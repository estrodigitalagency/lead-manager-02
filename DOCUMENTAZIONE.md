# Lead Manager — Documentazione tecnica completa

> App interna di **lead management** a due mercati (🇮🇹 IT / 🇪🇸 ES) per Booster Academy.
> Gestisce: acquisizione lead, distribuzione/assegnazione ai venditori, prenotazione call (Calendly),
> chiusura vendite, reportistica (lead + call), classifica pubblica venditori e redirect WhatsApp.

**Indice**
1. [Stack & architettura](#1-stack--architettura)
2. [Routing, pagine, autenticazione](#2-routing-pagine-autenticazione)
3. [Modello dati (DB Supabase)](#3-modello-dati-db-supabase)
4. [Edge Functions (backend Deno)](#4-edge-functions-backend-deno)
5. [Flussi end-to-end](#5-flussi-end-to-end)
6. [Inventario componenti frontend](#6-inventario-componenti-frontend)
7. [Librerie, hook, servizi](#7-librerie-hook-servizi)
8. [Configurazione, segreti, deploy](#8-configurazione-segreti-deploy)
9. [Fragilità note & debiti tecnici](#9-fragilità-note--debiti-tecnici)
10. [Lanci — il sottosistema completo](#10-lanci--il-sottosistema-completo)
11. [Come provare senza rompere la produzione](#11-come-provare-senza-rompere-la-produzione)

---

## 1. Stack & architettura

| Layer | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript, Vite (SPA), React Router, TanStack Query, shadcn/ui + Tailwind, framer-motion, Recharts |
| Backend | Supabase Postgres 15 + Edge Functions (Deno) |
| Hosting FE | Vercel (framework `vite`, output `dist`, SPA rewrite → `index.html`) |
| Hosting BE | Supabase (progetto `btcwmuyemmkiteqlopce`), funzioni deployate separatamente (non da Vercel) |
| Automazione esterna | Make.com (invia webhook in ingresso e riceve i fan-out di assegnazione) |
| Integrazioni | Google Sheets (classifica + valore call via OAuth), Calendly (booking via webhook), WhatsApp (deep-link `wa.me`, nessuna API) |

**Provider tree** (`src/App.tsx`, esterno→interno):
`QueryClientProvider` → `AuthProvider` → `MarketProvider` → `LanguageProvider` → `LeadSyncProvider` → `TooltipProvider` → `<Toaster/>` (sonner) → `BrowserRouter` → `AppContent`.

**Dimensione mercato**: `market` (`'IT'|'ES'`, default `IT`, `CHECK` sul DB) è presente su quasi tutte le tabelle operative. Sul frontend è gestito da `MarketContext` (persistito in `localStorage['selectedMarket']`) e propagato via `useMarket()`. **Non c'è vera detection**: gli edge riducono a `payload.market || 'IT'`.

---

## 2. Routing, pagine, autenticazione

### Autenticazione (gate locale, NON Supabase Auth)
`src/contexts/AuthContext.tsx`:
- Password **hardcoded in chiaro**: `CORRECT_PASSWORD = "LeadGen2025@"`.
- Stato salvato in `localStorage['leadgen_auth']` con `timestamp`; validità **30 giorni**.
- Nessuna sessione Supabase → **tutte le query dal browser usano la anon key** (mai un utente autenticato lato DB). Conseguenza pratica: le tabelle devono avere RLS aperta all'anon (vedi §3).
- `ProtectedRoute` (`App.tsx`): se non autenticato e la route non è pubblica → redirect `window.location.href='/login'`.

### Rotte
| Path | Componente | Gate |
|---|---|---|
| `/` | `Index` (dashboard + assegnazione bulk) | ✅ protetta |
| `/database` | `Database` (Lead / Call / Lavorati) | ✅ |
| `/history` | `History` (storico assegnazioni) | ✅ |
| `/reports` | `Reports` (tab Lead / Call) | ✅ |
| `/settings` | `Settings` (hub configurazione) | ✅ |
| `/lead-assignment` | `LeadAssignment` (assegnazione singola) | ⚠️ standalone, **non gated** (special-case) |
| `/login` | `Login` | pubblica |
| `/wa`, `/wa/:slug` | `WhatsAppRedirect` | pubblica |
| `/ranking` | `Ranking` (classifica pubblica) | pubblica |

`NotFound.tsx` esiste ma **non è registrato** (nessuna catch-all `path="*"`) → dead code.

### Pagine (sintesi)
- **Index** — `RealTimeStatsSection` (stat live da `LeadSyncContext`) + `LeadAssignmentWithExclusions` (UI assegnazione massiva).
- **Database** — 3 tab: `lead_generation`, `booked_call`, `lead_lavorati`. Paginazione server per i lead; delete diretto via `supabase.from(table).delete()`. Dialog add/import. Pulsanti "Verifica" (assegnabilità) e "Aggiorna".
- **History** — `AssignmentHistory` + pulsante "Ricostruisci Storico" → edge `rebuild-assignment-history`.
- **Reports** — tab **Lead** (`ReportFilters`, `ReportMetrics`, `LeadsBySourceChart`, `LeadsBySalespersonChart`, `ReportLeadsList`) e tab **Call** (`CallWeekly`, `ReportValoreCall`). Metriche da `getReportMetrics` (`reportsService`). Export PNG/PDF del tab Lead.
- **Settings** — nav verticale in 4 sezioni: **Team & Campagne** (venditori, campagne, ranking/valore call), **Regole di assegnazione** (automazioni, round-robin fix, finestra attribuzione), **Integrazioni** (webhook, WhatsApp, mapping/raggruppamento fonti), **Sistema** (database).
- **LeadAssignment** — assegnazione singola: aggiorna `lead_generation`, inserisce `assignment_history` (`manual`), invoca `lead-assign-webhook`, incrementa `venditori.lead_attuali`.
- **WhatsAppRedirect** — vedi §5.5.
- **Ranking** — vedi §5.4.

### Navigazione & contesti
- `PersistentNavigation` — barra unica (Home, Database, Report, Cronologia, Impostazioni). Desktop mostra `MarketSelector`; mobile mostra `LanguageSelector`.
- `MarketContext` / `LanguageContext` — `'IT'|'ES'`, persistiti in localStorage.
- `LeadSyncContext` — stat live `{total, assignable, assigned, booked}`; sottoscrive realtime `postgres_changes` su `lead_generation` e `booked_call` (debounce 1s); ri-verifica assegnabilità (cooldown 5 min).

---

## 3. Modello dati (DB Supabase)

31 tabelle nello schema `public`. Convenzioni: `id` = uuid PK (`gen_random_uuid()`), timestamp `now()`, identificatori misti IT/EN (`stato`=status, `fonte`=source, `venditore`=sales, `attivo`=active, `data_*`=date).

Due hub dominanti: **`lead_generation`** e **`venditori`**. Molti collegamenti a venditore sono **soft link per nome stringa** (non FK).

### 3.1 Tabelle core

**`lead_generation`** — record lead master (una riga per lead).
Colonne chiave: `nome`(NOT NULL), `cognome`, `email`, `telefono`, `market`, `fonte` (fonte originale), `ultima_fonte` (ultimo touch, guida le automazioni duplicato-fonte-diversa), `fonte_vendita` (fonte al momento della vendita), `campagna`, `venditore` (nome stringa), `stato` (pipeline), `stato_del_lead` (stato lifecycle/qualifica, coesiste con `stato`), `lead_score`, `assignable`, `manually_not_assignable` (override operatore), `booked_call` (`'SI'|'NO'`, denormalizzato), `data_assegnazione`, `data_chiusura`, `vendita_chiusa`, `importo_vendita`, `percorso_venduto`, `note_vendita`, `created_at`, `updated_at`.
Semantica date: `created_at`=ingresso, `data_assegnazione`=routing a venditore, `data_chiusura`=chiusura vendita.

**`booked_call`** — call prenotate (create SOLO da `calendly-webhook`).
`lead_id` → FK `lead_generation.id`; snapshot contatto `nome/cognome/email/telefono`; `market`; `fonte`; `venditore`; `stato` (⚠️ **mai aggiornato** — resta sempre `programmata`); `scheduled_at` (NOT NULL, ≈ timestamp prenotazione/booking); `data_call` (**data reale della call**, usata dal report CallWeekly); `created_at`/`updated_at`.
> Distinzione critica: `scheduled_at` ≈ `created_at` (quando prenotata), `data_call` = data slot/call. Il report Call conta per `data_call`.

**`venditori`** — venditori.
`nome`(NOT NULL), `cognome`, `email`, `telefono` (usato per WhatsApp), `market`, `is_sales` (gate distribuzione/ranking), `lead_capacity` (cap, **non applicato da nessuna parte**), `lead_attuali` (conteggio corrente, mantenuto da trigger DB + incrementi manuali → rischio doppio conteggio), `delivery_method` (`'sheets'|'webhook'`), `sheets_file_id` + `sheets_tab_name` (foglio Google del venditore), `webhook_url`, `stato`, timestamps.

### 3.2 Motore assegnazione
- **`lead_assignments`** — join relazionale lead↔venditore (`lead_id` FK, `venditore_id` FK, `stato`, `assigned_at`).
- **`lead_assignment_automations`** — regole di auto-routing. `nome`, `attivo`, `market`, `priority`, `condition_type` (enum `contains|equals|starts_with|ends_with|not_contains`), `condition_value[]`, `trigger_field`, `trigger_when` (default `duplicate_different_source`), `trigger_sources[]`, `action_type` (enum `assign_to_seller|assign_to_previous_seller|weighted_distribution`), `target_seller_id` FK, `use_previous_seller_first`, `excluded_sellers[]`, `distribution_*` (config/mode/state/cap per distribuzione pesata), `lock_period_days`, `campagna`, `webhook_enabled`.
- **`automation_executions`** — audit run automazioni (automation_id FK, lead_id FK, esito, seller, telemetria webhook, error_message).
- **`assignment_history`** — log batch assegnazioni (`venditore`, `leads_count`, `lead_ids[]`, `assignment_type` = `manual|automation|bulk_round_robin_fix`, filtri fonte, `source_mode`).
- **`lead_actions_log`** — audit azioni manuali (`action_type`, `lead_ids[]`, `previous_venditore`→`new_venditore`, `performed_by`, `notes`).
- **`lead_lavorati`** — lead "lavorati" (esito, obiezioni, `data_contatto`, `data_call`).

### 3.3 Cattura booking / funnel
- **`booking_clicks`** / **`booking_clicks_evergreen`** / **`booking_clicks_lancio`** — click/optin partizionati per tipo funnel (main / evergreen / lancio).
- **`conferma_partecipazione_webinar`** — conferme partecipazione webinar.
- **`forms`** — definizioni form configurabili (titolo, disclaimer, `webhook_url`, `calendly_url`, pixel: GA/GTM/Hyros/Meta). Parent di **`form_events`** (view/start/submit/booking).
- **`landing_pages`** — landing configurabili (CTA, tracking). Parent di **`landing_page_events`** (view/click).

### 3.4 Calendly & mapping fonti
- **`venditori_calendly`** — mapping venditore↔URL Calendly (`nome_venditore`, `calendly_url`, `skip_webinar`).
- **`calendly_event_types`** — catalogo event-type Calendly (uri, slug, duration, pooling, members).
- **`fonte_mapping`** — `fonte_calendario` ↔ `fonte_lead` (normalizza nomi fonte tra sistemi; usato nei report lead).
- **`fonte_calendar_conditions`** — regole fonte → URL Calendly (`priorita`, `attivo`).
- **`database_fonti`** — registro fonti.
- **`database_campagne`** — campagne + regole (`fonti_incluse/escluse[]`, `source_mode`, `solo_lead_nuovi_*`, `bypass_time_interval`).

### 3.5 WhatsApp
- **`whatsapp_templates`** — template messaggi (`slug`, `messaggio_template` con `{{placeholder}}`, `market`, `attivo`, `click_count`, `fallback_phone/message`).
- **`whatsapp_click_logs`** — log click redirect (`status` ok/error/fallback, `error_reason`, lead/venditore snapshot, referrer, user_agent).

### 3.6 Impostazioni, utenti, monitoraggio
- **`system_settings`** — key/value globale (`lead_assign_webhook_url`, `booking_attribution_window_days`, `days_before_assignable`, `duplicate_check_*`, `call_fonte_groups`, `call_report_filters_<market>`, …).
- **`ranking_settings`** — key/value classifica (PK = `key`, niente id): `sheet_url`, `max_rank`, `info_box`, `hof_images`, `valore_call_buckets`, `valore_call_cache_<market>`.
- **`call_report_filters`** — ⚠️ tabella con RLS "authenticated" → **non usata** dall'app (i filtri salvati vivono ora in `system_settings`).
- **`profiles`**, **`user_roles`** (enum `app_role` = `admin|user`) — RBAC (helper `has_role`, `get_current_user_role`), non usati dal gate password.
- **`uptime_monitoring`** — health check endpoint.

### 3.7 Funzioni Postgres / Enum
Funzioni: `check_leads_assignability()`, `forms_stats(from,to)`, `landing_pages_stats(from,to)`, `get_current_user_role()`, `has_role()`, `schedule_sync_job()`/`unschedule_sync_job()` (pg_cron), `show_limit()`/`show_trgm()` (pg_trgm).
Enum: `app_role`, `automation_action_type`, `automation_condition_type`.

### 3.8 Trigger & indici
- Trigger: `update_lead_booked_call()` (su insert booked_call copia venditore ai lead in finestra), `update_data_assegnazione()`, `sync_venditore_lead_count()` (mantiene `lead_attuali`), `update_booking_clicks_on_call()` (attribuzione 60 min), `update_timestamp_column()`.
- Indici: pacchetto perf (assignable/venditore/booked_call/created_at/email/telefono + compositi), indici `market` su 7 tabelle, **pg_trgm** GIN su `email`/`telefono` (`20260727_speed_indexes_lead_generation.sql`, ~3700x su `ilike`) + `(market, created_at DESC)` parziale.
- **RLS**: storia a zig-zag — disabilitata (2025-08-27), riabilitata (2025-11-03) poi rese policy **permissive "Allow all" / anon CRUD**. Stato attuale: **RLS attiva ma aperta all'anon** sulla maggior parte delle tabelle (perché il frontend usa la anon key).

---

## 4. Edge Functions (backend Deno)

`supabase/config.toml`: progetto `btcwmuyemmkiteqlopce`, `max_rows=1000`, **`verify_jwt=false` su tutte le funzioni** (pubblicamente invocabili, sicurezza per oscurità URL). Tutte usano `SUPABASE_SERVICE_ROLE_KEY` (bypassano RLS). Solo `valore-call` usa i segreti Google OAuth.

| Funzione | Scopo | Scrive |
|---|---|---|
| **lead-generation-webhook** | Intake lead + motore automazioni sincrono | insert `lead_generation`, `assignment_history`(automation), `automation_executions`; update `distribution_state` |
| **lead-assign-webhook** | Relay puro verso webhook esterno (Make) | nessuna tabella |
| **calendly-webhook** | Ricezione booking Calendly | insert `booked_call`; update lead → `booked_call='SI'`, `stato='prenotato'` |
| **sale-webhook** | Registra vendita chiusa | update `lead_generation` (vendita_chiusa, importo, percorso, fonte_vendita) |
| **lead-check** | Riconciliazione assegnabilità vs booking (batch/cron) | update `lead_generation` |
| **valore-call** | Analytics valore call/lead per fonte da Google Sheets | upsert cache in `ranking_settings` |
| **get-round-robin-analysis** | Analisi lead assegnati al placeholder "Round Robin" | read-only |
| **process-round-robin-leads** | Riassegna quei lead al venditore precedente | update lead, `lead_actions_log`, `assignment_history` |
| **process-existing-automations** | Backfill automazioni su lead già esistenti non assegnati | update lead, `automation_executions` |
| **test-automation** | Dry-run valutazione automazioni su un lead | read-only |
| **rebuild-assignment-history** | Ricostruisce `assignment_history` dagli assegnati correnti | insert `assignment_history` |
| **analytics-lancio** | Matrice del lancio: legge i fogli dei venditori e il DB, con cache | upsert cache in `ranking_settings` |
| **lancio-test** | Prova a vuoto della configurazione di un lancio + simulazione di un lead | nessuna scrittura |
| **contatori-distribuzione** | Azzera i contatori o li sposta fra venditori dopo una riassegnazione | update `distribution_state` |
| **wa-click** | Registra e legge i click sui link WhatsApp (la tabella è chiusa all'anon key) | insert/delete `whatsapp_click_logs` |
| **sheet-tabs**, **sheet-peek** | Utilità di ispezione dei fogli (elenco tab, lettura di un intervallo) | nessuna scrittura |

> `_shared/regole.ts` non è una funzione ma un modulo condiviso: contiene le regole di
> assegnazione senza accesso al database (condizioni, esclusioni, lock period, slot ancora
> capienti, sorteggio a gruppi). Lo importano sia il webhook che assegna davvero sia la prova a
> vuoto: se il test riscrivesse le stesse condizioni per conto suo, divergerebbero.

### valore-call (dettaglio — usato dalla classifica e dal report)
- Input: `?market=IT` (default), `?nocache=1`.
- Legge tab **`Analytics Fonte!A2:AD`** del foglio di ogni venditore `is_sales=true, stato='attivo'` via Google OAuth (refresh token).
- Colonne: `D`=Fatturato, `E`=Incassato, `T(19)`=Call fatte, `X(23)`=Call nette, `Y(24)`=Chiusure, `AD(29)`=Valore Lead. Data in `B`, provenienza in `C`.
- **Formula**: `valore_call = Σ Fatturato / Σ Call fatte` sui **mesi utili** (ultimi `USE_MONTHS=3` mesi con `call fatte>0`, su 12 mesi storico). `cr = Σ Chiusure / Σ Call nette * 100`.
- **Bucket** (config `ranking_settings.valore_call_buckets`): `3sfere`, `setter_ig` (typeform/setter/setter ig), `setter_new`, `vsl` (`vsl*`/`guida*`/mail/email/funnel video/podcast), `outbound`. `ignore`: totale/rischedulate/upsell/altro. Match con wildcard prefisso `*`.
- Concorrenza 3 + retry backoff sui 429/5xx. **Cache 10 min** in `ranking_settings.valore_call_cache_<market>`.
- Output: `{data[bucket], per_seller[], unmapped, errors, generated_at, cached}`.
- ✅ **Verificato corretto** (ricalcolo indipendente dai fogli grezzi su 20 venditori: valore_call/n_call/fatturato/incassato identici; unica differenza 0.1 sul CR per arrotondamento `Math.round` vs banker's rounding — l'edge è quello corretto).

---

## 5. Flussi end-to-end

### 5.1 Intake lead
POST esterno (Make/optin) → `lead-generation-webhook`:
1. Insert `lead_generation` (`booked_call='NO'`, `assignable` default false, `ultima_fonte = payload || fonte`).
2. Se non pre-assegnato → `checkAndApplyAutomations` **sincrono**: carica `lead_assignment_automations` attive per market ordinate per `priority`; valuta trigger (`new_lead` | `duplicate_different_source`) + condizione; applica azione (`assign_to_seller` | `weighted_distribution` con cap+state | `assign_to_previous_seller`).
3. Su match: update lead (`stato='assegnato'`), insert `assignment_history`(automation), se `webhook_enabled` invoca `lead-assign-webhook`, log `automation_executions`.

### 5.2 Assegnazione (3 percorsi)
- **A. Manuale (client, sincrono)** — `leadAssignmentService.assignLeadsWithExclusions`: fetch candidati (`venditore IS NULL`, `booked_call='NO'`, `manually_not_assignable=false`, filtro fonti + status), batch update, invoca `lead-assign-webhook`, insert `assignment_history`(manual). Contatore `lead_attuali` incrementato sia da trigger DB sia manualmente in UI → **rischio drift**. Nessun cap `lead_capacity`.
- **B. lead-assign-webhook** — relay puro verso `webhook_url` esterno (Make → scrive nei fogli Google dei venditori). Nessun DB.
- **C. "Round Robin" fix** — "Round Robin" è un **nome placeholder**, non una vera rotazione. `process-round-robin-leads` trova il venditore precedente (match email poi telefono) e riassegna.
> `findPreviousSeller` più ricca è nell'intake (order by `created_at DESC`, `ilike` email/telefono, accelerata da pg_trgm). Finestra attribuzione = `system_settings.booking_attribution_window_days`.

### 5.3 Booking call
`calendly-webhook` (unico creatore di `booked_call`):
1. Insert `booked_call` (`data_call = payload.data_call ?? scheduled_at ?? now`; **nessuno `stato` scritto**).
2. Mapping `venditori_calendly` per `calendly_url` → aggiorna `venditore` della riga.
3. Match lead in finestra attribuzione (default **7** qui, ma UI mostra 30 → incoerenza) → update lead: `booked_call='SI'`, `assignable=false`, `stato='prenotato'`, `venditore`.

### 5.4 Ranking (doppia fonte)
- **Fonte 1 (CSV pubblico)** `lib/ranking/googleSheets.fetchSheetData`: tab **`Ranking_Data`** via gviz CSV (no auth). Colonne: nome(0), fatturato(2), incassato(4), cr(6), valoreCall(8). Nomi **brevi/abbreviati** (es. "Rocco A.", "Desiree M.").
- **Fonte 2 (OAuth)** edge `valore-call`: tab `Analytics Fonte` per venditore. Nomi **completi** (es. "Rocco Alicchio").
- `Ranking.tsx` fa **un solo** fetch `valore-call?market=IT` (anon JWT hardcoded) in `vcData`, passato a ogni tab. Tab: 4 metriche (ognuna con `FontePodium` per fonte) + Hall of Fame + Info.
- **Link individuali `?m=CODE`**: `generateMemberCode` (djb2→base36). `FontePodium` risolve il nome del sales con matcher robusto (accent-fold + iniziali + bijezione token) per riconciliare nomi brevi vs completi, e mostra "Sei N° su M".

### 5.5 WhatsApp (`/wa`, `/wa/:slug`)
Deep-link `wa.me` (nessuna API, nessun invio server):
1. Legge parametri da query (fallback da `document.referrer`); normalizza telefono per market (39/34).
2. Se `:slug` → `whatsapp_templates`.
3. Trova lead più recente assegnato (email `ilike`, poi suffisso telefono) → risolve telefono venditore da `venditori`.
4. Sostituisce `{{placeholder}}` → `window.location.replace('https://wa.me/<phone>?text=...')`.
5. Fallback a `fallback_phone` del template se qualcosa manca.
6. Ogni tentativo loggato in `whatsapp_click_logs` (status ok/error/fallback); `click_count` incrementato (non atomico).
> Solo il **click** è tracciabile (arrivo su `/wa`); la "view" no (sta sulla landing esterna → servirebbe un pixel). Nessuna consegna/lettura (impossibile con `wa.me`).

### 5.6 Vendita
`sale-webhook`: match lead da `booked_call` più recente (email/telefono) → update `lead_generation` (`vendita_chiusa`, `data_chiusura`, `importo_vendita`, `percorso_venduto`, `fonte_vendita`).

---

## 6. Inventario componenti frontend

### ranking/
`Podium` (podio top-3, MoneyBurst su 1°), `LeaderboardTable` (righe con badge posizione a cerchio, highlight "tu"), `FontePodium` (blocchi per fonte da `valore-call`, matcher nomi, "Sei N° su M", notice no-call), `FonteRankingBlocks` (griglia compatta alternativa), `HallOfFame` (immagini Google Drive), `InfoBox`, `FloatingMoney`/`MoneyBurst` (animazioni), `PersonalStats` (rank personale su 4 metriche).

### reports/
`CallWeekly` (call schedulate per `data_call`, pivot sales×fonte, bucket giorno/settimana adattivo, sparkline multi-serie SVG, dialog Recharts, filtri salvati, raggruppamento fonti), `ReportValoreCall` (valore call per fonte da `valore-call`, tabella sortabile, trend/delta, medie), `ReportFilters` + `ReportSourceFilters` (barra filtri lead), `ReportLeadsList` (lista lead + CSV), `ReportMetrics` (4 KPI), `ExportReportButton` (PNG/PDF via html2canvas+jspdf).

### settings/
`FonteMappingSettings` (fonte_lead↔fonte_calendario), `CallFonteGroupSettings` (regole raggruppamento fonti → `system_settings.call_fonte_groups`), `AttributionWindowSettings` (finestre in `system_settings`), `RoundRobinFixSection` (edge round-robin), `RankingSettingsSection` (sheet_url/max_rank/info/HoF), `ValoreCallView` (editor bucket + vista valore call), `WhatsAppTemplatesSection`, `WebhookSettings` + `WebhookTestSection` + `WebhookDocumentationSection`, `DatabaseSection` + dialog `DatabaseImportDialog`/`DatabaseAddRecordDialog`/`DatabaseAddLavoratiDialog` (+ `import/CSVFileUploader`, `CSVHeaderMapper`).

### database/
`LeadsTable` (paginazione server + market, sorting, colonne visibili), `LeadLavoratiTable`, `BookingsTable`, `DatabaseTableContainer` (wrapper con ricerca/filtri/bulk/export/import/assegnazione), `LeadDetailsDialog` + `CustomerJourneyTimeline`, `DatabaseAdvancedFilters`, `BulkActions`, `ManualAssignmentDialog`, `ReplayAssignmentDialog`, `AssignedLeadsDialog`, `MultiSearchDialog` + `SearchResultsDialog`, `FonteDisplay`, sotto-componenti tabella (`LeadTableHeader/Row/Controls`, `SortableTableHead`, `ColumnVisibilityControls`, `PaginationControls`, `SearchInput`) e varianti mobile.

### automation/
`AutomationSettings` (container), `AutomationList` (drag reorder), `AutomationForm` (zod, embed `DistributionEditor`), `AutomationExecutionHistory`, `AutomationTestPanel`, `DistributionEditor`.

### campaigns/
`CampaignsList`, `AddCampaignForm`, `CampaignSourcesConfig`, `CampaignBypassConfig`, `CampaignNewLeadsConfig`.

### salespeople/
`SalespersonList`, `SalespersonCard`, `AddSalespersonForm`, `EditSalespersonDialog`.

### lead-assignment/
`AssignmentForm`, `LeadSearchComponent`, `SourceFilter`, `ExcludedSources`, `NewLeadsControl`, `LeadScoreHotFilter`, `BypassTimeIntervalControl`, `AvailableLeadsCounter`, `AlreadyAssignedLeadsDialog`.

### top-level
`HeroSection`, `StatsSection` (demo), `RealTimeStatsSection` (live), `LeadsBySalespersonChart`, `LeadsBySourceChart`, `LeadDatabase`, `LeadAssignmentForm`, `LeadAssignmentWithExclusions`, `LeadAssignmentVerificationWrapper`, `AssignmentHistory`, `CampaignsSettings`, `SalespeopleSettings`, `DatabaseFilters(Responsive)`, `MarketSelector`, `LanguageSelector`, `PersistentNavigation`.

---

## 7. Librerie, hook, servizi

### src/lib/
- `ranking/googleSheets.ts` — `TeamMember`/`RankedMember`/`MetricKey`, `METRIC_LABELS`, `extractSheetId`, `buildCsvUrl` (default tab `Ranking_Data`), `fetchConfigData`, `fetchSheetData`, `rankByMetric`.
- `ranking/adminConfig.ts` — `ranking_settings` I/O: `getDefaultSheetUrl`, `getRankingBaseUrl`, `fetchSettings`, `saveSetting`.
- `ranking/hashUtils.ts` — `generateMemberCode` (djb2→base36), `findMemberByCode`.
- `reports/fonteGroups.ts` — `FonteGroupRule`, `applyFonteGroups` (prefix/exact/contains), `fetchFonteGroups`/`saveFonteGroups` (`system_settings.call_fonte_groups`).
- `reports/callFilters.ts` — filtri call salvati per market in `system_settings.call_report_filters_<market>`: `fetchCallFilters`/`addCallFilter`/`removeCallFilter`.

### src/hooks/
`use-mobile`, `use-toast`, `useAssignabilityVerification`, `useAutomationsData`, `useCampaignsData`, `useColumnVisibility`, `useLeadAssignment` (orchestrazione assegnazione), `useLeadHistory` (timeline), `useLeadStatus`, `usePagination`, `useRealTimeLeadCount`, `useSalespeopleData`, `useServerPagination(+WithMarket)`, `useTableSorting`.

### src/services/
`leadAssignmentService`, `leadAssignabilityService` (`check_leads_assignability`), `databaseService` (`getPaginatedData`, `getLeadsStats`), `reportsService` (`getReportMetrics`, `getFilteredLeads`, venditori), `replayAssignmentService`.

---

## 8. Configurazione, segreti, deploy

L'elenco completo delle variabili, con l'origine di ciascuna e la spiegazione di quali sono
pubbliche e quali no, sta in **`.env.example`**: si copia in `.env` e si riempie. Qui il riassunto.

**Frontend (`.env`)** — solo chiavi pubbliche, finiscono nel JavaScript servito al browser:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY` (anon).
Alcuni file le hanno anche scritte dentro (`src/integrations/supabase/client.ts`, `Ranking.tsx`,
`src/lib/lanci/config.ts`): è la stessa chiave pubblica, non un segreto sfuggito.

**Edge (Supabase secrets, mai nel repository)**: `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`
sono iniettati da Supabase; `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
servono a `valore-call`, `analytics-lancio`, `lancio-test`, `sheet-tabs`, `sheet-peek`.

**Nel database, non in env** — perché devono cambiare senza un rilascio: gli URL dei webhook
(`system_settings.lead_assign_webhook_url`, `venditori.webhook_url`), la configurazione dei
lanci, i template WhatsApp, l'impronta del PIN delle Impostazioni. Vedi `.env.example` per l'elenco.

**Deploy**: Vercel (`vercel.json`: build `npm run build`, output `dist`, rewrite SPA). Edge functions deployate su Supabase separatamente. `package.json`: `dev/build/build:dev/lint/preview` (nessun test).

---

## 9. Fragilità note & debiti tecnici

- **Sicurezza**: password gate in chiaro nel codice; anon key pubblica e hardcoded; `verify_jwt=false` su tutte le edge (protezione solo per oscurità URL); RLS aperta all'anon.
- **Identità venditore = stringa nome** ovunque, con normalizzazioni ad-hoc (accenti, iniziali, first-name-prefix) → si rompe su rinomine/duplicati.
- **Market** = `payload.market || 'IT'` (nessuna detection reale).
- **Finestra attribuzione incoerente**: 7 giorni negli edge vs 30 nella UI.
- **`booked_call.stato` mai aggiornato** → no-show/effettuate non tracciate su quella tabella (il report Call conta le prenotate per `data_call`, non filtra cancellate).
- **Contatori non atomici**: `lead_attuali` (read-modify-write duplicato con trigger), `whatsapp_click_logs.click_count`, `distribution_state`.
- **`lead_capacity` non applicato** da nessuna parte.
- **`calculateUltimaFonte`** dead code nell'intake (`ultima_fonte` = fallback su `fonte`).
- **Matching telefono incoerente**: `.eq` esatto (Calendly) vs `ilike`/trigram (altrove) vs suffisso (WhatsApp).
- **`findPreviousSeller` duplicata** in 4 funzioni con semantiche di ordinamento diverse (`created_at` vs `data_assegnazione`).
- **`call_report_filters`** (tabella) inutilizzata: filtri spostati in `system_settings`.
- **`NotFound`** non instradato.

---

*Documentazione generata da analisi statica del codebase (frontend `src/`, edge `supabase/functions/`, migrazioni, `types.ts`). Riferimenti a righe/percorsi verificabili nel repo.*

---

## 10. Lanci — il sottosistema completo

Un **lancio** è una campagna con un suo insieme di venditori, i suoi fogli, la sua regola di
assegnazione e il suo link WhatsApp. La configurazione vive in `system_settings.lanci_config`
(array JSON), la regola in `lead_assignment_automations`.

### 10.1 Configurazione di un lancio

```jsonc
{
  "id": "workshop_set26",
  "nome": "Workshop Set26",
  "provenienza": "3sfere",                       // valore in col. B dei tab call
  "call_tabs": ["Settembre26 Elenco call/esito"],
  "lead_tab": "Lead Workshop Set26",
  "campagna": "Workshop Set26",                  // lead_generation.campagna
  "sales": ["Alessandra Savoldi", "…"],          // venditori del lancio
  "lead_sales": [...], "call_sales": [...],      // tenuti allineati a `sales`
  "automazione_id": "45cb68e8-…",                // regola collegata
  "whatsapp_slug": "instagram-sold-out-set26",   // primo link (retrocompatibilità)
  "whatsapp_slugs": ["…-a", "…-b"]               // più link = confronto A/B
}
```

La **provenienza deve essere scritta come compare nei fogli**: `3Sfere` contro `3sfere` non dà
errore, dà una matrice a zero. Il pulsante con la beuta in Impostazioni → Lanci lo verifica.

### 10.2 Come viene assegnato un lead

Le regole attive si provano **in ordine di priorità** e ci si ferma alla prima che prende il lead.
Dentro una regola l'ordine è questo:

1. **Il lead arriva già con un venditore?** (link personali con UTM) → le automazioni vengono
   saltate del tutto. Il tetto viene comunque scalato, attribuendolo alla regola che distribuisce
   a quel venditore e la cui condizione corrisponde alla fonte. Nello storico:
   `result = 'counted_preassigned'`. Se la fonte non corrisponde a nessuna regola, non si scala niente.
2. **Il lead è già noto?** Se `use_previous_seller_first`, si cerca per email o telefono l'ultimo
   lead assegnato a una persona vera (`Round Robin` escluso) e, se rientra nel `lock_period_days`,
   il lead torna da lui. **Questo passaggio ignora tetti, pause e gruppi**, e il contatore sale lo stesso.
3. **Distribuzione.** Sorteggio fra gli slot ancora capienti.
4. **Nessuno può riceverlo** → il lead **resta libero** (`venditore = null`, `assignable = true`),
   visibile fra quelli da assegnare. Non viene parcheggiato.

### 10.3 I tre stati dell'assegnazione

Impostabili sia da Lanci → Distribuzione sia dal wizard; sono esclusivi.

| Stato | Lead nuovo | Lead già noto entro il lock |
|---|---|---|
| **Attiva** | distribuito secondo le quote | torna al suo venditore |
| **Lead nuovi in attesa** | `venditore = 'Round Robin'`, `stato = 'assegnato'`, `assignable = false` | torna al suo venditore, e scala il tetto |
| **Spenta** (`attivo = false`) | resta **libero** | resta libero |

I lead pre-assegnati da UTM **non passano da nessuno dei tre**.

### 10.4 Quote, tetti, pause, gruppi

Ogni slot di `distribution_config`:

```jsonc
{ "venditore_id": "…", "weight": 8, "count_target": null, "cap": 250,
  "paused": false, "gruppo": "Closer", "gruppo_weight": 60 }
```

- **weight** — percentuale. Attenzione: è **relativa alla somma degli slot eleggibili**, non
  assoluta. Con 30 e 60 e nessun altro, diventano 33% e 67%. Il wizard blocca il salvataggio
  finché non fanno 100, ma la rinormalizzazione si vede quando qualcuno è in pausa o pieno.
- **cap** — tetto massimo, ed è anche l'**obiettivo** mostrato nella matrice: sono lo stesso numero.
- **count_target** — in modalità quota assoluta sostituisce il cap. Le quote si riempiono **in
  parti uguali**, non in proporzione alla loro dimensione: chi ha 20 satura prima di chi ha 200.
- **paused** — ferma i lead nuovi ma **non** le riassegnazioni al venditore precedente.
- **gruppo / gruppo_weight** — sorteggio a due livelli: prima il gruppo con la sua quota, poi la
  persona dentro il gruppo. Su 10 lead con Closer 60 / Setter 40 ne vanno 6 e 4 comunque siano
  composti i gruppi. Se un gruppo non ha nessuno disponibile, la sua quota va agli altri.

### 10.5 Contatori

`distribution_state = { count_assigned: {id: n}, total_assigned, last_updated, rev }`

Ogni assegnazione a un venditore presente nella distribuzione scala il suo tetto, **da qualunque
strada arrivi**: distribuzione, venditore precedente, recupero dalla coda, riassegnazione manuale,
lead pre-assegnato da UTM.

**`rev` è il meccanismo che tiene i conti giusti sotto carico.** La scrittura vale solo se a
database c'è ancora la revisione letta; altrimenti si rilegge e si riprova. Senza, con più lead in
arrivo insieme, si perdevano gli incrementi — misurato: 32 su 40 — e i tetti non scattavano mai.
Per lo stesso motivo scelta e conteggio sono **una sola operazione**: verificare il tetto su numeri
diversi da quelli con cui lo si incrementa faceva sforare i tetti (72 assegnati su 60 posti).

### 10.6 Coda e lead liberi: non sono la stessa cosa

- **In coda** (`venditore = 'Round Robin'`) finisce solo chi viene parcheggiato di proposito con lo
  stato «Lead nuovi in attesa». Si rimettono in circolo con *Distribuiscili ora*: ripassano dalle
  automazioni come lead in ingresso.
- **Liberi** (`venditore = null`) restano quelli che non hanno trovato posto perché i tetti erano
  pieni. Alzando i tetti e salvando, il wizard propone di distribuirli mostrando quanti sono e come
  verrebbero ripartiti.

### 10.7 Da dove vengono i numeri della matrice

| Metrica | Sorgente |
|---|---|
| Lead generati, mix per fonte, andamento, speed to lead | **database**, filtrando per `campagna` |
| Assegnati, qualifiche, voti, call, chiusure, fatturato | **fogli dei venditori** |
| Ricevuti, tetto, mancanti, riempimento | **contatori** della regola |

Sono tre sorgenti diverse e possono divergere legittimamente: un lead assegnato dal tool ma non
ancora scritto sul foglio conta nei contatori e non fra gli assegnati.

**Definizioni non ovvie**
- *Call da fare*: esito vuoto **oppure** contenente `closing` — su Pipedrive «Prenotato Closing» e
  «Closing Confermato» sono call fissate ma non svolte.
- *Call nette*: totali − da fare − rischedulate/no show/cancellate.
- *Tasso di chiusura*: chiusure su call nette. Chiusure = `Pagamento unico`, `Pagamento a rate`, `Acconto`.

**Cache**: fresca 15 minuti, servita fino a 12 ore mentre si ricalcola dietro. La pagina si
aggiorna da sola ogni 5 minuti. L'età mostrata è quella del **calcolo**, non della risposta.

### 10.8 Link WhatsApp

`/wa/<slug>?email=…&nome=…&telefono=…` cerca il lead, legge chi ce l'ha in carico, apre la chat.

- Serve **email o telefono**: senza, non si sa di quale lead si tratti.
- I segnaposto non risolti (`{{contact.email}}`) vengono riconosciuti e ignorati.
- Se il lead non risulta ancora si aspetta fino a **50 secondi**, perché il flusso esterno che lo
  registra può metterci mezzo minuto; dopo 8 secondi compare una via d'uscita verso il numero di riserva.
- Il **numero di riserva** del template è la rete di sicurezza: senza, chi arriva senza parametri
  vede una pagina di errore.
- Il ruolo attaccato al nome in anagrafica viene tolto dal messaggio: «Nicola Feliciolli Setter»
  diventa «Nicola Feliciolli». In database resta intero.
- Il confronto fra il nome scritto sul lead e l'anagrafica **ignora accenti, maiuscole e spazi
  doppi**, ma non le parole: `Nicola Feliciolli` e `Nicola Feliciolli Setter` restano due persone.

### 10.9 Cose che si rompono in silenzio

- **Nome del venditore diverso dall'anagrafica** in un flusso esterno: il lead viene assegnato ma
  il tetto non si muove. Si controlla cercando `counted_preassigned` nello storico.
- **Venditore inattivo**: la risoluzione filtra su `stato = 'attivo'`, quindi non viene trovato.
- **`campagna` mancante** nel payload esterno: i lead non compaiono fra i «lead generati».
- **`assignable: true` insieme a `venditore`**: le automazioni partono lo stesso e possono
  sovrascrivere l'assegnazione.
- **Venditore senza telefono**: il link WhatsApp non può aprire la chat. Segnalato in Impostazioni
  → Venditori, ma solo per chi è dentro una distribuzione attiva.

---

## 11. Come provare senza rompere la produzione

Non esiste un ambiente separato: le prove si fanno in produzione, quindi si isolano per **fonte**.

**Regola d'oro**: fonte inventata (`__prova_zzz__`), regola dedicata con `priority: 0` e
`webhook_enabled: false` — così non parte nessuna chiamata esterna e niente viene scritto sui
fogli — e cancellazione di lead, log ed esecuzioni alla fine.

```
1. crea la regola di prova sulla fonte inventata
2. manda i lead dal vero webhook (lead-generation-webhook)
3. verifica: lead in database, contatori, storico esecuzioni
4. cancella lead + automation_executions + regola
```

**Prima di toccare i dati veri**: `lancio-test` fa una prova a vuoto della configurazione — venditori,
tab presenti nei fogli, provenienza che compare davvero, conflitti fra regole, link WhatsApp — e
simula un lead dicendo a chi finirebbe, senza scrivere niente.

**Cosa verificare in una prova di carico** (tutto misurato, non dedotto):
nessun lead perso, nessuno senza venditore, contatori identici alle assegnazioni reali, tetti
rispettati al singolo lead, rientri simultanei allo stesso venditore, distribuzione entro tre
deviazioni standard dalle quote.

Su volumi bassi le percentuali non dicono niente: tre lead su dodici venditori danno spesso due
volte lo stesso nome. Servono un centinaio di lead perché il confronto con le quote abbia senso.
