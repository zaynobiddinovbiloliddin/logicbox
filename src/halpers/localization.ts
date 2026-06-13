import i18n from "@/i18n";

export type AppLocalizedField = "title" | "subtitle" | "description";
export type AppLocale = "ru" | "uz" | "en";
type LegacyLocalizedField = "title" | "subtitle";

export type AppLocalizedFields = Partial<
  Record<
    | "titleRu"
    | "titleUz"
    | "titleEn"
    | "subtitleRu"
    | "subtitleUz"
    | "subtitleEn"
    | "descriptionRu"
    | "descriptionUz"
    | "descriptionEn",
    string | null
  >
>;

export type LegacyTextFields = Partial<Record<LegacyLocalizedField, string | null>>;
export type LegacyTitleFields = Pick<LegacyTextFields, "title">;

const LOCALE_ORDER: AppLocale[] = ["ru", "uz", "en"];

export function normalizeAppLocale(locale?: string | null): AppLocale {
  const value = locale?.toLowerCase();

  if (value?.startsWith("ru")) return "ru";
  if (value?.startsWith("en")) return "en";
  return "uz";
}

function getNonEmptyLocalizedValue(value?: string | null) {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

export function getLocalizedText(
  entity: AppLocalizedFields | null | undefined,
  field: AppLocalizedField,
  locale = i18n.language,
) {
  if (!entity) return "";

  const normalizedLocale = normalizeAppLocale(locale);
  const fallbacks = [
    normalizedLocale,
    ...LOCALE_ORDER.filter((item) => item !== normalizedLocale),
  ];

  for (const currentLocale of fallbacks) {
    const key =
      `${field}${currentLocale.charAt(0).toUpperCase()}${currentLocale.slice(1)}` as keyof AppLocalizedFields;
    const value = getNonEmptyLocalizedValue(entity[key]);
    if (value) return value;
  }

  return "";
}

export function getLocalizedTitle(
  entity: AppLocalizedFields | null | undefined,
  locale = i18n.language,
) {
  return getLocalizedText(entity, "title", locale);
}

export function getLocalizedSubtitle(
  entity: AppLocalizedFields | null | undefined,
  locale = i18n.language,
) {
  return getLocalizedText(entity, "subtitle", locale);
}

export function getLocalizedDescription(
  entity: AppLocalizedFields | null | undefined,
  locale = i18n.language,
) {
  return getLocalizedText(entity, "description", locale);
}

export function getLocalizedLegacyText(
  entity: (AppLocalizedFields & LegacyTextFields) | null | undefined,
  field: LegacyLocalizedField,
  locale = i18n.language,
) {
  const localizedValue = getLocalizedText(entity, field, locale);
  if (localizedValue) return localizedValue;

  return getNonEmptyLocalizedValue(entity?.[field]) ?? "";
}

export function getLocalizedGameTitle(
  entity: (AppLocalizedFields & LegacyTextFields) | null | undefined,
  locale = i18n.language,
) {
  return getLocalizedLegacyText(entity, "title", locale);
}

export function getLocalizedGameSubtitle(
  entity: (AppLocalizedFields & LegacyTextFields) | null | undefined,
  locale = i18n.language,
) {
  return getLocalizedLegacyText(entity, "subtitle", locale);
}

export function getAchievementTitle(
  achievement: (AppLocalizedFields & LegacyTitleFields) | null | undefined,
  locale = i18n.language,
) {
  return getLocalizedLegacyText(achievement, "title", locale);
}
