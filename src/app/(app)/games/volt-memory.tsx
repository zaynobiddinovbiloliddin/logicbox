import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useTranslation } from "react-i18next";
import { useBoostsInventory } from "@/store/boosts-inventory";
import { useRetryBoost } from "@/hooks/use-retry-boost";
import RetryBoostButton from "@/components/shared/retry-boost-button";
import { useUserStats } from "@/store/user-stats";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  ScrollView,
  Dimensions,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { createMMKV } from "react-native-mmkv";
import { Keys, storage as appStorage } from "@/store/mmkv";
import { ChallengesModule } from "@/services/modules/challenges-module";
import { GamesModule } from "@/services/modules/games-module";
import { Alert } from "react-native";

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get("window");

const GOLD = "#f5c842";
const RED = "#ff5c6c";
const GREEN = "#2ecc8f";
const BG = "#08070c";
const CARD = "#161524";
const INK = "#f2eedc";
const MUTED = "rgba(242,238,220,0.45)";
const EDGE = "rgba(245,200,66,0.12)";

const COLS = 5;
const TOTAL_PAIRS = 10;
const ROUND_TIME = 63;
const GAP = 8;
const H_PAD = 12;

const ALL_ICONS = [
  {
    e: "🎈",
    bg: ["#93c5fd", "#2563eb", "#1e3a8a"] as [string, string, string],
  },
  {
    e: "🍔",
    bg: ["#86efac", "#16a34a", "#052e16"] as [string, string, string],
  },
  {
    e: "⏰",
    bg: ["#fca5a5", "#dc2626", "#7f1d1d"] as [string, string, string],
  },
  {
    e: "🧠",
    bg: ["#fde68a", "#d97706", "#451a03"] as [string, string, string],
  },
  {
    e: "🛁",
    bg: ["#fca5a5", "#e11d48", "#500724"] as [string, string, string],
  },
  {
    e: "👓",
    bg: ["#5eead4", "#0d9488", "#042f2e"] as [string, string, string],
  },
  {
    e: "🛏",
    bg: ["#7dd3fc", "#0369a1", "#0c4a6e"] as [string, string, string],
  },
  {
    e: "🚂",
    bg: ["#6ee7b7", "#059669", "#022c22"] as [string, string, string],
  },
  {
    e: "🦁",
    bg: ["#fde68a", "#b45309", "#451a03"] as [string, string, string],
  },
  {
    e: "🚀",
    bg: ["#c4b5fd", "#7c3aed", "#2e1065"] as [string, string, string],
  },
  {
    e: "🎮",
    bg: ["#fb923c", "#ea580c", "#431407"] as [string, string, string],
  },
  {
    e: "⚽",
    bg: ["#d1fae5", "#065f46", "#022c22"] as [string, string, string],
  },
  {
    e: "🌸",
    bg: ["#fbcfe8", "#be185d", "#500724"] as [string, string, string],
  },
  {
    e: "🐬",
    bg: ["#7dd3fc", "#0369a1", "#0c4a6e"] as [string, string, string],
  },
  {
    e: "🦋",
    bg: ["#e9d5ff", "#7c3aed", "#2e1065"] as [string, string, string],
  },
  {
    e: "🍕",
    bg: ["#fef08a", "#ca8a04", "#422006"] as [string, string, string],
  },
  {
    e: "🎸",
    bg: ["#fcd34d", "#92400e", "#1c0a00"] as [string, string, string],
  },
  {
    e: "🐉",
    bg: ["#86efac", "#15803d", "#052e16"] as [string, string, string],
  },
  {
    e: "⚡",
    bg: ["#fde68a", "#ca8a04", "#422006"] as [string, string, string],
  },
  {
    e: "🎯",
    bg: ["#fca5a5", "#b91c1c", "#450a0a"] as [string, string, string],
  },
];

type IconDef = (typeof ALL_ICONS)[number];
type CardData = { id: number; pairId: number; icon: IconDef };
type Screen = "start" | "game" | "result";

