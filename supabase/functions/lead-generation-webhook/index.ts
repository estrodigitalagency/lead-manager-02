
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  calculateDaysSince, checkCondition, regolaSiApplica, entroLockPeriod, slotEleggibili,
  scegliSlot, gruppoDi, pesoGruppo, nomeConfrontabile,
} from '../_shared/regole.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Utility functions for normalization and date calculations
function normalizeEmail(email: string | null): string {
  if (!email) return '';
  return email.toLowerCase().trim();
}

function normalizePhone(phone: string | null): string {
  if (!phone) return '';
  return phone.replace(/[^0-9+]/g, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const corpo = await req.json()

    // ── Recupero della coda ──────────────────────────────────────────────────────────────
    // I lead parcheggiati su "Round Robin" (sospensione attiva, oppure tetti pieni) vengono
    // rimessi nel giro quando si riapre la distribuzione. Passano dalle stesse automazioni di
    // un lead nuovo, quindi rispettano venditore precedente, tetti, pause e contatori.
    if (corpo?.azione === 'recupera_coda') {
      const mercato = (corpo.market || 'IT').toUpperCase()
      const limite = Math.min(Number(corpo.limit) || 500, 2000)
      // 'coda' = parcheggiati su Round Robin, 'liberi' = mai assegnati perché i tetti erano pieni
      const sorgente = corpo.sorgente === 'liberi' ? 'liberi' : 'coda'
      const soloAnteprima = corpo.simula === true

      let reg: any = null
      if (corpo.automazione_id) {
        const { data } = await supabase
          .from('lead_assignment_automations').select('*').eq('id', corpo.automazione_id).maybeSingle()
        if (!data) return new Response(JSON.stringify({ error: 'Automazione non trovata' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
        reg = data
      }

      // La coda storica puo contenere migliaia di lead di campagne vecchie: leggerne solo i
      // primi mille e filtrarli dopo non farebbe mai emergere quelli di questo lancio. Si
      // scorre a pagine finche non se ne trovano abbastanza che la regola riconosce come suoi.
      const PAGINA = 1000, SCANSIONE_MAX = 20000
      const candidati: any[] = []
      let letti = 0
      for (let off = 0; off < SCANSIONE_MAX && candidati.length < limite; off += PAGINA) {
        let q = supabase
          .from('lead_generation')
          .select('*')
          .eq('market', mercato)
          .order('created_at', { ascending: true })
          .range(off, off + PAGINA - 1)
        q = sorgente === 'liberi' ? q.is('venditore', null) : q.eq('venditore', 'Round Robin')
        const { data: blocco } = await q
        if (!blocco || blocco.length === 0) break
        letti += blocco.length
        for (const l of blocco) {
          if (candidati.length >= limite) break
          if (!reg || regolaSiApplica(l, reg)) candidati.push(l)
        }
        if (blocco.length < PAGINA) break
      }
      const codaTroncata = letti >= SCANSIONE_MAX && candidati.length < limite
      console.log(`[recupero] coda esaminata: ${letti} lead, ${candidati.length} di questa regola${codaTroncata ? ' (scansione interrotta al tetto)' : ''}`)

      // Anteprima: dice quanti sono e come verrebbero ripartiti, senza toccare niente.
      if (soloAnteprima) {
        let ripartizione: Record<string, number> = {}
        if (reg?.action_type === 'weighted_distribution') {
          const { data: vend } = await supabase
            .from('venditori').select('id, nome, cognome, stato').eq('market', mercato).eq('stato', 'attivo')
          const counts = { ...((reg.distribution_state || {}).count_assigned || {}) }
          const mode = reg.distribution_mode || 'percentage'
          // Si simula l'ingresso uno per uno, così tetti e quote si esauriscono come dal vivo.
          // La scelta reale è casuale pesata: qui si prende ogni volta chi è più indietro
          // rispetto alla sua quota, che dà la ripartizione attesa senza dipendere dal caso.
          const dati: Record<string, number> = {}
          for (let i = 0; i < candidati.length; i++) {
            const el = slotEleggibili(reg.distribution_config || [], counts, vend ?? [], mode)
            if (el.length === 0) break
            const pesi = el.reduce((s2: number, e: any) => s2 + (e.slot.weight || 0), 0)
            const assegnatiOra = el.reduce((s2: number, e: any) => s2 + (dati[e.slot.venditore_id] || 0), 0)
            const scelto = (mode === 'count' || pesi <= 0)
              ? el.reduce((min: any, e: any) =>
                  (dati[e.slot.venditore_id] || 0) < (dati[min.slot.venditore_id] || 0) ? e : min)
              : (() => {
                  // Peso effettivo = quota del gruppo x percentuale dentro il gruppo, così
                  // l'anteprima riflette la stessa ripartizione dell'assegnazione vera.
                  const gruppiVivi = new Map<string, number>()
                  for (const e of el) {
                    const g = gruppoDi(e.slot)
                    if (g && pesoGruppo(e.slot) > 0) gruppiVivi.set(g, pesoGruppo(e.slot))
                  }
                  const totGruppi = [...gruppiVivi.values()].reduce((a, b) => a + b, 0)
                  const usaGruppi = gruppiVivi.size > 0 && totGruppi > 0 &&
                    el.every((e: any) => gruppoDi(e.slot) && pesoGruppo(e.slot) > 0)
                  const effettivo = (x: any) => {
                    if (!usaGruppi) return (x.slot.weight || 0) / pesi
                    const g = gruppoDi(x.slot)
                    const dentro = el.filter((y: any) => gruppoDi(y.slot) === g)
                    const somma = dentro.reduce((s2: number, y: any) => s2 + (y.slot.weight || 0), 0)
                    const quotaInterna = somma > 0 ? (x.slot.weight || 0) / somma : 1 / dentro.length
                    return ((gruppiVivi.get(g) || 0) / totGruppi) * quotaInterna
                  }
                  const scarto = (x: any) => effettivo(x) * (assegnatiOra + 1) - (dati[x.slot.venditore_id] || 0)
                  return el.reduce((best: any, e: any) => (scarto(e) > scarto(best) ? e : best))
                })()
            const nome = `${scelto.seller.nome} ${scelto.seller.cognome || ''}`.trim()
            ripartizione[nome] = (ripartizione[nome] || 0) + 1
            dati[scelto.slot.venditore_id] = (dati[scelto.slot.venditore_id] || 0) + 1
            counts[scelto.slot.venditore_id] = (counts[scelto.slot.venditore_id] || 0) + 1
          }
        }
        const assegnabili = Object.values(ripartizione).reduce((s2: number, n: any) => s2 + n, 0)
        return new Response(JSON.stringify({
          ok: true, anteprima: true, sorgente,
          trovati: candidati.length, assegnabili, ripartizione, coda_esaminata: letti,
          scansione_troncata: codaTroncata,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      let assegnati = 0
      for (const lead of candidati) {
        // Si riparte da zero: senza venditore le automazioni lo trattano come un lead in ingresso.
        await supabase.from('lead_generation')
          .update({ venditore: null, data_assegnazione: null }).eq('id', lead.id)
        await checkAndApplyAutomations({ ...lead, venditore: null, data_assegnazione: null }, supabase)

        const { data: dopo } = await supabase
          .from('lead_generation').select('venditore').eq('id', lead.id).maybeSingle()
        if (dopo?.venditore && dopo.venditore !== 'Round Robin') assegnati++
        else if (sorgente === 'coda') {
          // Nessuna regola l'ha preso: torna in coda, dov'era.
          await supabase.from('lead_generation').update({
            venditore: 'Round Robin', stato: 'assegnato', assignable: false,
            data_assegnazione: new Date().toISOString(),
          }).eq('id', lead.id)
        }
      }

      return new Response(JSON.stringify({
        ok: true, in_coda: candidati.length, assegnati,
        ancora_in_coda: candidati.length - assegnati, coda_esaminata: letti,
        scansione_troncata: codaTroncata,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { nome, cognome, email, telefono, fonte, campagna, notes, lead_score, venditore, stato, market, ultima_fonte, assignable, stato_del_lead } = corpo

    // Default market to 'IT' for backward compatibility
    const finalMarket = market || 'IT'

    console.log('Received lead data:', { nome, cognome, email, telefono, fonte, campagna, notes, lead_score, venditore, stato, market: finalMarket, ultima_fonte, assignable, stato_del_lead })

    // Use provided ultima_fonte if available, otherwise use fonte as fallback (no calculation)
    const finalUltimaFonte = ultima_fonte || fonte;
    
    // Respect assignable value from payload if provided, otherwise calculate it
    const isAssigned = venditore && venditore.trim() !== '';
    const finalStato = stato || 'nuovo';
    const finalAssignable = assignable !== undefined ? assignable : (isAssigned ? false : false);
    const dataAssegnazione = isAssigned ? new Date().toISOString() : null;
    
    const { data: newLead, error: insertError } = await supabase
      .from('lead_generation')
      .insert({
        nome,
        cognome,
        email,
        telefono,
        fonte,
        campagna,
        notes,
        lead_score,
        venditore: venditore || null,
        stato: finalStato,
        assignable: finalAssignable,
        booked_call: 'NO',
        data_assegnazione: dataAssegnazione,
        ultima_fonte: finalUltimaFonte,
        market: finalMarket,
        stato_del_lead: stato_del_lead || null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting lead:', insertError)
      throw insertError
    }

    console.log('Successfully created new lead:', newLead);
    
    // Controlla automazioni solo se il lead NON ha già un venditore assegnato o se è assignable
    if (!newLead.venditore || newLead.assignable) {
      console.log('Checking automations for new lead:', newLead.id);
      await checkAndApplyAutomations(newLead, supabase);
    } else {
      console.log('Skipping automations: lead already has assigned seller and assignable=false');
      await scalaTettoPreassegnato(newLead, supabase);
    }
    
    return new Response(JSON.stringify({
      success: true,
      lead: newLead,
      action: 'created_new'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in lead-generation-webhook:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: (error as Error).message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});


// Function to compute the difference between fonte values
function computeFonteDiff(previousFonte: string, newFonte: string): string {
  if (!previousFonte || !newFonte) {
    return newFonte || '';
  }
  
  // Normalize and split fonte values
  const previousSources = previousFonte.split(',').map(s => s.trim()).filter(s => s);
  const newSources = newFonte.split(',').map(s => s.trim()).filter(s => s);
  
  // Find sources that are in newFonte but not in previousFonte
  const diff = newSources.filter(source => !previousSources.includes(source));
  
  // If no difference, return the new fonte (not empty)
  if (diff.length === 0) {
    return newFonte;
  }
  
  return diff.join(', ');
}

// Funzione per controllare e applicare automazioni
async function checkAndApplyAutomations(lead: any, supabase: any) {
  try {
    console.log('Fetching active automations...');
    
    // Recupera tutte le automazioni attive ordinate per priorità, filtrate per market
    const { data: automations, error: automationsError } = await supabase
      .from('lead_assignment_automations')
      .select(`
        *,
        venditori!target_seller_id(nome, cognome, sheets_file_id, sheets_tab_name, market)
      `)
      .eq('attivo', true)
      .eq('market', lead.market)
      .order('priority', { ascending: true });

    if (automationsError) {
      console.error('Error fetching automations:', automationsError);
      return;
    }

    if (!automations || automations.length === 0) {
      console.log('No active automations found');
      return;
    }

    console.log(`Found ${automations.length} active automations`);

    // "Assegnazione Round Robin": interruttore manuale per mettere in coda i lead nuovi quando
    // i venditori sono in ritardo con la lavorazione, senza toccare tetti e percentuali.
    // L'elenco sta in system_settings (stesso schema del soft-delete) perché l'app scrive con
    // la anon key e non può aggiungere colonne alla tabella delle automazioni.
    let inCoda: string[] = [];
    try {
      const { data: rr } = await supabase
        .from('system_settings').select('value').eq('key', 'automations_round_robin').maybeSingle();
      const parsed = JSON.parse(rr?.value || '[]');
      if (Array.isArray(parsed)) inCoda = parsed as string[];
    } catch { /* nessuna coda attiva */ }

    // Regole per cui il venditore precedente vale solo se fa parte della distribuzione: senza
    // questo un lead gia lavorato torna a chi l'aveva anche se quella persona non lavora al
    // lancio, e i suoi numeri non compaiono da nessuna parte.
    let soloInterni: string[] = [];
    try {
      const { data: si } = await supabase
        .from('system_settings').select('value').eq('key', 'automations_prev_solo_interni').maybeSingle();
      const parsed = JSON.parse(si?.value || '[]');
      if (Array.isArray(parsed)) soloInterni = parsed as string[];
    } catch { /* nessun vincolo */ }

    /** Il venditore trovato puo prendere questo lead per questa regola? */
    const ammesso = (automation: any, sellerId?: string) => {
      if (!soloInterni.includes(automation.id)) return true;
      return (automation.distribution_config || []).some((sl: any) => sl.venditore_id === sellerId);
    };

    // Se una regola matcha ma ha le quote esaurite il lead non va perso: a fine giro
    // finisce in Round Robin, la coda già usata nel database per i lead in attesa.
    let quotePiene: string | null = null;
    let codaAttiva: string | null = null;

    // Controlla ogni automazione nell'ordine di priorità
    for (const automation of automations) {
      console.log(`Checking automation: ${automation.nome}`);
      
      if (!regolaSiApplica(lead, automation)) continue;

      {
        console.log(`Automation condition matched: ${automation.nome}`);
        
        let targetSeller = null;
        let sheetsTabName = null;
        // la distribuzione scala il tetto da sé; le altre strade no e vanno contate a valle
        let tettoGiaScalato = false;

        if (inCoda.includes(automation.id)) {
          // In coda: passa solo chi è già stato lavorato di recente, il resto aspetta.
          const prev = await findPreviousSeller(lead, supabase, automation.excluded_sellers || []);
          if (prev && entroLockPeriod(automation, prev.dataAssegnazione)) {
            console.log(`[coda] ${automation.nome}: lead già lavorato da ${prev.seller.nome} ${prev.seller.cognome}, torna a lui`);
            await scalaTettoVenditore(automation, prev.seller.id, supabase);
            await assignLeadAutomatically(
              lead,
              { ...prev.seller, originalDataAssegnazione: prev.dataAssegnazione },
              automation.sheets_tab_name || prev.seller.sheets_tab_name,
              automation, supabase,
            );
            return;
          }
          console.log(`[coda] ${automation.nome}: nessun venditore recente, lead in Round Robin`);
          codaAttiva = automation.nome;
          continue;
        }

        if (automation.action_type === 'assign_to_seller' && automation.target_seller_id) {
          // Assegna al venditore specificato
          targetSeller = automation.venditori;
          sheetsTabName = automation.sheets_tab_name || automation.venditori?.sheets_tab_name;

        } else if (automation.action_type === 'weighted_distribution') {
          // Se toggle 'use_previous_seller_first' attivo: prova prima previous
          if (automation.use_previous_seller_first) {
            const excludedList = automation.excluded_sellers || [];
            const prev = await findPreviousSeller(lead, supabase, excludedList);
            if (prev && ammesso(automation, prev.seller?.id)) {
              const prevSeller = prev.seller;
              const dataAssegnazione = prev.dataAssegnazione;
              // check lock period se presente
              if (automation.lock_period_days && automation.lock_period_days > 0 && dataAssegnazione) {
                const days = calculateDaysSince(dataAssegnazione);
                if (days < automation.lock_period_days) {
                  targetSeller = prevSeller;
                  sheetsTabName = automation.sheets_tab_name || prevSeller.sheets_tab_name;
                  targetSeller.originalDataAssegnazione = dataAssegnazione;
                }
              } else {
                targetSeller = prevSeller;
                sheetsTabName = automation.sheets_tab_name || prevSeller.sheets_tab_name;
              }
            }
          }

          if (!targetSeller) {
            // Distribuzione pesata
            const pickedSeller = await pickSellerFromDistribution(automation, supabase);
            if (!pickedSeller) {
              await logAutomationExecution(lead, automation, null, 'no_seller_found',
                'Distribution quota full or no eligible sellers', 'webhook', supabase);
              quotePiene = automation.nome;
              continue;
            }
            targetSeller = pickedSeller;
            tettoGiaScalato = true;
            sheetsTabName = automation.sheets_tab_name || pickedSeller.sheets_tab_name;
          }
        } else if (automation.action_type === 'assign_to_previous_seller') {
          // Cerca tra TUTTI i lead precedenti (qualsiasi fonte), ordinati per ingresso desc
          // e già filtrati dagli excluded_sellers — così se il più recente è escluso, prende
          // automaticamente il successivo non escluso (no skip).
          const excludedList = (automation.excluded_sellers && automation.excluded_sellers.length > 0)
            ? automation.excluded_sellers
            : [];
          const previousSellerResult = await findPreviousSeller(lead, supabase, excludedList);
          
          if (previousSellerResult) {
            const previousSeller = previousSellerResult.seller;
            const dataAssegnazione = previousSellerResult.dataAssegnazione;
            
            if (automation.lock_period_days !== null && automation.lock_period_days !== undefined) {
              // lock_period_days = -1 significa "sempre riassegna" (no lock)
              if (automation.lock_period_days === -1) {
                console.log(`No lock period: always reassigning to ${previousSeller.nome} ${previousSeller.cognome}`);
                targetSeller = previousSeller;
                sheetsTabName = automation.sheets_tab_name || previousSeller.sheets_tab_name;
              } else if (automation.lock_period_days > 0 && dataAssegnazione) {
                // Controlla i giorni dal lock period
                const daysSinceAssignment = calculateDaysSince(dataAssegnazione);
                
                console.log(`Lock period check: ${daysSinceAssignment} days since last assignment (limit: ${automation.lock_period_days})`);
                
                if (daysSinceAssignment < automation.lock_period_days) {
                  // ENTRO il lock period → riassegna allo stesso venditore
                  console.log(`Within lock period, reassigning to ${previousSeller.nome} ${previousSeller.cognome}`);
                  targetSeller = previousSeller;
                  sheetsTabName = automation.sheets_tab_name || previousSeller.sheets_tab_name;
                  // IMPORTANTE: Passare dataAssegnazione originale per NON aggiornarla
                  targetSeller.originalDataAssegnazione = dataAssegnazione;
                } else {
                  // OLTRE il lock period → NON assegnare, lascia assignable=true
                  console.log(`Beyond lock period (${daysSinceAssignment}/${automation.lock_period_days} days), lead remains assignable`);
                  await logAutomationExecution(lead, automation, null, 'beyond_lock_period', 
                    `${daysSinceAssignment} days since last assignment exceeds lock period of ${automation.lock_period_days} days`, 
                    'webhook', supabase);
                  continue;
                }
              }
            } else {
              // Nessun lock_period_days: riassegna sempre al venditore precedente
              targetSeller = previousSeller;
              sheetsTabName = automation.sheets_tab_name || previousSeller.sheets_tab_name;
            }
          } else {
            console.log('No previous assignment found');
            await logAutomationExecution(lead, automation, null, 'no_previous_assignment', 'No previous assignment found', 'webhook', supabase);
            continue;
          }
          
          // Controlla se il venditore precedente è nella lista esclusi
          if (targetSeller && automation.excluded_sellers && automation.excluded_sellers.length > 0) {
            const previousSellerName = `${targetSeller.nome} ${targetSeller.cognome}`.trim();
            
            if (automation.excluded_sellers.includes(previousSellerName)) {
              console.log(`Previous seller ${previousSellerName} is excluded from automation: ${automation.nome}`);
              await logAutomationExecution(lead, automation, null, 'seller_excluded', `Previous seller ${previousSellerName} is in excluded list`, 'webhook', supabase);
              continue; // Passa alla prossima automazione
            }
          }
          
          if (!sheetsTabName) {
            sheetsTabName = automation.sheets_tab_name;
          }
        }

        if (targetSeller) {
          if (!tettoGiaScalato) await scalaTettoVenditore(automation, targetSeller.id, supabase);
          await assignLeadAutomatically(lead, targetSeller, sheetsTabName, automation, supabase);
          return; // Ferma alla prima automazione che matcha
        } else {
          console.log(`No target seller found for automation: ${automation.nome}`);
          await logAutomationExecution(lead, automation, null, 'no_seller_found', 'No target seller found', 'webhook', supabase);
        }
      }
    }

    if (codaAttiva) {
      // Sospensione decisa a mano: il lead entra nella coda "Round Robin", la stessa già usata
      // nel database, perché è una scelta esplicita di parcheggiarlo.
      console.log(`Sospensione attiva su "${codaAttiva}": lead ${lead.id} messo in Round Robin`);
      await supabase
        .from('lead_generation')
        .update({
          venditore: 'Round Robin',
          stato: 'assegnato',
          assignable: false,
          data_assegnazione: new Date().toISOString(),
        })
        .eq('id', lead.id);
    } else if (quotePiene) {
      // Tetti esauriti: il lead resta LIBERO, non parcheggiato. Marcarlo come assegnato a
      // "Round Robin" lo farebbe sembrare sistemato e lo toglierebbe dai lead da lavorare,
      // mentre invece aspetta solo che qualcuno alzi i limiti o lo assegni a mano.
      console.log(`Quote piene su "${quotePiene}": lead ${lead.id} resta libero`);
      await supabase
        .from('lead_generation')
        .update({ venditore: null, stato: 'nuovo', assignable: true, data_assegnazione: null })
        .eq('id', lead.id);
    } else {
      console.log('No automation conditions matched');
    }
    
  } catch (error) {
    console.error('Error in checkAndApplyAutomations:', error);
  }
}

/**
 * Ogni lead che finisce a un venditore occupa capacità, quindi scala dal suo tetto: vale per
 * la distribuzione ma anche per le riassegnazioni al venditore precedente, che saltano la
 * distribuzione e altrimenti non verrebbero contate.
 */
async function scalaTettoVenditore(automation: any, sellerId: string | undefined, supabase: any) {
  if (!sellerId || automation.action_type !== 'weighted_distribution') return;
  const config: any[] = automation.distribution_config || [];
  if (!config.some((slot: any) => slot.venditore_id === sellerId)) return;
  const state: any = automation.distribution_state || {};
  await incrementDistributionState(automation.id, sellerId, state.count_assigned || {}, state.total_assigned || 0, supabase);
  console.log(`[tetto] +1 su ${sellerId} per "${automation.nome}"`);
}

/**
 * Lead che arriva già assegnato (es. n8n con link UTM): le automazioni non girano, ma il lead
 * occupa comunque capacità del venditore, quindi scala dal suo tetto. Si sceglie la regola che
 * avrebbe gestito questo lead, cioè quella la cui condizione corrisponde alla sua fonte e che
 * distribuisce a quel venditore. Senza corrispondenza non si scala niente: un lead di un'altra
 * campagna non deve consumare il tetto di questo lancio.
 */
async function scalaTettoPreassegnato(lead: any, supabase: any) {
  try {
    const seller = await fetchSellerDetails(lead.venditore, lead.market, supabase);
    if (!seller) return;   // nome non riconducibile a un venditore attivo: niente da scalare

    const { data: automations } = await supabase
      .from('lead_assignment_automations')
      .select('*')
      .eq('attivo', true).eq('market', lead.market)
      .order('priority', { ascending: true });

    const conIlVenditore = (automations || []).filter((a: any) =>
      a.action_type === 'weighted_distribution' &&
      (a.distribution_config || []).some((slot: any) => slot.venditore_id === seller.id));
    if (conIlVenditore.length === 0) return;

    const regola = conIlVenditore.find((a: any) => regolaSiApplica(lead, a));
    if (!regola) {
      console.log(`[preassegnato] ${lead.venditore}: nessuna regola con condizione corrispondente a "${lead.ultima_fonte}", tetto non scalato`);
      return;
    }

    const state: any = regola.distribution_state || {};
    await incrementDistributionState(regola.id, seller.id, state.count_assigned || {}, state.total_assigned || 0, supabase);
    await logAutomationExecution(lead, regola, seller, 'counted_preassigned',
      'Lead già assegnato da fuori: scalato dal tetto senza riassegnare', 'webhook', supabase);
    console.log(`[preassegnato] ${lead.venditore} scalato dal tetto di "${regola.nome}"`);
  } catch (e) {
    console.error('[preassegnato] errore nello scalare il tetto:', e);
  }
}

// Funzione per trovare il venditore precedente - SENZA LIMITI
// Restituisce { seller, dataAssegnazione } per evitare query duplicate
async function findPreviousSeller(lead: any, supabase: any, excludedSellers: string[] = []) {
  try {
    console.log(`Finding previous seller for lead: ${lead.email} / ${lead.telefono} in market: ${lead.market} (excluded: ${excludedSellers.length})`);

    const normalizedEmail = normalizeEmail(lead.email);
    const normalizedPhone = normalizePhone(lead.telefono);

    // Helper: builds query ordered by ingresso (created_at) DESC — più recente ingresso vince,
    // non più recente assegnazione. Logica: lead entrato per ultimo "appartiene" al venditore
    // di quel canale di ingresso, non a chi lo ha lavorato dopo cronologicamente.
    const buildQuery = (column: 'email' | 'telefono', value: string) => {
      let q = supabase
        .from('lead_generation')
        .select('venditore, data_assegnazione, created_at, id')
        .eq('market', lead.market)
        .ilike(column, value)
        .not('venditore', 'is', null)
        .not('data_assegnazione', 'is', null);
      // Esclusione diretta in query: il match più recente non escluso.
      // "Round Robin" non è un venditore ma la coda d'attesa: se restasse in gioco sarebbe
      // il match più recente e il lead perderebbe il collegamento al venditore vero.
      const daEscludere = [...excludedSellers, 'Round Robin'];
      const escaped = daEscludere.map(s => `"${String(s).replace(/"/g, '\\"')}"`).join(',');
      q = q.not('venditore', 'in', `(${escaped})`);
      return q.order('created_at', { ascending: false }).limit(1);
    };

    // Le due ricerche partono insieme: sono indipendenti e quella per telefono, essendo per
    // sottostringa, e la piu lenta. In fila si sommavano; in parallelo il costo e quello della
    // piu lenta soltanto. L'email resta prioritaria nella scelta del risultato.
    const [perEmail, perTelefono] = await Promise.all([
      normalizedEmail ? buildQuery('email', normalizedEmail) : Promise.resolve({ data: null, error: null }),
      normalizedPhone ? buildQuery('telefono', normalizedPhone) : Promise.resolve({ data: null, error: null }),
    ]);
    if (perEmail.error) console.error('Error searching by email:', perEmail.error);
    if (perTelefono.error) console.error('Error searching by phone:', perTelefono.error);

    const match = perEmail.data?.[0] ?? perTelefono.data?.[0] ?? null;
    if (match) {
      const via = perEmail.data?.[0] ? 'EMAIL' : 'TELEFONO';
      console.log(`✅ Found previous seller by ${via}: ${match.venditore} (entered: ${match.created_at}, assigned: ${match.data_assegnazione})`);
      const seller = await fetchSellerDetails(match.venditore, lead.market, supabase);
      return seller ? { seller, dataAssegnazione: match.data_assegnazione } : null;
    }

    console.log('❌ No previous assignment found (after excluding: ' + excludedSellers.join(', ') + ')');
    return null;

  } catch (error) {
    console.error('Error in findPreviousSeller:', error);
    return null;
  }
}

// Helper function per fetch dei dettagli venditore
async function fetchSellerDetails(sellerName: string, market: string, supabase: any) {
  try {
    const { data: sellers, error } = await supabase
      .from('venditori')
      .select('id, nome, cognome, sheets_file_id, sheets_tab_name, market, stato')
      .eq('market', market)
      .eq('stato', 'attivo');
    
    if (error) {
      console.error('Error fetching seller details:', error);
      return null;
    }

    if (!sellers || sellers.length === 0) {
      console.log('No active sellers found in market');
      return null;
    }
    
    const cercato = nomeConfrontabile(sellerName);
    const targetSeller = sellers.find(
      (seller: any) => nomeConfrontabile(`${seller.nome} ${seller.cognome}`) === cercato,
    );
    
    if (targetSeller) {
      console.log(`✅ Matched seller details:`, targetSeller);
    } else {
      console.log(`❌ No matching seller found for name: ${sellerName}`);
      console.log('Available sellers:', sellers.map((s: any) => `${s.nome} ${s.cognome}`));
    }
    
    return targetSeller || null;
  } catch (error) {
    console.error('Error in fetchSellerDetails:', error);
    return null;
  }
}

// Funzione per registrare l'esecuzione dell'automazione
async function logAutomationExecution(
  lead: any, 
  automation: any, 
  seller: any | null, 
  result: string, 
  errorMessage: string | null, 
  executionSource: string,
  supabase: any
) {
  try {
    const logData = {
      automation_id: automation.id,
      automation_name: automation.nome,
      lead_id: lead.id,
      lead_email: lead.email,
      lead_name: `${lead.nome} ${lead.cognome || ''}`.trim(),
      trigger_field: automation.trigger_field,
      trigger_value: lead[automation.trigger_field] || '',
      action_taken: automation.action_type,
      seller_assigned: seller ? `${seller.nome} ${seller.cognome}` : null,
      seller_id: seller?.id || null,
      webhook_sent: automation.webhook_enabled && result === 'success',
      webhook_success: automation.webhook_enabled && result === 'success',
      result: result,
      error_message: errorMessage,
      execution_source: executionSource,
      market: lead.market
    };

    const { error: logError } = await supabase
      .from('automation_executions')
      .insert(logData);

    if (logError) {
      console.error('Error logging automation execution:', logError);
    } else {
      console.log('Automation execution logged successfully');
    }
  } catch (error) {
    console.error('Error in logAutomationExecution:', error);
  }
}

// Funzione per assegnare automaticamente il lead
async function assignLeadAutomatically(lead: any, seller: any, sheetsTabName: string | null, automation: any, supabase: any) {
  try {
    console.log(`Assigning lead ${lead.id} to seller ${seller.nome} ${seller.cognome} via automation: ${automation.nome}`);
    
    // Prepara updateData
    const updateData: any = {
      venditore: `${seller.nome} ${seller.cognome}`,
      stato: 'assegnato',
      updated_at: new Date().toISOString()
    };
    
    // CRITICO: Aggiorna data_assegnazione SOLO se:
    // 1. È la prima assegnazione (non c'era data_assegnazione prima)
    // 2. È un cambio di venditore (non stiamo riassegnando lo stesso entro lock period)
    if (seller.originalDataAssegnazione) {
      // Stiamo riassegnando lo stesso venditore entro il lock period
      // NON aggiornare data_assegnazione
      console.log(`Reassigning within lock period, preserving original data_assegnazione: ${seller.originalDataAssegnazione}`);
      updateData.data_assegnazione = seller.originalDataAssegnazione;
    } else {
      // Prima assegnazione o cambio venditore → aggiorna data_assegnazione
      console.log('New assignment or seller change, updating data_assegnazione to NOW()');
      updateData.data_assegnazione = new Date().toISOString();
    }
    
    // Usa campagna dall'automazione se fornita, altrimenti dal sheets_tab_name per retrocompatibilità
    if (automation.campagna) {
      updateData.campagna = automation.campagna;
    } else if (sheetsTabName) {
      updateData.campagna = sheetsTabName;
    }
    
    const { error: updateError } = await supabase
      .from('lead_generation')
      .update(updateData)
      .eq('id', lead.id);

    if (updateError) {
      console.error('Error updating lead:', updateError);
      await logAutomationExecution(lead, automation, seller, 'error', updateError.message, 'webhook', supabase);
      return;
    }

    // Record the automation assignment in assignment_history for tracking
    const { error: historyError } = await supabase
      .from('assignment_history')
      .insert({
        venditore: `${seller.nome} ${seller.cognome}`,
        leads_count: 1,
        campagna: updateData.campagna || null,
        fonti_escluse: null,
        fonti_incluse: null,
        exclude_from_included: null,
        source_mode: 'exclude',
        bypass_time_interval: false,
        market: lead.market,
        lead_ids: [lead.id],
        assignment_type: 'automation'
      });

    if (historyError) {
      console.error('Error recording automation assignment in history:', historyError);
      // Don't fail the assignment if history recording fails
    } else {
      console.log('Automation assignment recorded in history');
    }

    let webhookSuccess = true;
    let webhookErrorMsg: string | null = null;

    // Call webhook if automation has webhook enabled
    if (automation.webhook_enabled) {
      try {
        // Get webhook URL from system settings
        const { data: webhookSettings, error: webhookSettingsError } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'lead_assign_webhook_url')
          .single();

        if (webhookSettingsError || !webhookSettings?.value) {
          console.error('Webhook URL not configured in system settings');
          webhookSuccess = false;
          webhookErrorMsg = 'Webhook URL not configured';
        } else {
          const webhookUrl = webhookSettings.value;
          
          // Format payload as expected by lead-assign-webhook - INCLUDE ALL FIELDS
          const assignedAt = new Date().toISOString();
          const finalCampagna = automation.campagna || sheetsTabName || lead.campagna || '';

          // Lead storico: torna a un venditore che l'aveva gia in carico entro l'intervallo
          // impostato sulla regola. Serve a chi riceve il webhook per trattarlo diversamente
          // da un contatto nuovo, senza doversi ricostruire lo storico per conto suo.
          const primaAssegnazione: string | null = seller.originalDataAssegnazione || null;
          const leadStorico = !!primaAssegnazione;
          const giorniDaUltima = primaAssegnazione ? calculateDaysSince(primaAssegnazione) : null;
          
          const assignmentData = {
            venditore: seller.nome,
            venditore_cognome: seller.cognome,
            venditore_email: '',
            venditore_telefono: '',
            google_sheets_file_id: seller.sheets_file_id || '',
            google_sheets_tab_name: sheetsTabName || seller.sheets_tab_name || '',
            campagna: finalCampagna,
            market: lead.market,
            leads_count: 1,
            timestamp: assignedAt,
            lead_storico: leadStorico,
            intervallo_giorni: automation.lock_period_days ?? null,
            leads: [{
              id: lead.id,
              nome: lead.nome,
              cognome: lead.cognome || '',
              email: lead.email || '',
              telefono: lead.telefono || '',
              fonte: lead.fonte || '',
              lead_score: lead.lead_score || null,
              stato_del_lead: lead.stato_del_lead || '',
              stato: 'assegnato',
              ultima_fonte: lead.ultima_fonte || '',
              note: lead.note || '',
              market: lead.market || 'IT',
              campagna: finalCampagna,
              booked_call: lead.booked_call || 'NO',
              assignable: false,
              manually_not_assignable: lead.manually_not_assignable || false,
              venditore: `${seller.nome} ${seller.cognome}`,
              created_at: lead.created_at,
              updated_at: assignedAt,
              data_assegnazione: updateData.data_assegnazione,
              assigned_at: assignedAt,
              lead_storico: leadStorico,
              venditore_precedente: leadStorico ? `${seller.nome} ${seller.cognome}`.trim() : null,
              prima_assegnazione: primaAssegnazione,
              giorni_da_ultima_assegnazione: giorniDaUltima,
              intervallo_giorni: automation.lock_period_days ?? null
            }]
          };

          const { error: webhookCallError } = await supabase.functions.invoke('lead-assign-webhook', {
            body: {
              assignmentData,
              webhookUrl
            }
          });

          if (webhookCallError) {
            console.error('Error calling lead-assign-webhook:', webhookCallError);
            webhookSuccess = false;
            webhookErrorMsg = webhookCallError.message;
          } else {
            console.log('Successfully called lead-assign-webhook for automation assignment');
          }
        }
      } catch (error) {
        console.error('Error in webhook call:', error);
        webhookSuccess = false;
        webhookErrorMsg = (error as Error).message;
      }
    } else {
      console.log('Webhook disabled for automation:', automation.nome);
    }

    // Log successful execution
    await logAutomationExecution(lead, automation, seller, 'success', webhookErrorMsg, 'webhook', supabase);

    console.log(`Lead ${lead.id} successfully assigned via automation: ${automation.nome}`);
    
  } catch (error) {
    console.error('Error in assignLeadAutomatically:', error);
    await logAutomationExecution(lead, automation, seller, 'error', (error as Error).message, 'webhook', supabase);
  }
}

// Seleziona venditore da distribuzione (percentage o count) con state tracking atomico
// Rispetta cap individuali per slot (opzionali) e count_target per mode=count.
async function pickSellerFromDistribution(automation: any, supabase: any): Promise<any | null> {
  try {
    const config: any[] = automation.distribution_config || [];
    if (config.length === 0) return null;

    const mode: 'percentage' | 'count' = automation.distribution_mode || 'percentage';

    const sellerIds = config.map((s: any) => s.venditore_id);
    const { data: sellers } = await supabase
      .from('venditori')
      .select('id, nome, cognome, email, telefono, sheets_file_id, sheets_tab_name, stato')
      .in('id', sellerIds);

    const activeSellers = (sellers || []).filter((s: any) => s.stato === 'attivo');
    if (activeSellers.length === 0) {
      console.log('[distribution] No active sellers in slots');
      return null;
    }

    // Scelta e conteggio devono essere un'operazione sola.
    //
    // Prima si guardavano i contatori, si sceglieva, e solo dopo si scriveva: con piu lead in
    // arrivo insieme tutti leggevano gli stessi numeri, quindi tutti vedevano posto libero e i
    // tetti venivano sforati — su cento lead con sessanta posti ne passavano settantadue.
    //
    // Ora a ogni tentativo si rileggono i contatori, si sceglie su quelli e si scrive con il
    // vincolo che la revisione a database sia ancora quella letta. Se nel frattempo ha scritto
    // qualcun altro la scrittura non passa, si ricomincia da capo con i numeri aggiornati: il
    // tetto viene verificato sempre sugli stessi dati con cui viene incrementato.
    for (let tentativo = 0; tentativo < 25; tentativo++) {
      const { data: attuale } = await supabase
        .from('lead_assignment_automations')
        .select('distribution_state')
        .eq('id', automation.id)
        .maybeSingle();

      const stato: any = attuale?.distribution_state || {};
      const revisione: number | null = Number.isFinite(Number(stato.rev)) ? Number(stato.rev) : null;
      const counts: Record<string, number> = stato.count_assigned || {};

      const eligible = slotEleggibili(config, counts, activeSellers, mode);
      if (eligible.length === 0) {
        console.log('[distribution] Nessuno puo ricevere: tetti o quote esauriti');
        return null;
      }

      const scelto = mode === 'count'
        ? (scegliSlot(eligible, Math.random(), true) ?? eligible[0])
        : scegliSlot(eligible, Math.random());
      if (!scelto) {
        console.log('[distribution] Pesi a zero, impossibile scegliere');
        return null;
      }

      const id = scelto.slot.venditore_id;
      const nuoviCounts = { ...counts, [id]: (counts[id] || 0) + 1 };
      const nuovoStato = {
        count_assigned: nuoviCounts,
        total_assigned: (stato.total_assigned || 0) + 1,
        last_updated: new Date().toISOString(),
        rev: (revisione ?? 0) + 1,
      };

      let q = supabase
        .from('lead_assignment_automations')
        .update({ distribution_state: nuovoStato })
        .eq('id', automation.id);
      q = revisione === null
        ? q.is('distribution_state->>rev', null)
        : q.eq('distribution_state->>rev', String(revisione));

      const { data: righe } = await q.select('id');
      if (righe && righe.length > 0) {
        console.log(`[distribution] pick=${scelto.seller.nome} ${scelto.seller.cognome} gruppo=${gruppoDi(scelto.slot) || '-'} tentativi=${tentativo + 1}`);
        return scelto.seller;
      }

      // Collisione: attesa breve e casuale, poi si rilegge tutto da capo.
      await new Promise((r) => setTimeout(r, 10 + Math.random() * 60));
    }

    console.error(`[distribution] impossibile assegnare dopo 25 tentativi su ${automation.id}: troppa contesa`);
    return null;
  } catch (error) {
    console.error('[distribution] Error in pickSellerFromDistribution:', error);
    return null;
  }
}

async function incrementDistributionState(
  automationId: string,
  venditoreId: string,
  _counts: Record<string, number>,
  _total: number,
  supabase: any
) {
  // Leggere lo stato, sommare uno e riscriverlo funziona con un lead alla volta, ma con piu
  // lead in arrivo insieme due esecuzioni leggono lo stesso numero e la seconda sovrascrive la
  // prima: sotto carico i contatori restavano indietro e i tetti non scattavano mai.
  //
  // Ogni scrittura porta un numero di revisione e l'aggiornamento vale solo se la revisione a
  // database e ancora quella letta. Se nel frattempo ha scritto qualcun altro non passa nessuna
  // riga, si rilegge e si riprova: nessun incremento va perso.
  for (let tentativo = 0; tentativo < 25; tentativo++) {
    const { data: attuale } = await supabase
      .from('lead_assignment_automations')
      .select('distribution_state')
      .eq('id', automationId)
      .maybeSingle()

    const stato: any = attuale?.distribution_state || {}
    const revisione: number | null = Number.isFinite(Number(stato.rev)) ? Number(stato.rev) : null
    const counts: Record<string, number> = { ...(stato.count_assigned || {}) }
    counts[venditoreId] = (counts[venditoreId] || 0) + 1

    const nuovoStato = {
      count_assigned: counts,
      total_assigned: (stato.total_assigned || 0) + 1,
      last_updated: new Date().toISOString(),
      rev: (revisione ?? 0) + 1,
    }

    let q = supabase
      .from('lead_assignment_automations')
      .update({ distribution_state: nuovoStato })
      .eq('id', automationId)
    q = revisione === null
      ? q.is('distribution_state->>rev', null)
      : q.eq('distribution_state->>rev', String(revisione))

    const { data: righe } = await q.select('id')
    if (righe && righe.length > 0) return

    // Collisione: attesa breve e crescente, con un po' di casualita per non ripartire insieme.
    await new Promise((r) => setTimeout(r, 10 + Math.random() * 60))
  }
  console.error(`[distribution] contatore non aggiornato dopo 25 tentativi: ${automationId} / ${venditoreId}`)
}
