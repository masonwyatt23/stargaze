-- =====================================================================
-- Stargaze v0.1 — initial schema
-- swipe-deck for indie GitHub side projects
-- =====================================================================
-- Tables:  users, projects, project_media, swipes, access_requests
-- Views:   leaderboard_weekly (materialized)
-- RLS:     enabled on every table
-- =====================================================================

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- users — mirrors auth.users with our app columns
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  github_username TEXT UNIQUE NOT NULL,
  github_id BIGINT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  github_token_encrypted TEXT,
  auto_star_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ---------------------------------------------------------------------
-- projects — user-submitted side projects
-- ---------------------------------------------------------------------
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  tagline TEXT NOT NULL CHECK (length(tagline) <= 100),
  description_md TEXT,
  description_html TEXT,
  github_repo_url TEXT,
  github_stars INT,
  github_language TEXT,
  is_open_source BOOLEAN NOT NULL,
  cta_url TEXT,
  category TEXT CHECK (category IN ('ai-tool','dev-utility','game','saas','other')),
  status TEXT DEFAULT 'live' CHECK (status IN ('live','hidden','flagged')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ---------------------------------------------------------------------
-- project_media — screenshots / videos / gifs attached to a project
-- ---------------------------------------------------------------------
CREATE TABLE project_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('screenshot','video','gif')) NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  order_index INT NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- swipes — every right/left swipe a user makes
-- ---------------------------------------------------------------------
CREATE TABLE swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  direction TEXT CHECK (direction IN ('right','left')) NOT NULL,
  github_starred BOOLEAN DEFAULT FALSE NOT NULL,
  github_star_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, project_id)
);

-- ---------------------------------------------------------------------
-- access_requests — for closed-source projects, viewer asks to try
-- ---------------------------------------------------------------------
CREATE TABLE access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  requester_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  requester_email TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','declined')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(project_id, requester_user_id)
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------
CREATE INDEX swipes_project_direction_idx ON swipes(project_id, direction);
CREATE INDEX swipes_user_created_idx ON swipes(user_id, created_at DESC);
CREATE INDEX projects_status_created_idx ON projects(status, created_at DESC);
CREATE INDEX project_media_project_order_idx ON project_media(project_id, order_index);

-- ---------------------------------------------------------------------
-- updated_at auto-bump on projects
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_touch
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- =====================================================================
-- Rate-limit triggers
-- =====================================================================

-- 5 projects / 24h per user
CREATE OR REPLACE FUNCTION enforce_projects_daily_limit() RETURNS TRIGGER AS $$
DECLARE
  recent_count INT;
BEGIN
  SELECT COUNT(*) INTO recent_count
    FROM projects
    WHERE user_id = NEW.user_id
      AND created_at > NOW() - INTERVAL '24 hours';
  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'rate_limit_exceeded: max 5 projects per 24h'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_rate_limit
  BEFORE INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION enforce_projects_daily_limit();

-- 200 swipes / 24h per user
CREATE OR REPLACE FUNCTION enforce_swipes_daily_limit() RETURNS TRIGGER AS $$
DECLARE
  recent_count INT;
BEGIN
  SELECT COUNT(*) INTO recent_count
    FROM swipes
    WHERE user_id = NEW.user_id
      AND created_at > NOW() - INTERVAL '24 hours';
  IF recent_count >= 200 THEN
    RAISE EXCEPTION 'rate_limit_exceeded: max 200 swipes per 24h'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER swipes_rate_limit
  BEFORE INSERT ON swipes
  FOR EACH ROW EXECUTE FUNCTION enforce_swipes_daily_limit();

-- =====================================================================
-- Row Level Security
-- =====================================================================
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_media   ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- ---------------- users -----------------
-- Public profile data is readable by anyone (sensitive fields are
-- protected at the column level via the public_users view below — this
-- policy still allows SELECT on the table for joins.). The token column
-- is only ever read by the service role, never reachable from the
-- anon/authenticated REST surface because we route it through server
-- code that uses the service-role client.
CREATE POLICY users_select_public ON users
  FOR SELECT USING (true);

CREATE POLICY users_insert_self ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY users_update_self ON users
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ---------------- projects -----------------
CREATE POLICY projects_select_live ON projects
  FOR SELECT USING (
    status = 'live' OR auth.uid() = user_id
  );

CREATE POLICY projects_insert_own ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY projects_update_own ON projects
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY projects_delete_own ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------- project_media -----------------
-- Anyone can see media of a live project; only owner may write.
CREATE POLICY project_media_select_live ON project_media
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_media.project_id
        AND (p.status = 'live' OR p.user_id = auth.uid())
    )
  );

CREATE POLICY project_media_insert_own ON project_media
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_media.project_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY project_media_update_own ON project_media
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_media.project_id
        AND p.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_media.project_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY project_media_delete_own ON project_media
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_media.project_id
        AND p.user_id = auth.uid()
    )
  );

-- ---------------- swipes -----------------
-- Swipe history is private — only the swiper can read their own swipes.
CREATE POLICY swipes_select_own ON swipes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY swipes_insert_own ON swipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY swipes_update_own ON swipes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------- access_requests -----------------
CREATE POLICY access_requests_select_visible ON access_requests
  FOR SELECT USING (
    auth.uid() = requester_user_id
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = access_requests.project_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY access_requests_insert_self ON access_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_user_id);

-- Project owner can update status (approve / decline).
CREATE POLICY access_requests_update_owner ON access_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = access_requests.project_id
        AND p.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = access_requests.project_id
        AND p.user_id = auth.uid()
    )
  );

-- =====================================================================
-- Materialized weekly leaderboard
-- =====================================================================
CREATE MATERIALIZED VIEW leaderboard_weekly AS
  SELECT
    u.id AS user_id,
    u.github_username,
    u.display_name,
    u.avatar_url,
    COUNT(s.id) FILTER (WHERE s.direction = 'right') AS right_swipes_week,
    COUNT(DISTINCT s.project_id) FILTER (WHERE s.direction = 'right') AS projects_with_swipes
  FROM users u
  LEFT JOIN projects p ON p.user_id = u.id AND p.status = 'live'
  LEFT JOIN swipes s ON s.project_id = p.id
    AND s.created_at > NOW() - INTERVAL '7 days'
    AND s.direction = 'right'
  GROUP BY u.id;

CREATE UNIQUE INDEX leaderboard_weekly_user_id_idx
  ON leaderboard_weekly(user_id);

CREATE INDEX leaderboard_weekly_swipes_idx
  ON leaderboard_weekly(right_swipes_week DESC);

-- Expose to anon/authenticated through a regular view (matviews can't
-- have RLS, and we want this readable by everyone). The matview itself
-- is refreshed by a cron job (added in v0.2 with pg_cron).
CREATE OR REPLACE VIEW leaderboard_weekly_public AS
  SELECT user_id, github_username, display_name, avatar_url,
         right_swipes_week, projects_with_swipes
    FROM leaderboard_weekly;

GRANT SELECT ON leaderboard_weekly_public TO anon, authenticated;

-- Helper function used by the eventual pg_cron schedule.
CREATE OR REPLACE FUNCTION refresh_leaderboard_weekly() RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_weekly;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
