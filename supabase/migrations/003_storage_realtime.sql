-- ============================================================================
-- AI Workshop Runner - Storage & Realtime Configuration
-- Migration: 003_storage_realtime
-- ============================================================================

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create bucket for prompt pack PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prompt-packs',
  'prompt-packs',
  FALSE, -- Not public, requires signed URLs
  5242880, -- 5MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Create bucket for organization logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-logos',
  'org-logos',
  TRUE, -- Public
  2097152, -- 2MB limit
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Prompt packs: Service role can upload
CREATE POLICY "Service upload prompt packs"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'prompt-packs');

-- Prompt packs: Signed URL access (handled by Supabase)
CREATE POLICY "Signed URL access prompt packs"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'prompt-packs');

-- Org logos: Authenticated users can upload to their org
CREATE POLICY "Upload org logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'org-logos' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM organizations 
      WHERE id IN (SELECT get_user_org_ids())
    )
  );

-- Org logos: Anyone can view
CREATE POLICY "View org logos"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'org-logos');

-- ============================================================================
-- REALTIME PUBLICATION
-- Enable realtime for tables that need live updates
-- ============================================================================

-- Note: Run these after enabling realtime in Supabase dashboard
-- ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE participants;
-- ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE analytics_events;

-- Create a view for presenter mode progress tracking
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
  ) as stuck_count
FROM sessions s
LEFT JOIN participants p ON p.session_id = s.id
LEFT JOIN submissions sub ON sub.session_id = s.id
LEFT JOIN analytics_events ae ON ae.session_id = s.id
WHERE s.status = 'live'
GROUP BY p.session_id, s.current_step_id;

-- Grant select on the view
GRANT SELECT ON session_progress TO authenticated;
