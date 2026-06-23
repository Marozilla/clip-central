-- User stats summary for Discord bot "My Stats" button

CREATE OR REPLACE FUNCTION get_user_stats(p_discord_id TEXT)
RETURNS TABLE (
  approved_clips BIGINT,
  total_views_gained BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COUNT(c.id) FILTER (WHERE c.status IN ('approved', 'tracking'))::BIGINT AS approved_clips,
    COALESCE(
      SUM(
        CASE
          WHEN c.status IN ('approved', 'tracking') THEN
            GREATEST(c.current_views - c.initial_views, 0)
          ELSE 0
        END
      ),
      0
    )::BIGINT AS total_views_gained
  FROM clips c
  WHERE c.discord_id = p_discord_id
    AND c.status != 'deleted';
$$;
