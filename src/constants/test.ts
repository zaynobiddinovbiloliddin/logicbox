import { gameTitle } from './games';

export interface Test {
  id: number | string;
  title: string;
  badgeColor: string;
  icon: string;
  from: string;
  to: string;
  tasks: string[];
  difficulty: string;
  time: string;
  badge: string;
  hasPrize?: boolean;
  price?: number;
  prizeSumma?: string;
  bought?: boolean;
  type?: string;
}

export const TESTS: Test[] = [
  {
    title: 'Aql Jangi',
    price: 2000,
    badge: "🔥 Eng zo'ri",
    badgeColor: '#FF6B35',
    icon: '🧠',
    from: '#4D96FF',
    to: '#C77DFF',
    tasks: [gameTitle(1), gameTitle(11), gameTitle(14)],
    difficulty: 'Средний',
    time: '15 мин',
    hasPrize: true,
    prizeSumma: '500 000',
  },
  {
    title: 'Tezkor Zafar',
    price: 2000,
    badge: '⚡ Tez & Shirin',
    badgeColor: '#FFD93D',
    icon: '⚡',
    from: '#FFD93D',
    to: '#FF6B35',
    tasks: [gameTitle(2), gameTitle(3), gameTitle(10)],
    difficulty: 'Лёгкий',
    time: '10 мин',
    hasPrize: true,
    prizeSumma: '300 000',
    bought: true,
  },
  {
    title: 'Chempionlar Kurashi',
    price: 2000,
    badge: '🏆 Grand Prix',
    badgeColor: '#6BCB77',
    icon: '🏆',
    from: '#6BCB77',
    to: '#4ECDC4',
    tasks: [gameTitle(7), gameTitle(9), gameTitle(12)],
    difficulty: 'Сложный',
    time: '20 мин',
    hasPrize: true,
    prizeSumma: '700 000',
  },
];
