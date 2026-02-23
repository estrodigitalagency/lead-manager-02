

# Fix: Table horizontal scroll broken after applying filters

## Problem
After applying filters in the Lead Generation table, the table becomes unscrollable horizontally and the UI appears "frozen." The table has 12+ columns that require horizontal scrolling on most screens.

## Root Cause
There are **nested overflow containers** that conflict with each other:

1. `DatabaseTableContainer` > `CardContent` has `overflow-x-auto` + a child `<div className="min-w-full">`
2. Inside that, `LeadsTable` renders a `<Table>` component
3. The `<Table>` UI component itself wraps the `<table>` element in another `<div className="relative w-full overflow-auto">`

This creates a situation where the inner `overflow-auto` div (from `Table`) tries to handle scrolling, but the outer `min-w-full` div forces it to match the card width instead of allowing the table to overflow. After a re-render (triggered by filter application), the scroll context is lost.

## Solution

### 1. Fix `DatabaseTableContainer.tsx` (line 390-393)
Remove `overflow-x-auto` from `CardContent` and remove the unnecessary `min-w-full` wrapper div. Let the `Table` component's built-in overflow wrapper handle scrolling by itself.

**Before:**
```
<CardContent className={isMobile ? 'p-2 overflow-x-auto' : 'overflow-x-auto'}>
  <div className="min-w-full">
    {children}
  </div>
</CardContent>
```

**After:**
```
<CardContent className={isMobile ? 'p-2' : ''}>
  {children}
</CardContent>
```

### 2. Fix `LeadsTable.tsx` table wrapper (lines ~195-230)
Wrap the `<Table>` in a container with explicit `overflow-x-auto` and constrained width to ensure the wide table (12 columns) can scroll properly within the card boundaries.

**Before:**
```
<Table>
  <LeadTableHeader ... />
  <TableBody>...</TableBody>
</Table>
```

**After:**
```
<div className="w-full overflow-x-auto">
  <Table>
    <LeadTableHeader ... />
    <TableBody>...</TableBody>
  </Table>
</div>
```

### 3. Update `Table` UI component (`src/components/ui/table.tsx`)
Change the table wrapper from `overflow-auto` (which handles both axes and can cause layout issues) to `overflow-x-auto` only, to be more explicit and avoid vertical scroll conflicts with pagination and other controls outside the table.

**Before:**
```
<div className="relative w-full overflow-auto">
```

**After:**
```
<div className="relative w-full overflow-x-auto">
```

## Technical Details

- The fix removes redundant scroll containers so only one element handles horizontal overflow
- The `Table` UI component's wrapper remains the primary scroll container
- `DatabaseTableContainer` simply passes through children without interfering with their scroll behavior
- No changes to filtering logic, data loading, or pagination -- this is purely a CSS/layout fix

