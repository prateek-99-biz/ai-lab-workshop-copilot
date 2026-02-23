-- Drop the session_progress view
-- Reason: The view is not used by any application code and was flagged by Supabase's
-- security linter because it runs with SECURITY DEFINER semantics (the view owner's
-- permissions), bypassing RLS on underlying tables (sessions, participants, submissions,
-- analytics_events, session_questions).

DROP VIEW IF EXISTS public.session_progress;
