-- =====================================================================
-- 0003_leaderboard_by_category — per-category weekly leaderboard
-- =====================================================================
-- The base materialized view (leaderboard_weekly) aggregates across all
-- categories. Per-category tabs need an on-the-fly aggregation that
-- joins through projects and filters by category, so we expose it as a
-- SECURITY-INVOKER SQL function. Returning a "top project" per row lets
-- the UI render a thumbnail + title beside each leader without a second
-- round-trip.
-- =====================================================================

CREATE OR REPLACE FUNCTION leaderboard_by_category(
  p_category TEXT,
  p_limit    INT DEFAULT 50
)
RETURNS TABLE (
  user_id              UUID,
  github_username      TEXT,
  display_name         TEXT,
  avatar_url           TEXT,
  right_swipes_week    BIGINT,
  projects_with_swipes BIGINT,
  top_project_id       UUID,
  top_project_slug     TEXT,
  top_project_title    TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH
  -- Aggregate right-swipes per (user, project) over the last 7 days,
  -- restricted to projects in the requested category.
  swipes_by_project AS (
    SELECT
      p.user_id      AS owner_id,
      p.id           AS project_id,
      p.slug         AS project_slug,
      p.title        AS project_title,
      COUNT(s.id)    AS right_swipes
    FROM projects p
    LEFT JOIN swipes s
      ON s.project_id = p.id
      AND s.direction = 'right'
      AND s.created_at > NOW() - INTERVAL '7 days'
    WHERE p.status = 'live'
      AND p.category = p_category
    GROUP BY p.user_id, p.id, p.slug, p.title
  ),
  -- Pick the top project per owner (most right-swipes, ties broken by
  -- most recent project slug).
  top_per_owner AS (
    SELECT
      owner_id,
      project_id,
      project_slug,
      project_title,
      ROW_NUMBER() OVER (
        PARTITION BY owner_id
        ORDER BY right_swipes DESC NULLS LAST, project_slug DESC
      ) AS rn
    FROM swipes_by_project
  ),
  -- User-level totals: sum across their projects in this category.
  totals AS (
    SELECT
      owner_id,
      SUM(right_swipes)::BIGINT  AS total_swipes,
      COUNT(*) FILTER (WHERE right_swipes > 0)::BIGINT AS projects_with_swipes
    FROM swipes_by_project
    GROUP BY owner_id
  )
  SELECT
    u.id                  AS user_id,
    u.github_username,
    u.display_name,
    u.avatar_url,
    COALESCE(t.total_swipes, 0)::BIGINT          AS right_swipes_week,
    COALESCE(t.projects_with_swipes, 0)::BIGINT  AS projects_with_swipes,
    tp.project_id         AS top_project_id,
    tp.project_slug       AS top_project_slug,
    tp.project_title      AS top_project_title
  FROM users u
  JOIN totals t       ON t.owner_id = u.id
  LEFT JOIN top_per_owner tp
    ON tp.owner_id = u.id AND tp.rn = 1
  ORDER BY right_swipes_week DESC, u.github_username ASC
  LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION leaderboard_by_category(TEXT, INT)
  TO anon, authenticated;
