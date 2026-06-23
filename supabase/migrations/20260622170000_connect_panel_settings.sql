-- Connect Socials panel embed settings
--
-- A single managed Discord message (with the "Connect Account" button) that lets
-- creators link their social accounts. Admins pick the channel and optionally
-- override the title/description from the admin settings page; the bot posts the
-- embed and edits it in place on later syncs.

CREATE TABLE connect_panel_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  discord_channel_id TEXT,
  discord_message_id TEXT,
  title TEXT,
  description TEXT,
  last_posted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO connect_panel_settings (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION update_connect_panel_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER connect_panel_settings_updated_at
  BEFORE UPDATE ON connect_panel_settings
  FOR EACH ROW EXECUTE FUNCTION update_connect_panel_settings_updated_at();

ALTER TABLE connect_panel_settings ENABLE ROW LEVEL SECURITY;
