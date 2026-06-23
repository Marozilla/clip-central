-- Allow multiple verified handles per platform per Discord user.
ALTER TABLE social_accounts
  DROP CONSTRAINT social_accounts_discord_id_platform_key;

ALTER TABLE social_accounts
  ADD CONSTRAINT social_accounts_discord_id_platform_handle_key
  UNIQUE (discord_id, platform, handle);

CREATE INDEX IF NOT EXISTS idx_social_accounts_discord_platform
  ON social_accounts (discord_id, platform);
