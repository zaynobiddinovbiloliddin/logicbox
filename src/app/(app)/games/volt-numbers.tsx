import { ChallengesModule } from '@/services/modules/challenges-module';
import { GamesModule } from '@/services/modules/games-module';
import { useBoostsInventory } from '@/store/boosts-inventory';
import { useRetryBoost } from "@/hooks/use-retry-boost";
import RetryBoostButton from "@/components/shared/retry-boost-button";
import { Keys, storage as appStorage } from '@/store/mmkv';
import { useUserStats } from '@/store/user-stats';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { createMMKV } from 'react-native-mmkv';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Storage ──────────────────────────────────────────────────────────────────
const gameStorage = createMMKV({ id: 'volt-numbers-game' });
const LB_KEY = 'lb_v1';

// ─── Constants ────────────────────────────────────────────────────────────────
const GOLD = '#f5c842';
const GOLD_LT = '#fde68a';
const GOLD_DK = '#b8870c';
const BG = '#08070c';
const CARD = '#161524';
const INK = '#f2eedc';
const MUTED = 'rgba(242,238,220,0.45)';
const EDGE = 'rgba(245,200,66,0.12)';
const RED = '#ff5c6c';
const GREEN = '#2ecc8f';
const STATUS_H = 44;

const BALL_PALETTES: [string, string][] = [
  ['#7c3aed', '#4c1d95'],
  ['#b45309', '#7c2d12'],
  ['#0369a1', '#0c4a6e'],
  ['#065f46', '#022c22'],
  ['#9d174d', '#500724'],
  ['#1d4ed8', '#1e3a8a'],
  ['#b91c1c', '#7f1d1d'],
  ['#0f766e', '#042f2e'],
  ['#7e22ce', '#4a044e'],
  ['#b45309', '#451a03'],
  ['#0284c7', '#0c4a6e'],
  ['#15803d', '#052e16'],
  ['#c026d3', '#4a044e'],
  ['#0891b2', '#083344'],
  ['#dc2626', '#450a0a'],
];

const AVATARS = [
  '😎',
  '🧠',
  '🎯',
  '🔥',
  '⚡',
  '🦁',
  '🐉',
  '👑',
  '🌟',
  '🚀',
  '💥',
  '🎮',
  '🏆',
  '🦊',
  '🌀',
];

type Diff = 'easy' | 'normal' | 'hard';
type Screen = 'start' | 'game' | 'result' | 'board';
type Phase = 'look' | 'scatter' | 'play' | 'done';

const DIFF_CFG: Record<Diff, { count: number; ballR: number; label: string }> =
  {
    easy: { count: 35, ballR: 28, label: 'EASY' },
    normal: { count: 50, ballR: 22, label: 'NORMAL' },
    hard: { count: 70, ballR: 18, label: 'HARD' },
  };

// ─── Types ────────────────────────────────────────────────────────────────────
type BallAnim = {
  tx: Animated.Value;
  ty: Animated.Value;
  scale: Animated.Value;
  opacity: Animated.Value;
  shake: Animated.Value;
};

type BallState = {
  num: number;
  r: number;
  palIdx: number;
  anim: BallAnim;
};

type LBEntry = { n: string; t: number; av: string; fake: boolean };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function lightenHex(hex: string, amt = 40): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (n >> 16) + amt);
  const g = Math.min(255, ((n >> 8) & 0xff) + amt);
  const b = Math.min(255, (n & 0xff) + amt);
  return `rgb(${r},${g},${b})`;
}

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildGrid(n: number, aW: number, aH: number, ballR: number) {
  const BORDER = 4;
  const GAP = 4;
  let r = ballR;
  while (r > 8) {
    const cols = Math.floor((aW - BORDER * 2) / (r * 2 + GAP));
    const rows = Math.floor((aH - BORDER * 2) / (r * 2 + GAP));
    if (cols * rows >= n) break;
    r--;
  }
  const cell = r * 2 + GAP;
  const cols = Math.floor((aW - BORDER * 2) / cell);
  const rows = Math.floor((aH - BORDER * 2) / cell);
  const colSpacing = (aW - BORDER * 2) / cols;
  const rowSpacing = (aH - BORDER * 2) / rows;
  const positions: { x: number; y: number; r: number }[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      positions.push({
        x: BORDER + colSpacing * col + colSpacing / 2,
        y: BORDER + rowSpacing * row + rowSpacing / 2,
        r,
      });
    }
  }
  return shuffleArr(positions).slice(0, n);
}

// ─── MMKV ─────────────────────────────────────────────────────────────────────
const FAKES: Record<Diff, LBEntry[]> = {
  easy: [
    { n: 'BlitzKing', t: 17.0, av: '⚡', fake: true },
    { n: 'NovaStar', t: 20.5, av: '🌟', fake: true },
    { n: 'QuickFox', t: 23.2, av: '🦊', fake: true },
    { n: 'NeonBrain', t: 26.5, av: '🧠', fake: true },
    { n: 'CyberTiger', t: 31.1, av: '🐉', fake: true },
  ],
  normal: [
    { n: 'BlitzKing', t: 28.4, av: '⚡', fake: true },
    { n: 'NovaStar', t: 34.1, av: '🌟', fake: true },
    { n: 'QuickFox', t: 38.7, av: '🦊', fake: true },
    { n: 'NeonBrain', t: 44.2, av: '🧠', fake: true },
    { n: 'CyberTiger', t: 51.8, av: '🐉', fake: true },
  ],
  hard: [
    { n: 'BlitzKing', t: 51.1, av: '⚡', fake: true },
    { n: 'NovaStar', t: 61.4, av: '🌟', fake: true },
    { n: 'QuickFox', t: 69.7, av: '🦊', fake: true },
    { n: 'NeonBrain', t: 79.6, av: '🧠', fake: true },
    { n: 'CyberTiger', t: 93.2, av: '🐉', fake: true },
  ],
};

