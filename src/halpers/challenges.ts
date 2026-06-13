import i18n from "@/i18n";
import {
  getLocalizedDescription,
  getLocalizedText,
  getLocalizedTitle,
} from "@/halpers/localization";
import type { ChallengeDay } from "@/types/challenges";

export { getLocalizedDescription, getLocalizedText, getLocalizedTitle };

export function canOpenChallengeDay(day?: ChallengeDay | null) {
  if (!day) return false;
  return Boolean(day.canStart || day.status === "in_progress");
}

export function shouldStartChallengeDay(day?: ChallengeDay | null) {
  return day?.status === "locked";
}

export function getCurrentChallengeDay(days?: ChallengeDay[] | null) {
  if (!days?.length) return null;

  return (
    days.find((day) => day.status === "in_progress") ??
    days.find((day) => canOpenChallengeDay(day) && day.status !== "completed") ??
    days.find((day) => day.canStart) ??
    days[0]
  );
}

export function formatChallengeDayLabel(day?: ChallengeDay | null) {
  if (!day) return i18n.t("components.challengeDayCard.label.day");

  const dayLabel =
    typeof day.dayNumber === "number"
      ? i18n.t("components.challengeDayCard.label.dayNumber", {
          number: day.dayNumber,
        })
      : i18n.t("components.challengeDayCard.label.day");

  if (typeof day.taskNumber === "number") {
    return i18n.t("components.challengeDayCard.label.dayTask", {
      day: dayLabel,
      task: day.taskNumber,
    });
  }

  return dayLabel;
}

export function formatChallengeTaskLabel(day?: ChallengeDay | null) {
  if (!day) return "";

  const title = getLocalizedTitle(day);

  if (typeof day.taskNumber === "number" && title) {
    return i18n.t("components.challengeDayCard.label.taskWithTitle", {
      task: day.taskNumber,
      title,
    });
  }

  if (typeof day.taskNumber === "number") {
    return i18n.t("components.challengeDayCard.label.task", {
      task: day.taskNumber,
    });
  }

  return title;
}
