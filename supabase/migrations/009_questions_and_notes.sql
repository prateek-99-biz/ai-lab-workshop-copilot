-- ============================================================================
-- AI Workshop Runner - Q&A + Facilitator Notes
-- Migration: 009_questions_and_notes
-- ============================================================================

-- Add facilitator_notes column to participants table
ALTER TABLE participants ADD COLUMN IF NOT EXISTS facilitator_notes TEXT;

-- ============================================================================
-- SESSION QUESTIONS (Public Q&A Board)
-- ============================================================================

CREATE TABLE session_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer_text TEXT,
  is_answered BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at TIMESTAMPTZ
);

CREATE INDEX idx_questions_session ON session_questions(session_id, created_at DESC);
CREATE INDEX idx_questions_participant ON session_questions(participant_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE session_questions ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (used by API routes)
CREATE POLICY "Service role full access on session_questions"
  ON session_questions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users (facilitators) can read/write
CREATE POLICY "Authenticated read session_questions"
  ON session_questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated update session_questions"
  ON session_questions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated delete session_questions"
  ON session_questions FOR DELETE
  TO authenticated
  USING (true);

-- Anon users can read questions for their session (attendees)
CREATE POLICY "Anon read session_questions"
  ON session_questions FOR SELECT
  TO anon
  USING (true);

-- Anon users can insert questions (attendees)
CREATE POLICY "Anon insert session_questions"
  ON session_questions FOR INSERT
  TO anon
  WITH CHECK (true);

-- ============================================================================
-- REALTIME
-- Enable realtime for session_questions so Q&A updates live
-- ============================================================================

-- Note: Run in Supabase SQL Editor:
-- ALTER PUBLICATION supabase_realtime ADD TABLE session_questions;

-- ============================================================================
-- Update session_progress view to include question count
-- ============================================================================

CREATE OR REPLACE VIEW session_progress AS
SELECT 
  p.session_id,
  COUNT(DISTINCT p.id) as total_participants,
  COUNT(DISTINCT CASE WHEN p.current_step_id IS NOT NULL THEN p.id END) as active_participants,
  s.current_step_id,
  COUNT(DISTINCT sub.participant_id) FILTER (WHERE sub.step_id = s.current_step_id) as current_step_completions,
  COUNT(DISTINCT ae.participant_id) FILTER (
    WHERE ae.event_type = 'stuck_signal' 
    AND ae.created_at > NOW() - INTERVAL '5 minutes'
  ) as stuck_count,
  (SELECT COUNT(*) FROM session_questions sq WHERE sq.session_id = s.id AND sq.is_answered = false) as unanswered_questions
FROM sessions s
LEFT JOIN participants p ON p.session_id = s.id
LEFT JOIN submissions sub ON sub.session_id = s.id
LEFT JOIN analytics_events ae ON ae.session_id = s.id
WHERE s.status = 'live'
GROUP BY p.session_id, s.current_step_id, s.id;

GRANT SELECT ON session_progress TO authenticated;
