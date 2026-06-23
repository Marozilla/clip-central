-- Payout controls + custom campaign embed media
--
-- min_views_for_payout: a per-campaign threshold of views (counted AFTER a clip's
--   initial views at submission) that are NOT paid out. Payout only begins once a
--   clip passes initial_views + min_views_for_payout. Example: a clip submitted at
--   500 views with min_views_for_payout = 1000 starts earning at 1500 views.
--
-- embed_thumbnail_url / embed_image_url: optional custom media for the Discord
--   campaign embed. When embed_thumbnail_url is empty the bot falls back to the
--   Clip Central logo.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS min_views_for_payout BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS embed_thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS embed_image_url TEXT;

ALTER TABLE campaigns
  ADD CONSTRAINT campaigns_min_views_for_payout_nonneg
  CHECK (min_views_for_payout >= 0);

COMMENT ON COLUMN campaigns.min_views_for_payout IS 'Views after a clip''s initial_views that are not paid out. Payout starts after initial_views + this threshold.';
COMMENT ON COLUMN campaigns.embed_thumbnail_url IS 'Optional custom thumbnail (top-right) for the Discord campaign embed. Falls back to the Clip Central logo when null.';
COMMENT ON COLUMN campaigns.embed_image_url IS 'Optional large hero image (bottom) for the Discord campaign embed.';
