

# Fix: Fonti mancanti + filtri Database non funzionanti

## Problemi identificati

### Problema 1: Fonti mancanti nei Report
**File**: `src/components/reports/ReportSourceFilters.tsx` (riga 9, 36)
Usa ancora `getAvailableFonti` dal reportsService, che interroga SOLO la tabella `database_fonti` (lista curata statica). La fonte "iscritto webinar interno 032026" non è in `database_fonti`, quindi non appare mai nei filtri Report.

### Problema 2: Filtri Database non si applicano
**File**: `src/components/database/DatabaseTableContainer.tsx` (righe 79-88)
`handleAdvancedFilters` chiama `onApplyFilters(newFilters)` DENTRO un callback di `setCurrentFilters`. In React 18 con batching automatico, chiamare un setter di stato esterno dentro un updater function di un altro setState è un anti-pattern che può causare la mancata propagazione dello stato. I filtri vengono impostati localmente ma non raggiungono `Database.tsx → activeFilters → LeadsTable`.

### Problema 3: DatabaseAdvancedFilters.tsx (codice morto)
Questo componente non è importato da nessuna parte — è stato sostituito da `DatabaseFiltersResponsive`. Tuttavia, se qualcuno lo riutilizzasse, chiama `getUniqueSourcesFromLeads()` senza passare il market.

## Soluzione

### Fix 1: ReportSourceFilters → fonti dinamiche
Sostituire `getAvailableFonti` con `getUniqueSourcesFromLeads` nel componente `ReportSourceFilters.tsx`, passando il `selectedMarket` dal context. Questo allinea i Report con la stessa logica già usata nei filtri Database.

```
// src/components/reports/ReportSourceFilters.tsx
- import { getAvailableFonti } from "@/services/reportsService";
+ import { getUniqueSourcesFromLeads } from "@/services/databaseService";

  useEffect(() => {
    const loadFonti = async () => {
-     const fonti = await getAvailableFonti(selectedMarket);
+     const fonti = await getUniqueSourcesFromLeads(selectedMarket);
      setAvailableFonti(fonti);
    };
    loadFonti();
  }, [selectedMarket]);
```

### Fix 2: handleAdvancedFilters — rimuovere anti-pattern
Spostare la chiamata `onApplyFilters` fuori dal callback di `setCurrentFilters`. Calcolare i nuovi filtri e poi aggiornare entrambi gli stati in sequenza (React 18 li batcherà automaticamente).

```
// src/components/database/DatabaseTableContainer.tsx
const handleAdvancedFilters = useCallback((filters: Record<string, any>) => {
  setCurrentFilters(prev => {
    const newFilters = {
      ...filters,
      ...(prev.search && { search: prev.search })
    };
    return newFilters;
  });
  // Chiamata separata, fuori dal setState callback
  setCurrentFilters(prev => {
    onApplyFilters(prev);  // Usa lo stato già aggiornato
    return prev;
  });
}, [onApplyFilters]);
```

In realtà, un approccio più pulito: usare un ref per il search term o ristrutturare per evitare dipendenze circolari:

```
const handleAdvancedFilters = useCallback((filters: Record<string, any>) => {
  const searchFromCurrent = currentFiltersRef.current?.search;
  const newFilters = {
    ...filters,
    ...(searchFromCurrent && { search: searchFromCurrent })
  };
  setCurrentFilters(newFilters);
  onApplyFilters(newFilters);
}, [onApplyFilters]);
```

Aggiungere un `useRef` per tracciare i filtri correnti, così non si deve leggere `prev` dentro setState.

### Fix 3: DatabaseAdvancedFilters — aggiungere market (housekeeping)
Anche se è codice morto, aggiungere `useMarket()` e passare `selectedMarket` a `getUniqueSourcesFromLeads` per coerenza.

## File da modificare

| File | Modifica |
|------|----------|
| `src/components/reports/ReportSourceFilters.tsx` | Sostituire `getAvailableFonti` → `getUniqueSourcesFromLeads(selectedMarket)` |
| `src/components/database/DatabaseTableContainer.tsx` | Rifattorizzare `handleAdvancedFilters` con ref per evitare setState-inside-setState |
| `src/components/database/DatabaseAdvancedFilters.tsx` | Aggiungere `useMarket()` e passare market (housekeeping) |

## Impatto atteso
- Le fonti dinamiche (inclusa "iscritto webinar interno 032026") appaiono in tutti i selettori: Database filtri, Report filtri fonte
- I filtri avanzati nel Database si applicano correttamente dopo il click su "Applica"
- Nessuna regressione funzionale

