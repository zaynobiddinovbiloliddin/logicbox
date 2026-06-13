import type { RemoteGame } from "@/types/games";

export type ChallengeLocale = "ru" | "uz" | "en";

export interface ChallengeLocalizedFields {
  titleRu?: string | null;
  titleUz?: string | null;
  titleEn?: string | null;
  descriptionRu?: string | null;
  descriptionUz?: string | null;
  descriptionEn?: string | null;
}

export interface ChallengeDayGame {
  id?: number | string;
  challengeDayGameId?: number | string;
  completed?: boolean | number;
  status?: string;
  game?: Partial<RemoteGame>;
  withReclam?: boolean;
  reclamSeen?: boolean;
  reclamSkipPrice?: number;
}

export interface ChallengeDay extends ChallengeLocalizedFields {
  id: number | string;
  dayNumber?: number;
  taskNumber?: number;
  status?: string;
  canStart?: boolean;
  isUnlocked?: boolean;
  activity?: number;
  activityToComplete?: number;
  totalGames?: number;
  completedGames?: number;
  games?: ChallengeDayGame[];
}

export interface Challenge extends ChallengeLocalizedFields {
  id: number | string;
  type?: string;
  price?: number | string;
  prizePool?: number | string;
  startsAt?: string;
  endsAt?: string;
  isParticipant?: boolean;
  days?: ChallengeDay[];
}

export interface ChallengeProgressDay extends ChallengeLocalizedFields {
  id: number | string;
  titleRu?: string | null;
  titleUz?: string | null;
  titleEn?: string | null;
  status?: string;
  canStart?: boolean;
  dayNumber?: number;
  taskNumber?: number;
}

export interface ChallengeProgress {
  completedDays?: number;
  totalDays?: number;
  totalScore?: number;
  endsAt?: string;
  days?: ChallengeProgressDay[];
}

export interface ChallengeLeaderboardEntry {
  id?: number | string;
  rank?: number;
  score?: number;
  user?: unknown;
  [key: string]: unknown;
}
