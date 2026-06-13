import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export type Period = 'daily' | 'weekly' | 'monthly';

type Player = {
  id: number;
  avatar: string;
};

type ItemProps = {
  period: Period;
  players?: Player[];
  onPress?: () => void;
};

type Props = {
  onPress?: (period: Period) => void;
};

const DEFAULT_PLAYERS: Player[] = [
  { id: 1, avatar: '🦁' },
  { id: 2, avatar: '🐺' },
  { id: 3, avatar: '🦊' },
  { id: 4, avatar: '🐯' },
  { id: 5, avatar: '🐻' },
  { id: 6, avatar: '🐼' },
  { id: 7, avatar: '🦅' },
  { id: 8, avatar: '🦉' },
  { id: 9, avatar: '🦄' },
  { id: 10, avatar: '🐉' },
  { id: 11, avatar: '🦈' },
  { id: 12, avatar: '🐆' },
  { id: 13, avatar: '🐍' },
  { id: 14, avatar: '🦇' },
  { id: 15, avatar: '🦎' },
  { id: 16, avatar: '🐊' },
  { id: 17, avatar: '🦏' },
  { id: 18, avatar: '🦛' },
  { id: 19, avatar: '🦒' },
  { id: 20, avatar: '🦘' },
];

const PERIOD_CONFIG: Record<
  Period,
  { labelKey: string; icon: string; color: string; bg: string }
> = {
  daily: {
    labelKey: 'components.topPlayersList.daily',
    icon: '☀️',
    color: '#FFB347',
    bg: 'rgba(255,179,71,0.08)',
  },
  weekly: {
    labelKey: 'components.topPlayersList.weekly',
    icon: '📅',
    color: '#4D96FF',
    bg: 'rgba(77,150,255,0.08)',
  },
  monthly: {
    labelKey: 'components.topPlayersList.monthly',
    icon: '🏆',
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.08)',
  },
};

// ─── Fireworks ────────────────────────────────────────────────────────────────

const PARTICLE_COLORS = [
  '#FFB347',
  '#4D96FF',
  '#A78BFA',
  '#FF6B6B',
  '#FFD700',
  '#00E5FF',
  '#FF69B4',
  '#7CFC00',
];

type ParticleData = {
  key: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
  size: number;
  translateX: Animated.Value;
  translateY: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
};

const BURST_SIZE = 22;

function buildBursts(containerW: number, containerH: number): ParticleData[] {
  const origins = [
    { x: containerW * 0.15, y: containerH * 0.5 },
    { x: containerW * 0.5, y: containerH * 0.5 },
    { x: containerW * 0.85, y: containerH * 0.5 },
  ];

  let key = 0;
  const particles: ParticleData[] = [];

  origins.forEach(({ x, y }) => {
    for (let i = 0; i < BURST_SIZE; i++) {
      const angle = (i / BURST_SIZE) * Math.PI * 2;
      const distance = 28 + Math.random() * 50;
      particles.push({
        key: key++,
        x,
        y,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance + 20, // slight gravity
        color:
          PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        size: 3 + Math.random() * 4,
        translateX: new Animated.Value(0),
        translateY: new Animated.Value(0),
        opacity: new Animated.Value(1),
        scale: new Animated.Value(1),
      });
    }
  });

  return particles;
}

function runFireworks(particles: ParticleData[], onDone: () => void) {
  const numBursts = Math.ceil(particles.length / BURST_SIZE);
  let finishedBursts = 0;

  for (let b = 0; b < numBursts; b++) {
    const slice = particles.slice(b * BURST_SIZE, (b + 1) * BURST_SIZE);
    const delay = b * 200;

    const anims = slice.map(p =>
      Animated.parallel([
        Animated.timing(p.translateX, {
          toValue: p.dx,
          duration: 600 + Math.random() * 300,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(p.translateY, {
          toValue: p.dy,
          duration: 600 + Math.random() * 300,
          delay,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(p.scale, {
            toValue: 1.6,
            duration: 80,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(p.scale, {
            toValue: 0.1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(delay + 120),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    Animated.parallel(anims).start(() => {
      finishedBursts++;
      if (finishedBursts === numBursts) onDone();
    });
  }
}

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * Shuffles an array using Fisher-Yates algorithm
 * Returns a new array without modifying the original
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ─── TopPlayersItem ───────────────────────────────────────────────────────────

function TopPlayersItem({
  period,
  players = DEFAULT_PLAYERS,
  onPress,
}: ItemProps) {
  const { t } = useTranslation();
  const config = PERIOD_CONFIG[period];
  const shuffledPlayers = shuffleArray(players);
  const top5 = shuffledPlayers.slice(0, 4);
  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: config.bg, borderColor: config.color + '33' },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.avatarsRow}>
        {top5.map((player, index) => (
          <View
            key={player.id}
            style={[
              styles.avatarBubble,
              { marginLeft: index === 0 ? 0 : -10, zIndex: 5 - index },
            ]}
          >
            <Text style={styles.avatarEmoji}>{player.avatar}</Text>
          </View>
        ))}
      </View>
      <View style={styles.bottom}>
        <View style={styles.labelRow}>
          <Text style={styles.labelIcon}>{config.icon}</Text>
          <Text style={[styles.labelText, { color: config.color }]}>
            {t(config.labelKey)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" color={config.color + '99'} />
      </View>
    </TouchableOpacity>
  );
}

// ─── TopPlayersList ───────────────────────────────────────────────────────────

export function TopPlayersList({ onPress }: Props) {
  const periods: Period[] = ['daily', 'weekly'];
  const [particles, setParticles] = useState<ParticleData[]>([]);
  const [showParticles, setShowParticles] = useState(false);
  const didLaunch = useRef(false);

  const onLayout = (e: LayoutChangeEvent) => {
    if (didLaunch.current) return;
    didLaunch.current = true;

    const { width, height } = e.nativeEvent.layout;
    const built = buildBursts(width, height);
    setParticles(built);
    setShowParticles(true);

    setTimeout(() => {
      runFireworks(built, () => setShowParticles(false));
    }, 50);
  };

  return (
    <View style={styles.wrapper} onLayout={onLayout}>
      {/* Particle layer — clipped to component bounds via overflow: hidden */}
      {showParticles && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {particles.map(p => (
            <Animated.View
              key={p.key}
              style={{
                position: 'absolute',
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.size,
                borderRadius: p.size / 2,
                backgroundColor: p.color,
                transform: [
                  { translateX: p.translateX },
                  { translateY: p.translateY },
                  { scale: p.scale },
                ],
                opacity: p.opacity,
              }}
            />
          ))}
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {periods.map(period => (
          <TopPlayersItem
            key={period}
            period={period}
            onPress={() => onPress?.(period)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden', // 👈 clips all particles within the component bounds
  },
  list: {
    gap: 8,
    paddingVertical: 2,
    flexDirection: 'row',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 2,
    borderColor: '#0D1117',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 16,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  labelIcon: {
    fontSize: 12,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
