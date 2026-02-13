-- ============================================================================
-- AI Workshop Runner - Row Level Security Policies
-- Migration: 002_rls_policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilitator_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_snapshot_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_snapshot_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_snapshot_prompt_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Check if current user is a facilitator for an organization
CREATE OR REPLACE FUNCTION is_facilitator_of_org(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM facilitator_users
    WHERE user_id = auth.uid()
    AND organization_id = org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is owner/admin of an organization
CREATE OR REPLACE FUNCTION is_admin_of_org(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM facilitator_users
    WHERE user_id = auth.uid()
    AND organization_id = org_id
    AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's organization IDs
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT organization_id FROM facilitator_users
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ORGANIZATIONS POLICIES
-- ============================================================================

-- Facilitators can view their organizations
CREATE POLICY "Facilitators can view own orgs"
  ON organizations FOR SELECT
  TO authenticated
  USING (id IN (SELECT get_user_org_ids()));

-- Owners/Admins can update their organizations
CREATE POLICY "Admins can update own orgs"
  ON organizations FOR UPDATE
  TO authenticated
  USING (is_admin_of_org(id))
  WITH CHECK (is_admin_of_org(id));

-- Only owners can insert organizations (handled via service role initially)
CREATE POLICY "Service role can insert orgs"
  ON organizations FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

-- ============================================================================
-- FACILITATOR USERS POLICIES
-- ============================================================================

-- Users can view facilitators in their organizations
CREATE POLICY "View org facilitators"
  ON facilitator_users FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()));

-- Owners/Admins can manage facilitators
CREATE POLICY "Admins manage facilitators"
  ON facilitator_users FOR ALL
  TO authenticated
  USING (is_admin_of_org(organization_id))
  WITH CHECK (is_admin_of_org(organization_id));

-- ============================================================================
-- WORKSHOP TEMPLATES POLICIES
-- ============================================================================

-- Facilitators can view templates in their org
CREATE POLICY "View org templates"
  ON workshop_templates FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()));

-- Facilitators can manage templates in their org
CREATE POLICY "Manage org templates"
  ON workshop_templates FOR ALL
  TO authenticated
  USING (is_facilitator_of_org(organization_id))
  WITH CHECK (is_facilitator_of_org(organization_id));

-- ============================================================================
-- MODULES POLICIES
-- ============================================================================

-- Facilitators can view modules for their templates
CREATE POLICY "View org modules"
  ON modules FOR SELECT
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM workshop_templates 
      WHERE organization_id IN (SELECT get_user_org_ids())
    )
  );

-- Facilitators can manage modules
CREATE POLICY "Manage org modules"
  ON modules FOR ALL
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM workshop_templates 
      WHERE organization_id IN (SELECT get_user_org_ids())
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT id FROM workshop_templates 
      WHERE organization_id IN (SELECT get_user_org_ids())
    )
  );

-- ============================================================================
-- MODULE STEPS POLICIES
-- ============================================================================

-- Facilitators can view steps
CREATE POLICY "View org steps"
  ON module_steps FOR SELECT
  TO authenticated
  USING (
    module_id IN (
      SELECT m.id FROM modules m
      JOIN workshop_templates t ON m.template_id = t.id
      WHERE t.organization_id IN (SELECT get_user_org_ids())
    )
  );

-- Facilitators can manage steps
CREATE POLICY "Manage org steps"
  ON module_steps FOR ALL
  TO authenticated
  USING (
    module_id IN (
      SELECT m.id FROM modules m
      JOIN workshop_templates t ON m.template_id = t.id
      WHERE t.organization_id IN (SELECT get_user_org_ids())
    )
  )
  WITH CHECK (
    module_id IN (
      SELECT m.id FROM modules m
      JOIN workshop_templates t ON m.template_id = t.id
      WHERE t.organization_id IN (SELECT get_user_org_ids())
    )
  );

