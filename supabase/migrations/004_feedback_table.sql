-- ============================================================================
-- AI Workshop Runner - Feedback System
-- Migration: 004_feedback_table
-- ============================================================================

-- Add feedback_submitted to event_type enum
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'feedback_submitted';

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT NOT NULL,
  most_valuable TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one feedback per participant per session
  UNIQUE(session_id, participant_id)
);

-- Indexes
CREATE INDEX idx_feedback_session_id ON feedback(session_id);
CREATE INDEX idx_feedback_participant_id ON feedback(participant_id);
CREATE INDEX idx_feedback_rating ON feedback(rating);
CREATE INDEX idx_feedback_submitted_at ON feedback(submitted_at);

-- RLS Policies
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Facilitators can view feedback for their organization's sessions
CREATE POLICY "Facilitators can view feedback for their sessions"
  ON feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      INNER JOIN facilitator_users fu ON fu.organization_id = s.organization_id
      WHERE s.id = feedback.session_id
      AND fu.user_id = auth.uid()
    )
  );

-- Service role can insert feedback (via API)
CREATE POLICY "Service role can manage feedback"
  ON feedback
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Add feedback_submitted flag to participants table
ALTER TABLE participants 
  ADD COLUMN IF NOT EXISTS feedback_submitted BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_participants_feedback_submitted 
  ON participants(feedback_submitted) 
  WHERE feedback_submitted = TRUE;

-- Update existing participants to false (if any)
UPDATE participants SET feedback_submitted = FALSE WHERE feedback_submitted IS NULL;

COMMENT ON TABLE feedback IS 'Stores participant feedback for workshop sessions';
COMMENT ON COLUMN feedback.rating IS 'Rating from 1-5 stars';
COMMENT ON COLUMN feedback.feedback IS 'General feedback text';
COMMENT ON COLUMN feedback.most_valuable IS 'Optional: What participant found most valuable';
COMMENT ON COLUMN participants.feedback_submitted IS 'Flag to track if participant has submitted feedback';
