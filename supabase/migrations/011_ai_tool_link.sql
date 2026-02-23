-- ============================================================================
-- Migration: 011_ai_tool_link
-- Add configurable AI tool link (name + URL) to templates and sessions
-- ============================================================================

-- Add to workshop_templates (source of truth for template editing)
ALTER TABLE workshop_templates
  ADD COLUMN ai_tool_name TEXT NOT NULL DEFAULT 'ChatGPT',
  ADD COLUMN ai_tool_url  TEXT NOT NULL DEFAULT 'https://chat.openai.com';

-- Add to sessions (snapshot-copied at session creation from template)
ALTER TABLE sessions
  ADD COLUMN ai_tool_name TEXT NOT NULL DEFAULT 'ChatGPT',
  ADD COLUMN ai_tool_url  TEXT NOT NULL DEFAULT 'https://chat.openai.com';
