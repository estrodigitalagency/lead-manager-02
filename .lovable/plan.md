

# Fix: Page freezes after applying filters (infinite re-render loop)

## Root Cause

There is an **infinite re-render loop** between `Database.tsx` and `LeadsTable.tsx`:

1. Filters change -> `LeadsTable` loads new data -> calls `onDataChange(leads)`
2. `handleLeadsDataChange` in `Database.tsx` is **not wrapped in `useCallback`**, so a new function reference is created on every render
3. `LeadsTable` has a `useEffect` with `onDataChange` in its dependency array -> detects the new reference -> calls `onDataChange` again
4. This triggers `setLeadsData` -> re-render -> new function reference -> infinite loop

This loop causes the browser's main thread to be fully consumed by React re-renders, making the page unresponsive.

## Solution

### 1. `src/pages/Database.tsx`
- Wrap `handleLeadsDataChange` in `useCallback` to stabilize its reference across re-renders

### 2. `src/components/database/LeadsTable.tsx`
- Remove `onDataChange` from the `useEffect` dependency array to prevent re-triggering when the callback reference changes (the effect should only run when `leads` data actually changes)

### 3. `src/pages/Database.tsx` - Secondary fix
- Wrap `handleApplyFilters` in `useCallback` to prevent unnecessary re-renders of `DatabaseTableContainer` and its children when filters haven't actually changed

## Technical Details

**File: `src/pages/Database.tsx`**
```
// Before (causes new function reference every render):
const handleLeadsDataChange = (data: Lead[]) => {
  setLeadsData(data);
};

// After (stable reference):
const handleLeadsDataChange = useCallback((data: Lead[]) => {
  setLeadsData(data);
}, []);
```

Also stabilize `handleApplyFilters`:
```
const handleApplyFilters = useCallback((filters: Record<string, any>) => {
  setActiveFilters(filters);
}, []);
```

**File: `src/components/database/LeadsTable.tsx`**
```
// Before (re-fires when onDataChange reference changes):
useEffect(() => {
  if (onDataChange && leads) {
    onDataChange(leads);
  }
}, [leads, onDataChange]);

// After (only fires when actual data changes):
useEffect(() => {
  if (onDataChange && leads) {
    onDataChange(leads);
  }
}, [leads]);
```

## Expected Impact
- Eliminates the infinite re-render loop that freezes the page
- Filter application becomes instant (data loads via server pagination, no loop)
- No functional changes -- data still flows correctly from LeadsTable to DatabaseTableContainer

