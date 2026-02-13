-- ============================================================================
-- Cleanup: Drop all service role policies before recreating
-- Run this FIRST, then run 005_fix_session_access.sql
-- ============================================================================

-- Drop all service role policies that we're about to recreate
DROP POLICY IF EXISTS "Service role full access sessions" ON sessions;
DROP POLICY IF EXISTS "Service role full access participants" ON participants;
DROP POLICY IF EXISTS "Service role full access submissions" ON submissions;
DROP POLICY IF EXISTS "Service role full access analytics" ON analytics_events;
DROP POLICY IF EXISTS "Service insert leads" ON leads;
DROP POLICY IF EXISTS "Service role full access leads" ON leads;
DROP POLICY IF EXISTS "Service role full access feedback" ON feedback;
DROP POLICY IF EXISTS "Service role full access snapshot modules" ON session_snapshot_modules;
DROP POLICY IF EXISTS "Service role full access snapshot steps" ON session_snapshot_steps;
DROP POLICY IF EXISTS "Service role full access snapshot blocks" ON session_snapshot_prompt_blocks;
DROP POLICY IF EXISTS "Service role can insert orgs" ON organizations;
DROP POLICY IF EXISTS "Service role full access organizations" ON organizations;
DROP POLICY IF EXISTS "Service role full access templates" ON workshop_templates;
DROP POLICY IF EXISTS "Service role full access modules" ON modules;
DROP POLICY IF EXISTS "Service role full access module_steps" ON module_steps;
DROP POLICY IF EXISTS "Service role full access prompt_blocks" ON prompt_blocks;
DROP POLICY IF EXISTS "Service role full access facilitator_users" ON facilitator_users;
DROP POLICY IF EXISTS "Service role full access votes" ON votes;
