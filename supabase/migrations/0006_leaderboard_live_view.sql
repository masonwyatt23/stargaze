-- =====================================================================
-- 0006: convert leaderboard_weekly from materialized view to regular view
-- =====================================================================
-- Why:
--   The materialized view was populated at v0.1 migration time (when the
--   users table was empty) and has no refresh schedule, so production
--   leaderboard reads return zero rows even when swipes exist.
--
--   At current scale (low-2-digit users, low-3-digit swipes/day) a regular
--   view computes in under 5ms and removes the staleness class of bug
--   entirely. Re-promote to a materialized view + pg_cron once read volume
--   on /leaderboard makes the cost actually matter.
-- =====================================================================

-- Drop in dependency order: dependent view first, function next, then matview.
DROP VIEW IF EXISTS leaderboard_weekly_public;
DROP FUNCTION IF EXISTS refresh_leaderboard_weekly();
DROP MATERIALIZED VIEW IF EXISTS leaderboard_weekly;

-- Live view — same shape and semantics as the original matview.
CREATE OR REPLACE VIEW leaderboard_weekly AS
  SELECT
    u.id AS user_id,
    u.github_username,
    u.display_name,
    u.avatar_url,
    COUNT(s.id) FILTER (WHERE s.direction = 'right') AS right_swipes_week,
    COUNT(DISTINCT s.project_id) FILTER (WHERE s.direction = 'right')
      AS projects_with_swipes
  FROM users u
  LEFT JOIN projects p
    ON p.user_id = u.id AND p.status = 'live'
  LEFT JOIN swipes s
    ON s.project_id = p.id
   AND s.created_at > NOW() - INTERVAL '7 days'
   AND s.direction = 'right'
  GROUP BY u.id;

-- Public-facing wrapper view (so the API surface stays identical).
CREATE OR REPLACE VIEW leaderboard_weekly_public AS
  SELECT user_id, github_username, display_name, avatar_url,
         right_swipes_week, projects_with_swipes
    FROM leaderboard_weekly;

GRANT SELECT ON leaderboard_weekly        TO anon, authenticated;
GRANT SELECT ON leaderboard_weekly_public TO anon, authenticated;

-- Stub the refresh function so any caller that still invokes it is a no-op
-- instead of erroring (callers exist in: cron jobs, edge functions, scripts).
CREATE OR REPLACE FUNCTION refresh_leaderboard_weekly() RETURNS void AS $$
BEGIN
  -- no-op; leaderboard_weekly is now a live view.
END;
$$ LANGUAGE plpgsql;
