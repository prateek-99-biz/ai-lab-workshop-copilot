-- ============================================================================
-- Migration: 012_submission_images
-- Add image_url column to submissions + create storage bucket for images
-- ============================================================================

-- Add image_url column to submissions
ALTER TABLE submissions
  ADD COLUMN image_url TEXT;

-- Create bucket for submission images (screenshots, prompt results, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submission-images',
  'submission-images',
  TRUE, -- Public so gallery loads without signed URLs
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for submission-images bucket

-- Service role can upload (participants use custom JWT, not Supabase Auth)
CREATE POLICY "Service upload submission images"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'submission-images');

-- Service role can overwrite (re-upload replaces previous image)
CREATE POLICY "Service update submission images"
  ON storage.objects FOR UPDATE
  TO service_role
  USING (bucket_id = 'submission-images');

-- Service role can delete
CREATE POLICY "Service delete submission images"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'submission-images');

-- Anyone can view submission images (public bucket)
CREATE POLICY "Public view submission images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'submission-images');