function loadLB(): Record<Diff, LBEntry[]> {
  try {
    const raw = gameStorage.getString(LB_KEY);
    return raw ? JSON.parse(raw) : { easy: [], normal: [], hard: [] };
  } catch {
    return { easy: [], normal: [], hard: [] };
  }
}

function ensureLB(): Record<Diff, LBEntry[]> {
  const lb = loadLB();
  (['easy', 'normal', 'hard'] as Diff[]).forEach(dk => {
    if (!lb[dk]) lb[dk] = [];
    if (!lb[dk].some(e => e.fake)) lb[dk] = [...FAKES[dk], ...lb[dk]];
  });
  gameStorage.set(LB_KEY, JSON.stringify(lb));
  return lb;
}

function saveLBEntry(d: Diff, name: string, time: number, av: string) {
  const lb = ensureLB();
  const arr = lb[d];
  const me = arr.find(e => e.n === name && !e.fake);
  let isNew = false;
  if (!me) {
    arr.push({ n: name, t: time, av, fake: false });
    isNew = true;
  } else if (time < me.t) {
    me.t = time;
    isNew = true;
  }
  arr.sort((a, b) => a.t - b.t);
  gameStorage.set(LB_KEY, JSON.stringify(lb));
  const rank = arr.findIndex(e => e.n === name && !e.fake) + 1;
  return { isNew, rank };
}

// ─── BallItem ─────────────────────────────────────────────────────────────────
type BallItemProps = {
  num: number;
  r: number;
  palIdx: number;
  isGold: boolean;
  anim: BallAnim;
  onTap: (num: number) => void;
};

const BallItem = React.memo(
  ({ num, r, palIdx, isGold, anim, onTap }: BallItemProps) => {
    const D = r * 2;
    const [pal1, pal2] = BALL_PALETTES[palIdx % BALL_PALETTES.length];
    const fontSize = Math.max(10, r * 0.82);

    const shakeRot = anim.shake.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: ['-12deg', '0deg', '12deg'],
    });

    return (
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: D,
          height: D,
          transform: [
            { translateX: anim.tx },
            { translateY: anim.ty },
            { scale: anim.scale },
            { rotate: shakeRot },
          ],
          opacity: anim.opacity,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onTap(num)}
          style={{
            width: D,
            height: D,
            borderRadius: D / 2,
            overflow: 'hidden',
          }}
        >
          <LinearGradient
            colors={
              isGold
                ? ['#ffe877', '#f5c842', '#b8870c']
                : [lightenHex(pal1, 40) as any, pal1, pal2]
            }
            start={{ x: 0.36, y: 0.3 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            {/* Gloss */}
            <View
              style={{
                position: 'absolute',
                top: '6%',
                left: '15%',
                width: '55%',
                height: '42%',
                backgroundColor: 'rgba(255,255,255,0.22)',
                borderRadius: 100,
              }}
            />
            <Text
              style={{
                fontWeight: '800',
                fontSize,
                color: isGold ? '#1a0e00' : 'rgba(255,255,255,0.96)',
                letterSpacing: -0.5,
              }}
            >
              {num}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }
);

