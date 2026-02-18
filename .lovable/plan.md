

## Problema

I filtri fonte usano `ilike` con wildcard `%` (es. `%VSL16%`), che corrisponde a qualsiasi stringa che **contiene** "VSL16", incluso "VSL16-BIS". Serve un match esatto.

## Soluzione

Sostituire `ilike` con `eq` (match esatto) in tutti i punti dove si filtrano le fonti incluse/escluse.

## File coinvolti e modifiche

### 1. `src/services/databaseService.ts` (4 punti)

**In `getPaginatedData()` - fonti incluse (riga 134):**
```text
// Prima:  `${fonteColumn}.ilike.%${fonte}%`
// Dopo:   `${fonteColumn}.eq.${fonte}`
```

**In `getPaginatedData()` - fonti escluse (riga 141):**
```text
// Prima:  query.not(fonteColumn, 'ilike', `%${fonte}%`)
// Dopo:   query.not(fonteColumn, 'eq', fonte)
```

**In `filterLeads()` - fonti incluse (riga 313):**
```text
// Prima:  `${fonteColumn}.ilike.%${fonte}%`
// Dopo:   `${fonteColumn}.eq.${fonte}`
```

**In `filterLeads()` - fonti escluse (riga 320):**
```text
// Prima:  query.not(fonteColumn, 'ilike', `%${fonte}%`)
// Dopo:   query.not(fonteColumn, 'eq', fonte)
```

### 2. `src/services/reportsService.ts` (4 punti)

**In `applyFonteFilters()` - incluse (riga 120):**
```text
// Prima:  `${fonteColumn}.ilike.%${fonte}%`
// Dopo:   `${fonteColumn}.eq.${fonte}`
```

**In `applyFonteFilters()` - escluse (riga 128):**
```text
// Prima:  query.not(fonteColumn, 'ilike', `%${fonte}%`)
// Dopo:   query.not(fonteColumn, 'eq', fonte)
```

**In `getLeadsBySourceData()` - incluse (riga 332):**
```text
// Prima:  `ultima_fonte.ilike.%${fonte}%`
// Dopo:   `ultima_fonte.eq.${fonte}`
```

**In `getLeadsBySourceData()` - escluse (riga 338):**
```text
// Prima:  query.not('ultima_fonte', 'ilike', `%${fonte}%`)
// Dopo:   query.not('ultima_fonte', 'eq', fonte)
```

## Riepilogo

| File | Modifiche |
|------|-----------|
| `src/services/databaseService.ts` | 4 sostituzioni: `ilike` + wildcard diventa `eq` esatto |
| `src/services/reportsService.ts` | 4 sostituzioni: `ilike` + wildcard diventa `eq` esatto |

Nessun nuovo file. Nessuna modifica al database.
