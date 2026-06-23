-- Clip video metadata + private thumbnail storage paths

ALTER TABLE clips
  ADD COLUMN IF NOT EXISTS video_metadata JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS thumbnail_path TEXT,
  ADD COLUMN IF NOT EXISTS metadata_fetched_at TIMESTAMPTZ;

COMMENT ON COLUMN clips.video_metadata IS 'Snapshot of platform video stats from Scrape Creators (no external thumbnail URLs after mirror)';
COMMENT ON COLUMN clips.thumbnail_path IS 'Private Supabase storage object path — served via admin /api/media proxy';
COMMENT ON COLUMN clips.thumbnail_url IS 'Deprecated: legacy external URL, cleared after mirror';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clip-assets',
  'clip-assets',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
