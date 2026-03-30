/**
 * Deterministic seeded pseudo-random number generator (Mulberry32).
 * Same seed always produces the same shuffle — fair and consistent.
 */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convert a numeric seed string to a number. Returns null if invalid/empty. */
export function parseSeed(seed: string): number | null {
  const trimmed = seed.trim();
  if (!trimmed) return null;
  const n = parseInt(trimmed, 10);
  return isNaN(n) ? null : Math.abs(n);
}

/**
 * Shuffle an array deterministically using a numeric seed.
 * Returns a NEW array — does not mutate the original.
 */
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Shuffle answer options for a question while preserving the correct answer mapping.
 * Tracks by index (not text) so duplicate option texts are handled correctly.
 */
export function shuffleOptions(
  options: { key: string; text: string }[],
  correctKey: string,
  seed: number
): { shuffled: { key: string; text: string }[]; newCorrectKey: string } {
  const keys = ["A", "B", "C", "D"];

  // Build index array [0,1,2,3] and shuffle it
  const indices = [0, 1, 2, 3];
  const shuffledIndices = seededShuffle(indices, seed);

  // Find which shuffled position the correct answer ended up in
  const correctIndex = options.findIndex((o) => o.key === correctKey);
  const newCorrectPosition = shuffledIndices.indexOf(correctIndex);

  return {
    shuffled: shuffledIndices.map((origIdx, newPos) => ({
      key: keys[newPos],
      text: options[origIdx].text,
    })),
    newCorrectKey: keys[newCorrectPosition] ?? correctKey,
  };
}
