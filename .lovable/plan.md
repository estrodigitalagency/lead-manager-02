
# Fix: Database page freezes when applying filters (in production)

## Root Cause

The Database page triggers `checkLeadsAssignability()` on every load, which performs 3 massive UPDATE operations on the `lead_generation` table (44,000+ rows):

1. `UPDATE ... SET assignable=false WHERE booked_call='SI'` (updates thousands of rows)
2. `UPDATE ... SET assignable=false WHERE venditore IS NOT NULL` (updates ~43,987 rows)  
3. `UPDATE ... SET assignable=true WHERE ...` + `.select('id')` (returns all matching IDs to the browser)

This same verification ALSO runs from `LeadSyncProvider` on app startup, so it runs twice. Each run blocks the browser while waiting for these massive queries to complete.

Additionally, `handleRefresh` in Database.tsx triggers verification + refreshAllData + double-loads bookings and lavorati (6+ sequential operations).

## Solution

### 1. Remove duplicate verification from Database page (`src/pages/Database.tsx`)
- Remove the `performVerification()` call from `initializeDatabase()` — the `LeadSyncProvider` already handles this on app startup
- Simplify `handleRefresh` to only reload data, not re-verify
- Remove the `useAssignabilityVerification` hook import entirely from Database page

### 2. Optimize `checkLeadsAssignability` (`src/services/leadAssignabilityService.ts`)
- Remove `.select('id')` from step 3 — use `{ count: 'exact', head: true }` instead to avoid downloading all matching IDs
- Add `head: true` to steps 1 and 2 as well to reduce response payload

### 3. Prevent double verification in LeadSyncProvider (`src/contexts/LeadSyncContext.tsx`)
- Skip initial verification if it was recently completed (use a timestamp check)
- Ensure the verification only runs once across the app lifecycle, not on every market change

### 4. Remove unused `filterLeads` function (`src/services/databaseService.ts`)
- Dead code that fetches unlimited rows — remove to prevent accidental future use

## Technical Details

### File changes:

**`src/pages/Database.tsx`**
- Remove `useAssignabilityVerification` import and usage
- Remove `performVerification()` from `initializeDatabase()`
- Simplify `handleRefresh` to only call `refreshAllData()` + reload bookings/lavorati
- Remove duplicate data fetches after verification
- Remove "Verifica assegnabilita" button or make it use the LeadSync context version

**`src/services/leadAssignabilityService.ts`**
- Step 3: Replace `.select('id')` with `.select('id', { count: 'exact', head: true })` to avoid downloading all matching row IDs
- Use count-only responses for steps 1 and 2

**`src/services/databaseService.ts`**
- Remove unused `filterLeads` function (lines 235-336)

**`src/contexts/LeadSyncContext.tsx`**
- Add a `lastVerificationRef` timestamp to skip re-verification within 5 minutes
- This prevents the verification from re-running on every route change

## Expected Impact

- Database page load: from 5-10+ seconds of blocking to under 1 second
- No more duplicate 44k-row UPDATE operations
- Filter application becomes instant (was already using server pagination, just blocked by concurrent verification)
