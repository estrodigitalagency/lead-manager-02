

## Attribuzione Call per Fonte di Provenienza

### Contesto del problema

Attualmente il sistema attribuisce le call prenotate all'**ultima fonte** del lead (`ultima_fonte` in `lead_generation`). Ma se un lead entra da VSL16, poi da VSL17, poi da VSL18 e prenota dal calendario VSL16, la call viene attribuita a VSL18 (ultima fonte) anziche a VSL16 (fonte reale della prenotazione).

La tabella `booked_call` ha gia un campo `fonte` che rappresenta la fonte del calendario da cui la call e stata effettivamente prenotata. Questo dato esiste gia nel database e puo essere sfruttato.

### Soluzione

Aggiungere un selettore nel pannello filtri dei Report che permette di scegliere la modalita di attribuzione delle call:

- **Ultima fonte lead** (default, comportamento attuale): conta le call basandosi su `ultima_fonte` della tabella `lead_generation`
- **Fonte calendario**: conta le call incrociando con la tabella `booked_call` e usando il campo `fonte` di quella tabella per determinare l'attribuzione

Questo impatta solo i Report. Assegnazione e gestione lead restano invariate.

### Modifiche tecniche

#### 1. `src/services/reportsService.ts`

- Aggiungere `callAttributionMode?: 'ultima_fonte' | 'fonte_calendario'` all'interfaccia `ReportFilters`
- Riscrivere `getCallTotaliPrenotate()`:
  - Se modalita = `ultima_fonte` (default): comportamento attuale, conta da `lead_generation` dove `booked_call = SI` filtrando per `ultima_fonte`
  - Se modalita = `fonte_calendario`: query sulla tabella `booked_call`, filtrando per la colonna `fonte` (invece di `ultima_fonte`), applicando gli stessi filtri data/venditore/fonte
- Aggiornare `getFilteredLeads()` per aggiungere una colonna `fonte_calendario` al risultato: fare un LEFT JOIN logico con `booked_call` per arricchire ogni lead con la fonte della prenotazione effettiva
- Aggiornare `ReportLeadDetail` per includere `fonte_calendario?: string`

#### 2. `src/components/reports/ReportFilters.tsx`

- Aggiungere un nuovo blocco UI "Attribuzione Call" con un selettore a due opzioni:
  - "Ultima fonte lead" (default)
  - "Fonte calendario"
- Con tooltip esplicativo che spiega la differenza tra le due modalita
- Il valore viene salvato nel filtro come `callAttributionMode`

#### 3. `src/components/reports/ReportLeadsList.tsx`

- Aggiungere una colonna "Fonte Calendario" alla tabella, visibile quando la modalita e `fonte_calendario`
- Mostrare la fonte effettiva della prenotazione accanto alla fonte del lead

#### 4. `src/components/reports/ReportMetrics.tsx`

- Nessuna modifica strutturale: la metrica "Call Totali Prenotate" continuera a mostrare il conteggio, ma il numero sara calcolato diversamente in base alla modalita scelta

#### 5. `src/pages/Reports.tsx`

- Passare il filtro `callAttributionMode` a tutti i componenti che ne hanno bisogno

### Flusso dati con attribuzione per fonte calendario

```text
Modalita "Fonte calendario" attiva:

1. Query su booked_call (non lead_generation)
2. Filtro fonte applicato su booked_call.fonte (la fonte del calendario)
3. Filtri data applicati su booked_call.created_at
4. Filtro venditore applicato su booked_call.venditore
5. Filtro market applicato su booked_call.market

Risultato: conteggio call effettivamente prenotate DA quella specifica fonte
```

### Riepilogo file coinvolti

| File | Tipo modifica |
|------|---------------|
| `src/services/reportsService.ts` | Nuova logica query per modalita `fonte_calendario` |
| `src/components/reports/ReportFilters.tsx` | Nuovo selettore "Attribuzione Call" |
| `src/components/reports/ReportLeadsList.tsx` | Colonna aggiuntiva fonte calendario |
| `src/pages/Reports.tsx` | Propagazione del nuovo filtro |

Nessuna modifica al database. Nessun nuovo file necessario.

