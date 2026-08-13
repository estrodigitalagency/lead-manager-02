import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { regolaSiApplica, nomeConfrontabile } from "../_shared/regole.ts";

/**
 * Contatori della distribuzione: lettura, azzeramento e spostamento fra venditori.
 *
 * Lo spostamento serve quando un lead viene riassegnato a mano: il tetto di chi lo cede deve
 * scendere e quello di chi lo prende deve salire, altrimenti i contatori raccontano una
 * distribuzione diversa da quella reale e i tetti si saturano sulla persona sbagliata.
 *
 * La regola a cui attribuire il lead si sceglie con le stesse funzioni del webhook
 * (../_shared/regole.ts), così una riassegnazione conta esattamente come conterebbe
 * un'assegnazione automatica dello stesso lead.
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Conteggi = Record<string, number>;

/**
 * Applica un delta ai contatori, senza mai scendere sotto zero.
 *
 * Come nell'assegnazione, la scrittura e protetta da un numero di revisione: se qualcun altro
 * ha toccato lo stato nel frattempo si rilegge e si riprova, invece di sovrascrivere il suo
 * lavoro. Qui la concorrenza e bassa, ma due riassegnazioni fatte insieme basterebbero.
 */
async function applicaDelta(supabase: any, automation: any, delta: Record<string, number>) {
  for (let tentativo = 0; tentativo < 10; tentativo++) {
    const { data: attuale } = await supabase
      .from("lead_assignment_automations").select("distribution_state").eq("id", automation.id).maybeSingle();
    const stato: any = attuale?.distribution_state || {};
    const revisione: number | null = Number.isFinite(Number(stato.rev)) ? Number(stato.rev) : null;
    const counts: Conteggi = { ...(stato.count_assigned || {}) };
    let totale = stato.total_assigned || 0;

    for (const [venditoreId, d] of Object.entries(delta)) {
      const prima = counts[venditoreId] || 0;
      // Un contatore negativo non significa niente: al massimo si torna a zero.
      const dopo = Math.max(0, prima + d);
      counts[venditoreId] = dopo;
      totale += dopo - prima;
    }

    let q = supabase.from("lead_assignment_automations").update({
      distribution_state: {
        count_assigned: counts,
        total_assigned: Math.max(0, totale),
        last_updated: new Date().toISOString(),
        rev: (revisione ?? 0) + 1,
      },
    }).eq("id", automation.id);
    q = revisione === null
      ? q.is("distribution_state->>rev", null)
      : q.eq("distribution_state->>rev", String(revisione));

    const { data: righe } = await q.select("id");
    if (righe && righe.length > 0) return counts;
    await new Promise((r) => setTimeout(r, 15 * (tentativo + 1) + Math.random() * 40));
  }
  console.error(`[contatori] delta non applicato dopo 10 tentativi su ${automation.id}`);
  return automation.distribution_state?.count_assigned ?? {};
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const body = await req.json();
    const azione = String(body.azione || "");

    // ── Azzeramento: tutti i venditori della regola, oppure solo quelli indicati ──
    if (azione === "reset") {
      const { data: a } = await supabase
        .from("lead_assignment_automations").select("*").eq("id", body.automazione_id).maybeSingle();
      if (!a) return json({ error: "Automazione non trovata" }, 404);

      const soloQuesti: string[] = body.venditori ?? [];
      if (soloQuesti.length === 0) {
        await supabase.from("lead_assignment_automations").update({
          distribution_state: { count_assigned: {}, total_assigned: 0, last_updated: new Date().toISOString() },
        }).eq("id", a.id);
        return json({ ok: true, azzerati: "tutti", counts: {} });
      }

      const counts: Conteggi = { ...(a.distribution_state?.count_assigned || {}) };
      for (const v of soloQuesti) delete counts[v];
      await supabase.from("lead_assignment_automations").update({
        distribution_state: {
          count_assigned: counts,
          total_assigned: Object.values(counts).reduce((s, n) => s + n, 0),
          last_updated: new Date().toISOString(),
        },
      }).eq("id", a.id);
      return json({ ok: true, azzerati: soloQuesti.length, counts });
    }

    // ── Spostamento dopo una riassegnazione manuale ──
    if (azione === "sposta") {
      const leadIds: string[] = body.lead_ids ?? [];
      const market = (body.market || "IT").toUpperCase();
      const nomeDestinatario = String(body.a || "").trim();
      if (leadIds.length === 0 || !nomeDestinatario) return json({ error: "Servono lead_ids e destinatario" }, 400);

      const { data: leads } = await supabase
        .from("lead_generation")
        .select("id, ultima_fonte, fonte, campagna, nome, email, telefono, lead_score, venditore, market")
        .in("id", leadIds);
      if (!leads?.length) return json({ error: "Lead non trovati" }, 404);

      const { data: venditori } = await supabase
        .from("venditori").select("id, nome, cognome").eq("market", market);
      const idDi = (nome: string) => (venditori ?? []).find(
        (v: any) => nomeConfrontabile(`${v.nome} ${v.cognome || ""}`) === nomeConfrontabile(nome))?.id;

      const idDestinatario = idDi(nomeDestinatario);
      if (!idDestinatario) return json({ error: `Venditore "${nomeDestinatario}" non riconosciuto` }, 400);

      const { data: automations } = await supabase
        .from("lead_assignment_automations").select("*")
        .eq("attivo", true).eq("market", market)
        .eq("action_type", "weighted_distribution")
        .order("priority", { ascending: true });

      // delta per regola: chi cede scende, chi prende sale
      const perRegola = new Map<string, Record<string, number>>();
      let attribuiti = 0;
      const senzaRegola: string[] = [];

      for (const lead of leads) {
        const regola = (automations ?? []).find((a: any) =>
          (a.distribution_config || []).some((s: any) => s.venditore_id === idDestinatario) &&
          regolaSiApplica(lead, a));
        if (!regola) { senzaRegola.push(lead.id); continue; }

        const delta = perRegola.get(regola.id) ?? {};
        delta[idDestinatario] = (delta[idDestinatario] || 0) + 1;

        // Il venditore precedente scala solo se fa parte di questa distribuzione: se veniva
        // da fuori (assegnazione a mano, altra regola) non c'è nessun tetto da liberare.
        const idPrecedente = lead.venditore ? idDi(lead.venditore) : undefined;
        if (idPrecedente && idPrecedente !== idDestinatario &&
            (regola.distribution_config || []).some((s: any) => s.venditore_id === idPrecedente)) {
          delta[idPrecedente] = (delta[idPrecedente] || 0) - 1;
        }
        perRegola.set(regola.id, delta);
        attribuiti++;
      }

      const esiti: any[] = [];
      for (const [id, delta] of perRegola) {
        const a = (automations ?? []).find((x: any) => x.id === id);
        const counts = await applicaDelta(supabase, a, delta);
        esiti.push({ automazione: a.nome, delta, counts });
      }

      return json({ ok: true, attribuiti, senza_regola: senzaRegola.length, esiti });
    }

    return json({ error: `Azione "${azione}" sconosciuta` }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