-- ============================================================================
-- PROMPT BLOCKS POLICIES
-- ============================================================================

-- Facilitators can view blocks
CREATE POLICY "View org blocks"
  ON prompt_blocks FOR SELECT
  TO authenticated
  USING (
    step_id IN (
      SELECT ms.id FROM module_steps ms
      JOIN modules m ON ms.module_id = m.id
      JOIN workshop_templates t ON m.template_id = t.id
      WHERE t.organization_id IN (SELECT get_user_org_ids())
    )
  );

-- Facilitators can manage blocks
CREATE POLICY "Manage org blocks"
  ON prompt_blocks FOR ALL
  TO authenticated
  USING (
    step_id IN (
      SELECT ms.id FROM module_steps ms
      JOIN modules m ON ms.module_id = m.id
      JOIN workshop_templates t ON m.template_id = t.id
      WHERE t.organization_id IN (SELECT get_user_org_ids())
    )
  )
  WITH CHECK (
    step_id IN (
      SELECT ms.id FROM module_steps ms
      JOIN modules m ON ms.module_id = m.id
      JOIN workshop_templates t ON m.template_id = t.id
      WHERE t.organization_id IN (SELECT get_user_org_ids())
    )
  );

-- ============================================================================
-- SESSIONS POLICIES
-- ============================================================================

-- Facilitators can view sessions in their org
CREATE POLICY "View org sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()));

