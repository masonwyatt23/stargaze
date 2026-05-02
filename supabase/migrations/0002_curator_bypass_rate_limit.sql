-- Allow the @stargaze-curator (and any future seed/system accounts) to bypass
-- the per-user rate limit triggers. We mark them via github_id = 0 because real
-- GitHub users always have positive ids.

CREATE OR REPLACE FUNCTION enforce_projects_daily_limit() RETURNS TRIGGER AS $$
DECLARE
  recent_count INT;
  is_system BOOLEAN;
BEGIN
  SELECT (github_id = 0) INTO is_system FROM users WHERE id = NEW.user_id;
  IF COALESCE(is_system, FALSE) THEN
    RETURN NEW;
  END IF;

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

CREATE OR REPLACE FUNCTION enforce_swipes_daily_limit() RETURNS TRIGGER AS $$
DECLARE
  recent_count INT;
  is_system BOOLEAN;
BEGIN
  SELECT (github_id = 0) INTO is_system FROM users WHERE id = NEW.user_id;
  IF COALESCE(is_system, FALSE) THEN
    RETURN NEW;
  END IF;

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
