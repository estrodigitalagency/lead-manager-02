
## Piano: Fix Fonti Mancanti + Grafico a Torta Lead per Fonte

### Problema Identificato

La funzione `getAvailableFonti()` in `reportsService.ts` carica le fonti dalla tabella `lead_generation` (42.000+ righe), ma Supabase restituisce massimo 1000 righe per query. Questo significa che la maggior parte delle fonti non vengono mai lette, causando la scomparsa di molte fonti dai filtri e dalle statistiche.

### Soluzione

#### 1. Fix Fonti Mancanti

Modificare `getAvailableFonti()` in `src/services/reportsService.ts` per usare la tabella `database_fonti` (che contiene gia tutte le fonti configurate) invece di scansionare `lead_generation`:

```text
Prima:  SELECT fonte FROM lead_generation (limitato a 1000 righe)
Dopo:   SELECT nome FROM database_fonti WHERE attivo = true
```

Questo risolve il problema alla radice: `database_fonti` ha gia tutte le fonti censite e non soffre del limite di 1000 righe.

#### 2. Nuovo Grafico a Torta - Lead per Fonte

Aggiungere una nuova sezione nella homepage (sotto le stats card) con:

- **Grafico a torta** (Recharts PieChart, gia installato) che mostra il numero di lead per `ultima_fonte`
- **Filtro per data** con date picker (data inizio / data fine) e periodi rapidi (Ultimi 7gg, 30gg, Questo mese, Mese scorso)
- **Tabella riepilogativa** sotto il grafico con fonte, conteggio e percentuale

Il grafico usera `ultima_fonte` (fonte singola piu recente) piuttosto che `fonte` (che e una lista cumulativa separata da virgole) per avere dati puliti.

---

### Dettaglio Tecnico

#### File modificati

| File | Modifica |
|------|----------|
| `src/services/reportsService.ts` | Fix `getAvailableFonti()` per usare `database_fonti` |
| `src/services/reportsService.ts` | Nuova funzione `getLeadsBySource()` per aggregare lead per `ultima_fonte` |
| `src/components/LeadsBySourceChart.tsx` | Nuovo componente con PieChart + filtri data |
| `src/pages/Index.tsx` | Aggiunta del componente grafico sotto le stats |

#### Nuova funzione `getLeadsBySource()`

Query per aggregare i lead per `ultima_fonte` con filtri data e market:

```text
1. Fetch lead_generation con filtri data/market (paginato per superare il limite 1000)
2. Raggruppa per ultima_fonte lato client
3. Ordina per conteggio decrescente
4. Restituisci array di { fonte, count, percentage }
```

Per gestire il limite di 1000 righe sulla query di aggregazione, si useranno due strategie:
- Selezionare solo la colonna `ultima_fonte` per minimizzare il payload
- Paginare i risultati con `.range()` per ottenere tutti i record

#### Componente `LeadsBySourceChart`

- Card con titolo "Lead per Fonte"
- Filtri data in alto (date picker + preset rapidi)
- PieChart di Recharts con colori distinti per fonte
- Tooltip al passaggio del mouse con nome fonte e conteggio
- Legenda interattiva
- Tabella sotto con colonne: Fonte | Lead | %
- Le fonti con meno dell'1% verranno raggruppate in "Altro"
