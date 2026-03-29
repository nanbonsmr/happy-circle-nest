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

/** Convert a numeric seed string to a number */
export function parseSeed(seed: string): number {
  const n = parseInt(seed, 10);
  return isNaN(n) ? 0 : Math.abs(n);
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
 * Returns shuffled options array and the new correct answer key (A/B/C/D).
 */
export function shuffleOptions(
  options: { key: string; text: string }[],
  correctKey: string,
  seed: number
): { shuffled: { key: string; text: string }[]; newCorrectKey: string } {
  // Shuffle the option texts
  const texts = options.map((o) => o.text);
  const shuffledTexts = seededShuffle(texts, seed);

  // Find which position the correct answer text ended up in
  const correctText = options.find((o) => o.key === correctKey)?.text || "";
  const newCorrectIndex = shuffledTexts.indexOf(correctText);
  const keys = ["A", "B", "C", "D"];

  return {
    shuffled: shuffledTexts.map((text, i) => ({ key: keys[i], text })),
    newCorrectKey: keys[newCorrectIndex] || correctKey,
  };
}
