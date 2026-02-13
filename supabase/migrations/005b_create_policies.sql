-- ============================================================================
-- AI Workshop Runner - Create Service Role Policies
-- Run this AFTER 005a_cleanup_policies.sql
-- ============================================================================

-- Grant view access
GRANT ALL ON session_progress TO service_role;
GRANT SELECT ON session_progress TO authenticated;

-- Create service role policies for all tables
CREATE POLICY "Service role full access sessions" 
  ON sessions FOR ALL 
  TO service_role 
  USING (TRUE) 
  WITH CHECK (TRUE);

CREATE POLICY "Service role full access participants"
  ON participants FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "Service role full access submissions"
  ON submissions FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "Service role full access analytics"
  ON analytics_events FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "Service role full access leads"
  ON leads FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "Service role full access feedback"
  ON feedback FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "Service role full access snapshot modules"
  ON session_snapshot_modules FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "Service role full access snapshot steps"
  ON session_snapshot_steps FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "Service role full access snapshot blocks"
  ON session_snapshot_prompt_blocks FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "Service role full access organizations"
  ON organizations FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "Service role full access templates"
  ON workshop_templates FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "Service role full access modules"
  ON modules FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "Service role full access module_steps"
  ON module_steps FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "Service role full access prompt_blocks"
  ON prompt_blocks FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "Service role full access facilitator_users"
  ON facilitator_users FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "Service role full access votes"
  ON votes FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Comments
COMMENT ON POLICY "Service role full access sessions" ON sessions IS 
  'Service role (API backend) has unrestricted access for all operations';

COMMENT ON POLICY "Service role full access participants" ON participants IS 
  'Service role needs full access for creating and managing participants via API';
