
# Fix: Blocco schermata Database quando si applicano filtri

## Problema Identificato

La funzione `getUniqueSourcesFromLeads()` in `databaseService.ts` scarica **TUTTI i 44.255+ lead** dalla tabella `lead_generation` in blocchi da 1000, solo per estrarre i nomi unici delle fonti. Questa operazione:

1. Genera 44+ richieste di rete consecutive
2. Elabora 123.000+ token lato client
3. Blocca completamente il thread principale del browser

Questa funzione viene chiamata dalla homepage (`LeadAssignmentWithExclusions` -> `useLeadAssignment`) e da `syncSourcesToDatabase()`, che poi inserisce ogni fonte una per una nel database (altre 146+ richieste).

Il tutto avviene ogni volta che si carica la homepage, e puo' sovrapporsi alla navigazione verso la pagina Database.

## Soluzione

Sostituire `getUniqueSourcesFromLeads()` con una query diretta alla tabella `database_fonti` che contiene gia' tutte le fonti sincronizzate. Eliminare `syncSourcesToDatabase()` dal flusso di caricamento iniziale.

### Modifiche ai file:

**1. `src/services/databaseService.ts`**
- Riscrivere `getUniqueSourcesFromLeads()`: invece di scansionare 44k+ righe, fare una semplice query su `database_fonti` (tabella con ~177 righe)
- Rendere `syncSourcesToDatabase()` un'operazione background opzionale, non bloccante

**2. `src/hooks/useLeadAssignment.tsx`**
- Rimuovere la chiamata a `syncSourcesToDatabase()` dal `fetchFonti()` (riga 110): non deve bloccare il caricamento iniziale
- Sostituire `getUniqueSourcesFromLeads()` con la versione ottimizzata che legge da `database_fonti`

**3. `src/components/campaigns/AddCampaignForm.tsx`**
- Sostituire `getUniqueSourcesFromLeads()` con query a `database_fonti`

**4. `src/components/campaigns/CampaignsList.tsx`**
- Sostituire `getUniqueSourcesFromLeads()` con query a `database_fonti`

### Dettaglio tecnico

```text
PRIMA (attuale):
  getUniqueSourcesFromLeads()
  -> 44 richieste x 1000 righe = 44.255 righe scaricate
  -> parsing di 123.000+ token lato client
  -> UI bloccata per 5-10 secondi

DOPO (ottimizzato):
  getUniqueSourcesFromLeads()  
  -> 1 richiesta a database_fonti = ~177 righe
  -> nessun parsing complesso
  -> risposta immediata (<100ms)
```

La tabella `database_fonti` e' gia' popolata e sincronizzata (come si vede dai log di rete). Non c'e' bisogno di riscansionare tutti i lead ogni volta.
