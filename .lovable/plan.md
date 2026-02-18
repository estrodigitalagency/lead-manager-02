

## Problema

In `getCallTotaliPrenotate` (riga 189 di `reportsService.ts`), il filtro `booked_call` usa `.or()`:
```
.or('booked_call.eq.SI,booked_call.eq.Si,booked_call.eq.si,booked_call.eq.Sì')
```

Quando poi `applyFonteFilters` aggiunge un secondo `.or()` per il filtro fonte, il primo `.or()` (quello per booked_call) viene **sovrascritto**. Di conseguenza, filtrando per fonte, il vincolo su `booked_call = SI` sparisce e il conteggio delle call prenotate diventa errato.

## Soluzione

Sostituire il `.or()` per booked_call con `.in()`, che non entra in conflitto con successivi `.or()`:

```text
// Prima (problematico - usa .or() che viene sovrascritto):
.or('booked_call.eq.SI,booked_call.eq.Si,booked_call.eq.si,booked_call.eq.Sì')

// Dopo (usa .in() che non interferisce con .or() dei filtri fonte):
.in('booked_call', ['SI', 'Si', 'si', 'Sì'])
```

## Dettaglio Tecnico

| File | Modifica |
|------|----------|
| `src/services/reportsService.ts` | Riga 189: sostituire `.or('booked_call.eq.SI,...')` con `.in('booked_call', ['SI', 'Si', 'si', 'Sì'])` |

Una singola riga da modificare. Nessun altro file coinvolto.

