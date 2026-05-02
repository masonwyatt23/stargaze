/**
 * Personalization for the swipe deck.
 *
 * Builds a "user taste" profile from past right-swipes (counts per category +
 * language) and scores candidate projects with a linear combination of
 * recency, popularity, GitHub-stars signal, and personalization affinity.
 *
 * Cold-start: profiles with fewer than 5 right-swipes fall back to recency +
 * popularity only (no personalization weight) so brand-new accounts still get
 * a sensible feed.
 *
 * All functions here are pure — no Supabase imports, no I/O, easy to test.
 */

const PERSONALIZATION_THRESHOLD = 5;

export type TasteProfile = {
  categories: Map<string, number>;
  languages: Map<string, number>;
  total: number;
};

export type ScoreInputs = {
  category: string | null;
  github_language: string | null;
  github_stars: number | null;
  created_at: string;
  right_swipes: number;
  total_swipes: number;
  has_demo_video: boolean;
};

/** Build a taste profile from a list of past right-swipes. */
export function buildUserProfile(
  swipes: Array<{ category: string | null; language: string | null }>,
): TasteProfile {
  const categories = new Map<string, number>();
  const languages = new Map<string, number>();
  for (const s of swipes) {
    if (s.category) categories.set(s.category, (categories.get(s.category) ?? 0) + 1);
    if (s.language) languages.set(s.language, (languages.get(s.language) ?? 0) + 1);
  }
  return { categories, languages, total: swipes.length };
}

/** Score a single project against the profile + global signals. Higher = better. */
export function scoreProject(
  p: ScoreInputs,
  profile: TasteProfile,
  now: Date = new Date(),
): number {
  const ageHours = Math.max(
    0,
    (now.getTime() - new Date(p.created_at).getTime()) / 36e5,
  );

  // Recency decays over ~3 days
  const recency = Math.exp(-ageHours / (24 * 3));

  // Right-swipe rate (clamped) — high signal of project quality
  const rate =
    p.total_swipes > 0
      ? Math.max(0, Math.min(1, p.right_swipes / p.total_swipes))
      : 0;
  // Logarithmic on count so a few high-density projects don't dominate
  const density = rate * Math.log1p(p.right_swipes) * 0.4;

  // GitHub stars signal — log-normalized
  const stars = Math.log1p(p.github_stars ?? 0) / 10;

  // Personalization: how much this project's category + language match the user
  let personal = 0;
  if (profile.total >= PERSONALIZATION_THRESHOLD) {
    const catWeight =
      p.category && profile.categories.has(p.category)
        ? (profile.categories.get(p.category) ?? 0) / profile.total
        : 0;
    const langWeight =
      p.github_language && profile.languages.has(p.github_language)
        ? (profile.languages.get(p.github_language) ?? 0) / profile.total
        : 0;
    // Cosine-ish: emphasize where both vector terms align
    personal = catWeight * 0.6 + langWeight * 0.4;
  }

  const video = p.has_demo_video ? 0.05 : 0;

  return recency * 0.3 + density * 0.25 + stars * 0.1 + personal * 0.3 + video;
}

/** True iff the profile is rich enough to warrant personalization weighting. */
export function isPersonalized(profile: TasteProfile): boolean {
  return profile.total >= PERSONALIZATION_THRESHOLD;
}
