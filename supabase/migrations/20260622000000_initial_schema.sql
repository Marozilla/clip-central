-- Clip Central — full initial schema
-- Applied to Supabase project: vesfjjekalfcvpevluxx (Clip Central)

CREATE TYPE platform AS ENUM ('youtube', 'tiktok', 'instagram', 'twitter');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');
CREATE TYPE clip_status AS ENUM ('pending', 'approved', 'rejected', 'tracking', 'deleted');
CREATE TYPE queue_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE users (
  discord_id TEXT PRIMARY KEY,
  discord_username TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
  platform platform NOT NULL,
  handle TEXT NOT NULL,
  verification_code TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (discord_id, platform)
);

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status campaign_status NOT NULL DEFAULT 'draft',
  rate_per_view DECIMAL(10, 6) NOT NULL,
  budget_cap DECIMAL(12, 2),
  platforms platform[] NOT NULL DEFAULT '{}',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  discord_guild_id TEXT,
  discord_channel_id TEXT,
  discord_message_id TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE campaign_participants (
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  discord_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (campaign_id, discord_id)
);

CREATE TABLE clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  discord_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
  platform platform NOT NULL,
  video_id TEXT NOT NULL,
  url TEXT NOT NULL,
  status clip_status NOT NULL DEFAULT 'pending',
  initial_views BIGINT NOT NULL DEFAULT 0,
  current_views BIGINT NOT NULL DEFAULT 0,
  title TEXT,
  thumbnail_url TEXT,
  owner_handle TEXT,
  failure_strikes INT NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reject_reason TEXT,
  UNIQUE (campaign_id, platform, video_id)
);

CREATE TABLE submission_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status queue_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE clip_view_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  views BIGINT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE worker_heartbeat (
  id TEXT PRIMARY KEY DEFAULT 'main',
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO worker_heartbeat (id) VALUES ('main') ON CONFLICT DO NOTHING;

CREATE INDEX idx_social_accounts_discord ON social_accounts(discord_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_clips_campaign ON clips(campaign_id);
CREATE INDEX idx_clips_status ON clips(status);
CREATE INDEX idx_clips_discord ON clips(discord_id);
CREATE INDEX idx_submission_queue_status ON submission_queue(status, created_at);
CREATE INDEX idx_clip_view_history_clip ON clip_view_history(clip_id, captured_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE clip_view_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_heartbeat ENABLE ROW LEVEL SECURITY;