-- Facilitators can manage sessions they facilitate
CREATE POLICY "Manage own sessions"
  ON sessions FOR ALL
  TO authenticated
  USING (
    facilitator_id IN (
      SELECT id FROM facilitator_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    facilitator_id IN (
      SELECT id FROM facilitator_users WHERE user_id = auth.uid()
    )
  );

-- Anonymous users can view published/live sessions by join code (for joining)
CREATE POLICY "Anon view published sessions"
  ON sessions FOR SELECT
  TO anon
  USING (status IN ('published', 'live'));

-- ============================================================================
-- SESSION SNAPSHOT POLICIES
-- ============================================================================

-- Facilitators can view snapshots for their sessions
CREATE POLICY "Facilitator view snapshots"
  ON session_snapshot_modules FOR SELECT
  TO authenticated
  USING (session_id IN (
    SELECT id FROM sessions WHERE organization_id IN (SELECT get_user_org_ids())
  ));

CREATE POLICY "Facilitator view snapshot steps"
  ON session_snapshot_steps FOR SELECT
  TO authenticated
  USING (session_id IN (
    SELECT id FROM sessions WHERE organization_id IN (SELECT get_user_org_ids())
  ));

CREATE POLICY "Facilitator view snapshot blocks"
  ON session_snapshot_prompt_blocks FOR SELECT
  TO authenticated
  USING (session_id IN (
    SELECT id FROM sessions WHERE organization_id IN (SELECT get_user_org_ids())
  ));

-- Anonymous attendees can view snapshots for their session
-- Note: Actual session validation happens via session token in app layer
CREATE POLICY "Anon view snapshot modules"
  ON session_snapshot_modules FOR SELECT
  TO anon
  USING (session_id IN (
    SELECT id FROM sessions WHERE status IN ('published', 'live')
  ));

CREATE POLICY "Anon view snapshot steps"
  ON session_snapshot_steps FOR SELECT
  TO anon
  USING (session_id IN (
    SELECT id FROM sessions WHERE status IN ('published', 'live')
  ));

CREATE POLICY "Anon view snapshot blocks"
  ON session_snapshot_prompt_blocks FOR SELECT
  TO anon
  USING (session_id IN (
    SELECT id FROM sessions WHERE status IN ('published', 'live')
  ));

-- Service role for inserting snapshots
CREATE POLICY "Service insert snapshots modules"
  ON session_snapshot_modules FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

CREATE POLICY "Service insert snapshots steps"
  ON session_snapshot_steps FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

CREATE POLICY "Service insert snapshots blocks"
  ON session_snapshot_prompt_blocks FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

-- ============================================================================
-- PARTICIPANTS POLICIES
-- ============================================================================

-- Facilitators can view participants in their sessions
CREATE POLICY "Facilitator view participants"
  ON participants FOR SELECT
  TO authenticated
  USING (session_id IN (
    SELECT id FROM sessions WHERE organization_id IN (SELECT get_user_org_ids())
  ));

-- Anonymous can insert themselves as participants
CREATE POLICY "Anon join session"
  ON participants FOR INSERT
  TO anon
  WITH CHECK (session_id IN (
    SELECT id FROM sessions WHERE status IN ('published', 'live')
  ));

-- Anonymous can view only their own participant record
-- This is enforced at app layer via session token
CREATE POLICY "Anon view own participant"
  ON participants FOR SELECT
  TO anon
  USING (TRUE); -- App layer validates via token

-- Anonymous can update their own participant (via app layer token validation)
CREATE POLICY "Anon update own participant"
  ON participants FOR UPDATE
  TO anon
  USING (TRUE)
  WITH CHECK (TRUE); -- App layer validates via token

-- ============================================================================
-- SUBMISSIONS POLICIES
-- ============================================================================

-- Facilitators can view submissions in their sessions
CREATE POLICY "Facilitator view submissions"
  ON submissions FOR SELECT
  TO authenticated
  USING (session_id IN (
    SELECT id FROM sessions WHERE organization_id IN (SELECT get_user_org_ids())
  ));

-- Anonymous can insert submissions (validated via token in app layer)
CREATE POLICY "Anon create submission"
  ON submissions FOR INSERT
  TO anon
  WITH CHECK (session_id IN (
    SELECT id FROM sessions WHERE status = 'live'
  ));

-- Anonymous can view own submissions
CREATE POLICY "Anon view own submissions"
  ON submissions FOR SELECT
  TO anon
  USING (TRUE); -- App layer validates via token

-- Anonymous can update own submissions
CREATE POLICY "Anon update own submissions"
  ON submissions FOR UPDATE
  TO anon
  USING (TRUE)
  WITH CHECK (TRUE); -- App layer validates via token

-- ============================================================================
-- VOTES POLICIES
-- ============================================================================

-- Facilitators can view votes
CREATE POLICY "Facilitator view votes"
  ON votes FOR SELECT
  TO authenticated
  USING (submission_id IN (
    SELECT id FROM submissions WHERE session_id IN (
      SELECT id FROM sessions WHERE organization_id IN (SELECT get_user_org_ids())
    )
  ));

-- Anonymous can vote (validated via token)
CREATE POLICY "Anon create vote"
  ON votes FOR INSERT
  TO anon
  WITH CHECK (TRUE); -- App layer validates

-- ============================================================================
-- ANALYTICS EVENTS POLICIES
-- ============================================================================

-- Facilitators can view analytics for their sessions
CREATE POLICY "Facilitator view analytics"
  ON analytics_events FOR SELECT
  TO authenticated
  USING (session_id IN (
    SELECT id FROM sessions WHERE organization_id IN (SELECT get_user_org_ids())
  ));

-- Anonymous can insert events (validated via token)
CREATE POLICY "Anon create event"
  ON analytics_events FOR INSERT
  TO anon
  WITH CHECK (session_id IN (
    SELECT id FROM sessions WHERE status = 'live'
  ));

-- ============================================================================
-- LEADS POLICIES
-- ============================================================================

-- Facilitators/Admins can view leads for their org
CREATE POLICY "View org leads"
  ON leads FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()));

-- Service role can insert leads
CREATE POLICY "Service insert leads"
  ON leads FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

-- Anonymous can insert leads (when providing email at end of session)
CREATE POLICY "Anon create lead"
  ON leads FOR INSERT
  TO anon
  WITH CHECK (TRUE); -- App validates consent
