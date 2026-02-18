

## Problemi Identificati

### 1. Filtro data nel Database usa UTC invece del fuso orario italiano
In `databaseService.ts`, i filtri data usano il suffisso `Z` (UTC):
- Riga 92: `${filters.dataInizio}T00:00:00.000Z`
- Riga 96: `${filters.dataFine}T23:59:59.999Z`

Selezionando "1 febbraio", la mezzanotte UTC corrisponde alle 01:00 in Italia, quindi i lead creati tra mezzanotte e l'una del 1 febbraio (ora italiana) vengono esclusi, e quelli del 31 gennaio dopo le 23:00 vengono inclusi erroneamente.

### 2. Filtro data applicato DUE VOLTE in `filterLeads()`
La funzione `filterLeads` applica il filtro data prima alle righe 269-275 (in UTC), e poi di nuovo alle righe 292-308 (con `new Date().toISOString()` che produce comunque UTC). Questo causa conflitti e comportamenti imprevedibili.

---

## Soluzione

### Modifiche in `src/services/databaseService.ts`

1. **Importare le funzioni timezone da `reportsService.ts`** (`getStartOfDay`, `getEndOfDay`) oppure duplicarle localmente per evitare dipendenze circolari.

2. **In `getPaginatedData()`** (righe 91-96): sostituire i timestamp UTC con le funzioni che calcolano mezzanotte/fine giornata nel fuso orario italiano:

```text
// Prima (sbagliato):
query = query.gte('created_at', `${filters.dataInizio}T00:00:00.000Z`);
query = query.lte('created_at', `${filters.dataFine}T23:59:59.999Z`);

// Dopo (corretto):
query = query.gte('created_at', getStartOfDayIT(filters.dataInizio));
query = query.lte('created_at', getEndOfDayIT(filters.dataFine));
```

3. **In `filterLeads()`** (righe 269-308): rimuovere il blocco duplicato (righe 292-308) e correggere il blocco rimanente (righe 269-275) con le stesse funzioni timezone italiane.

### Dettaglio tecnico

Aggiungere queste utility locali in `databaseService.ts`:

```text
function getItalianTimezoneOffset(date: Date): string {
  const formatter = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    timeZoneName: 'shortOffset'
  });
  const parts = formatter.formatToParts(date);
  const offsetPart = parts.find(p => p.type === 'timeZoneName');
  if (offsetPart?.value) {
    const match = offsetPart.value.match(/GMT([+-])(\d+)/);
    if (match) {
      return `${match[1]}${match[2].padStart(2, '0')}:00`;
    }
  }
  return '+01:00'; // fallback CET
}

function getStartOfDayIT(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const tempDate = new Date(year, month - 1, day, 12, 0, 0);
  const offset = getItalianTimezoneOffset(tempDate);
  return new Date(`${dateString}T00:00:00${offset}`).toISOString();
}

function getEndOfDayIT(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const tempDate = new Date(year, month - 1, day, 12, 0, 0);
  const offset = getItalianTimezoneOffset(tempDate);
  return new Date(`${dateString}T23:59:59.999${offset}`).toISOString();
}
```

### Riepilogo modifiche

| File | Cosa cambia |
|------|------------|
| `src/services/databaseService.ts` | Aggiungere funzioni timezone IT; correggere filtri data in `getPaginatedData()` e `filterLeads()`; rimuovere blocco data duplicato in `filterLeads()` |

Nessuna modifica al database. Nessun nuovo file.

