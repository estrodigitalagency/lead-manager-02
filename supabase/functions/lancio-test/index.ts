import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { valutaRegola, entroLockPeriod, slotEleggibili } from "../_shared/regole.ts";

/**
 * Prova a vuoto della configurazione di un lancio: nessuna scrittura, nessun lead creato.
 *
 * Fa due cose. Prima controlla che l'impianto regga — venditori attivi, tab dei fogli davvero
 * presenti, provenienza che compare nelle call, regola collegata, link WhatsApp. Poi simula
 * l'ingresso di un lead con la fonte indicata e dice a chi finirebbe, usando le stesse funzioni
 * di decisione del webhook che assegna sul serio (../_shared/regole.ts).
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Stato = "ok" | "avviso" | "errore";
interface Check { area: string; voce: string; stato: Stato; dettaglio: string }

async function googleToken(): Promise<string> {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
      refresh_token: Deno.env.get("GOOGLE_REFRESH_TOKEN") ?? "",
      grant_type: "refresh_token",
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error("Google: token non ottenuto");
  return j.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url);
    const lancioId = url.searchParams.get("lancio") || "";
    const market = (url.searchParams.get("market") || "IT").toUpperCase();
    const fonteProva = url.searchParams.get("fonte") || "";
    const emailProva = (url.searchParams.get("email") || "").trim().toLowerCase();
    const telefonoProva = (url.searchParams.get("telefono") || "").trim();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: cfgRow } = await supabase
      .from("system_settings").select("value").eq("key", "lanci_config").maybeSingle();
    const lanci = JSON.parse(cfgRow?.value || "[]");
    const cfg = lanci.find((l: any) => l.id === lancioId);
    if (!cfg) throw new Error(`Lancio "${lancioId}" non trovato`);

    const checks: Check[] = [];
    const add = (area: string, voce: string, stato: Stato, dettaglio: string) =>
      checks.push({ area, voce, stato, dettaglio });

    // ── 1. Venditori ──
    const { data: venditori } = await supabase
      .from("venditori").select("id, nome, cognome, stato, is_sales, sheets_file_id, telefono")
      .eq("market", market);
    const attivi = (venditori ?? []).filter((v: any) => v.stato === "attivo" && v.is_sales);
    const nomeDi = (v: any) => `${v.nome} ${v.cognome || ""}`.trim();

    const scelti: string[] = cfg.sales?.length ? cfg.sales : attivi.map(nomeDi);
    if (!cfg.sales?.length) {
      add("Venditori", "Selezione", "avviso",
        `Nessun venditore scelto: il lancio prende tutti i ${attivi.length} attivi. Va bene solo se è davvero così.`);
    } else {
      add("Venditori", "Selezione", "ok", `${cfg.sales.length} venditori nel lancio`);
    }
    const nonAttivi = scelti.filter((n) => !attivi.some((v: any) => nomeDi(v) === n));
    if (nonAttivi.length) {
      add("Venditori", "Stato", "errore",
        `Non attivi o non venditori: ${nonAttivi.join(", ")}. I loro dati non verranno letti.`);
    } else {
      add("Venditori", "Stato", "ok", "Tutti attivi");
    }
    const senzaFoglio = scelti.filter((n) => {
      const v = attivi.find((x: any) => nomeDi(x) === n);
      return v && !v.sheets_file_id;
    });
    if (senzaFoglio.length) {
      add("Venditori", "Foglio collegato", "errore", `Senza foglio: ${senzaFoglio.join(", ")}`);
    }

    // ── 2. Fogli: i tab esistono? la provenienza compare? ──
    if (!cfg.lead_tab) add("Fogli", "Tab lead", "errore", "Non impostato: nessun dato lead nella matrice");
    if (!cfg.call_tabs?.length) add("Fogli", "Tab call", "errore", "Nessun tab call impostato");
    if (!cfg.provenienza) add("Fogli", "Provenienza", "errore", "Non impostata: le call non verranno filtrate");

    if ((cfg.lead_tab || cfg.call_tabs?.length) && scelti.length) {
      try {
        const token = await googleToken();
        const gh = { Authorization: `Bearer ${token}` };
        const prov = String(cfg.provenienza || "").trim().toLowerCase();
        const mancanti: Record<string, string[]> = {};
        let conProvenienza = 0, controllati = 0, righeProv = 0;

        // A gruppi: 20 fogli letti in fila superavano i venti secondi di attesa.
        const CONC = 5;
        for (let i = 0; i < scelti.length; i += CONC) {
        await Promise.all(scelti.slice(i, i + CONC).map(async (nome) => {
          const v = attivi.find((x: any) => nomeDi(x) === nome);
          const sid = String(v?.sheets_file_id || "").replace(/[^a-zA-Z0-9_-]/g, "");
          if (!sid) return;
          controllati++;
          const meta = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${sid}?fields=sheets.properties.title`, { headers: gh });
          if (!meta.ok) { (mancanti[nome] ??= []).push(`foglio non leggibile (${meta.status})`); return; }
          const titoli: string[] = ((await meta.json()).sheets ?? []).map((s: any) => s.properties.title);

          for (const t of [cfg.lead_tab, ...(cfg.call_tabs ?? [])].filter(Boolean)) {
            if (!titoli.includes(t)) (mancanti[nome] ??= []).push(t);
          }

          // La provenienza compare davvero nei tab call di questo venditore?
          if (prov && cfg.call_tabs?.length) {
            const presenti = cfg.call_tabs.filter((t: string) => titoli.includes(t));
            if (presenti.length) {
              const qs = presenti.map((t: string) => `ranges=${encodeURIComponent(`${t}!B2:B1000`)}`).join("&");
              const r = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${sid}/values:batchGet?${qs}`, { headers: gh });
              if (r.ok) {
                const n = ((await r.json()).valueRanges ?? [])
                  .flatMap((vr: any) => vr.values ?? [])
                  .filter((row: any[]) => String(row[0] ?? "").trim().toLowerCase() === prov).length;
                if (n > 0) { conProvenienza++; righeProv += n; }
              }
            }
          }
        }));
        }

        const conMancanti = Object.keys(mancanti);
        if (conMancanti.length) {
          // Senza una selezione esplicita si controllano tutti i venditori del market: che a
          // qualcuno manchino i tab del lancio è normale, non un errore di configurazione.
          add("Fogli", "Tab presenti", cfg.sales?.length ? "errore" : "avviso",
            (cfg.sales?.length ? "" : "Nessun venditore scelto, quindi controllati tutti. Senza i tab del lancio: ") +
            conMancanti.map((n) => `${n} (${mancanti[n].length})`).join(" · "));
        } else {
          add("Fogli", "Tab presenti", "ok", `Tutti i tab trovati su ${controllati} fogli`);
        }

        if (prov && cfg.call_tabs?.length) {
          if (righeProv === 0) {
            add("Fogli", "Provenienza call", "errore",
              `"${cfg.provenienza}" non compare in nessuna call: la matrice resterà a zero. Controlla come è scritta nei fogli.`);
          } else if (conProvenienza < controllati / 2) {
            add("Fogli", "Provenienza call", "avviso",
              `${righeProv} call trovate, ma solo ${conProvenienza} venditori su ${controllati} ne hanno`);
          } else {
            add("Fogli", "Provenienza call", "ok",
              `${righeProv} call con provenienza "${cfg.provenienza}" su ${conProvenienza} venditori`);
          }
        }
      } catch (e) {
        add("Fogli", "Lettura", "errore", (e as Error).message);
      }
    }

    // ── 3. Regola di assegnazione ──
    const { data: automations } = await supabase
      .from("lead_assignment_automations").select("*")
      .eq("attivo", true).eq("market", market).order("priority", { ascending: true });

    const { data: rrRow } = await supabase
      .from("system_settings").select("value").eq("key", "automations_round_robin").maybeSingle();
    let inCoda: string[] = [];
    try { const p = JSON.parse(rrRow?.value || "[]"); if (Array.isArray(p)) inCoda = p; } catch { /* vuota */ }

    const regola = (automations ?? []).find((a: any) => a.id === cfg.automazione_id);
    if (!cfg.automazione_id) {
      add("Assegnazione", "Regola collegata", "avviso", "Nessuna regola: i lead vanno assegnati a mano");
    } else if (!regola) {
      add("Assegnazione", "Regola collegata", "errore",
        "La regola collegata non è attiva (o è stata eliminata): i lead di questo lancio non verranno assegnati");
    } else {
      add("Assegnazione", "Regola collegata", "ok", `"${regola.nome}", priorità ${regola.priority}`);

      if (regola.action_type === "weighted_distribution") {
        const cfgSlot: any[] = regola.distribution_config || [];
        const counts: Record<string, number> = regola.distribution_state?.count_assigned || {};
        const mode = regola.distribution_mode || "percentage";

        const fuoriLancio = cfgSlot
          .map((s) => attivi.find((v: any) => v.id === s.venditore_id))
          .filter((v: any) => v && !scelti.includes(nomeDi(v)))
          .map((v: any) => nomeDi(v));
        if (fuoriLancio.length) {
          add("Assegnazione", "Venditori della regola", "avviso",
            `Ricevono lead ma non sono nel lancio: ${fuoriLancio.join(", ")} — i loro numeri non compariranno nella matrice`);
        }

        const spenti = cfgSlot.filter((s) => !attivi.some((v: any) => v.id === s.venditore_id));
        if (spenti.length) {
          add("Assegnazione", "Venditori della regola", "errore",
            `${spenti.length} slot puntano a venditori non attivi: la loro quota va agli altri`);
        }

        if (mode === "percentage") {
          const somma = cfgSlot.reduce((s, x) => s + (x.weight || 0), 0);
          if (somma === 0) add("Assegnazione", "Percentuali", "errore", "Tutti i pesi a zero: non assegnerebbe a nessuno");
          else if (Math.abs(somma - 100) > 0.5) add("Assegnazione", "Percentuali", "avviso",
            `Somma ${somma}% invece di 100: le quote restano proporzionali, ma il conto non torna a vista`);
          else add("Assegnazione", "Percentuali", "ok", "Somma 100%");
        }

        const eleggibili = slotEleggibili(cfgSlot, counts, attivi, mode);
        const capienza = cfgSlot.map((s) => {
          const v = attivi.find((x: any) => x.id === s.venditore_id);
          return {
            venditore: v ? nomeDi(v) : "(non attivo)",
            assegnati: counts[s.venditore_id] || 0,
            tetto: mode === "count" ? (s.count_target || 0) : (s.cap || null),
            peso: s.weight ?? null,
            pieno: !eleggibili.some((e) => e.slot.venditore_id === s.venditore_id),
          };
        });

        if (eleggibili.length === 0) {
          add("Assegnazione", "Capienza", "avviso",
            "Nessuno può più ricevere: i lead nuovi finiscono in coda Round Robin");
        } else if (mode === "percentage" && !cfgSlot.some((s) => s.cap)) {
          add("Assegnazione", "Capienza", "avviso",
            "Nessun tetto impostato: la coda Round Robin automatica non scatterà mai");
        } else {
          add("Assegnazione", "Capienza", "ok",
            `${eleggibili.length} venditori su ${cfgSlot.length} possono ancora ricevere`);
        }

        if (inCoda.includes(regola.id)) {
          add("Assegnazione", "Round Robin", "avviso",
            "Interruttore acceso: i lead nuovi restano in coda, passa solo chi era già stato assegnato");
        }

        // Conflitti: altre regole attive che intercettano le stesse fonti
        const mie: string[] = regola.condition_value || [];
        const conflitti = (automations ?? []).filter((a: any) =>
          a.id !== regola.id &&
          a.trigger_field === regola.trigger_field &&
          (a.trigger_when ?? "new_lead") === (regola.trigger_when ?? "new_lead") &&
          a.condition_type !== "not_contains" &&
          (a.condition_value || []).some((c: string) =>
            mie.some((m) => c && m && (c.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(c.toLowerCase())))));
        const prima = conflitti.filter((a: any) => (a.priority ?? 999) < (regola.priority ?? 999));
        if (prima.length) {
          add("Assegnazione", "Conflitti", "errore",
            `Scattano prima di questa: ${prima.map((a: any) => `${a.nome} (priorità ${a.priority})`).join(", ")}`);
        } else if (conflitti.length) {
          add("Assegnazione", "Conflitti", "avviso",
            `Stesse fonti ma priorità più bassa: ${conflitti.map((a: any) => a.nome).join(", ")}`);
        } else {
          add("Assegnazione", "Conflitti", "ok", "Nessuna altra regola sulle stesse fonti");
        }

        (checks as any).capienza = capienza;
      }
    }

    // ── 4. WhatsApp ──
    if (cfg.whatsapp_slug) {
      const { data: waRow } = await supabase
        .from("system_settings").select("value").eq("key", "whatsapp_templates").maybeSingle();
      let tpl: any = null;
      try { tpl = (JSON.parse(waRow?.value || "[]") as any[]).find((t) => t.slug === cfg.whatsapp_slug); } catch { /* vuoto */ }
      if (!tpl) add("WhatsApp", "Link", "errore", `Slug "${cfg.whatsapp_slug}" non trovato`);
      else if (!tpl.attivo) add("WhatsApp", "Link", "errore", "Link disattivato: chi clicca vede un errore");
      else {
        add("WhatsApp", "Link", "ok", `/wa/${tpl.slug}`);
        if (!tpl.fallback_phone) {
          add("WhatsApp", "Riserva", "avviso",
            "Nessun numero di riserva: un lead senza venditore assegnato vedrà un errore invece di una chat");
        }
        const senzaTel = scelti.filter((n) => {
          const v = attivi.find((x: any) => nomeDi(x) === n);
          return v && !v.telefono;
        });
        if (senzaTel.length) {
          add("WhatsApp", "Numeri venditori", "errore",
            `Senza numero, il link non può aprire la chat: ${senzaTel.join(", ")}`);
        }
      }
    } else {
      add("WhatsApp", "Link", "avviso", "Nessun link collegato: contatti e click non vengono tracciati");
    }

    // ── 5. Simulazione di un lead in ingresso (nessuna scrittura) ──
    let simulazione: any = null;
    if (fonteProva) {
      const finto = {
        nome: "Prova", cognome: "Configurazione",
        email: emailProva || "prova@example.com",
        telefono: telefonoProva || "",
        fonte: fonteProva, ultima_fonte: fonteProva,
        campagna: cfg.campagna || null, market,
      };
      const passi: any[] = [];
      let esito = "Nessuna regola corrisponde: il lead resterebbe senza venditore";

      // Venditore precedente reale, se email/telefono di un lead già esistente
      let prev: { venditore: string; data: string } | null = null;
      if (emailProva || telefonoProva) {
        let q = supabase.from("lead_generation")
          .select("venditore, data_assegnazione, created_at")
          .eq("market", market).not("venditore", "is", null)
          .neq("venditore", "Round Robin")
          .not("data_assegnazione", "is", null)
          .order("created_at", { ascending: false }).limit(1);
        q = emailProva ? q.ilike("email", emailProva) : q.ilike("telefono", `%${telefonoProva}%`);
        const { data } = await q;
        if (data?.[0]) prev = { venditore: data[0].venditore, data: data[0].data_assegnazione };
      }

      for (const a of automations ?? []) {
        const v = valutaRegola(finto, a);
        if (!v.vale) { passi.push({ regola: a.nome, esito: "saltata", motivo: (v as any).motivo }); continue; }

        if (inCoda.includes(a.id)) {
          if (prev && entroLockPeriod(a, prev.data)) {
            esito = `${prev.venditore} — già assegnato di recente, la coda lo lascia passare`;
            passi.push({ regola: a.nome, esito: "assegnato", motivo: "venditore precedente entro il lock period" });
          } else {
            esito = "Round Robin — coda attiva su questa regola";
            passi.push({ regola: a.nome, esito: "in coda", motivo: prev ? "lock period scaduto" : "nessun venditore precedente" });
          }
          break;
        }

        if (a.action_type === "assign_to_seller") {
          const v2 = attivi.find((x: any) => x.id === a.target_seller_id);
          esito = v2 ? `${nomeDi(v2)} — venditore fisso della regola` : "Regola senza venditore valido";
          passi.push({ regola: a.nome, esito: "assegnato", motivo: "venditore fisso" });
          break;
        }

        if (a.use_previous_seller_first || a.action_type === "assign_to_previous_seller") {
          if (prev && entroLockPeriod(a, prev.data)) {
            esito = `${prev.venditore} — venditore precedente`;
            passi.push({ regola: a.nome, esito: "assegnato", motivo: "venditore precedente entro il lock period" });
            break;
          }
          if (a.action_type === "assign_to_previous_seller") {
            passi.push({ regola: a.nome, esito: "saltata", motivo: prev ? "lock period scaduto" : "nessun venditore precedente" });
            continue;
          }
        }

        const counts: Record<string, number> = a.distribution_state?.count_assigned || {};
        const el = slotEleggibili(a.distribution_config || [], counts, attivi, a.distribution_mode || "percentage");
        if (el.length === 0) {
          esito = "Round Robin — tutti i venditori hanno raggiunto il tetto";
          passi.push({ regola: a.nome, esito: "in coda", motivo: "quote esaurite" });
          continue;
        }
        const tot = el.reduce((s, e) => s + (e.slot.weight || 0), 0);
        esito = `uno tra ${el.map((e) => `${e.seller.nome} ${e.seller.cognome}`).join(", ")}`;
        passi.push({
          regola: a.nome, esito: "assegnato",
          motivo: a.distribution_mode === "count"
            ? "quota assoluta, scelta uniforme fra chi non ha esaurito"
            : el.map((e) => `${e.seller.nome} ${tot > 0 ? Math.round(((e.slot.weight || 0) / tot) * 100) : 0}%`).join(" · "),
        });
        break;
      }
      simulazione = { fonte: fonteProva, venditore_precedente: prev, passi, esito };
    }

    const errori = checks.filter((c) => c.stato === "errore").length;
    const avvisi = checks.filter((c) => c.stato === "avviso").length;

    return new Response(JSON.stringify({
      lancio: { id: cfg.id, nome: cfg.nome },
      pronto: errori === 0,
      errori, avvisi,
      checks,
      capienza: (checks as any).capienza ?? null,
      simulazione,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
