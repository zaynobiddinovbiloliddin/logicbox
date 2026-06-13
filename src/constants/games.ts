import { ImageSource } from "expo-image";
import { Href } from "expo-router";

export interface Game {
  id: number;
  icon: ImageSource;
  title: string;
  subtitle: string;
  from: string;
  to: string;
  route: Href;
  tag: string;
  withReclam?: boolean;
  reclamSeen?: boolean;
}

export const games: Game[] = [
  {
    id: 1,
    icon: require("@/assets/game/brain-traing.png"),
    title: "Brain Math",
    subtitle: "Устный счет",
    from: "#4D96FF",
    to: "#C77DFF",
    route: "/games/barain-traing" as Href,
    tag: "🔢 Математика",
  },
  {
    id: 2,
    icon: require("@/assets/game/geography-quiz-prime.png"),
    title: "Geo Expert",
    subtitle: "Мировая викторина",
    from: "#6BCB77",
    to: "#4D96FF",
    route: "/games/geography-quiz" as Href,
    tag: "🌍 География",
  },
  {
    id: 16,
    icon: require("@/assets/game/slidding-puzzle.png"),
    title: "World Puzzle",
    subtitle: "Собери карту",
    from: "#6BCB77",
    to: "#4D96FF",
    route: "/games/sliding-puzzle" as Href,
    tag: "🧩 Пазл",
  },
  {
    id: 3,
    icon: require("@/assets/game/find-letter.png"),
    title: "Letter Hunter",
    subtitle: "Найди букву",
    from: "#0ea5e9",
    to: "#38bdf8",
    route: "/games/find-letter" as Href,
    tag: "🔤 Язык",
  },
  {
    id: 4,
    icon: require("@/assets/game/space-find-number.png"),
    title: "Space Search",
    subtitle: "Числа в космосе",
    from: "#C77DFF",
    to: "#FF6B6B",
    route: "/games/space-find-number" as Href,
    tag: "🚀 Космос",
  },
  {
    id: 5,
    icon: require("@/assets/game/stroop-color.png"),
    title: "Color Stroop",
    subtitle: "Тест Струпа",
    from: "#FF6B35",
    to: "#FFD93D",
    route: "/games/stroop-color" as Href,
    tag: "🎨 Внимание",
  },
  {
    id: 6,
    icon: require("@/assets/game/udar-timing.png"),
    title: "Perfect Beat",
    subtitle: "Ритм и тайминг",
    from: "#4ECDC4",
    to: "#6BCB77",
    route: "/games/udar-timing" as Href,
    tag: "⏱️ Тайминг",
  },
  {
    id: 7,
    icon: require("@/assets/game/one-second.png"),
    title: "One Second",
    subtitle: "Ровно секунда",
    from: "#A78BFA",
    to: "#C77DFF",
    route: "/games/one-second" as Href,
    tag: "⌛ Скорость",
  },
  {
    id: 9,
    icon: require("@/assets/game/red-ball.png"),
    title: "Red Ball",
    subtitle: "Реакция на шар",
    from: "#ef4444",
    to: "#fbbf24",
    route: "/games/red-ball" as Href,
    tag: "🔴 Реакция",
  },
  {
    id: 10,
    icon: require("@/assets/game/shadow-game.png"),
    title: "Shadow Match",
    subtitle: "Логика теней",
    from: "#00ffb3",
    to: "#00b3ff",
    route: "/games/shadow-game" as Href,
    tag: "👁️ Диққат",
  },
  {
    id: 11,
    icon: require("@/assets/game/math-quiz.png"),
    title: "Math Quiz",
    subtitle: "Быстрый тест",
    from: "#f7c948",
    to: "#ff4f7b",
    route: "/games/math-quiz" as Href,
    tag: "🔢 Математика",
  },
  {
    id: 12,
    icon: require("@/assets/game/racing.png"),
    title: "Turbo Race",
    subtitle: "Нитро гонки",
    from: "#00ff88",
    to: "#00cfff",
    route: "/games/racing" as Href,
    tag: "🏎️ Гонка",
  },
  {
    id: 13,
    icon: require("@/assets/game/volt-match.png"),
    title: "Emoji Match",
    subtitle: "Найди пару",
    from: "#f5c842",
    to: "#fb9c38",
    route: "/games/volt-match" as Href,
    tag: "⚡ Скорость",
  },
  {
    id: 14,
    icon: require("@/assets/game/volt-memory.png"),
    title: "Memory Matrix",
    subtitle: "Запомни сетку",
    from: "#f5c842",
    to: "#c084fc",
    route: "/games/volt-memory" as Href,
    tag: "🧠 Память",
  },
  {
    id: 15,
    icon: require("@/assets/game/volt-number.png"),
    title: "Number Dash",
    subtitle: "По порядку",
    from: "#f5c842",
    to: "#7c3aed",
    route: "/games/volt-numbers" as Href,
    tag: "⚡ Скорость",
  },
];

export function gameTitle(id: number): string {
  return games.find((g) => g.id === id)?.title ?? "";
}
