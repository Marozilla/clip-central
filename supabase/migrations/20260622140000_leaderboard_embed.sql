-- Live Discord leaderboard embed settings + top-users aggregation

CREATE TABLE leaderboard_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  enabled BOOLEAN NOT NULL DEFAULT false,
  discord_channel_id TEXT,
  discord_message_id TEXT,
  refresh_interval_minutes INT NOT NULL DEFAULT 10
    CHECK (refresh_interval_minutes >= 1 AND refresh_interval_minutes <= 60),
  last_posted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO leaderboard_settings (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION update_leaderboard_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leaderboard_settings_updated_at
  BEFORE UPDATE ON leaderboard_settings
  FOR EACH ROW EXECUTE FUNCTION update_leaderboard_settings_updated_at();

ALTER TABLE leaderboard_settings ENABLE ROW LEVEL SECURITY;

-- Top creators by campaign-attributed view growth (approved + tracking clips)
CREATE OR REPLACE FUNCTION get_leaderboard_top_users(p_limit INT DEFAULT 10)
RETURNS TABLE (
  rank BIGINT,
  discord_id TEXT,
  discord_username TEXT,
  discord_avatar TEXT,
  total_views BIGINT,
  clip_count BIGINT
)
LANGUAGE sql
STABLE
AS $$
  WITH ranked AS (
    SELECT
      u.discord_id,
      u.discord_username,
      u.discord_avatar,
      COALESCE(SUM(GREATEST(c.current_views - c.initial_views, 0)), 0)::BIGINT AS total_views,
      COUNT(c.id)::BIGINT AS clip_count
    FROM users u
    INNER JOIN clips c ON c.discord_id = u.discord_id
      AND c.status IN ('approved', 'tracking')
    GROUP BY u.discord_id, u.discord_username, u.discord_avatar
    HAVING COALESCE(SUM(GREATEST(c.current_views - c.initial_views, 0)), 0) > 0
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY total_views DESC, discord_id)::BIGINT AS rank,
    discord_id,
    discord_username,
    discord_avatar,
    total_views,
    clip_count
  FROM ranked
  ORDER BY total_views DESC, discord_id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
$$;
