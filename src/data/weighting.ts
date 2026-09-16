/**
 * Spawn weight for a template first available at `minDepth` when the
 * player is at `depth`. Newly unlocked entries are favoured: 3 for the
 * two most recent floors, 2 for the two before that, then 1.
 */
export function depthWeight(depth: number, minDepth: number): number {
  const relevance = depth - minDepth;
  return relevance < 2 ? 3 : relevance < 4 ? 2 : 1;
}
