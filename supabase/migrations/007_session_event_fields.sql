-- ============================================================================
-- Migration: 007_session_event_fields
-- Adds event/session detail fields to sessions table
-- ============================================================================

-- Add event type enum
DO $$ BEGIN
  CREATE TYPE event_category AS ENUM ('keynote', 'halfday', 'fullday');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to sessions
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS poc_name TEXT,
  ADD COLUMN IF NOT EXISTS event_type event_category,
  ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ;
