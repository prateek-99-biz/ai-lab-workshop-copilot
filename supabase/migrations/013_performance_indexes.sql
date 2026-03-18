-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Optimizes feedback status queries (used in email prompt-pack route)
CREATE INDEX IF NOT EXISTS idx_participants_feedback
  ON participants(session_id, feedback_submitted);

-- Optimizes submission ordering/lookup by update time
CREATE INDEX IF NOT EXISTS idx_submissions_updated
  ON submissions(session_id, updated_at DESC);

-- Optimizes analytics time-range reporting
CREATE INDEX IF NOT EXISTS idx_events_created
  ON analytics_events(session_id, created_at DESC);

-- Optimizes admin session listing (status filter + date sort)
CREATE INDEX IF NOT EXISTS idx_sessions_status_date
  ON sessions(status, created_at DESC);

-- Optimizes completion count queries per step
CREATE INDEX IF NOT EXISTS idx_submissions_step
  ON submissions(session_id, step_id);