BallItem.displayName = '';

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VoltNumbers() {
  const { dayId, gameId, challengeDayGameId } = useLocalSearchParams();
  const { t } = useTranslation();
  const [screen, setScreen] = useState<Screen>('start');
  const [diff, setDiff] = useState<Diff>('normal');
  const [phase, setPhase] = useState<Phase>('look');
  const [balls, setBalls] = useState<BallState[]>([]);
  const [elapsedDisp, setElapsedDisp] = useState('0.0');
  const [remaining, setRemaining] = useState(0);
  const [currentDisp, setCurrentDisp] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [boardTab, setBoardTab] = useState<Diff>('normal');
  const [lbData, setLbData] = useState<Record<Diff, LBEntry[]>>({
    easy: [],
    normal: [],
    hard: [],
  });
  const [result, setResult] = useState({
    won: false,
    time: 0,
    okTaps: 0,
    errors: 0,
    rank: 0,
    isNew: false,
  });

  // ── Boost: Freeze ──────────────────────────────────────────────────────────
  const { useBoost: consumeBoost } = useBoostsInventory();
  const { retryCount, hasRetry, activateRetry } = useRetryBoost();
  const freezeCount = useBoostsInventory(
    state => state.inventory['volt_num_freeze'] ?? 0
  );
  const { addXP, addIQScore } = useUserStats();
  const [freezeActive, setFreezeActive] = useState(false);
  const [freezeCountdown, setFreezeCountdown] = useState(0);
  const [freezeUsedThisGame, setFreezeUsedThisGame] = useState(0);
  const freezeCountdownRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  // ── refs ────────────────────────────────────────────────────────────────────
  const diffRef = useRef<Diff>('normal');
  const phaseRef = useRef<Phase>('look');
  const currentRef = useRef(0); // next number to tap (descending)
  const totalRef = useRef(0);
  const mistakesRef = useRef(0);
  const okTapsRef = useRef(0);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockedRef = useRef(false);
  const arenaSize = useRef<{ w: number; h: number } | null>(null);
  const needsSpawn = useRef(false);
  const ballAnimsRef = useRef<Map<number, BallAnim>>(new Map());
  const pName = useRef(appStorage.getString(Keys.USER_NAME) ?? 'Player');
  const pAvatar = useRef(AVATARS[Math.floor(Math.random() * AVATARS.length)]);

  // ── look banner anim ────────────────────────────────────────────────────────
  const bannerOpacity = useRef(new Animated.Value(0)).current;

  const showBanner = useCallback(() => {
    Animated.timing(bannerOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [bannerOpacity]);

  const hideBanner = useCallback(
    (cb?: () => void) => {
      Animated.timing(bannerOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(cb);
    },
    [bannerOpacity]
  );

  // ── scatter ─────────────────────────────────────────────────────────────────
  const scatterBalls = useCallback((callback: () => void) => {
    const { w: aW, h: aH } = arenaSize.current!;
    const cfg = DIFF_CFG[diffRef.current];
    const nums = [...ballAnimsRef.current.keys()];
    const positions = buildGrid(nums.length, aW, aH - STATUS_H, cfg.ballR);

    nums.forEach((num, idx) => {
      const a = ballAnimsRef.current.get(num);
      if (!a) return;
      const pos = positions[idx];
      const R = pos.r;
      const delay = idx * 10;
      const dur = 650;
      const ez = Easing.bezier(0.34, 1.35, 0.64, 1);
      Animated.timing(a.tx, {
        toValue: pos.x - R,
        duration: dur,
        delay,
        easing: ez,
        useNativeDriver: true,
      }).start();
      Animated.timing(a.ty, {
        toValue: pos.y - R,
        duration: dur,
        delay,
        easing: ez,
        useNativeDriver: true,
      }).start();
    });

    setTimeout(callback, 900);
  }, []);

  // ── activatePlay ─────────────────────────────────────────────────────────────
  const activatePlay = useCallback(() => {
    phaseRef.current = 'scatter';
    setPhase('scatter');
    scatterBalls(() => {
      phaseRef.current = 'play';
      setPhase('play');
      // Start timer
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const sec = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
        setElapsedDisp(sec);
      }, 250);
    });
  }, [scatterBalls]);

  // ── spawnBalls ───────────────────────────────────────────────────────────────
  const spawnBalls = useCallback(
    (aW: number, aH: number) => {
      const cfg = DIFF_CFG[diffRef.current];
      const n = cfg.count;
      const positions = buildGrid(n, aW, aH - STATUS_H, cfg.ballR);
      const numbers = shuffleArr(Array.from({ length: n }, (_, i) => i + 1));

      const newBalls: BallState[] = numbers.map((num, i) => {
        const pos = positions[i];
        const R = pos.r;
        const anim: BallAnim = {
          tx: new Animated.Value(pos.x - R),
          ty: new Animated.Value(pos.y - R),
          scale: new Animated.Value(1),
          opacity: new Animated.Value(1),
          shake: new Animated.Value(0),
        };
        ballAnimsRef.current.set(num, anim);
        return { num, r: R, palIdx: num % BALL_PALETTES.length, anim };
      });

      setBalls(newBalls);
      setRemaining(n);
      setCurrentDisp(n);
      currentRef.current = n;
      totalRef.current = n;
      mistakesRef.current = 0;
      okTapsRef.current = 0;
      setMistakes(0);
      setElapsedDisp('0.0');
      bannerOpacity.setValue(0);

      // Show look banner after a brief paint delay
      setTimeout(() => {
        phaseRef.current = 'look';
        setPhase('look');
        showBanner();
      }, 100);
    },
    [showBanner, bannerOpacity]
  );

  // ── initGame ─────────────────────────────────────────────────────────────────
  const initGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    ballAnimsRef.current.clear();
    diffRef.current = diff;
    lockedRef.current = false;
    setFreezeActive(false);
    setFreezeCountdown(0);
    setFreezeUsedThisGame(0);
    if (freezeCountdownRef.current) clearInterval(freezeCountdownRef.current);
    pAvatar.current = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    setScreen('game');
    if (arenaSize.current) {
      spawnBalls(arenaSize.current.w, arenaSize.current.h);
    } else {
      needsSpawn.current = true;
    }
  }, [diff, spawnBalls]);

  const onArenaLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width: w, height: h } = e.nativeEvent.layout;
      arenaSize.current = { w, h: h - 20 };
      if (needsSpawn.current) {
        needsSpawn.current = false;
        spawnBalls(w, h);
      }
    },
    [spawnBalls]
  );

  // ── onBallTap ─────────────────────────────────────────────────────────────────
  const onBallTap = useCallback(
    (num: number) => {
      const p = phaseRef.current;

      if (p === 'look') {
        if (num === totalRef.current) {
          hideBanner(() => activatePlay());
        } else {
          const a = ballAnimsRef.current.get(num);
          if (a) {
            Animated.sequence([
              Animated.timing(a.shake, {
                toValue: 1,
                duration: 70,
                useNativeDriver: true,
              }),
              Animated.timing(a.shake, {
                toValue: -1,
                duration: 70,
                useNativeDriver: true,
              }),
              Animated.timing(a.shake, {
                toValue: 1,
                duration: 70,
                useNativeDriver: true,
              }),
              Animated.timing(a.shake, {
                toValue: 0,
                duration: 70,
                useNativeDriver: true,
              }),
            ]).start();
          }
        }
        return;
      }

      if (p !== 'play' || lockedRef.current) return;

      if (num === currentRef.current) {
        // Correct tap
        okTapsRef.current++;
        const a = ballAnimsRef.current.get(num);
        if (a) {
          Animated.parallel([
            Animated.sequence([
              Animated.timing(a.scale, {
                toValue: 1.3,
                duration: 100,
                useNativeDriver: true,
              }),
              Animated.timing(a.scale, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(a.opacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start();
        }
        currentRef.current--;
        const rem = currentRef.current;
        setCurrentDisp(rem);
        setRemaining(rem);

        if (rem === 0) {
          lockedRef.current = true;
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          const finalTime = parseFloat(
            ((Date.now() - startTimeRef.current) / 1000).toFixed(1)
          );
          setTimeout(() => finishGame(true, finalTime), 400);
        }
      } else {
        // Wrong tap
        const newM = mistakesRef.current + 1;
        mistakesRef.current = newM;
        setMistakes(newM);
        const a = ballAnimsRef.current.get(num);
        if (a) {
          Animated.sequence([
            Animated.timing(a.shake, {
              toValue: 1,
              duration: 70,
              useNativeDriver: true,
            }),
            Animated.timing(a.shake, {
              toValue: -1,
              duration: 70,
              useNativeDriver: true,
            }),
            Animated.timing(a.shake, {
              toValue: 1,
              duration: 70,
              useNativeDriver: true,
            }),
            Animated.timing(a.shake, {
              toValue: 0,
              duration: 70,
              useNativeDriver: true,
            }),
          ]).start();
        }
        if (newM >= 3) {
          lockedRef.current = true;
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          const finalTime = parseFloat(
            ((Date.now() - startTimeRef.current) / 1000).toFixed(1)
          );
          setTimeout(() => finishGame(false, finalTime), 400);
        }
      }
    },
    [hideBanner, activatePlay]
  );

  const bestRef = useRef<number | null>(null);

  const finishGame = useCallback(
    async (won: boolean, finalTime: number) => {
      const diffBestKey = `bestTime_v1_${diffRef.current}`;
      bestRef.current = gameStorage.getNumber(diffBestKey) || null;

      phaseRef.current = 'done';
      let rank = 0,
        isNew = false;
      if (won) {
        if (bestRef.current === null || finalTime < bestRef.current) {
          gameStorage.set(diffBestKey, finalTime);
        }

        const res = saveLBEntry(
          diffRef.current,
          pName.current,
          finalTime,
          pAvatar.current
        );
        rank = res.rank;
        isNew = res.isNew;
      }
      const totalTaps = okTapsRef.current + mistakesRef.current;
      const finalAcc =
        totalTaps > 0 ? Math.round((okTapsRef.current / totalTaps) * 100) : 0;
      const baseXP = won ? 100 : 20;
      const xpGain = baseXP + (finalAcc > 80 ? 25 : 0);
      addXP(xpGain);
      addIQScore(finalAcc);

      (async () => {
        try {
          if (challengeDayGameId) {
            const res = await ChallengesModule.completeDayGame(
              challengeDayGameId as string,
              0
            );
            if (res?.dayCompleted) {
              Alert.alert(t('games.common.congratsTitle'), t('games.common.allDayGamesDone'));
            }
          } else {
            const response = await GamesModule.completeGame(
              (gameId as string) || 15
            );
            if (response.dayCompleted) {
              Alert.alert(t('games.common.challengeTitle'), t('games.common.dayFinished'));
            }
            if (dayId) {
              await ChallengesModule.submitDayScore(dayId as string, 0);
            }
          }
        } catch (error) {
          console.error('Failed to complete game/submit score:', error);
        }
      })();

      setResult({
        won,
        time: finalTime,
        okTaps: okTapsRef.current,
        errors: mistakesRef.current,
        rank,
        isNew,
      });
      setScreen('result');
    },
    [addXP, addIQScore, dayId, gameId, challengeDayGameId, t]
  );

  const useFreezeBoost = useCallback(() => {
    if (freezeUsedThisGame >= 1 || freezeCount <= 0 || freezeActive) return;
    if (phaseRef.current !== 'play') return;

    if (!consumeBoost('volt_num_freeze')) return;

    setFreezeActive(true);
    setFreezeUsedThisGame(n => n + 1);

    // Pause timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Countdown display
    setFreezeCountdown(10);
    let remaining = 10;
    freezeCountdownRef.current = setInterval(() => {
      remaining -= 1;
      setFreezeCountdown(remaining);
      if (remaining <= 0) {
        if (freezeCountdownRef.current)
          clearInterval(freezeCountdownRef.current);
      }
    }, 1000);

    // After 10s: shift startTime and resume
    setTimeout(() => {
      startTimeRef.current += 10000;
      timerRef.current = setInterval(() => {
        const sec = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
        setElapsedDisp(sec);
      }, 250);
      setFreezeActive(false);
      setFreezeCountdown(0);
    }, 10000);
  }, [freezeUsedThisGame, freezeActive, freezeCount, consumeBoost]);

  // ── openBoard ────────────────────────────────────────────────────────────────
  const openBoard = useCallback((tab?: Diff) => {
    const t = tab ?? diffRef.current;
    setBoardTab(t);
    setLbData(ensureLB());
    setScreen('board');
  }, []);

  // ── cleanup ──────────────────────────────────────────────────────────────────
  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (freezeCountdownRef.current) clearInterval(freezeCountdownRef.current);
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER START
  // ─────────────────────────────────────────────────────────────────────────────
  if (screen === 'start') {
    return (
      <View style={s.bg}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={s.startScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Back */}
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={22} color={MUTED} />
            </TouchableOpacity>

            {/* Logo */}
            <View style={s.logoWrap}>
              <Text style={s.logoMain}>VOLT</Text>
              <Text style={s.logoSub}>{t('games.voltNumbers.start.logoSub')}</Text>
            </View>

            {/* Preview ball */}
            <View style={s.previewBall}>
              <Text style={s.previewBallText}>50</Text>
            </View>

            {/* How cards */}
            <View style={s.howRow}>
              {[
                {
                  ico: '👁',
                  ttl: t('games.voltNumbers.start.how.rememberTitle'),
                  txt: t('games.voltNumbers.start.how.rememberText'),
                },
                {
                  ico: '💥',
                  ttl: t('games.voltNumbers.start.how.scatterTitle'),
                  txt: t('games.voltNumbers.start.how.scatterText'),
                },
                {
                  ico: '⚡',
                  ttl: t('games.voltNumbers.start.how.inOrderTitle'),
                  txt: t('games.voltNumbers.start.how.inOrderText'),
                },
                {
                  ico: '🏆',
                  ttl: t('games.voltNumbers.start.how.timedTitle'),
                  txt: t('games.voltNumbers.start.how.timedText'),
                },
              ].map(c => (
                <View key={c.ttl} style={s.howCard}>
                  <Text style={s.howIco}>{c.ico}</Text>
                  <Text style={s.howTtl}>{c.ttl}</Text>
                  <Text style={s.howTxt}>{c.txt}</Text>
                </View>
              ))}
            </View>

            {/* Difficulty */}
            {/*<Text style={s.diffLabel}>DIFFICULTY</Text>
            <View style={s.diffRow}>
              {(["easy", "normal", "hard"] as Diff[]).map((d) => {
                const cfg = DIFF_CFG[d];
                const sel = diff === d;
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setDiff(d)}
                    style={[s.diffPill, sel && s.diffPillSel]}
                  >
                    <Text style={[s.diffName, sel && { color: GOLD }]}>
                      {d === "easy"
                        ? "Easy"
                        : d === "normal"
                          ? "Normal"
                          : "Hard"}
                    </Text>
                    <Text style={s.diffDesc}>{cfg.count} balls</Text>
                  </TouchableOpacity>
                );
              })}
            </View>*/}

            {/* Start */}
            <TouchableOpacity
              onPress={initGame}
              activeOpacity={0.85}
              style={s.startBtnWrap}
            >
              <LinearGradient
                colors={[GOLD, '#fb9c38']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.startBtn}
              >
                <Text style={s.startBtnText}>{t('games.voltNumbers.start.startBtn')}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => openBoard(diff)}
              style={s.outlineBtn}
            >
              <Text style={s.outlineBtnText}>{t('games.voltNumbers.common.leaderboard')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER GAME
  // ─────────────────────────────────────────────────────────────────────────────
  if (screen === 'game') {
    const cfg = DIFF_CFG[diffRef.current];
    const total = totalRef.current || cfg.count;
    const progress = total > 0 ? (total - remaining) / total : 0;
    const isLook = phase === 'look';

    return (
      <View style={s.bg}>
        <SafeAreaView style={{ flex: 1 }}>
          {/* HUD */}
          <View style={s.hud}>
            <View style={s.hbox}>
              <Text style={s.hlbl}>{t('games.voltNumbers.game.time')}</Text>
              <Text
                style={[s.hval, { color: freezeActive ? '#7dd3fc' : GOLD }]}
              >
                {elapsedDisp}s
              </Text>
            </View>
            <View style={s.hbox}>
              <Text style={s.hlbl}>{t('games.voltNumbers.game.left')}</Text>
              <Text style={s.hval}>{remaining}</Text>
            </View>
            <View style={[s.hbox, s.hboxNext]}>
              <Text style={[s.hlbl, { color: 'rgba(245,200,66,0.7)' }]}>
                {t('games.voltNumbers.game.find')}
              </Text>
              <Text style={[s.hval, { color: GOLD, fontSize: 26 }]}>
                {phase === 'play' ? currentDisp : '—'}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                s.freezeBtn,
                freezeActive && s.freezeBtnActive,
                (freezeUsedThisGame >= 1 || freezeCount <= 0) &&
                  s.freezeBtnDisabled,
              ]}
              onPress={useFreezeBoost}
              disabled={
                freezeUsedThisGame >= 1 || freezeCount <= 0 || freezeActive
              }
            >
              <Text style={s.freezeBtnEmoji}>
                {freezeActive ? `${freezeCountdown}` : '❄️'}
              </Text>
              {!freezeActive && freezeCount > 0 && (
                <View style={s.freezeBadge}>
                  <Text style={s.freezeBadgeText}>{freezeCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Progress */}
          <View style={s.progRow}>
            <View style={s.progInfo}>
              <Text style={s.progLbl}>{cfg.label}</Text>
              <Text style={s.progLbl}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={s.progTrack}>
              <Animated.View
                style={[s.progFill, { width: `${progress * 100}%` as any }]}
              />
            </View>
          </View>

          {/* Arena */}
          <View style={s.arena} onLayout={onArenaLayout}>
            {balls.map(b => (
              <BallItem
                key={b.num}
                num={b.num}
                r={b.r}
                palIdx={b.palIdx}
                isGold={isLook && b.num === total}
                anim={b.anim}
                onTap={onBallTap}
              />
            ))}

            {/* Look phase banner */}
            <Animated.View
              pointerEvents={isLook ? 'box-none' : 'none'}
              style={[s.lookBanner, { opacity: bannerOpacity }]}
            >
              <Text style={s.bannerEmo}>👁</Text>
              <Text style={s.bannerTitle}>{t('games.voltNumbers.game.bannerTitle')}</Text>
              <Text style={s.bannerSub}>
                {t('games.voltNumbers.game.bannerSub', { total })}
              </Text>
              <TouchableOpacity
                onPress={() => hideBanner(() => activatePlay())}
                style={s.bannerBtn}
                activeOpacity={0.85}
              >
                <Text style={s.bannerBtnText}>{t('games.voltNumbers.game.readyBtn')}</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Status strip */}
            <View style={s.statusStrip}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <View
                    key={i}
                    style={[s.missDot, i < mistakes && s.missDotUsed]}
                  />
                ))}
              </View>
              <Text style={s.statusTxt}>
                {mistakes >= 3
                  ? t('games.voltNumbers.game.limitReached')
                  : t('games.voltNumbers.game.mistakes', { mistakes })}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER RESULT
  // ─────────────────────────────────────────────────────────────────────────────
  if (screen === 'result') {
    const { won, time, okTaps, errors, rank, isNew } = result;
    const total = totalRef.current;
    const acc = total > 0 ? Math.round((okTaps / (okTaps + errors)) * 100) : 0;
    const avgPerBall = total > 0 ? (time / total).toFixed(1) : '-';

    let crown = '💪',
      title = t('games.voltNumbers.result.tryAgainTitle'),
      sub = t('games.voltNumbers.result.mistakes', { errors });
    let medalIco = '🥉',
      medalVal = t('games.voltNumbers.result.medalBronze');
    if (!won) {
      crown = '😤';
      title = t('games.voltNumbers.result.soClose');
    } else if (time < 30) {
      crown = '🏆';
      title = t('games.voltNumbers.result.legend');
      sub = t('games.voltNumbers.result.phenomenal');
      medalIco = '🥇';
      medalVal = t('games.voltNumbers.result.medalGold');
    } else if (time < 60) {
      crown = '🎉';
      title = t('games.voltNumbers.result.excellent');
      sub = t('games.voltNumbers.result.amazing');
      medalIco = '🥈';
      medalVal = t('games.voltNumbers.result.medalSilver');
    } else {
      crown = '😎';
      title = t('games.voltNumbers.result.goodJob');
      sub = t('games.voltNumbers.result.keepPractising');
    }

    return (
      <View style={s.bg}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={s.resultScroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.rCrown}>{crown}</Text>
            <Text style={s.rTitle}>{title}</Text>
            <Text style={s.rSub}>{sub}</Text>

            <View style={s.statsRowComparison}>
              <View style={s.statBoxComparison}>
                <View style={s.statIconWrap}>
                  <Ionicons name="trophy-outline" size={16} color={GOLD} />
                </View>
                <Text style={[s.statNumComparison, { color: GOLD }]}>
                  {won
                    ? (bestRef.current !== null
                        ? Math.min(bestRef.current, time)
                        : time
                      ).toFixed(1)
                    : bestRef.current !== null
                      ? bestRef.current.toFixed(1)
                      : '—'}
                </Text>
                <Text style={s.statLabelComparison}>{t('games.voltNumbers.result.bestTime')}</Text>
              </View>
              <View style={s.statBoxComparison}>
                <View style={s.statIconWrap}>
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={won ? GREEN : RED}
                  />
                </View>
                <Text
                  style={[s.statNumComparison, { color: won ? GREEN : RED }]}
                >
                  {won ? time.toFixed(1) : t('games.voltNumbers.result.fail')}
                </Text>
                <Text style={s.statLabelComparison}>{t('games.voltNumbers.result.yourTime')}</Text>
              </View>
            </View>

            {/* Score slab */}
            <LinearGradient
              colors={['rgba(245,200,66,0.13)', 'rgba(251,156,56,0.07)']}
              style={s.scoreSlab}
            >
              <Text style={s.scLbl}>{t('games.voltNumbers.result.finalTime')}</Text>
              <Text style={s.scTime}>{won ? time.toFixed(1) : t('games.voltNumbers.result.fail')}</Text>
              <Text style={s.scUnit}>{t('games.voltNumbers.result.seconds')}</Text>
              <View style={s.scStats}>
                <View style={s.scStat}>
                  <Text style={[s.scStatV, { color: GREEN }]}>{okTaps}</Text>
                  <Text style={s.scStatK}>{t('games.voltNumbers.result.correct')}</Text>
                </View>
                <View style={s.scStat}>
                  <Text style={[s.scStatV, { color: RED }]}>{errors}</Text>
                  <Text style={s.scStatK}>{t('games.voltNumbers.result.errors')}</Text>
                </View>
                <View style={s.scStat}>
                  <Text style={[s.scStatV, { color: GOLD }]}>
                    {won ? `#${rank}` : '—'}
                  </Text>
                  <Text style={s.scStatK}>{t('games.voltNumbers.result.rank')}</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Medal row */}
            <View style={s.medalRow}>
              {[
                { ico: medalIco, lbl: t('games.voltNumbers.result.medal'), val: medalVal },
                { ico: '🎯', lbl: t('games.voltNumbers.result.accuracy'), val: `${acc}%` },
                { ico: '⚡', lbl: t('games.voltNumbers.result.avgPerBall'), val: `${avgPerBall}s` },
              ].map(m => (
                <View key={m.lbl} style={s.medalCard}>
                  <Text style={s.medalIco}>{m.ico}</Text>
                  <Text style={s.medalLbl}>{m.lbl}</Text>
                  <Text style={s.medalVal}>{m.val}</Text>
                </View>
              ))}
            </View>

            {/* New record */}
            {isNew && (
              <View style={s.newRecord}>
                <Text style={s.newRecordTxt}>{t('games.voltNumbers.result.newRecord')}</Text>
              </View>
            )}

            {/* Buttons */}
            <View style={s.rBtns}>
              <TouchableOpacity
                onPress={initGame}
                activeOpacity={0.85}
                style={s.startBtnWrap}
              >
                <LinearGradient
                  colors={[GOLD, '#fb9c38']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.startBtn}
                >
                  <Text style={s.startBtnText}>{t('games.voltNumbers.result.tryAgain')}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <RetryBoostButton
                hasRetry={hasRetry}
                retryCount={retryCount}
                onPress={() => activateRetry(0, initGame)}
                style={{ width: "100%", marginTop: 8 }}
              />
              <TouchableOpacity
                onPress={() => openBoard()}
                style={s.outlineBtn}
              >
                <Text style={s.outlineBtnText}>{t('games.voltNumbers.common.leaderboard')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setScreen('start')}
                style={s.outlineBtn}
              >
                <Text style={s.outlineBtnText}>{t('games.voltNumbers.result.home')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER BOARD
  // ─────────────────────────────────────────────────────────────────────────────
  const arr = (lbData[boardTab] ?? [])
    .slice()
    .sort((a, b) => a.t - b.t)
    .slice(0, 15);
  const myIdx = arr.findIndex(e => e.n === pName.current && !e.fake);

  return (
    <View style={s.bg}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.boardScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={s.boardHeader}>
            <Text style={s.boardTitle}>{t('games.voltNumbers.board.leaders')}</Text>
            <TouchableOpacity
              onPress={() =>
                setScreen(result.won !== undefined ? 'result' : 'start')
              }
              style={s.boardBack}
            >
              <Text style={s.boardBackTxt}>{t('games.voltNumbers.board.back')}</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={s.tabRow}>
            {(['easy', 'normal', 'hard'] as Diff[]).map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => {
                  setBoardTab(t);
                  setLbData(ensureLB());
                }}
                style={[s.tab, boardTab === t && s.tabSel]}
              >
                <Text style={[s.tabTxt, boardTab === t && { color: GOLD }]}>
                  {t === 'easy' ? t('games.voltNumbers.common.easy') : t === 'normal' ? t('games.voltNumbers.common.normal') : t('games.voltNumbers.common.hard')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Podium */}
          {arr.length >= 3 && (
            <View style={s.podium}>
              {([1, 0, 2] as const).map(i => {
                const e = arr[i];
                if (!e) return null;
                const heights = [128, 98, 76];
                const podStyles = [s.pod1, s.pod2, s.pod3];
                const scoreColors = [GOLD, '#c0c8d8', '#cd7f32'];
                return (
                  <View
                    key={i}
                    style={[s.pod, podStyles[i], { height: heights[i] }]}
                  >
                    <Text style={s.podAv}>{e.av || '😎'}</Text>
                    <Text style={s.podNm} numberOfLines={1}>
                      {e.n}
                    </Text>
                    <Text style={[s.podSc, { color: scoreColors[i] }]}>
                      {e.t}s
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* My position */}
          <View style={s.myPos}>
            <View>
              <Text style={s.myPosLbl}>{t('games.voltNumbers.board.myPosition')}</Text>
              <Text style={s.myPosVal}>
                {myIdx >= 0 ? `#${myIdx + 1}` : '—'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.myPosLbl}>{t('games.voltNumbers.result.bestTime')}</Text>
              <Text style={s.myPosVal}>
                {myIdx >= 0 ? `${arr[myIdx].t}s` : '—'}
              </Text>
            </View>
          </View>

          {/* List */}
          {arr.map((e, i) => {
            const isMe = e.n === pName.current && !e.fake;
            const rankColors = [
              'rgba(245,200,66,0.22)',
              'rgba(192,200,216,0.16)',
              'rgba(205,127,50,0.16)',
            ];
            const avColors = [
              '#d97706',
              '#0369a1',
              '#065f46',
              '#9d174d',
              '#1e3a5f',
              '#713f12',
              '#374151',
            ];
            const medal =
              i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
            const ac = avColors[i % avColors.length];
            return (
              <View
                key={`${e.n}-${i}`}
                style={[
                  s.boardItem,
                  i < 3 && { borderColor: rankColors[i] },
                  isMe && s.boardItemMe,
                ]}
              >
                <Text style={s.boardRank}>{medal}</Text>
                <View style={[s.boardAv, { backgroundColor: ac + '22' }]}>
                  <Text style={{ fontSize: 16 }}>{e.av || '😎'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.boardName}>
                    {e.n}
                    {isMe ? ` ${t('games.voltNumbers.board.you')}` : ''}
                  </Text>
                  <Text style={s.boardDate}>
                    VOLT Numbers · {boardTab.toUpperCase()}
                  </Text>
                </View>
                <Text style={s.boardScore}>{e.t}s</Text>
              </View>
            );
          })}

          <TouchableOpacity
            onPress={() => setScreen('start')}
            style={[s.outlineBtn, { marginTop: 8 }]}
          >
            <Text style={s.outlineBtnText}>{t('games.voltNumbers.result.home')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: BG },

  // ── Start ──
  startScroll: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  backBtn: { alignSelf: 'flex-start', padding: 8, marginBottom: 8 },
  logoWrap: { alignItems: 'center', marginBottom: 24 },
  logoMain: {
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: -3,
    lineHeight: 72,
    color: GOLD,
  },
  logoSub: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 5,
    color: MUTED,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  previewBall: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 24,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  previewBallText: { fontSize: 28, fontWeight: '900', color: '#1a0e00' },
  howRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  howCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: CARD,
    borderWidth: 1.5,
    borderColor: EDGE,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
  },
  howIco: { fontSize: 26, marginBottom: 5 },
  howTtl: { fontSize: 13, fontWeight: '800', color: GOLD, marginBottom: 3 },
  howTxt: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '600',
    lineHeight: 16,
    textAlign: 'center',
  },
  diffLabel: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: MUTED,
    marginBottom: 8,
  },
  diffRow: { width: '100%', flexDirection: 'row', gap: 8, marginBottom: 18 },
  diffPill: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: EDGE,
    backgroundColor: CARD,
    alignItems: 'center',
  },
  diffPillSel: {
    borderColor: GOLD,
    backgroundColor: 'rgba(245,200,66,0.08)',
  },
  diffName: { fontSize: 14, fontWeight: '800', color: MUTED },
  diffDesc: { fontSize: 10, color: MUTED, fontWeight: '600', marginTop: 3 },
  startBtnWrap: { alignSelf: 'stretch', marginBottom: 10 },
  startBtn: {
    borderRadius: 15,
    paddingVertical: 18,
    alignItems: 'center',
  },
  startBtnText: {
    fontSize: 18,
    fontWeight: '900',
    color: BG,
    letterSpacing: 1,
  },
  outlineBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: EDGE,
    backgroundColor: CARD,
    marginBottom: 10,
  },
  outlineBtnText: { fontSize: 14, fontWeight: '700', color: MUTED },

  // ── Game ──
  hud: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    marginBottom: 8,
  },
  hbox: {
    flex: 1,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: EDGE,
    borderRadius: 13,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  hboxNext: {
    backgroundColor: 'rgba(245,200,66,0.08)',
    borderColor: 'rgba(245,200,66,0.2)',
    alignItems: 'center',
    minWidth: 76,
    flex: 0,
  },
  hlbl: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    color: MUTED,
    textTransform: 'uppercase',
  },
  hval: { fontSize: 22, fontWeight: '800', color: INK, lineHeight: 26 },
  progRow: { paddingHorizontal: 16, marginBottom: 8 },
  progInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progLbl: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: MUTED },
  progTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 50,
    overflow: 'hidden',
  },
  progFill: { height: '100%', borderRadius: 50, backgroundColor: GOLD },
  arena: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: CARD,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.14)',
  },
  lookBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    backgroundColor: 'rgba(8,7,12,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  bannerEmo: { fontSize: 56, marginBottom: 8 },
  bannerTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: GOLD,
    marginBottom: 6,
  },
  bannerSub: {
    fontSize: 13,
    fontWeight: '700',
    color: MUTED,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 20,
  },
  bannerBtn: {
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 14,
    backgroundColor: GOLD,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  bannerBtnText: {
    fontSize: 18,
    fontWeight: '900',
    color: BG,
    letterSpacing: 1,
  },
  statusStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 12,
    backgroundColor: 'rgba(8,7,12,0.6)',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  missDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  missDotUsed: { backgroundColor: RED },
  statusTxt: { fontSize: 12, fontWeight: '700', color: MUTED },
  freezeBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(125,211,252,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(125,211,252,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freezeBtnActive: {
    backgroundColor: 'rgba(125,211,252,0.3)',
    borderColor: '#7dd3fc',
  },
  freezeBtnDisabled: { opacity: 0.35 },
  freezeBtnEmoji: { fontSize: 24, fontWeight: '900', color: '#7dd3fc' },
  freezeBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#38bdf8',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  freezeBadgeText: { color: '#000', fontSize: 9, fontWeight: '800' },

  // ── Result ──
  resultScroll: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
    alignItems: 'center',
  },
  rCrown: { fontSize: 56, textAlign: 'center', marginBottom: 6 },
  rTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: GOLD,
    letterSpacing: -1,
    marginBottom: 4,
  },
  rSub: { fontSize: 13, fontWeight: '600', color: MUTED, marginBottom: 22 },
  statsRowComparison: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    justifyContent: 'center',
    width: '100%',
  },
  statBoxComparison: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  statNumComparison: { fontSize: 24, fontWeight: '900', lineHeight: 26 },
  statLabelComparison: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: MUTED,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  scoreSlab: {
    width: '100%',
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.2)',
  },
  scLbl: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: MUTED,
    marginBottom: 4,
  },
  scTime: {
    fontSize: 72,
    fontWeight: '900',
    color: GOLD,
    letterSpacing: -2,
    lineHeight: 76,
  },
  scUnit: { fontSize: 14, fontWeight: '700', color: MUTED, marginBottom: 4 },
  scStats: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
    width: '100%',
    justifyContent: 'space-around',
  },
  scStat: { alignItems: 'center' },
  scStatV: { fontSize: 24, fontWeight: '900' },
  scStatK: { fontSize: 10, color: MUTED, fontWeight: '600', marginTop: 1 },
  medalRow: { width: '100%', flexDirection: 'row', gap: 8, marginBottom: 12 },
  medalCard: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: EDGE,
    backgroundColor: CARD,
    alignItems: 'center',
  },
  medalIco: { fontSize: 26, marginBottom: 4 },
  medalLbl: { fontSize: 11, color: MUTED, fontWeight: '600' },
  medalVal: { fontSize: 17, fontWeight: '900', color: GOLD },
  newRecord: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.2)',
    backgroundColor: 'rgba(245,200,66,0.08)',
    alignItems: 'center',
    marginBottom: 12,
  },
  newRecordTxt: {
    fontSize: 17,
    fontWeight: '900',
    color: GOLD,
    letterSpacing: 1,
  },
  rBtns: { width: '100%', gap: 9, alignSelf: 'stretch' },

  // ── Board ──
  boardScroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  boardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  boardTitle: { fontSize: 24, fontWeight: '900', color: INK },
  boardBack: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: EDGE,
  },
  boardBackTxt: { fontSize: 13, fontWeight: '700', color: MUTED },
  tabRow: { flexDirection: 'row', gap: 7, marginBottom: 14 },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: EDGE,
    backgroundColor: CARD,
    alignItems: 'center',
  },
  tabSel: { borderColor: GOLD, backgroundColor: 'rgba(245,200,66,0.08)' },
  tabTxt: { fontSize: 12, fontWeight: '700', color: MUTED },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  pod: {
    flex: 1,
    maxWidth: 112,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pod1: {
    backgroundColor: 'rgba(245,200,66,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.22)',
  },
  pod2: {
    backgroundColor: 'rgba(192,200,216,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(192,200,216,0.14)',
  },
  pod3: {
    backgroundColor: 'rgba(205,127,50,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(205,127,50,0.14)',
  },
  podAv: { fontSize: 24, marginBottom: 4 },
  podNm: { fontSize: 11, fontWeight: '700', color: INK, textAlign: 'center' },
  podSc: { fontSize: 15, fontWeight: '900' },
  myPos: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(245,200,66,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.16)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  myPosLbl: { fontSize: 11, color: MUTED, fontWeight: '600' },
  myPosVal: { fontSize: 22, fontWeight: '900', color: GOLD },
  boardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: EDGE,
    borderRadius: 13,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 7,
  },
  boardItemMe: {
    borderColor: 'rgba(245,200,66,0.28)',
    backgroundColor: 'rgba(245,200,66,0.05)',
  },
  boardRank: {
    fontSize: 17,
    fontWeight: '900',
    color: INK,
    minWidth: 28,
    textAlign: 'center',
  },
  boardAv: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardName: { fontSize: 13, fontWeight: '700', color: INK },
  boardDate: { fontSize: 10, color: MUTED, fontWeight: '600', marginTop: 1 },
  boardScore: { fontSize: 20, fontWeight: '900', color: GOLD },
});
