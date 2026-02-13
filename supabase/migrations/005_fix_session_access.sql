-- ============================================================================
-- AI Workshop Runner - Fix Session Access for Attendees
-- Migration: 005_fix_session_access
-- ============================================================================

-- The session_progress view should be accessible to authenticated users and service role
-- Re-grant permissions after it was made private

-- Ensure service role has full access (bypasses RLS but needs grants)
GRANT ALL ON session_progress TO service_role;
GRANT SELECT ON session_progress TO authenticated;

-- Add explicit service role policies for key tables
-- Service role should have unrestricted access to all operations

-- Sessions table - service role full access
DROP POLICY IF EXISTS "Service role full access sessions" ON sessions;
CREATE POLICY "Service role full access sessions" 
  ON sessions FOR ALL 
  TO service_role 
  USING (TRUE) 
  WITH CHECK (TRUE);

-- Participants table - service role full access
DROP POLICY IF EXISTS "Service role full access participants" ON participants;
CREATE POLICY "Service role full access participants"
  ON participants FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Submissions table - service role full access
DROP POLICY IF EXISTS "Service role full access submissions" ON submissions;
CREATE POLICY "Service role full access submissions"
  ON submissions FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Analytics events - service role full access
DROP POLICY IF EXISTS "Service role full access analytics" ON analytics_events;
CREATE POLICY "Service role full access analytics"
  ON analytics_events FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Leads table already has service role policy for INSERT, add full access
DROP POLICY IF EXISTS "Service insert leads" ON leads;
DROP POLICY IF EXISTS "Service role full access leads" ON leads;
CREATE POLICY "Service role full access leads"
  ON leads FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Feedback table (from migration 004)
DROP POLICY IF EXISTS "Service role full access feedback" ON feedback;
CREATE POLICY "Service role full access feedback"
  ON feedback FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Session snapshots - ensure service role has full access
DROP POLICY IF EXISTS "Service role full access snapshot modules" ON session_snapshot_modules;
CREATE POLICY "Service role full access snapshot modules"
  ON session_snapshot_modules FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access snapshot steps" ON session_snapshot_steps;
CREATE POLICY "Service role full access snapshot steps"
  ON session_snapshot_steps FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access snapshot blocks" ON session_snapshot_prompt_blocks;
CREATE POLICY "Service role full access snapshot blocks"
  ON session_snapshot_prompt_blocks FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Organizations - service role full access
DROP POLICY IF EXISTS "Service role can insert orgs" ON organizations;
CREATE POLICY "Service role full access organizations"
  ON organizations FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Workshop templates - service role full access
DROP POLICY IF EXISTS "Service role full access templates" ON workshop_templates;
CREATE POLICY "Service role full access templates"
  ON workshop_templates FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Modules - service role full access
DROP POLICY IF EXISTS "Service role full access modules" ON modules;
CREATE POLICY "Service role full access modules"
  ON modules FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Module steps - service role full access
DROP POLICY IF EXISTS "Service role full access module_steps" ON module_steps;
CREATE POLICY "Service role full access module_steps"
  ON module_steps FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Prompt blocks - service role full access
DROP POLICY IF EXISTS "Service role full access prompt_blocks" ON prompt_blocks;
CREATE POLICY "Service role full access prompt_blocks"
  ON prompt_blocks FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Facilitator users - service role full access
DROP POLICY IF EXISTS "Service role full access facilitator_users" ON facilitator_users;
CREATE POLICY "Service role full access facilitator_users"
  ON facilitator_users FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Votes - service role full access
DROP POLICY IF EXISTS "Service role full access votes" ON votes;
CREATE POLICY "Service role full access votes"
  ON votes FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Also ensure anon role still has necessary access for joining
-- (These should already exist but let's verify the critical ones)

-- Verify anon can read published/live sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sessions' 
    AND policyname = 'Anon view published sessions'
  ) THEN
    CREATE POLICY "Anon view published sessions"
      ON sessions FOR SELECT
      TO anon
      USING (status IN ('published', 'live'));
  END IF;
END $$;

-- Verify anon can insert participants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'participants' 
    AND policyname = 'Anon join session'
  ) THEN
    CREATE POLICY "Anon join session"
      ON participants FOR INSERT
      TO anon
      WITH CHECK (session_id IN (
        SELECT id FROM sessions WHERE status IN ('published', 'live')
      ));
  END IF;
END $$;

COMMENT ON POLICY "Service role full access sessions" ON sessions IS 
  'Service role (API backend) has unrestricted access for all operations';

COMMENT ON POLICY "Service role full access participants" ON participants IS 
  'Service role needs full access for creating and managing participants via API';