const storage = createMMKV({ id: "volt-memory-game" });
const LB_KEY = "volt_memory_lb_v1";
const FAKES = [
  "BlitzKing",
  "NovaStar",
  "QuickFox",
  "NeonBrain",
  "CyberTiger",
  "Shadow_X",
  "ProMind",
  "FlashIQ",
  "AlphaWave",
  "TopPlayer",
];
const AVS = ["😎", "🧠", "🎯", "🔥", "⚡", "🦁", "🐉", "👑", "🌟", "🚀"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ri(a: number, b: number) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

// ─── Memory Card ──────────────────────────────────────────────────────────────

function MemoryCard({
  card,
  isFlipped,
  isMatched,
  isWrong,
  size,
  onPress,
  disabled,
}: {
  card: CardData;
  isFlipped: boolean;
  isMatched: boolean;
  isWrong: boolean;
  size: number;
  onPress: () => void;
  disabled: boolean;
}) {
  const flipAnim = useRef(
    new Animated.Value(isFlipped || isMatched ? 1 : 0),
  ).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const showFront = isFlipped || isMatched;

  useEffect(() => {
    Animated.timing(flipAnim, {
      toValue: showFront ? 1 : 0,
      duration: 360,
      useNativeDriver: true,
    }).start();
  }, [showFront]);

  useEffect(() => {
    if (!isWrong) return;
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 1,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -1,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0.5,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 55,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isWrong]);

  const backRotateY = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const frontRotateY = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });
  const shakeX = shakeAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-5, 0, 5],
  });

  const r = size / 2;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || isMatched || showFront}
      activeOpacity={0.85}
      style={{ width: size, height: size }}
    >
      <Animated.View
        style={{
          width: size,
          height: size,
          transform: [{ translateX: shakeX }],
        }}
      >
        {/* BACK */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: r,
              alignItems: "center",
              justifyContent: "center",
              backfaceVisibility: "hidden",
              transform: [{ perspective: 900 }, { rotateY: backRotateY }],
              backgroundColor: "#161228",
              borderWidth: 1.5,
              borderColor: "rgba(245,200,66,0.2)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.55,
              shadowRadius: 8,
              elevation: 4,
            },
          ]}
        >
          <Text style={{ fontSize: size * 0.34, opacity: 0.32 }}>⚡</Text>
        </Animated.View>

        {/* FRONT */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: r,
              alignItems: "center",
              justifyContent: "center",
              backfaceVisibility: "hidden",
              overflow: "hidden",
              transform: [{ perspective: 900 }, { rotateY: frontRotateY }],
              borderWidth: isMatched ? 2.5 : 0,
              borderColor: GREEN,
              shadowColor: isMatched ? GREEN : "#000",
              shadowOpacity: isMatched ? 0.55 : 0.35,
              shadowRadius: isMatched ? 14 : 5,
              elevation: isMatched ? 8 : 3,
            },
          ]}
        >
          <LinearGradient
            colors={card.icon.bg}
            start={{ x: 0.35, y: 0.28 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: r }]}
          />
          <Text style={{ fontSize: size * 0.42 }}>{card.icon.e}</Text>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VoltMemory() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { dayId, gameId, challengeDayGameId } = useLocalSearchParams();
  const playerName = appStorage.getString(Keys.USER_NAME) ?? "Player";
  const bestScore = useMemo(() => {
    try {
      const raw = storage.getString(LB_KEY);
      if (!raw) return 0;
      const lb: { n: string; s: number; fake?: boolean }[] = JSON.parse(raw);
      const me = lb.find((e) => e.n === playerName && !e.fake);
      return me ? me.s : 0;
    } catch {
      return 0;
    }
  }, [playerName]);

  const [screen, setScreen] = useState<Screen>("start");

  // Cards
  const [cards, setCards] = useState<CardData[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<Set<number>>(new Set());
  const [wrongIndices, setWrongIndices] = useState<number[]>([]);
  const [isLocked, setIsLocked] = useState(false);

  // Score
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [foundPairs, setFoundPairs] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  // Timer
  const [tLeft, setTLeft] = useState(ROUND_TIME);
  const timerBarAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Win overlay data
  const [winData, setWinData] = useState<{
    timeUsed: number;
    moves: number;
    maxCombo: number;
    score: number;
  } | null>(null);

  // Result
  const [resultScore, setResultScore] = useState(0);
  const [resultPairs, setResultPairs] = useState(0);
  const [resultMoves, setResultMoves] = useState(0);
  const [resultMaxCombo, setResultMaxCombo] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);

  // Mutable refs (safe in callbacks)
  const scoreRef = useRef(0);
  const movesRef = useRef(0);
  const foundRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const tLeftRef = useRef(ROUND_TIME);
  const lockedRef = useRef(false);
  const flippedRef = useRef<number[]>([]);
  const matchedRef = useRef<Set<number>>(new Set());

  // ── Boost: Reveal ──────────────────────────────────────────────────────────
  const { useBoost: consumeBoost } = useBoostsInventory();
  const { addXP, addIQScore } = useUserStats();
  const revealCount = useBoostsInventory((state) => state.inventory["volt_memory_repeat"] ?? 0);
  const { retryCount, hasRetry, activateRetry, getFinalScore } = useRetryBoost();
  const [revealActive, setRevealActive] = useState(false);
  const [revealUsedThisGame, setRevealUsedThisGame] = useState(0);
  const cardsRef = useRef<CardData[]>([]);

  // ── Leaderboard ────────────────────────────────────────────────────────────

  const ensureLB = useCallback(() => {
    try {
      const raw = storage.getString(LB_KEY);
      let lb: { n: string; s: number; av: string; fake?: boolean }[] = raw
        ? JSON.parse(raw)
        : [];
      if (!lb.some((e) => e.fake)) {
        const base = [3200, 2750, 2360, 2000, 1700, 1430, 1200, 1000, 820, 660];
        lb = [
          ...FAKES.map((n, i) => ({ n, s: base[i], av: AVS[i], fake: true })),
          ...lb,
        ];
      }
      return lb;
    } catch {
      return [];
    }
  }, []);

  const saveLB = useCallback(
    (sc: number, name: string) => {
      try {
        const lb = ensureLB();
        const me = lb.find((e) => e.n === name && !e.fake);
        let isNew = false;
        if (!me) {
          lb.push({ n: name, s: sc, av: AVS[ri(0, AVS.length - 1)] });
          isNew = true;
        } else if (sc > me.s) {
          me.s = sc;
          isNew = true;
        }
        lb.sort((a, b) => b.s - a.s);
        storage.set(LB_KEY, JSON.stringify(lb));
        return isNew;
      } catch {
        return false;
      }
    },
    [ensureLB],
  );

  // ── End game ───────────────────────────────────────────────────────────────

  const endGame = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerBarAnim.stopAnimation();
    setWinData(null);
    const finalScore = getFinalScore(scoreRef.current);
    const isNew = saveLB(finalScore, playerName);

    const finalAcc = movesRef.current > 0 ? Math.round((foundRef.current / movesRef.current) * 100) : 0;
    const xpGain = Math.round(finalScore / 10) + (finalAcc > 80 ? 25 : 0);
    addXP(xpGain);
    addIQScore(finalAcc);

    (async () => {
      try {
        if (challengeDayGameId) {
          const res = await ChallengesModule.completeDayGame(
            challengeDayGameId as string,
            finalScore
          );
          if (res?.dayCompleted) {
            Alert.alert(t("games.common.congratsTitle"), t("games.common.allDayGamesDone"));
          }
        } else {
          const response = await GamesModule.completeGame(
            (gameId as string) || "14"
          );
          if (response.dayCompleted) {
            Alert.alert(t("games.common.challengeTitle"), t("games.common.dayFinished"));
          }
          if (dayId) {
            await ChallengesModule.submitDayScore(dayId as string, finalScore);
          }
        }
      } catch (error) {
        console.error("Failed to complete game/submit score:", error);
      }
    })();

    setResultScore(finalScore);
    setResultPairs(foundRef.current);
    setResultMoves(movesRef.current);
    setResultMaxCombo(maxComboRef.current);
    setIsNewRecord(isNew);
    setScreen("result");
  }, [saveLB, playerName, addXP, addIQScore, dayId, gameId]);

  // ── Time out ───────────────────────────────────────────────────────────────

  const onTimeOut = useCallback(() => {
    lockedRef.current = true;
    setIsLocked(true);
    // Briefly reveal all unmatched
    const allUnmatched = cardsRef.current
      .map((_, i) => i)
      .filter((i) => !matchedRef.current.has(cardsRef.current[i].pairId));
    setFlippedIndices(allUnmatched);
    setTimeout(() => endGame(), 1000);
  }, [endGame]);

  // ── Check pair ─────────────────────────────────────────────────────────────

  const checkPair = useCallback((indices: number[]) => {
    const [aIdx, bIdx] = indices;
    const cardA = cardsRef.current[aIdx];
    const cardB = cardsRef.current[bIdx];

    if (cardA.pairId === cardB.pairId) {
      // MATCH ✅
      comboRef.current++;
      if (comboRef.current > maxComboRef.current)
        maxComboRef.current = comboRef.current;
      foundRef.current++;
      setCombo(comboRef.current);
      setMaxCombo(maxComboRef.current);
      setFoundPairs(foundRef.current);

      const newMatched = new Set(matchedRef.current);
      newMatched.add(cardA.pairId);
      matchedRef.current = newMatched;
      setMatchedPairIds(new Set(newMatched));

      const speedBonus = Math.round(tLeftRef.current * 2);
      const pts = (50 + speedBonus) * Math.min(comboRef.current, 6);
      scoreRef.current += pts;
      setScore(scoreRef.current);

      flippedRef.current = [];
      setFlippedIndices([]);
      lockedRef.current = false;
      setIsLocked(false);

      if (foundRef.current >= TOTAL_PAIRS) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerBarAnim.stopAnimation();
        const timeUsed = ROUND_TIME - tLeftRef.current;
        setTimeout(() => {
          setWinData({
            timeUsed,
            moves: movesRef.current,
            maxCombo: maxComboRef.current,
            score: scoreRef.current,
          });
        }, 350);
      }
    } else {
      // NO MATCH ❌
      comboRef.current = 0;
      setCombo(0);
      setWrongIndices(indices);
      setTimeout(() => {
        setWrongIndices([]);
        flippedRef.current = [];
        setFlippedIndices([]);
        lockedRef.current = false;
        setIsLocked(false);
      }, 700);
    }
  }, []);

  // ── Card tap ───────────────────────────────────────────────────────────────

  const onCardTap = useCallback(
    (idx: number) => {
      if (lockedRef.current) return;
      const card = cardsRef.current[idx];
      if (!card) return;
      if (matchedRef.current.has(card.pairId)) return;
      if (flippedRef.current.includes(idx)) return;
      if (flippedRef.current.length >= 2) return;

      const next = [...flippedRef.current, idx];
      flippedRef.current = next;
      setFlippedIndices([...next]);

      if (next.length === 2) {
        lockedRef.current = true;
        setIsLocked(true);
        movesRef.current++;
        setMoves(movesRef.current);
        setTimeout(() => checkPair(next), 500);
      }
    },
    [checkPair],
  );

  // ── Build game ─────────────────────────────────────────────────────────────

  const buildGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    // Reset refs
    scoreRef.current = 0;
    movesRef.current = 0;
    foundRef.current = 0;
    comboRef.current = 0;
    maxComboRef.current = 0;
    tLeftRef.current = ROUND_TIME;
    lockedRef.current = false;
    flippedRef.current = [];
    matchedRef.current = new Set();

    // Reset state
    setScore(0);
    setMoves(0);
    setFoundPairs(0);
    setCombo(0);
    setMaxCombo(0);
    setFlippedIndices([]);
    setMatchedPairIds(new Set());
    setWrongIndices([]);
    setIsLocked(false);
    setWinData(null);
    setRevealActive(false);
    setRevealUsedThisGame(0);

    // Build deck
    const iconPool = shuffle([...ALL_ICONS]).slice(0, TOTAL_PAIRS);
    const deck: CardData[] = shuffle([
      ...iconPool.map((icon, pairId) => ({ icon, pairId })),
      ...iconPool.map((icon, pairId) => ({ icon, pairId })),
    ]).map((c, id) => ({ ...c, id }));

    cardsRef.current = deck;
    setCards(deck);

    // Start timer
    setTLeft(ROUND_TIME);
    tLeftRef.current = ROUND_TIME;
    timerBarAnim.setValue(1);
    Animated.timing(timerBarAnim, {
      toValue: 0,
      duration: ROUND_TIME * 1000,
      useNativeDriver: false,
    }).start();

    const startTs = Date.now();
    timerRef.current = setInterval(() => {
      const left = Math.max(0, ROUND_TIME - (Date.now() - startTs) / 1000);
      tLeftRef.current = left;
      setTLeft(left);
      if (left <= 0) {
        clearInterval(timerRef.current!);
        onTimeOut();
      }
    }, 100);
  }, [onTimeOut]);

  // ── Start game ─────────────────────────────────────────────────────────────

  const startGame = useCallback(() => {
    setScreen("game");
    setTimeout(() => buildGame(), 80);
  }, [buildGame]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  const useRevealBoost = useCallback(() => {
    if (
      revealUsedThisGame >= 2 ||
      revealCount <= 0 ||
      revealActive
    )
      return;
    
    if (!consumeBoost("volt_memory_repeat")) return;

    setRevealActive(true);
    lockedRef.current = true;
    setIsLocked(true);
    setRevealUsedThisGame((n) => n + 1);
    setTimeout(() => {
      setRevealActive(false);
      lockedRef.current = false;
      setIsLocked(false);
    }, 1500);
  }, [revealUsedThisGame, revealActive, revealCount, consumeBoost]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const cellSize = Math.floor((SCREEN_W - H_PAD * 2 - GAP * (COLS - 1)) / COLS);
  const timerPct = tLeft / ROUND_TIME;
  const timerUrgent = timerPct < 0.25;

  // ───────────────────────────────────────────────────────────────────────────
  // ── START SCREEN ───────────────────────────────────────────────────────────
  // ───────────────────────────────────────────────────────────────────────────

  if (screen === "start") {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={["#130f1e", "#0d0b14", BG]}
          style={StyleSheet.absoluteFill}
        />

        <TouchableOpacity
          style={[ss.backBtn, { top: insets.top + 12 }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" color={GOLD} size={20} />
          <Text style={{ color: GOLD, fontSize: 12, fontWeight: "700", marginLeft: 4 }}>
            {t("common.back")}
          </Text>
        </TouchableOpacity>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            ss.scroll,
            { paddingTop: insets.top, paddingBottom: 16 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={ss.heroEmoji}>🧠</Text>
          <Text style={ss.title}>VOLT MEMORY</Text>
          <Text style={ss.subtitle}>{t("games.voltMemory.start.subtitle")}</Text>

          {/* Preview circles */}
          <View style={ss.previewRow}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[ss.previewCircle, i === 2 && { width: 68, height: 68 }]}
              >
                <Text style={{ fontSize: i === 2 ? 30 : 24, opacity: 0.28 }}>
                  ⚡
                </Text>
              </View>
            ))}
          </View>

          {/* Info card */}
          <View style={ss.infoCard}>
            <Text style={ss.infoHeading}>{t("games.voltMemory.start.howToPlayTitle")}</Text>
            <Text style={ss.infoDesc}>
              {t("games.voltMemory.start.infoDesc")}
            </Text>

            <View style={ss.divider} />

            <Text style={ss.sectionTitle}>{t("games.voltMemory.start.mechanicsTitle")}</Text>
            <View style={{ gap: 8, marginTop: 8 }}>
              {[
                {
                  dot: GOLD,
                  title: t("games.voltMemory.start.mechanics.flipTitle"),
                  desc: t("games.voltMemory.start.mechanics.flipDesc"),
                },
                {
                  dot: GREEN,
                  title: t("games.voltMemory.start.mechanics.comboTitle"),
                  desc: t("games.voltMemory.start.mechanics.comboDesc"),
                },
                {
                  dot: "#c084fc",
                  title: t("games.voltMemory.start.mechanics.speedTitle"),
                  desc: t("games.voltMemory.start.mechanics.speedDesc"),
                },
                {
                  dot: RED,
                  title: t("games.voltMemory.start.mechanics.limitTitle"),
                  desc: t("games.voltMemory.start.mechanics.limitDesc"),
                },
              ].map((r) => (
                <View key={r.title} style={ss.mechRow}>
                  <View style={[ss.dot, { backgroundColor: r.dot }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={ss.mechTitle}>{r.title}</Text>
                    <Text style={ss.mechDesc}>{r.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={ss.divider} />

            <Text style={ss.sectionTitle}>{t("games.voltMemory.start.scoringTitle")}</Text>
            <View style={{ gap: 8, marginTop: 8 }}>
              {[
                {
                  badge: "pts",
                  col: GOLD,
                  desc: t("games.voltMemory.start.scoring.main"),
                },
                {
                  badge: "⚡",
                  col: "#c084fc",
                  desc: t("games.voltMemory.start.scoring.speed"),
                },
                {
                  badge: "×6",
                  col: GREEN,
                  desc: t("games.voltMemory.start.scoring.combo"),
                },
              ].map((r) => (
                <View key={r.badge} style={ss.scoreRow}>
                  <View
                    style={[
                      ss.scoreBadge,
                      {
                        borderColor: r.col + "80",
                        backgroundColor: r.col + "22",
                      },
                    ]}
                  >
                    <Text style={[ss.scoreBadgeText, { color: r.col }]}>
                      {r.badge}
                    </Text>
                  </View>
                  <Text style={ss.scoreDesc}>{r.desc}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Feature chips */}
          <View style={ss.featureRow}>
            {[
              { e: "🧩", l: t("games.voltMemory.start.features.pairs") },
              { e: "⏱", l: t("games.voltMemory.start.features.timer") },
              { e: "🔥", l: t("games.voltMemory.start.features.combo") },
              { e: "⚡", l: t("games.voltMemory.start.features.speedBonus") },
            ].map((f) => (
              <View key={f.l} style={ss.featureBox}>
                <Text style={ss.featureEmoji}>{f.e}</Text>
                <Text style={ss.featureLabel}>{f.l}</Text>
              </View>
            ))}
          </View>

          {/* Difficulty badge */}
          <View style={ss.diffBadge}>
            <Text style={ss.diffTitle}>{t("games.voltMemory.start.diffTitle")}</Text>
            <Text style={ss.diffDesc}>{t("games.voltMemory.start.diffDesc")}</Text>
          </View>

        </ScrollView>

        {/* Sticky start button */}
        <View style={[ss.footer, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={ss.startBtn}
            onPress={startGame}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[GOLD, "#fb9c38"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
            />
            <Text style={ss.startBtnText}>{t("games.voltMemory.start.startBtn")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ── RESULT SCREEN ──────────────────────────────────────────────────────────
  // ───────────────────────────────────────────────────────────────────────────

  if (screen === "result") {
    const pct = resultScore / 500;
    const crown =
      pct >= 2 ? "🏆" : pct >= 1.2 ? "🎉" : pct >= 0.6 ? "😎" : "💪";
    const title =
      pct >= 2
        ? t("games.voltMemory.result.titleMaster")
        : pct >= 1.2
          ? t("games.voltMemory.result.titleGreat")
          : pct >= 0.6
            ? t("games.voltMemory.result.titleGood")
            : t("games.voltMemory.result.titleTrain");

    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={["#130f1e", "#0d0b14", BG]}
          style={StyleSheet.absoluteFill}
        />

        <ScrollView
          contentContainerStyle={[
            rs.scroll,
            { paddingTop: insets.top + 20, paddingBottom: 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={rs.crown}>{crown}</Text>
          <Text style={rs.title}>{title}</Text>
          <Text style={rs.sub}>{t("games.voltMemory.result.pairsMoves", { pairs: resultPairs, moves: resultMoves })}</Text>

          <View style={rs.scoreSlab}>
            <LinearGradient
              colors={["rgba(245,200,66,0.12)", "rgba(251,156,56,0.04)"]}
              style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
            />
            <Text style={rs.scoreLabel}>{t("games.voltMemory.result.finalScore")}</Text>
            <Text style={rs.scoreNum}>{resultScore}</Text>

            <View style={rs.statsRowComparison}>
              <View style={rs.statBoxComparison}>
                <View style={rs.statIconWrap}>
                  <Ionicons name="trophy-outline" size={16} color={GOLD} />
                </View>
                <Text style={[rs.statNumComparison, { color: GOLD }]}>
                  {bestScore}
                </Text>
                <Text style={rs.statLabelComparison}>{t("games.voltMemory.result.best")}</Text>
              </View>
              <View style={rs.statBoxComparison}>
                <View style={rs.statIconWrap}>
                  <Ionicons name="person-outline" size={16} color={GREEN} />
                </View>
                <Text style={[rs.statNumComparison, { color: GREEN }]}>
                  {resultScore}
                </Text>
                <Text style={rs.statLabelComparison}>{t("games.voltMemory.result.yourRecord")}</Text>
              </View>
            </View>

            <View style={rs.statsRow}>
              <View style={rs.stat}>
                <Text style={[rs.statVal, { color: GREEN }]}>
                  {resultPairs}
                </Text>
                <Text style={rs.statKey}>{t("games.voltMemory.result.pairs")}</Text>
              </View>
              <View style={rs.stat}>
                <Text style={[rs.statVal, { color: MUTED }]}>
                  {resultMoves}
                </Text>
                <Text style={rs.statKey}>{t("games.voltMemory.result.moves")}</Text>
              </View>
              <View style={rs.stat}>
                <Text style={[rs.statVal, { color: GOLD }]}>
                  ×{resultMaxCombo}
                </Text>
                <Text style={rs.statKey}>{t("games.voltMemory.result.maxCombo")}</Text>
              </View>
            </View>
          </View>

          {isNewRecord && (
            <View style={rs.newRecord}>
              <Text style={rs.newRecordText}>{t("games.voltMemory.result.newRecord")}</Text>
            </View>
          )}

          <TouchableOpacity
            style={rs.primaryBtn}
            onPress={startGame}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[GOLD, "#fb9c38"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
            />
            <Text style={rs.primaryBtnText}>{t("games.voltMemory.result.tryAgain")}</Text>
          </TouchableOpacity>

          <RetryBoostButton
            hasRetry={hasRetry}
            retryCount={retryCount}
            onPress={() => activateRetry(scoreRef.current, startGame)}
            style={{ width: "100%", marginBottom: 8 }}
          />

          <TouchableOpacity
            style={rs.secondaryBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={rs.secondaryBtnText}>{t("games.voltMemory.result.back")}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ── GAME SCREEN ────────────────────────────────────────────────────────────
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#130f1e", "#0d0b14", BG]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        {/* ── Top bar ── */}
        <View style={gs.topbar}>
          <View style={gs.tbBox}>
            <Text style={gs.tbLabel}>{t("games.voltMemory.game.score")}</Text>
            <Text style={gs.tbValue}>{score}</Text>
          </View>
          <View style={[gs.tbBox, { alignItems: "center" }]}>
            <Text style={gs.tbLabel}>{t("games.voltMemory.game.combo")}</Text>
            <Text style={[gs.tbValue, { color: combo > 1 ? GOLD : INK }]}>
              ×{Math.min(combo, 6)}
            </Text>
          </View>
          <View style={[gs.tbBox, { alignItems: "flex-end" }]}>
            <Text style={gs.tbLabel}>MOVES</Text>
            <Text style={gs.tbValue}>{moves}</Text>
          </View>
        </View>

        {/* ── Timer bar ── */}
        <View style={{ paddingHorizontal: H_PAD, marginTop: 6 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 3,
            }}
          >
            <Text style={gs.timerLabel}>HARDCORE</Text>
            <Text style={[gs.timerLabel, timerUrgent && { color: RED }]}>
              {tLeft.toFixed(1)}s
            </Text>
          </View>
          <View style={gs.timerTrack}>
            <Animated.View
              style={[
                gs.timerFill,
                {
                  width: timerBarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                  backgroundColor: timerUrgent ? RED : GOLD,
                },
              ]}
            />
          </View>
        </View>

        {/* ── Pair progress dots ── */}
        <View style={{ paddingHorizontal: H_PAD, marginTop: 8 }}>
          <View style={{ flexDirection: "row", gap: 5, flexWrap: "wrap" }}>
            {Array(TOTAL_PAIRS)
              .fill(0)
              .map((_, i) => {
                const found = i < foundPairs;
                return (
                  <View
                    key={i}
                    style={[
                      gs.pairDot,
                      found && {
                        backgroundColor: GOLD,
                        borderColor: GOLD,
                        shadowColor: GOLD,
                        shadowOpacity: 0.6,
                        shadowRadius: 5,
                        elevation: 3,
                      },
                    ]}
                  />
                );
              })}
          </View>
        </View>

        {/* ── Grid ── */}
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: GAP,
              paddingHorizontal: H_PAD,
              justifyContent: "center",
            }}
          >
            {cards.map((card, idx) => (
              <MemoryCard
                key={card.id}
                card={card}
                isFlipped={
                  flippedIndices.includes(idx) ||
                  (revealActive && !matchedPairIds.has(card.pairId))
                }
                isMatched={matchedPairIds.has(card.pairId)}
                isWrong={wrongIndices.includes(idx)}
                size={cellSize}
                onPress={() => onCardTap(idx)}
                disabled={isLocked}
              />
            ))}
          </View>
        </View>

        {/* ── Reveal boost button ── */}
        <TouchableOpacity
          style={[
            gs.revealBtn,
            { bottom: insets.bottom + 10 },
            revealActive && gs.revealBtnActive,
            (revealUsedThisGame >= 2 || revealCount <= 0) &&
              gs.revealBtnDisabled,
          ]}
          onPress={useRevealBoost}
          disabled={
            revealUsedThisGame >= 2 ||
            revealCount <= 0 ||
            revealActive
          }
        >
          <Text style={gs.revealBtnEmoji}>🔄</Text>
          {revealCount > 0 && (
            <View style={gs.revealBadge}>
              <Text style={gs.revealBadgeText}>
                {revealCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </SafeAreaView>

      {/* ── Win overlay ── */}
      <Modal visible={!!winData} transparent animationType="fade">
        <View style={gs.overlayBg}>
          <Text style={{ fontSize: 62 }}>
            {(winData?.maxCombo ?? 0) >= 3 ? "🔥" : "🎉"}
          </Text>
          <Text style={gs.overlayTitle}>
            {(winData?.maxCombo ?? 0) >= 3 ? t("games.voltMemory.overlay.onFire") : t("games.voltMemory.overlay.allPairs")}
          </Text>
          <Text style={gs.overlaySub}>{t("games.voltMemory.overlay.brilliant")}</Text>

          <View style={gs.overlayStats}>
            <View style={gs.overlayStat}>
              <Text style={gs.overlayStatVal}>
                {winData?.timeUsed.toFixed(1)}s
              </Text>
              <Text style={gs.overlayStatKey}>{t("games.voltMemory.overlay.timeUsed")}</Text>
            </View>
            <View style={gs.overlayStat}>
              <Text style={gs.overlayStatVal}>{winData?.moves}</Text>
              <Text style={gs.overlayStatKey}>{t("games.voltMemory.result.moves")}</Text>
            </View>
            <View style={gs.overlayStat}>
              <Text style={gs.overlayStatVal}>×{winData?.maxCombo}</Text>
              <Text style={gs.overlayStatKey}>{t("games.voltMemory.game.combo")}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={gs.overlayBtn}
            onPress={endGame}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[GOLD, "#fb9c38"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
            />
            <Text style={gs.overlayBtnText}>{t("games.voltMemory.overlay.resultsBtn")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={gs.overlaySecBtn}
            onPress={() => {
              setWinData(null);
              buildGame();
            }}
            activeOpacity={0.7}
          >
            <Text style={gs.overlaySecBtnText}>{t("games.voltMemory.result.tryAgain")}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

// ─── Start Screen Styles ──────────────────────────────────────────────────────
const ss = StyleSheet.create({
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: EDGE,
  },
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 100,
    paddingHorizontal: 10,
    height: 40,
    borderRadius: 12,
    paddingRight: 2,
    backgroundColor: "rgba(245,200,66,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.3)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  scroll: { paddingHorizontal: 20, alignItems: "center" },
  heroEmoji: { fontSize: 60, marginBottom: 10, textAlign: "center" },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: GOLD,
    letterSpacing: 3,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: MUTED,
    textAlign: "center",
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 22,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 22,
    justifyContent: "center",
  },
  previewCircle: {
    width: 56,
    height: 56,
    borderRadius: 30,
    backgroundColor: CARD,
    borderWidth: 1.5,
    borderColor: EDGE,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCard: {
    backgroundColor: "rgba(22,21,36,0.9)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: EDGE,
    marginBottom: 16,
    width: "100%",
  },
  infoHeading: { fontSize: 15, fontWeight: "800", color: INK, marginBottom: 8 },
  infoDesc: { fontSize: 13, color: MUTED, lineHeight: 20 },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginVertical: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: INK,
    marginBottom: 4,
  },
  mechRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
  mechTitle: { fontSize: 13, fontWeight: "700", color: INK },
  mechDesc: { fontSize: 12, color: MUTED, marginTop: 1 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  scoreBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 40,
    alignItems: "center",
  },
  scoreBadgeText: { fontSize: 12, fontWeight: "800" },
  scoreDesc: { fontSize: 13, color: MUTED, flex: 1 },
  featureRow: { flexDirection: "row", gap: 8, width: "100%", marginBottom: 14 },
  featureBox: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: EDGE,
    paddingVertical: 12,
    alignItems: "center",
    gap: 5,
  },
  featureEmoji: { fontSize: 20 },
  featureLabel: {
    fontSize: 10,
    color: MUTED,
    fontWeight: "700",
    textAlign: "center",
  },
  diffBadge: {
    width: "100%",
    padding: 14,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: GOLD,
    backgroundColor: "rgba(245,200,66,0.07)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  diffTitle: { fontSize: 15, fontWeight: "800", color: GOLD },
  diffDesc: { fontSize: 11, color: MUTED, fontWeight: "600" },
  startBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  startBtnText: {
    fontSize: 18,
    fontWeight: "900",
    color: BG,
    letterSpacing: 2,
  },
});

// ─── Result Screen Styles ─────────────────────────────────────────────────────
const rs = StyleSheet.create({
  scroll: { paddingHorizontal: 20, alignItems: "center" },
  crown: { fontSize: 58, textAlign: "center", marginBottom: 8 },
  title: {
    fontSize: 36,
    fontWeight: "900",
    color: GOLD,
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    color: MUTED,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
  },
  scoreSlab: {
    width: "100%",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.2)",
    alignItems: "center",
    marginBottom: 12,
    overflow: "hidden",
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2.5,
    color: MUTED,
    marginBottom: 4,
  },
  scoreNum: {
    fontSize: 68,
    fontWeight: "900",
    color: GOLD,
    letterSpacing: -2,
    lineHeight: 72,
    marginBottom: 8,
  },
  statsRowComparison: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    marginTop: 10,
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 20,
  },
  statBoxComparison: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  statNumComparison: { fontSize: 24, fontWeight: "900", lineHeight: 26 },
  statLabelComparison: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: MUTED,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 12,
    width: "100%",
  },
  stat: { alignItems: "center", flex: 1 },
  statVal: { fontSize: 24, fontWeight: "900" },
  statKey: { fontSize: 10, color: MUTED, fontWeight: "600", marginTop: 2 },
  newRecord: {
    width: "100%",
    backgroundColor: "rgba(245,200,66,0.08)",
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.25)",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  newRecordText: { fontSize: 15, fontWeight: "800", color: GOLD },
  primaryBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    overflow: "hidden",
    marginTop: 4,
    marginBottom: 10,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 7,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: "900",
    color: BG,
    letterSpacing: 2,
  },
  secondaryBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 13,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: EDGE,
    backgroundColor: CARD,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: "700", color: MUTED },
});

// ─── Game Screen Styles ───────────────────────────────────────────────────────
const gs = StyleSheet.create({
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: EDGE,
    gap: 6,
  },
  tbBox: { flex: 1, flexDirection: "column" },
  tbLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 2, color: MUTED },
  tbValue: { fontSize: 22, fontWeight: "900", color: INK, lineHeight: 26 },
  timerTrack: {
    height: 5,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 50,
    overflow: "hidden",
  },
  timerFill: { height: "100%", borderRadius: 50 },
  timerLabel: { fontSize: 10, fontWeight: "700", color: MUTED },
  pairDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
  },
  overlayBg: {
    flex: 1,
    backgroundColor: "rgba(8,7,12,0.92)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 30,
  },
  overlayTitle: {
    fontSize: 38,
    fontWeight: "900",
    color: GOLD,
    letterSpacing: -1,
    textAlign: "center",
  },
  overlaySub: { fontSize: 14, color: MUTED, fontWeight: "600" },
  overlayStats: { flexDirection: "row", gap: 28, marginTop: 4 },
  overlayStat: { alignItems: "center", gap: 3 },
  overlayStatVal: { fontSize: 30, fontWeight: "900", color: GOLD },
  overlayStatKey: {
    fontSize: 10,
    fontWeight: "700",
    color: MUTED,
    letterSpacing: 1,
  },
  overlayBtn: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 12,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  overlayBtnText: {
    fontSize: 18,
    fontWeight: "900",
    color: BG,
    letterSpacing: 1,
  },
  overlaySecBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: EDGE,
  },
  overlaySecBtnText: { fontSize: 14, fontWeight: "700", color: MUTED },
  revealBtn: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(245,200,66,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(245,200,66,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  revealBtnActive: {
    backgroundColor: "rgba(245,200,66,0.3)",
    borderColor: GOLD,
  },
  revealBtnDisabled: {
    opacity: 0.35,
  },
  revealBtnEmoji: {
    fontSize: 24,
  },
  revealBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: GOLD,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  revealBadgeText: {
    color: BG,
    fontSize: 9,
    fontWeight: "800",
  },
});
