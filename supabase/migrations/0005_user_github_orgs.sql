-- 0005_user_github_orgs.sql
-- Track each user's GitHub org memberships (lowercased login slugs) so the
-- claim flow can match repos owned by orgs the user belongs to, not just
-- repos under their personal namespace.
--
-- Refreshed on every OAuth sign-in via app/auth/callback/route.ts.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS github_orgs TEXT[] NOT NULL DEFAULT '{}';

-- GIN index supports the array containment / overlap operators used by the
-- claim flow when filtering candidate projects by owner membership.
CREATE INDEX IF NOT EXISTS users_github_orgs_idx
  ON users USING GIN (github_orgs);
