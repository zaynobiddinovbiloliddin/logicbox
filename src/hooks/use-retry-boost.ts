import { useRef } from "react";
import { useBoostsInventory } from "@/store/boosts-inventory";

export function useRetryBoost() {
  const retryCount = useBoostsInventory((s) => s.inventory["retry_boost"] ?? 0);
  const consumeBoost = useBoostsInventory((s) => s.useBoost);
  const firstScoreRef = useRef<number>(-1);

  // true only on the first attempt when boost is available
  const hasRetry = retryCount > 0 && firstScoreRef.current < 0;

  function activateRetry(currentScore: number, restartFn: () => void): boolean {
    if (retryCount <= 0) return false;
    if (!consumeBoost("retry_boost")) return false;
    firstScoreRef.current = currentScore;
    restartFn();
    return true;
  }

  // Call this instead of raw score when submitting — returns max(first, current)
  function getFinalScore(currentScore: number): number {
    if (firstScoreRef.current < 0) return currentScore;
    const best = Math.max(firstScoreRef.current, currentScore);
    firstScoreRef.current = -1;
    return best;
  }

  return { retryCount, hasRetry, activateRetry, getFinalScore };
}
