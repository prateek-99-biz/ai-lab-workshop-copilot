-- ============================================================================
-- AI Workshop Runner - Database Schema
-- Migration: 001_initial_schema
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE session_status AS ENUM ('draft', 'published', 'live', 'ended');
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'facilitator');
CREATE TYPE event_type AS ENUM (
  'step_viewed',
  'step_completed', 
  'prompt_copied',
  'stuck_signal',
  'chatgpt_opened',
  'pdf_downloaded',
  'email_sent'
);

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  industry TEXT,
  tone_notes TEXT,
  example_use_cases TEXT[] DEFAULT '{}',
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_name ON organizations(name);

-- ============================================================================
-- FACILITATOR USERS
-- Maps Supabase Auth users to organizations
-- ============================================================================

CREATE TABLE facilitator_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'facilitator',
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_facilitator_users_user_id ON facilitator_users(user_id);
CREATE INDEX idx_facilitator_users_org_id ON facilitator_users(organization_id);

-- ============================================================================
-- WORKSHOP TEMPLATES
-- ============================================================================

CREATE TABLE workshop_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 60,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_org_id ON workshop_templates(organization_id);

-- ============================================================================
-- MODULES
-- ============================================================================

CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES workshop_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  objective TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_modules_template_id ON modules(template_id);
CREATE INDEX idx_modules_order ON modules(template_id, order_index);

-- ============================================================================
-- MODULE STEPS
-- ============================================================================

CREATE TABLE module_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instruction_markdown TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  estimated_minutes INTEGER,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_steps_module_id ON module_steps(module_id);
CREATE INDEX idx_steps_order ON module_steps(module_id, order_index);

-- ============================================================================
-- PROMPT BLOCKS
-- ============================================================================

CREATE TABLE prompt_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  step_id UUID NOT NULL REFERENCES module_steps(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  is_copyable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blocks_step_id ON prompt_blocks(step_id);
CREATE INDEX idx_blocks_order ON prompt_blocks(step_id, order_index);

-- ============================================================================
-- SESSIONS (Live Workshops)
-- ============================================================================

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES workshop_templates(id) ON DELETE RESTRICT,
  facilitator_id UUID NOT NULL REFERENCES facilitator_users(id) ON DELETE RESTRICT,
  join_code TEXT NOT NULL,
  status session_status NOT NULL DEFAULT 'draft',
  current_step_id UUID, -- References session_snapshot_steps.id (added later)
  navigation_locked BOOLEAN NOT NULL DEFAULT TRUE,
  timer_end_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-insensitive unique index on join_code for active sessions
CREATE UNIQUE INDEX idx_sessions_join_code_active 
  ON sessions(LOWER(join_code)) 
  WHERE status IN ('draft', 'published', 'live');

CREATE INDEX idx_sessions_org_id ON sessions(organization_id);
CREATE INDEX idx_sessions_facilitator_id ON sessions(facilitator_id);
CREATE INDEX idx_sessions_status ON sessions(status);

-- ============================================================================
-- SESSION SNAPSHOT TABLES
-- These store point-in-time copies of template content when session is published
-- ============================================================================

CREATE TABLE session_snapshot_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  original_module_id UUID NOT NULL REFERENCES modules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  objective TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_snapshot_modules_session ON session_snapshot_modules(session_id);
CREATE INDEX idx_snapshot_modules_order ON session_snapshot_modules(session_id, order_index);

CREATE TABLE session_snapshot_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  snapshot_module_id UUID NOT NULL REFERENCES session_snapshot_modules(id) ON DELETE CASCADE,
  original_step_id UUID NOT NULL REFERENCES module_steps(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  instruction_markdown TEXT NOT NULL, -- Rendered with variables
  instruction_markdown_raw TEXT NOT NULL, -- Original with placeholders
  order_index INTEGER NOT NULL,
  estimated_minutes INTEGER,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_snapshot_steps_session ON session_snapshot_steps(session_id);
CREATE INDEX idx_snapshot_steps_module ON session_snapshot_steps(snapshot_module_id);
CREATE INDEX idx_snapshot_steps_order ON session_snapshot_steps(snapshot_module_id, order_index);

CREATE TABLE session_snapshot_prompt_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  snapshot_step_id UUID NOT NULL REFERENCES session_snapshot_steps(id) ON DELETE CASCADE,
  original_block_id UUID NOT NULL REFERENCES prompt_blocks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL, -- Rendered with variables
  content_markdown_raw TEXT NOT NULL, -- Original with placeholders
  order_index INTEGER NOT NULL,
  is_copyable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_snapshot_blocks_session ON session_snapshot_prompt_blocks(session_id);
CREATE INDEX idx_snapshot_blocks_step ON session_snapshot_prompt_blocks(snapshot_step_id);
CREATE INDEX idx_snapshot_blocks_order ON session_snapshot_prompt_blocks(snapshot_step_id, order_index);

-- Now add foreign key for sessions.current_step_id
ALTER TABLE sessions 
  ADD CONSTRAINT fk_sessions_current_step 
  FOREIGN KEY (current_step_id) 
  REFERENCES session_snapshot_steps(id) 
  ON DELETE SET NULL;

-- ============================================================================
-- PARTICIPANTS (Attendees)
-- ============================================================================

CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT,
  email_consent BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  current_step_id UUID REFERENCES session_snapshot_steps(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_participants_session ON participants(session_id);
CREATE INDEX idx_participants_email ON participants(email) WHERE email IS NOT NULL;

-- ============================================================================
-- SUBMISSIONS
-- ============================================================================

CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES session_snapshot_steps(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submissions_participant ON submissions(participant_id);
CREATE INDEX idx_submissions_session ON submissions(session_id);
CREATE INDEX idx_submissions_step ON submissions(step_id);
CREATE UNIQUE INDEX idx_submissions_unique ON submissions(participant_id, step_id);

-- ============================================================================
-- VOTES (Optional feature for upvoting prompts)
-- ============================================================================

CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(participant_id, submission_id)
);

CREATE INDEX idx_votes_submission ON votes(submission_id);

-- ============================================================================
-- ANALYTICS EVENTS
-- ============================================================================

CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  event_type event_type NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_participant ON analytics_events(participant_id);
CREATE INDEX idx_events_session ON analytics_events(session_id);
CREATE INDEX idx_events_type ON analytics_events(event_type);
CREATE INDEX idx_events_session_type ON analytics_events(session_id, event_type);

-- ============================================================================
-- LEADS (Persisted beyond session cleanup)
-- ============================================================================

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_org ON leads(organization_id);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facilitator_users_updated_at
  BEFORE UPDATE ON facilitator_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workshop_templates_updated_at
  BEFORE UPDATE ON workshop_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_module_steps_updated_at
  BEFORE UPDATE ON module_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompt_blocks_updated_at
  BEFORE UPDATE ON prompt_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate a random join code (4-char alphanumeric, excluding ambiguous)
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excludes I, O, 0, 1
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..4 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to check if join code is available
CREATE OR REPLACE FUNCTION is_join_code_available(code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM sessions 
    WHERE LOWER(join_code) = LOWER(code) 
    AND status IN ('draft', 'published', 'live')
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get unique join code
CREATE OR REPLACE FUNCTION get_unique_join_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  attempts INTEGER := 0;
BEGIN
  LOOP
    code := generate_join_code();
    EXIT WHEN is_join_code_available(code) OR attempts > 100;
    attempts := attempts + 1;
  END LOOP;
  
  IF attempts > 100 THEN
    RAISE EXCEPTION 'Could not generate unique join code after 100 attempts';
  END IF;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;
