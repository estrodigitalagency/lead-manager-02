# Lavorare su questo progetto

Nota di orientamento per chi apre il repository — persona o assistente — prima di toccare
qualcosa. Il dettaglio tecnico sta in [DOCUMENTAZIONE.md](DOCUMENTAZIONE.md).

## Com'è fatto

React + TypeScript + Vite, Supabase (Postgres + Edge Functions in Deno), shadcn/ui, Tailwind.
Pubblicato su Vercel a ogni push su `main`. Le Edge Functions si pubblicano a parte:

```bash
npx supabase functions deploy <nome> --project-ref <ref> --no-verify-jwt
```

## Prima di cominciare

```bash
cp .env.example .env     # e riempi i valori
npm install
npm run dev
```

Controlli prima di ogni commit — non c'è una suite di test automatici:

```bash
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

## Quattro cose da sapere subito

**Non esiste un ambiente di prova.** Il database è quello vero. Le prove si isolano per fonte
inventata e si ripuliscono; il capitolo 11 della documentazione spiega come.

**L'app scrive con la chiave anon.** Diverse tabelle sono chiuse dalla RLS: se una scrittura
fallisce senza motivo apparente, quasi sempre è quello. Il rimedio usato finora è spostare il dato
in `system_settings` o passare da una Edge Function con la service role.

**Non si possono aggiungere colonne.** Non c'è accesso DDL da qui: le migrazioni le applica una
persona dalla console Supabase. Per questo diverse configurazioni vivono in `system_settings`
invece che in colonne dedicate.

**La logica di assegnazione sta in un posto solo.** `supabase/functions/_shared/regole.ts` è
importato sia dal webhook che assegna davvero sia dalla prova a vuoto. Se una condizione va
cambiata, va cambiata lì: riscriverla altrove significa vederle divergere, ed è già successo.

## Come sono scritte le cose

I commenti spiegano **perché**, non cosa fa la riga sotto — in particolare dove il codice sembra
più contorto del necessario, che di solito è il segno di un caso reale già incontrato.

L'interfaccia è in italiano, e i messaggi dicono cosa è successo e cosa fare: «Nel gruppo Closer le
percentuali sommano a 76% invece di 100», non «Errore di validazione».

Nomi di variabili e funzioni in italiano dove descrivono il dominio (`slotEleggibili`,
`nomeConfrontabile`, `entroLockPeriod`), in inglese dove sono tecnici.

## Dove mettere le mani

| Cosa | Dove |
|---|---|
| Assegnazione dei lead | `supabase/functions/lead-generation-webhook/`, `_shared/regole.ts` |
| Matrice del lancio | `supabase/functions/analytics-lancio/`, `src/pages/Lanci.tsx` |
| Configurazione lanci | `src/components/settings/LancioConfigDialog.tsx` |
| Governo quotidiano | `src/components/lanci/TabDistribuzione.tsx` |
| Redirect WhatsApp | `src/pages/WhatsAppRedirect.tsx`, `supabase/functions/wa-click/` |
| Verifica configurazione | `supabase/functions/lancio-test/` |

## Operazioni ricorrenti

Con le sole variabili del `.env` (chiave anon). Le tabelle dei lead, delle automazioni e delle
impostazioni sono raggiungibili così; serve la service role solo per `whatsapp_click_logs`.

```bash
set -a && source .env && set +a
API="$VITE_SUPABASE_URL/rest/v1"
H=(-H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" -H "Authorization: Bearer $VITE_SUPABASE_PUBLISHABLE_KEY")
```

**Cercare un lead** e capire dov'è finito:

```bash
curl -s "$API/lead_generation?select=created_at,email,ultima_fonte,campagna,venditore,stato,assignable\
&email=ilike.mario@esempio.it" "${H[@]}"
```

**Chi l'ha assegnato** — la riga compare solo se è passato da un'automazione; `counted_preassigned`
significa che è arrivato già assegnato da un flusso esterno:

```bash
curl -s "$API/automation_executions?select=executed_at,automation_name,seller_assigned,result,error_message\
&lead_email=eq.mario@esempio.it&order=executed_at.desc" "${H[@]}"
```

**Stato delle regole** — quote, tetti, contatori:

```bash
curl -s "$API/lead_assignment_automations?select=nome,attivo,priority,condition_value,\
distribution_mode,distribution_config,distribution_state&market=eq.IT&order=priority" "${H[@]}"
```

**Verificare un lancio senza scrivere niente** — venditori, tab dei fogli, provenienza, conflitti,
link WhatsApp, più la simulazione di un lead con la fonte indicata:

```bash
curl -s -G "$VITE_SUPABASE_URL/functions/v1/lancio-test" \
  --data-urlencode "lancio=workshop_set26" --data-urlencode "market=IT" \
  --data-urlencode "fonte=workshop_set26_ads" \
  -H "Authorization: Bearer $VITE_SUPABASE_PUBLISHABLE_KEY"
```

**Far entrare un lead di prova** dal vero webhook — usa una fonte inventata e cancellalo dopo:

```bash
curl -s -X POST "$VITE_SUPABASE_URL/functions/v1/lead-generation-webhook" \
  -H "Authorization: Bearer $VITE_SUPABASE_PUBLISHABLE_KEY" -H "Content-Type: application/json" \
  -d '{"nome":"Prova","email":"p1@prova.invalid","fonte":"__prova_zzz__",
       "ultima_fonte":"__prova_zzz__","market":"IT"}'

curl -s -X DELETE "$API/lead_generation?ultima_fonte=eq.__prova_zzz__" "${H[@]}"
```

**Log di una Edge Function** — il posto dove guardare quando un'assegnazione non torna:

```bash
npx supabase functions logs lead-generation-webhook --project-ref <ref>
```

**Ricalcolare la matrice** saltando la cache: aggiungi `&nocache=1` alla chiamata di
`analytics-lancio`. A freddo impiega una decina di secondi perché rilegge tutti i fogli.
