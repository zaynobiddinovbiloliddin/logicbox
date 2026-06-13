import type { AppLocalizedFields, LegacyTitleFields } from "@/halpers/localization";

export interface Achievement extends AppLocalizedFields, LegacyTitleFields {
  id: number;
}

export interface UserAchievement {
  id: number;
  userId: number;
  achievementId: number;
  count: number;
  achievement: Achievement;
}
