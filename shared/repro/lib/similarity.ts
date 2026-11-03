export const STOPWORDS = new Set(
  "a an the and or but of to in on at for with from by is are was were be been it its this that these those when then than as not no after before into over under does do did doesn t s can cannot get gets got page button click clicking".split(
    " ",
  ),
);

export function tokenize(text: string | null | undefined): Set<string> {
  const out = new Set<string>();
  for (const w of (text ?? "").toLowerCase().split(/[^a-z0-9]+/)) {
    if (w.length > 1 && !STOPWORDS.has(w)) out.add(w);
  }
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export function titleSimilarity(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  return jaccard(tokenize(a), tokenize(b));
}

export interface SimilarityInput {
  title: string | null;
  errorSignature: string | null;
}

export interface Scored {
  score: number;
  reason: string;
}

export const DUPLICATE_THRESHOLD = 0.75;

/** Exact error signature = strong (0.9+, plus up to 0.1 from title overlap). */
export function scoreSimilarity(
  subject: SimilarityInput,
  candidate: SimilarityInput,
): Scored {
  const t = titleSimilarity(subject.title, candidate.title);
  const sigMatch =
    !!subject.errorSignature &&
    subject.errorSignature === candidate.errorSignature;
  if (sigMatch) {
    return {
      score: Math.min(1, 0.9 + 0.1 * t),
      reason: "Same error signature",
    };
  }
  return {
    score: Math.round(t * 0.85 * 100) / 100,
    reason: t > 0 ? `Similar title (${Math.round(t * 100)}% word overlap)` : "No overlap",
  };
}

export interface Candidate<T> {
  item: T;
  score: number;
  reason: string;
}

export function rankCandidates<T>(
  items: { item: T; input: SimilarityInput }[],
  subject: SimilarityInput,
  opts: { limit?: number; minScore?: number } = {},
): Candidate<T>[] {
  const min = opts.minScore ?? 0.3;
  return items
    .map(({ item, input }) => ({ item, ...scoreSimilarity(subject, input) }))
    .filter((c) => c.score >= min)
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.limit ?? 5);
}

export function isLikelyDuplicate(best: number | undefined): boolean {
  return best !== undefined && best >= DUPLICATE_THRESHOLD;
}
