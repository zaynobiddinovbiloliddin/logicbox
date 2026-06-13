export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface RarityConfig {
  label: string;
  color: string;
  glowColor: string;
  particleColor: string;
  bgColor: string;
  borderColor: string;
}

export interface RewardConfig {
  id: string;
  label: string;
  icon: string;
  color: string;
  rarity: Rarity;
  minAmount: number;
  maxAmount: number;
  /** Higher = more likely to be rolled */
  weight: number;
  /** Optional cost/value in coins */
  cost?: number;
}

export const RARITY_CONFIG: Record<Rarity, RarityConfig> = {
  common: {
    label: "Обычный",
    color: "#B0B0C4",
    glowColor: "rgba(176,176,196,0.35)",
    particleColor: "#C8C8DC",
    bgColor: "rgba(176,176,196,0.08)",
    borderColor: "rgba(176,176,196,0.25)",
  },
  rare: {
    label: "Редкий",
    color: "#4D96FF",
    glowColor: "rgba(77,150,255,0.45)",
    particleColor: "#7BBDFF",
    bgColor: "rgba(77,150,255,0.08)",
    borderColor: "rgba(77,150,255,0.35)",
  },
  epic: {
    label: "Эпический",
    color: "#C77DFF",
    glowColor: "rgba(199,125,255,0.45)",
    particleColor: "#D8A4FF",
    bgColor: "rgba(199,125,255,0.08)",
    borderColor: "rgba(199,125,255,0.35)",
  },
  legendary: {
    label: "Легендарный",
    color: "#FFD93D",
    glowColor: "rgba(255,217,61,0.55)",
    particleColor: "#FFE87A",
    bgColor: "rgba(255,217,61,0.08)",
    borderColor: "rgba(255,217,61,0.4)",
  },
};

/** All possible rewards, weighted for random rolling */
export const REWARDS: RewardConfig[] = [
  // ── COMMON (100-200 coins value) ──────────────────────────────────
  {
    id: "xp_activity",
    label: "Активность",
    icon: "⭐",
    color: "#FF9A3C",
    rarity: "common",
    minAmount: 20,
    maxAmount: 100,
    weight: 40,
  },
  {
    id: "find_letter_hint",
    label: "Подсветка буквы",
    icon: "🔍",
    color: "#4D96FF",
    rarity: "common",
    minAmount: 1,
    maxAmount: 1,
    weight: 15,
    cost: 150,
  },
  {
    id: "space_radar",
    label: "Радар",
    icon: "📡",
    color: "#FFD93D",
    rarity: "common",
    minAmount: 1,
    maxAmount: 1,
    weight: 15,
    cost: 180,
  },
  {
    id: "udar_slow",
    label: "Замедление",
    icon: "🐢",
    color: "#FF6B35",
    rarity: "common",
    minAmount: 1,
    maxAmount: 1,
    weight: 15,
    cost: 200,
  },
  {
    id: "shadow_reveal",
    label: "Повторный показ",
    icon: "👁️",
    color: "#00ffb3",
    rarity: "common",
    minAmount: 1,
    maxAmount: 1,
    weight: 15,
    cost: 150,
  },
  {
    id: "volt_memory_repeat",
    label: "Повтор паттерна",
    icon: "🔄",
    color: "#6BCB77",
    rarity: "common",
    minAmount: 1,
    maxAmount: 1,
    weight: 15,
    cost: 150,
  },
  {
    id: "sliding_freeze",
    label: "Заморозка ходов",
    icon: "❄️",
    color: "#7dd3fc",
    rarity: "common",
    minAmount: 1,
    maxAmount: 1,
    weight: 15,
    cost: 100,
  },

  // ── RARE (250-400 coins value) ────────────────────────────────────
  {
    id: "stroop_shield",
    label: "Щит (Stroop)",
    icon: "🛡️",
    color: "#FF9F43",
    rarity: "rare",
    minAmount: 1,
    maxAmount: 1,
    weight: 10,
    cost: 300,
  },
  {
    id: "red_ball_shield",
    label: "Щит (Red Ball)",
    icon: "🛡️",
    color: "#38bdf8",
    rarity: "rare",
    minAmount: 1,
    maxAmount: 1,
    weight: 10,
    cost: 300,
  },
  {
    id: "racing_shield",
    label: "Щит (Racing)",
    icon: "🛡️",
    color: "#FF6B9D",
    rarity: "rare",
    minAmount: 1,
    maxAmount: 1,
    weight: 10,
    cost: 300,
  },
  {
    id: "geo_50_50",
    label: "50/50",
    icon: "✂️",
    color: "#FFD93D",
    rarity: "rare",
    minAmount: 1,
    maxAmount: 1,
    weight: 10,
    cost: 250,
  },
  {
    id: "volt_num_freeze",
    label: "Заморозка таймера",
    icon: "❄️",
    color: "#7dd3fc",
    rarity: "rare",
    minAmount: 1,
    maxAmount: 1,
    weight: 8,
    cost: 350,
  },
  {
    id: "brain_time_boost",
    label: "+12 секунд",
    icon: "⏱️",
    color: "#a29bfe",
    rarity: "rare",
    minAmount: 1,
    maxAmount: 1,
    weight: 8,
    cost: 400,
  },

  // ── EPIC (500-600+ coins value) ─────────────────────────────────────
  {
    id: "retry_boost",
    label: "Попробовать еще",
    icon: "🔄",
    color: "#FF9A3C",
    rarity: "epic",
    minAmount: 1,
    maxAmount: 1,
    weight: 5,
    cost: 500,
  },
  {
    id: "volt_match_reveal",
    label: "Рентген карт",
    icon: "🃏",
    color: "#C77DFF",
    rarity: "epic",
    minAmount: 1,
    maxAmount: 1,
    weight: 4,
    cost: 600,
  },

  // ── LEGENDARY (Grand prizes) ────────────────────────────────
  {
    id: "gems_300",
    label: "300 Алмазов",
    icon: "💎",
    color: "#4D96FF",
    rarity: "legendary",
    minAmount: 300,
    maxAmount: 300,
    weight: 3,
  },
];

export interface RolledReward {
  reward: RewardConfig;
  amount: number;
}

/** Weighted random roll — returns a reward and its amount */
export function rollReward(): RolledReward {
  const total = REWARDS.reduce((s, r) => s + r.weight, 0);
  let pick = Math.random() * total;

  for (const reward of REWARDS) {
    pick -= reward.weight;
    if (pick <= 0) {
      const amount =
        Math.floor(Math.random() * (reward.maxAmount - reward.minAmount + 1)) +
        reward.minAmount;
      return { reward, amount };
    }
  }

  // Fallback
  const r = REWARDS[0];
  return { reward: r, amount: r.minAmount };
}
