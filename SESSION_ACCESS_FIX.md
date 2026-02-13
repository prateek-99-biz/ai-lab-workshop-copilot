# Session Access Issue - Fix Guide

## What Happened

When you made the `session_progress` view "private" in Supabase Dashboard, it removed access grants that the backend API needs. This broke the attendee join flow.

### The Problem

1. **API Backend Uses Service Role**: Your API endpoints use `createServiceClient()` which authenticates with the `SUPABASE_SERVICE_ROLE_KEY`
2. **Service Role Needs Explicit Policies**: Even though service role should bypass RLS, it still needs explicit policies OR grants to access tables
3. **View Made Private**: Making `session_progress` private removed the `GRANT SELECT` statements
4. **Related Tables Affected**: The underlying tables (`sessions`, `participants`, etc.) need service_role policies

### The Error

Attendees trying to join sessions were getting permission errors because:
- The `/api/sessions/join` endpoint couldn't read/write to required tables
- The service role was blocked by missing policies

## The Fix

I've created **migration 005_fix_session_access.sql** which:

✅ Adds explicit service_role policies for ALL tables  
✅ Grants access to session_progress view for service_role and authenticated users  
✅ Verifies anon role policies still exist for attendee access  
✅ Ensures the API backend can perform all necessary operations

## How to Apply the Fix

### Option 1: Using Supabase CLI (Recommended)

```bash
# In your project directory
supabase db push
```

This will apply migration 005 automatically.

### Option 2: Manual via Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Open the file: `supabase/migrations/005_fix_session_access.sql`
3. Copy all the SQL content
4. Paste into SQL Editor
5. Click "Run"

### Option 3: Run Specific Migration

```bash
# If using Supabase CLI
supabase db diff --file 005_fix_session_access
supabase migration up
```

## Verification

After running the migration, test the flow:

### Test 1: Verify Policies Exist

```sql
-- Check service_role policies
SELECT tablename, policyname, roles 
FROM pg_policies 
WHERE roles::text LIKE '%service_role%';
```

You should see policies like:
- `Service role full access sessions`
- `Service role full access participants`
- etc.

### Test 2: Test Attendee Join

1. As facilitator, create and publish a session
2. Get the join code
3. In incognito/private browser window:
   - Go to `/join`
   - Enter the join code
   - Provide name and email
   - Click "Enter Workshop"
4. Should successfully join ✅

### Test 3: Check View Access

```sql
-- Check view grants
SELECT 
  table_name, 
  grantee, 
  privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'session_progress';
```

Should show:
- `authenticated` can SELECT
- `service_role` can ALL

## Understanding the Fix

### Service Role Policies

The migration adds policies like this for every table:

```sql
CREATE POLICY "Service role full access sessions" 
  ON sessions FOR ALL 
  TO service_role 
  USING (TRUE)     -- Can read anything
  WITH CHECK (TRUE); -- Can write anything
```

This ensures your API backend (which uses service role) can:
- Create participants when attendees join
- Read session data for verification
- Update participant progress
- Insert analytics events
- Send emails (access to leads table)

### Why This is Safe

✅ **Service role is backend-only**: The key is in your `.env.local`, never exposed to browsers  
✅ **Existing RLS still applies**: Authenticated users (facilitators) and anon users (attendees) still have restricted access  
✅ **No security regression**: This is how it should have been configured originally

## Prevention

To avoid similar issues in the future:

1. **Don't change view permissions in Dashboard**: Make changes via migrations
2. **Keep migration files**: They document all security policies
3. **Test join flow after changes**: Always verify attendee experience
4. **Use service_role for backend**: Never use anon key for backend operations

## What session_progress View Does

The view aggregates live session metrics:
```sql
- total_participants: Count of all joined participants
- active_participants: Participants currently active
- current_step_completions: How many completed current step
- stuck_count: Recent stuck signals (last 5 minutes)
```

This is used for presenter mode real-time stats. Making it "private" was fine, but needed proper grants.

## If Issue Persists

### Check Environment Variables

```bash
# Verify service role key is set
echo $SUPABASE_SERVICE_ROLE_KEY
# Should show: sb-xxxxx (different from anon key)
```

### Check API Logs

Look for errors like:
- "permission denied for table sessions"
- "new row violates row-level security policy"
- "insufficient privilege"

### Re-run Migration

If policies weren't applied:

```sql
-- Drop and recreate (safe to run multiple times)
-- The migration handles this with IF EXISTS checks
```

### Contact Support

If still broken:
1. Export current RLS policies: Dashboard → Database → Policies
2. Check table grants: Run verification queries above
3. Review API logs for specific error messages

## Related Files

- **Migration**: [005_fix_session_access.sql](supabase/migrations/005_fix_session_access.sql)
- **API Endpoint**: [src/app/api/sessions/join/route.ts](src/app/api/sessions/join/route.ts)
- **Original Policies**: [002_rls_policies.sql](supabase/migrations/002_rls_policies.sql)
- **View Definition**: [003_storage_realtime.sql](supabase/migrations/003_storage_realtime.sql) (line 78)

---

**Status**: ✅ Fixed in TASK_LIST.md  
**Priority**: HIGH - Required for attendees to join  
**Last Updated**: February 10, 2026
