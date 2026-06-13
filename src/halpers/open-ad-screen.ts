import { router } from "expo-router";

interface OpenAdScreenParams {
  gameId: number | string;
  targetPath: string;
  dayId?: number | string;
  challengeDayGameId?: number | string;
  startDayBeforeOpen?: boolean;
}

export function openAdScreen({
  gameId,
  targetPath,
  dayId,
  challengeDayGameId,
  startDayBeforeOpen,
}: OpenAdScreenParams) {
  router.push({
    pathname: "/(app)/modals/watch-ad",
    params: {
      gameId: String(gameId),
      targetPath,
      dayId: dayId ? String(dayId) : undefined,
      challengeDayGameId: challengeDayGameId
        ? String(challengeDayGameId)
        : undefined,
      startDayBeforeOpen: startDayBeforeOpen ? "1" : undefined,
    },
  });
}
