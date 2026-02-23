

# Fix: Page freezes after applying filters

## Problem
After applying filters in the Database page, the entire page becomes unresponsive -- vertical scrolling works but clicking, horizontal scrolling, and all interactions are blocked.

## Root Cause
Two separate issues are causing this:

### Issue A: Re-render cascade (performance)
When filters are applied, a chain of state updates causes 7+ consecutive re-renders of the entire Database page:
1. `setActiveFilters(newFilters)` -- Database re-renders
2. `setCurrentFilters(newFilters)` -- DatabaseTableContainer re-renders
3. `setSelectedLeads([])` -- from LeadsTable useEffect, Database re-renders again
4. `setIsLoadingBookings(true)` / `setIsLoadingLeadLavorati(true)` -- more re-renders
5. Data loaded: `setBookings()`, `setLeadLavorati()`, `setLeadsData()` -- even more re-renders

Each re-render recreates 50 table rows x 12 columns = 600 cells, blocking the main thread.

### Issue B: Invisible overlay blocking interactions (the real blocker)
The `DatabaseFiltersResponsive` Dialog renders an overlay (`fixed inset-0 z-50 bg-black/80`). When the Dialog closes at the same time as parent state changes, Radix may not properly remove the overlay element from the DOM, leaving an invisible barrier that blocks all pointer events except scrolling.

## Solution

### 1. Remove the `onDataChange` pattern entirely (Database.tsx + LeadsTable.tsx)
The `onDataChange` callback pattern was added to pass lead data from `LeadsTable` up to `DatabaseTableContainer` for bulk actions/export. This creates a re-render loop. Instead, we will:
- Remove `leadsData` state and `handleLeadsDataChange` from `Database.tsx`
- Remove `onDataChange` prop from `LeadsTable`
- Pass an empty array for `allItems` in the leads tab (bulk export will query the server directly instead)

### 2. Fix the selection reset effect (LeadsTable.tsx)
Replace the `useEffect` that calls `onSelectionChange([])` on every filter change with a smarter approach:
- Use a `useRef` to track the previous filter string
- Only call `onSelectionChange([])` if filters actually changed AND selection is not already empty

### 3. Add `modal={false}` to the filter Dialog (DatabaseFiltersResponsive.tsx)  
Setting `modal={false}` on the Radix Dialog prevents it from rendering a blocking overlay. Since the filter dialog is not a critical modal (the user can interact with the page behind it), this is the correct behavior and eliminates the overlay blocking issue entirely.

### 4. Memoize functions in DatabaseTableContainer
Wrap `handleAdvancedFilters` and `handleSearch` in `useCallback` to prevent unnecessary re-renders of children when DatabaseTableContainer re-renders.

### 5. Memoize `fetchBookings` and `fetchLeadLavorati` in Database.tsx
Wrap these in `useCallback` with proper dependencies so they don't capture stale closures and don't trigger unnecessary re-renders.

## Technical Details

### File: `src/pages/Database.tsx`
- Remove `leadsData` state and `handleLeadsDataChange`
- Remove `onDataChange` prop from `LeadsTable`
- Pass `allItems={[]}` for leads tab (or remove it)
- Wrap `fetchBookings` and `fetchLeadLavorati` in `useCallback` with `[activeFilters, selectedMarket]` deps

### File: `src/components/database/LeadsTable.tsx`
- Remove `onDataChange` prop and its interface entry
- Replace the filter-change useEffect with a ref-based comparison that avoids calling `onSelectionChange([])` when selection is already empty
- Remove `onDataChange` from the useEffect entirely

### File: `src/components/DatabaseFiltersResponsive.tsx`
- On desktop: change `<Dialog open={isOpen} onOpenChange={setIsOpen}>` to `<Dialog open={isOpen} onOpenChange={setIsOpen} modal={false}>`
- Also reset `calendarView` to `null` in `applyFilters` and `clearFilters` to prevent orphaned Popover portals

### File: `src/components/database/DatabaseTableContainer.tsx`
- Wrap `handleAdvancedFilters` in `useCallback`
- Wrap `handleSearch` in `useCallback`

## Expected Impact
- Eliminates 4-5 unnecessary re-renders after filter application
- Prevents the Dialog overlay from blocking page interactions
- No functional regressions -- bulk export can still work by querying server directly for selected IDs
- Overall page feels snappy after applying filters

