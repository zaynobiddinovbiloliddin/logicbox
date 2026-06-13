import { RemoteBoost } from "@/store/boosts-inventory";

export interface PowerUp {
  id: number;
  slug: string;
  emoji: string;
  label: string;
  desc: string;
  cost: number;
  color: string;
  from: string;
  to: string;
  category: string;
  badge: string;
}

export function mapRemoteToPowerUp(remote: RemoteBoost): PowerUp {
  const t = remote.title.toLowerCase();
  const d = remote.description.toLowerCase();

  let emoji = "✨";
  let color = "#4D96FF";
  let from = "#4D96FF";
  let to = "#6DAAFF";
  let category = "logic";
  let badge = "Логика";

  if (t.includes("рентген") || d.includes("volt match")) {
    emoji = "🃏";
    color = "#C77DFF";
    from = "#C77DFF";
    to = "#E0A0FF";
    category = "memory";
    badge = "Память";
  } else if (t.includes("повтор") || d.includes("volt memory")) {
    emoji = "🔄";
    color = "#6BCB77";
    from = "#6BCB77";
    to = "#8DDDAA";
    category = "memory";
    badge = "Память";
  } else if (t.includes("подсветка") || d.includes("find letter")) {
    emoji = "🔍";
    color = "#4D96FF";
    from = "#4D96FF";
    to = "#6DAAFF";
    category = "attention";
    badge = "Внимание";
  } else if (t.includes("радар") || d.includes("space number")) {
    emoji = "📡";
    color = "#FFD93D";
    from = "#FFD93D";
    to = "#FFE97A";
    category = "attention";
    badge = "Внимание";
  } else if (t.includes("щит") || d.includes("stroop")) {
    emoji = "🛡️";
    color = "#FF9F43";
    from = "#FF9F43";
    to = "#FFBE76";
    category = "attention";
    badge = "Внимание";
  } else if (t.includes("показ") || d.includes("shadow")) {
    emoji = "👁️";
    color = "#00ffb3";
    from = "#00ffb3";
    to = "#00e5a0";
    category = "attention";
    badge = "Внимание";
  } else if (
    t.includes("заморозка") ||
    d.includes("sliding") ||
    d.includes("volt numbers")
  ) {
    emoji = "❄️";
    color = "#7dd3fc";
    from = "#7dd3fc";
    to = "#38bdf8";
    category = "logic";
    badge = "Логика";
  } else if (
    t.includes("2x") ||
    t.includes("двойные") ||
    d.includes("math") ||
    d.includes("1 second")
  ) {
    emoji = "⚡";
    color = "#f7c948";
    from = "#f7c948";
    to = "#ffd700";
    category = "logic";
    badge = "Логика";
  } else if (t.includes("секунд") || d.includes("brain")) {
    emoji = "⏱️";
    color = "#a29bfe";
    from = "#a29bfe";
    to = "#d4cafe";
    category = "logic";
    badge = "Логика";
  } else if (t.includes("50/50") || d.includes("geography")) {
    emoji = "✂️";
    color = "#FFD93D";
    from = "#FFD93D";
    to = "#FFE97A";
    category = "logic";
    badge = "Логика";
  } else if (t.includes("еще") || t.includes("попробовать")) {
    emoji = "🔄";
    color = "#FF9A3C";
    from = "#FF9A3C";
    to = "#FFC837";
    category = "logic";
    badge = "Логика";
  } else if (t.includes("замедление") || d.includes("udar")) {
    emoji = "🐢";
    color = "#FF6B35";
    from = "#FF6B35";
    to = "#FF9F43";
    category = "reaction";
    badge = "Реакция";
  } else if (t.includes("щит") || d.includes("racing")) {
    emoji = "🛡️";
    color = "#FF6B9D";
    from = "#FF6B9D";
    to = "#C77DFF";
    category = "reaction";
    badge = "Реакция";
  }

  return {
    id: remote.id,
    slug: getSlugForRemoteBoost(remote),
    label: remote.title,
    desc: remote.description,
    cost: remote.price,
    emoji,
    color,
    from,
    to,
    category,
    badge,
  };
}

export function getSlugForRemoteBoost(remote: RemoteBoost): string {
  const t = remote.title.toLowerCase();
  const d = remote.description.toLowerCase();

  if (t.includes("рентген") || d.includes("volt match"))
    return "volt_match_reveal";
  if (t.includes("повтор") || d.includes("volt memory"))
    return "volt_memory_repeat";
  if (t.includes("подсветка") || d.includes("find letter"))
    return "find_letter_hint";
  if (t.includes("радар") || d.includes("space number")) return "space_radar";
  if (t.includes("щит") && d.includes("stroop")) return "stroop_shield";
  if (t.includes("щит") && d.includes("red ball")) return "red_ball_shield";
  if (t.includes("показ") || d.includes("shadow")) return "shadow_reveal";
  if (t.includes("заморозка") && d.includes("sliding")) return "sliding_freeze";
  if (t.includes("заморозка") && d.includes("volt numbers"))
    return "volt_num_freeze";
  if ((t.includes("2x") || t.includes("двойные")) && d.includes("1 second"))
    return "one_second_double";
  if ((t.includes("2x") || t.includes("двойные")) && d.includes("math"))
    return "math_double";
  if (t.includes("секунд") || d.includes("brain")) return "brain_time_boost";
  if (t.includes("50/50") || d.includes("geography")) return "geo_50_50";
  if (t.includes("еще") || t.includes("попробовать")) return "retry_boost";
  if (t.includes("замедление") || d.includes("udar")) return "udar_slow";
  if (t.includes("щит") && d.includes("racing")) return "racing_shield";

  return String(remote.id); // fallback
}

export const POWERUP_TABS = [
  { id: "all", label: "Все" },
  { id: "memory", label: "🧠 Память" },
  { id: "attention", label: "👀 Внимание" },
  { id: "logic", label: "🧩 Логика" },
  { id: "reaction", label: "⚡ Реакция" },
];
