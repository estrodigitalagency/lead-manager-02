

## Problema

La funzione `applyFonteFilters()` usa sempre la colonna `ultima_fonte` per filtrare, ma la tabella `booked_call` ha solo la colonna `fonte` (non `ultima_fonte`). Quando selezioni delle fonti nei filtri, la query sulle call prenotate fallisce silenziosamente e restituisce un conteggio sbagliato.

Lo stesso problema si applica potenzialmente a qualsiasi altra tabella che non abbia `ultima_fonte`.

---

## Soluzione

Modificare `applyFonteFilters()` per accettare un parametro che indica il nome della colonna da usare per il filtro fonte, con default `ultima_fonte`.

### Modifiche in `src/services/reportsService.ts`

1. **`applyFonteFilters()`** - aggiungere un terzo parametro `fonteColumn` con default `'ultima_fonte'`:
   - Sostituire tutte le occorrenze hardcoded di `ultima_fonte` nella funzione con il parametro dinamico

2. **`getCallTotaliPrenotate()`** - chiamare `applyFonteFilters(query, filters, 'fonte')` invece di `applyFonteFilters(query, filters)`

3. **`getLeadTotaliGenerati()`** e **`getLeadTotaliLavorati()`** - restano invariate (usano `lead_generation` che ha `ultima_fonte`)

### Dettaglio tecnico

```text
// Prima (sbagliato per booked_call):
function applyFonteFilters(query, filters) {
  // filtra sempre su ultima_fonte
}

// Dopo (corretto):
function applyFonteFilters(query, filters, fonteColumn = 'ultima_fonte') {
  // filtra sulla colonna specificata
}

// In getCallTotaliPrenotate:
query = applyFonteFilters(query, filters, 'fonte');
```

Nessuna modifica al database necessaria. Nessun nuovo file da creare.

