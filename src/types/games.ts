import type { AppLocalizedFields } from "@/halpers/localization";

export interface GameLocalizedFields extends AppLocalizedFields {
  titleRu?: string | null;
  titleUz?: string | null;
  titleEn?: string | null;
  subtitleRu?: string | null;
  subtitleUz?: string | null;
  subtitleEn?: string | null;
}

export interface RemoteGame extends GameLocalizedFields {
  id: number;
  title?: string | null;
  subtitle?: string | null;
  type?: string;
  imageUrl?: string;
  isVisible?: boolean;
  withReclam?: boolean;
  reclamSeen?: boolean;
  reclamSkipPrice?: number;
  challengeDayGameId?: string | number;
}
