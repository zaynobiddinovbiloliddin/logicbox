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
const GOLD_LT = "#fde68a";
const GOLD_DK = "#b8870c";
const RED = "#ff5c6c";
const GREEN = "#2ecc8f";
const BG = "#08070c";
const CARD = "#161524";
const INK = "#f2eedc";
const MUTED = "rgba(242,238,220,0.45)";
const EDGE = "rgba(245,200,66,0.12)";

const COLS = 5;
const ROWS = 5;
const TOTAL_CELLS = 25;
const TOTAL_ROUNDS = 12;
const BASE_TIME = 7;
const MAX_MISTAKES = 3;
const MATCH_COPIES_MIN = 3;

const ICONS = [
  {
    e: "🎈",
    n: "Balloon",
    bg: ["#93c5fd", "#2563eb", "#1e3a8a"] as [string, string, string],
  },
  {
    e: "🍔",
    n: "Burger",
    bg: ["#86efac", "#16a34a", "#052e16"] as [string, string, string],
  },
  {
    e: "⏰",
    n: "Alarm",
    bg: ["#fca5a5", "#dc2626", "#7f1d1d"] as [string, string, string],
  },
  {
    e: "👶",
    n: "Baby",
    bg: ["#a78bfa", "#7c3aed", "#3b0764"] as [string, string, string],
  },
  {
    e: "🧠",
    n: "Brain",
    bg: ["#fde68a", "#d97706", "#451a03"] as [string, string, string],
    dark: true,
  },
  {
    e: "🛁",
    n: "Bathtub",
    bg: ["#fca5a5", "#e11d48", "#500724"] as [string, string, string],
  },
  {
    e: "👓",
    n: "Glasses",
    bg: ["#5eead4", "#0d9488", "#042f2e"] as [string, string, string],
  },
  {
    e: "🌙",
    n: "Moon",
    bg: ["#818cf8", "#4338ca", "#1e1b4b"] as [string, string, string],
  },
  {
    e: "🚂",
    n: "Train",
    bg: ["#6ee7b7", "#059669", "#022c22"] as [string, string, string],
  },
  {
    e: "🦁",
    n: "Lion",
    bg: ["#fde68a", "#b45309", "#451a03"] as [string, string, string],
    dark: true,
  },
  {
    e: "🚀",
    n: "Rocket",
    bg: ["#c4b5fd", "#7c3aed", "#2e1065"] as [string, string, string],
  },
  {
    e: "🎮",
    n: "Gamepad",
    bg: ["#fb923c", "#ea580c", "#431407"] as [string, string, string],
  },
  {
    e: "⚽",
    n: "Ball",
    bg: ["#d1fae5", "#065f46", "#022c22"] as [string, string, string],
    dark: true,
  },
  {
    e: "🌸",
    n: "Flower",
    bg: ["#fbcfe8", "#be185d", "#500724"] as [string, string, string],
    dark: true,
  },
  {
    e: "🐬",
    n: "Dolphin",
    bg: ["#7dd3fc", "#0369a1", "#0c4a6e"] as [string, string, string],
  },
  {
    e: "🦋",
    n: "Butterfly",
    bg: ["#e9d5ff", "#7c3aed", "#2e1065"] as [string, string, string],
    dark: true,
  },
  {
    e: "🍕",
    n: "Pizza",
    bg: ["#fef08a", "#ca8a04", "#422006"] as [string, string, string],
    dark: true,
  },
  {
    e: "🎸",
    n: "Guitar",
    bg: ["#fcd34d", "#92400e", "#1c0a00"] as [string, string, string],
    dark: true,
  },
  {
    e: "🐉",
    n: "Dragon",
    bg: ["#86efac", "#15803d", "#052e16"] as [string, string, string],
  },
  {
    e: "⚡",
    n: "Lightning",
    bg: ["#fde68a", "#ca8a04", "#422006"] as [string, string, string],
    dark: true,
  },
  {
    e: "🎯",
    n: "Target",
    bg: ["#fca5a5", "#b91c1c", "#450a0a"] as [string, string, string],
  },
  {
    e: "🌊",
    n: "Wave",
    bg: ["#7dd3fc", "#1d4ed8", "#1e3a8a"] as [string, string, string],
  },
  {
    e: "🦊",
    n: "Fox",
    bg: ["#fed7aa", "#c2410c", "#431407"] as [string, string, string],
    dark: true,
  },
  {
    e: "🏆",
    n: "Trophy",
    bg: ["#fde68a", "#b45309", "#451a03"] as [string, string, string],
    dark: true,
  },
];

type IconDef = (typeof ICONS)[number];
type CellItem = { isTarget: boolean; icon: IconDef; id: number };
type Screen = "start" | "game" | "result";

const storage = createMMKV({ id: "volt-match-game" });
const LB_KEY = "volt_match_lb_v2";
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
const AVS = [
  "😎",
  "🧠",
  "🎯",
  "🔥",
  "⚡",
  "🦁",
  "🐉",
  "👑",
  "🌟",
  "🚀",
  "💥",
  "🎮",
  "🏆",
  "🦊",
  "🌀",
];

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

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

// ─── Cell Button ──────────────────────────────────────────────────────────────

type CellState = "idle" | "correct" | "wrong" | "disabled";

function EmojiCell({
  item,
  state,
  size,
  onPress,
  highlighted = false,
}: {
  item: CellItem;
  state: CellState;
  size: number;
  onPress: () => void;
  highlighted?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: state === "disabled" ? 0.35 : 1,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [state]);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      delay: item.id * 18,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePress = () => {
    if (state !== "idle") return;
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.82,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 110,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  const bg = item.icon.bg;
  const borderColor =
    state === "correct"
      ? GREEN
      : state === "wrong"
        ? RED
        : highlighted
          ? GOLD
          : "rgba(255,255,255,0.06)";

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={handlePress}
        disabled={state !== "idle"}
        style={[
          cell_styles.cell,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor,
            borderWidth:
              state === "correct" || state === "wrong" || highlighted
                ? 2.5
                : 1.5,
          },
        ]}
      >
        <LinearGradient
          colors={bg}
          start={{ x: 0.35, y: 0.28 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
        />
        <Text style={[cell_styles.emoji, { fontSize: size * 0.44 }]}>
          {item.icon.e}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const cell_styles = StyleSheet.create({
  cell: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  emoji: {
    lineHeight: undefined,
  },
});

// ─── Score Pop ────────────────────────────────────────────────────────────────

function ScorePop({ pts }: { pts: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.delay(300),
      Animated.timing(anim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        alignSelf: "center",
        top: 10,
        opacity: anim,
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -28],
            }),
          },
          {
            scale: anim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.7, 1.15, 1],
            }),
          },
        ],
        zIndex: 50,
      }}
    >
      <Text style={{ color: GOLD, fontWeight: "900", fontSize: 22 }}>
        +{pts}
      </Text>
    </Animated.View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VoltMatch() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { dayId, gameId, challengeDayGameId } = useLocalSearchParams();
  const [screen, setScreen] = useState<Screen>("start");
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

  // Game state
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [okTaps, setOkTaps] = useState(0);
  const [errTaps, setErrTaps] = useState(0);
  const [roundNum, setRoundNum] = useState(0);
  const [tLeft, setTLeft] = useState(BASE_TIME);
  const [roundTime, setRoundTime] = useState(BASE_TIME);
  const [canTap, setCanTap] = useState(true);
  const [targetIcon, setTargetIcon] = useState<IconDef>(ICONS[0]);
  const [remaining, setRemaining] = useState(0);
  const [cells, setCells] = useState<CellItem[]>([]);
  const [cellStates, setCellStates] = useState<CellState[]>([]);
  const [roundOverlay, setRoundOverlay] = useState<{
    won: boolean;
    roundScore: number;
  } | null>(null);
  const [scorePops, setScorePops] = useState<number[]>([]);
  const [totalMs, setTotalMs] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Result state
  const [resultScore, setResultScore] = useState(0);
  const [resultOk, setResultOk] = useState(0);
  const [resultErr, setResultErr] = useState(0);
  const [resultMaxCombo, setResultMaxCombo] = useState(0);
  const [resultTime, setResultTime] = useState(0);
  const [resultRounds, setResultRounds] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);

  // Timer bar
  const timerBarAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const usedIconIdxs = useRef<number[]>([]);
  const roundScoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const scoreRef = useRef(0);
  const mistakesRef = useRef(0);
  const okRef = useRef(0);
  const errRef = useRef(0);
  const roundNumRef = useRef(0);
  const remainingRef = useRef(0);
  const canTapRef = useRef(true);
  const startTsRef = useRef(0);
  const totalMsRef = useRef(0);

  // ── Boost: Reveal ────────────────────────────────────────────────────────────
  const { useBoost: consumeBoost } = useBoostsInventory();
  const { addXP, addIQScore } = useUserStats();
  const revealCount = useBoostsInventory((state) => state.inventory["volt_match_reveal"] ?? 0);
  const { retryCount, hasRetry, activateRetry, getFinalScore } = useRetryBoost();
  const [revealActive, setRevealActive] = useState(false);
  const [revealUsedThisGame, setRevealUsedThisGame] = useState(0);

  // ── Leaderboard ──────────────────────────────────────────────────────────────

  const ensureLB = useCallback(() => {
    try {
      const raw = storage.getString(LB_KEY);
      let lb: { n: string; s: number; av: string; fake?: boolean }[] = raw
        ? JSON.parse(raw)
        : [];
      if (!lb.some((e) => e.fake)) {
        const base = [2860, 2470, 2132, 1820, 1547, 1300, 1092, 910, 741, 598];
        const fakes = FAKES.map((n, i) => ({
          n,
          s: base[i],
          av: AVS[i],
          fake: true,
        }));
        lb = [...fakes, ...lb];
      }
      return lb;
    } catch {
      return [];
    }
  }, []);

  const saveLB = useCallback(
    (score: number, name: string) => {
      try {
        const lb = ensureLB();
        const me = lb.find((e) => e.n === name && !e.fake);
        let isNew = false;
        if (!me) {
          lb.push({ n: name, s: score, av: AVS[ri(0, AVS.length - 1)] });
          isNew = true;
        } else if (score > me.s) {
          me.s = score;
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

  // ── Build grid ───────────────────────────────────────────────────────────────

  const buildGrid = useCallback((targetIdx: number) => {
    const copies = MATCH_COPIES_MIN + ri(0, 1);
    remainingRef.current = copies;
    setRemaining(copies);

    const positions = new Set<number>();
    while (positions.size < copies) positions.add(ri(0, TOTAL_CELLS - 1));

    const others = shuffle(
      ICONS.map((_, i) => i).filter((i) => i !== targetIdx),
    );
    let otherCursor = 0;
    const list: CellItem[] = [];

    for (let i = 0; i < TOTAL_CELLS; i++) {
      if (positions.has(i)) {
        list.push({ isTarget: true, icon: ICONS[targetIdx], id: i });
      } else {
        list.push({
          isTarget: false,
          icon: ICONS[others[otherCursor % others.length]],
          id: i,
        });
        otherCursor++;
      }
    }
    setCells(list);
    setCellStates(Array(TOTAL_CELLS).fill("idle"));
    return copies;
  }, []);

  // ── Start timer ──────────────────────────────────────────────────────────────

  const startTimer = useCallback((sec: number) => {
    setTLeft(sec);
    timerBarAnim.setValue(1);
    Animated.timing(timerBarAnim, {
      toValue: 0,
      duration: sec * 1000,
      useNativeDriver: false,
    }).start();

    if (timerRef.current) clearInterval(timerRef.current);
    const step = 100;
    let elapsed = 0;
    timerRef.current = setInterval(() => {
      elapsed += step;
      const left = Math.max(0, sec - elapsed / 1000);
      setTLeft(left);
      if (left <= 0) {
        clearInterval(timerRef.current!);
        if (canTapRef.current) {
          canTapRef.current = false;
          setCanTap(false);
          setCellStates((prev) =>
            prev.map((s) => (s === "idle" ? "disabled" : s)),
          );
          setTimeout(() => {
            setRoundOverlay({ won: false, roundScore: roundScoreRef.current });
            setTimeout(() => {
              setRoundOverlay(null);
              nextRound();
            }, 1800);
          }, 400);
        }
      }
    }, step);
  }, []);

  // ── Next round ───────────────────────────────────────────────────────────────

  const nextRound = useCallback(() => {
    const rn = roundNumRef.current + 1;
    roundNumRef.current = rn;
    setRoundNum(rn);

    if (rn > TOTAL_ROUNDS) {
      endGame();
      return;
    }

    roundScoreRef.current = 0;
    canTapRef.current = true;
    setCanTap(true);

    // Pick target (avoid last 8)
    const available = ICONS.map((_, i) => i).filter(
      (i) => !usedIconIdxs.current.slice(-8).includes(i),
    );
    const pool = available.length > 0 ? available : ICONS.map((_, i) => i);
    const iconIdx = pool[ri(0, pool.length - 1)];
    usedIconIdxs.current.push(iconIdx);
    setTargetIcon(ICONS[iconIdx]);
    buildGrid(iconIdx);

    // Timer: after round 6, reduce by 0.3s each round
    const extra = rn > 6 ? (rn - 6) * 0.3 : 0;
    const rt = Math.max(2, BASE_TIME - extra);
    setRoundTime(rt);
    startTimer(rt);
  }, [buildGrid, startTimer]);

  // ── End game ─────────────────────────────────────────────────────────────────

  const endGame = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (totalTimerRef.current) clearInterval(totalTimerRef.current);

    const ms = totalMsRef.current;
    const finalScore = getFinalScore(scoreRef.current);
    const isNew = saveLB(finalScore, playerName);

    const totalTaps = okRef.current + errRef.current;
    const finalAcc = totalTaps > 0 ? Math.round((okRef.current / totalTaps) * 100) : 0;
    const xpGain = Math.round(finalScore / 10) + (finalAcc > 80 ? 25 : 0);
    addXP(xpGain);
    addIQScore(finalAcc);

    (async () => {
      try {
        if (challengeDayGameId) {
          const res = await ChallengesModule.completeDayGame(
            challengeDayGameId as string,
            finalScore,
          );
          if (res?.dayCompleted) {
            Alert.alert(t("games.common.congratsTitle"), t("games.common.allDayGamesDone"));
          }
        } else {
          const response = await GamesModule.completeGame(
            (gameId as string) || "13",
          );
          if (response.dayCompleted) {
            Alert.alert(t("games.common.challengeTitle"), t("games.common.dayFinished"));
          }
        }

        if (dayId && !challengeDayGameId) {
          await ChallengesModule.submitDayScore(dayId as string, finalScore);
        }
      } catch (error) {
        console.error("Failed to complete game/submit score:", error);
      }
    })();

    setResultScore(finalScore);
    setResultOk(okRef.current);
    setResultErr(errRef.current);
    setResultMaxCombo(maxComboRef.current);
    setResultTime(ms);
    setResultRounds(roundNumRef.current - 1);
    setIsNewRecord(isNew);
    setScreen("result");
  }, [saveLB, playerName, addXP, addIQScore, dayId, gameId, challengeDayGameId]);

  // ── Tap handler ──────────────────────────────────────────────────────────────

  const onCellTap = useCallback(
    (idx: number) => {
      if (!canTapRef.current) return;
      const cell = cells[idx];
      if (!cell) return;

      if (cell.isTarget) {
        okRef.current++;
        setOkTaps(okRef.current);
        comboRef.current++;
        if (comboRef.current > maxComboRef.current)
          maxComboRef.current = comboRef.current;
        setCombo(comboRef.current);
        setMaxCombo(maxComboRef.current);

        const speed = Math.round((tLeft / roundTime) * 20);
        const pts = (15 + speed) * Math.min(comboRef.current, 6);
        scoreRef.current += pts;
        roundScoreRef.current += pts;
        setScore(scoreRef.current);
        setScorePops((p) => [...p.slice(-3), pts]);

        setCellStates((prev) => {
          const next = [...prev];
          next[idx] = "correct";
          return next;
        });

        remainingRef.current--;
        setRemaining(remainingRef.current);

        if (remainingRef.current <= 0) {
          canTapRef.current = false;
          setCanTap(false);
          if (timerRef.current) clearInterval(timerRef.current);
          timerBarAnim.stopAnimation();
          const rs = roundScoreRef.current;
          setTimeout(() => {
            setRoundOverlay({ won: true, roundScore: rs });
          }, 300);
        }
      } else {
        errRef.current++;
        setErrTaps(errRef.current);
        comboRef.current = 0;
        setCombo(0);
        mistakesRef.current++;
        setMistakes(mistakesRef.current);

        setCellStates((prev) => {
          const next = [...prev];
          next[idx] = "wrong";
          setTimeout(() => {
            setCellStates((p) => {
              const n2 = [...p];
              if (n2[idx] === "wrong") n2[idx] = "idle";
              return n2;
            });
          }, 500);
          return next;
        });

        if (mistakesRef.current >= MAX_MISTAKES) {
          canTapRef.current = false;
          setCanTap(false);
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeout(() => endGame(), 600);
        }
      }
    },
    [cells, tLeft, roundTime, endGame],
  );

  // ── Start game ───────────────────────────────────────────────────────────────

  const startGame = useCallback(() => {
    // Reset all
    scoreRef.current = 0;
    comboRef.current = 0;
    maxComboRef.current = 0;
    mistakesRef.current = 0;
    okRef.current = 0;
    errRef.current = 0;
    roundNumRef.current = 0;
    roundScoreRef.current = 0;
    totalMsRef.current = 0;
    usedIconIdxs.current = [];
    canTapRef.current = true;

    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setMistakes(0);
    setOkTaps(0);
    setErrTaps(0);
    setRoundNum(0);
    setScorePops([]);
    setRoundOverlay(null);
    setTotalMs(0);
    setRevealActive(false);
    setRevealUsedThisGame(0);

    if (timerRef.current) clearInterval(timerRef.current);
    if (totalTimerRef.current) clearInterval(totalTimerRef.current);

    setScreen("game");

    startTsRef.current = Date.now();
    totalTimerRef.current = setInterval(() => {
      totalMsRef.current = Date.now() - startTsRef.current;
      setTotalMs(totalMsRef.current);
    }, 500);

    setTimeout(() => nextRound(), 80);
  }, [nextRound]);

  const useRevealBoost = useCallback(() => {
    if (
      revealUsedThisGame >= 2 ||
      revealCount <= 0 ||
      revealActive
    )
      return;
    
    if (!consumeBoost("volt_match_reveal")) return;

    setRevealActive(true);
    setRevealUsedThisGame((n) => n + 1);
    setTimeout(() => setRevealActive(false), 1500);
  }, [revealUsedThisGame, revealActive, revealCount, consumeBoost]);

  const togglePause = useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      canTapRef.current = true;
      setCanTap(true);
      startTimer(tLeft);
      totalTimerRef.current = setInterval(() => {
        totalMsRef.current = Date.now() - startTsRef.current;
        setTotalMs(totalMsRef.current);
      }, 500);
    } else {
      setIsPaused(true);
      canTapRef.current = false;
      setCanTap(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
      timerBarAnim.stopAnimation();
      startTsRef.current = Date.now() - totalMsRef.current;
    }
  }, [isPaused, tLeft, startTimer]);

  const continueRound = useCallback(() => {
    setRoundOverlay(null);
    if (roundNumRef.current >= TOTAL_ROUNDS) {
      endGame();
    } else {
      nextRound();
    }
  }, [nextRound, endGame]);

  // ─────────────────────────────────────────────────────────────────────────────
  // ── START SCREEN ─────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────

  if (screen === "start") {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={["#130f1e", "#0d0b14", BG]}
          style={StyleSheet.absoluteFill}
        />

        {/* Back button */}
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
          {/* Hero */}
          <Text style={ss.heroEmoji}>⚡</Text>
          <Text style={ss.title}>VOLT MATCH</Text>
          <Text style={ss.subtitle}>{t("games.voltMatch.start.subtitle")}</Text>

          {/* Preview icons */}
          <View style={ss.previewGrid}>
            {["🎈", "🍔", "⏰", "🧠", "🍔", "🎈", "🧠", "⏰"].map((e, i) => (
              <View key={i} style={ss.previewCell}>
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </View>
            ))}
          </View>

          {/* Info card */}
          <View style={ss.infoCard}>
            <Text style={ss.infoHeading}>{t("games.voltMatch.start.howToPlayTitle")}</Text>
            <Text style={ss.infoDesc}>
              {t("games.voltMatch.start.howToPlayDesc")}
            </Text>

            <View style={ss.divider} />

            <Text style={ss.sectionTitle}>{t("games.voltMatch.start.mechanicsTitle")}</Text>
            <View style={{ gap: 8, marginTop: 8 }}>
              {[
                {
                  dot: GOLD,
                  title: t("games.voltMatch.start.mechanics.findTitle"),
                  desc: t("games.voltMatch.start.mechanics.findDesc"),
                },
                {
                  dot: GREEN,
                  title: t("games.voltMatch.start.mechanics.speedTitle"),
                  desc: t("games.voltMatch.start.mechanics.speedDesc"),
                },
                {
                  dot: "#c084fc",
                  title: t("games.voltMatch.start.mechanics.comboTitle"),
                  desc: t("games.voltMatch.start.mechanics.comboDesc"),
                },
                {
                  dot: RED,
                  title: t("games.voltMatch.start.mechanics.mistakeTitle"),
                  desc: t("games.voltMatch.start.mechanics.mistakeDesc"),
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

            <Text style={ss.sectionTitle}>{t("games.voltMatch.start.scoringTitle")}</Text>
            <View style={{ gap: 8, marginTop: 8 }}>
              {[
                {
                  badge: "+pts",
                  badgeColor: GOLD,
                  desc: t("games.voltMatch.start.scoring.main"),
                },
                {
                  badge: "⚡",
                  badgeColor: "#c084fc",
                  desc: t("games.voltMatch.start.scoring.speed"),
                },
                {
                  badge: "×6",
                  badgeColor: GREEN,
                  desc: t("games.voltMatch.start.scoring.combo"),
                },
              ].map((r) => (
                <View key={r.badge} style={ss.scoreRow}>
                  <View
                    style={[
                      ss.scoreBadge,
                      {
                        borderColor: r.badgeColor + "80",
                        backgroundColor: r.badgeColor + "22",
                      },
                    ]}
                  >
                    <Text style={[ss.scoreBadgeText, { color: r.badgeColor }]}>
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
              { e: "⚡", l: t("games.voltMatch.start.features.rounds") },
              { e: "❌", l: t("games.voltMatch.start.features.lives") },
              { e: "⏱", l: t("games.voltMatch.start.features.timer") },
              { e: "🔥", l: t("games.voltMatch.start.features.combo") },
            ].map((f) => (
              <View key={f.l} style={ss.featureBox}>
                <Text style={ss.featureEmoji}>{f.e}</Text>
                <Text style={ss.featureLabel}>{f.l}</Text>
              </View>
            ))}
          </View>

          {/* Difficulty badge */}
          <View style={ss.diffBadge}>
            <Text style={ss.diffTitle}>{t("games.voltMatch.start.diffTitle")}</Text>
            <Text style={ss.diffDesc}>
              {t("games.voltMatch.start.diffDesc")}
            </Text>
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
            <Text style={ss.startBtnText}>{t("games.voltMatch.start.startBtn")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ── RESULT SCREEN ────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────

  if (screen === "result") {
    const acc = resultOk / Math.max(1, resultOk + resultErr);
    const crown =
      resultScore >= 1500 && acc >= 0.85
        ? "🏆"
        : acc >= 0.8
          ? "🎉"
          : acc >= 0.6
            ? "😎"
            : "💪";
    const title =
      resultScore >= 1500 && acc >= 0.85
        ? t("games.voltMatch.result.titleLegend")
        : acc >= 0.8
          ? t("games.voltMatch.result.titleGreat")
          : acc >= 0.6
            ? t("games.voltMatch.result.titleGood")
            : t("games.voltMatch.result.titleTrain");

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
          <Text style={rs.sub}>
            {resultRounds} rounds · {Math.round(acc * 100)}% accuracy ·{" "}
            {formatTime(resultTime)}
          </Text>

          {/* Score slab */}
          <View style={rs.scoreSlab}>
            <LinearGradient
              colors={["rgba(245,200,66,0.12)", "rgba(251,156,56,0.04)"]}
              style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
            />
            <Text style={rs.scoreLabel}>{t("games.voltMatch.result.totalScore")}</Text>
            <Text style={rs.scoreNum}>{resultScore}</Text>

            <View style={rs.statsRowComparison}>
              <View style={rs.statBoxComparison}>
                <View style={rs.statIconWrap}>
                  <Ionicons name="trophy-outline" size={16} color={GOLD} />
                </View>
                <Text style={[rs.statNumComparison, { color: GOLD }]}>
                  {bestScore}
                </Text>
                <Text style={rs.statLabelComparison}>{t("games.voltMatch.result.best")}</Text>
              </View>
              <View style={rs.statBoxComparison}>
                <View style={rs.statIconWrap}>
                  <Ionicons name="person-outline" size={16} color={RED} />
                </View>
                <Text style={[rs.statNumComparison, { color: RED }]}>
                  {resultScore}
                </Text>
                <Text style={rs.statLabelComparison}>{t("games.voltMatch.result.yourRecord")}</Text>
              </View>
            </View>

            <View style={rs.statsRow}>
              <View style={rs.stat}>
                <Text style={[rs.statVal, { color: GREEN }]}>{resultOk}</Text>
                <Text style={rs.statKey}>{t("games.voltMatch.result.correct")}</Text>
              </View>
              <View style={rs.stat}>
                <Text style={[rs.statVal, { color: RED }]}>{resultErr}</Text>
                <Text style={rs.statKey}>{t("games.voltMatch.result.errors")}</Text>
              </View>
              <View style={rs.stat}>
                <Text style={[rs.statVal, { color: GOLD }]}>
                  ×{resultMaxCombo}
                </Text>
                <Text style={rs.statKey}>{t("games.voltMatch.result.maxCombo")}</Text>
              </View>
              <View style={[rs.stat, { flexBasis: "100%" }]}>
                <Text style={[rs.statVal, { color: "#c084fc", fontSize: 18 }]}>
                  {formatTime(resultTime)}
                </Text>
                <Text style={rs.statKey}>{t("games.voltMatch.result.totalTime")}</Text>
              </View>
            </View>
          </View>

          {isNewRecord && (
            <View style={rs.newRecord}>
              <Text style={rs.newRecordText}>{t("games.voltMatch.result.newRecord")}</Text>
            </View>
          )}

          {/* Buttons */}
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
            <Text style={rs.primaryBtnText}>{t("games.voltMatch.result.tryAgain")}</Text>
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
            <Text style={rs.secondaryBtnText}>{t("games.voltMatch.result.back")}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ── GAME SCREEN ──────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────

  const GAP = 8;
  const PADDING = 14;
  const cellSize = Math.floor(
    (SCREEN_W - PADDING * 2 - GAP * (COLS - 1)) / COLS,
  );
  const timerPct = tLeft / roundTime;
  const timerUrgent = timerPct < 0.3;

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
          <TouchableOpacity
            style={gs.pauseBtn}
            onPress={togglePause}
            activeOpacity={0.7}
          >
            <Ionicons name="pause" size={18} color={GOLD} />
          </TouchableOpacity>
          <View style={gs.tbBox}>
            <Text style={gs.tbLabel}>{t("games.voltMatch.game.score")}</Text>
            <Text style={gs.tbValue}>{score}</Text>
          </View>
          <View style={[gs.tbBox, { alignItems: "center" }]}>
            <Text style={gs.tbLabel}>{t("games.voltMatch.game.round")}</Text>
            <Text style={[gs.tbValue, { fontSize: 16, color: GOLD }]}>
              {roundNum}/{TOTAL_ROUNDS}
            </Text>
          </View>
          <View style={[gs.tbBox, { alignItems: "center" }]}>
            <Text style={gs.tbLabel}>{t("games.voltMatch.game.time")}</Text>
            <Text style={[gs.tbValue, { fontSize: 16, color: "#c084fc" }]}>
              {formatTime(totalMs)}
            </Text>
          </View>
          <View style={[gs.tbBox, { alignItems: "flex-end" }]}>
            <Text style={gs.tbLabel}>{t("games.voltMatch.game.lives")}</Text>
            <View style={{ flexDirection: "row", gap: 4, marginTop: 2 }}>
              {Array(MAX_MISTAKES)
                .fill(0)
                .map((_, i) => (
                  <View
                    key={i}
                    style={[
                      gs.missDot,
                      i < mistakes && {
                        backgroundColor: RED,
                        shadowColor: RED,
                        shadowOpacity: 0.7,
                        shadowRadius: 4,
                      },
                    ]}
                  />
                ))}
            </View>
          </View>
        </View>

        {/* ── Target strip ── */}
        <View style={gs.targetStrip}>
          <LinearGradient
            colors={["rgba(245,200,66,0.13)", "rgba(245,200,66,0.04)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
          />
          <View style={gs.tsIconWrap}>
            <LinearGradient
              colors={targetIcon.bg}
              start={{ x: 0.35, y: 0.28 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 30 }]}
            />
            <Text style={{ fontSize: 28 }}>{targetIcon.e}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={gs.tsLabel}>{t("games.voltMatch.game.findAll")}</Text>
            <Text style={gs.tsName}>{targetIcon.n}</Text>
            <Text style={gs.tsLeft}>
              {t("games.voltMatch.game.remaining", { remaining })} {targetIcon.e}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 3 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons
                name="time-outline"
                size={16}
                color={timerUrgent ? RED : GOLD}
              />
              <Text style={[gs.tsTimer, timerUrgent && { color: RED }]}>
                {tLeft.toFixed(1)}
              </Text>
            </View>
            <Text style={gs.tsCombo}>{t("games.voltMatch.game.combo")} ×{Math.min(combo, 6)}</Text>
          </View>
        </View>

        {/* ── Timer bar ── */}
        <View style={{ paddingHorizontal: PADDING, marginTop: 6 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <Text style={gs.timerLabel}>{t("games.voltMatch.game.hardcore")}</Text>
            <Text style={gs.timerLabel}>{Math.round(timerPct * 100)}%</Text>
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

        {/* ── Grid ── */}
        <View style={{ flex: 1, justifyContent: "center" }}>
          <View style={{ position: "relative" }}>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: GAP,
                paddingHorizontal: PADDING,
                justifyContent: "center",
              }}
            >
              {cells.map((cell, idx) => (
                <EmojiCell
                  key={`${roundNum}-${idx}`}
                  item={cell}
                  state={cellStates[idx] ?? "idle"}
                  size={cellSize}
                  onPress={() => onCellTap(idx)}
                  highlighted={revealActive && cell.isTarget}
                />
              ))}
            </View>

            {/* Score pops */}
            {scorePops.map((pts, i) => (
              <ScorePop key={`${roundNum}-pop-${i}`} pts={pts} />
            ))}
          </View>
        </View>

        {/* ── Reveal boost button ── */}
        <TouchableOpacity
          style={[
            gs.revealBtn,
            { bottom: insets.bottom + 16 },
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
          <Text style={gs.revealBtnEmoji}>🃏</Text>
          {revealCount > 0 && (
            <View style={gs.revealBadge}>
              <Text style={gs.revealBadgeText}>
                {revealCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </SafeAreaView>

      {/* ── Round overlay modal ── */}
      <Modal visible={!!roundOverlay} transparent animationType="fade">
        <View style={gs.overlayBg}>
          <Text style={gs.overlayEmoji}>{roundOverlay?.won ? "✅" : "⏰"}</Text>
          <Text style={gs.overlayTitle}>
            {roundOverlay?.won
              ? t("games.voltMatch.overlay.roundTitle", { round: roundNum })
              : t("games.voltMatch.overlay.timeUp")}
          </Text>
          <Text style={gs.overlaySub}>
            {roundOverlay?.won
              ? t("games.voltMatch.overlay.roundSub", {
                  score: roundOverlay.roundScore,
                })
              : t("games.voltMatch.overlay.continuing")}
          </Text>
          {roundOverlay?.won && (
            <TouchableOpacity
              style={gs.overlayBtn}
              onPress={continueRound}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[GOLD, "#fb9c38"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
              />
              <Text style={gs.overlayBtnText}>
                {roundNum >= TOTAL_ROUNDS
                  ? t("games.voltMatch.overlay.finish")
                  : t("games.voltMatch.overlay.next")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>

      {/* ── Pause overlay modal ── */}
      <Modal visible={isPaused} transparent animationType="fade">
        <View style={gs.overlayBg}>
          <Text style={gs.overlayEmoji}>⏸️</Text>
          <Text style={gs.overlayTitle}>{t("games.voltMatch.overlay.paused")}</Text>
          <TouchableOpacity
            style={gs.overlayBtn}
            onPress={togglePause}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[GOLD, "#fb9c38"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
            />
            <Text style={gs.overlayBtnText}>{t("games.voltMatch.overlay.resume")}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

// ─── Start Screen Styles ──────────────────────────────────────────────────────
const ss = StyleSheet.create({
  backBtn: {
    position: "absolute",
    left: 16,
    paddingHorizontal: 10,
    height: 40,
    borderRadius: 12,
    paddingRight: 2,
    backgroundColor: "rgba(245,200,66,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.3)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    flexDirection: "row",
  },
  scroll: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: EDGE,
  },
  heroEmoji: {
    fontSize: 60,
    marginBottom: 10,
    textAlign: "center",
  },
  title: {
    fontSize: 36,
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
    marginBottom: 24,
  },
  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginBottom: 24,
    width: 54 * 4 + 8 * 3,
  },
  previewCell: {
    width: 54,
    height: 54,
    borderRadius: 27,
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
    marginBottom: 18,
    width: "100%",
  },
  infoHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: INK,
    marginBottom: 8,
  },
  infoDesc: {
    fontSize: 13,
    color: MUTED,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: INK,
    marginBottom: 4,
  },
  mechRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
    flexShrink: 0,
  },
  mechTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: INK,
  },
  mechDesc: {
    fontSize: 12,
    color: MUTED,
    marginTop: 1,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  scoreBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 40,
    alignItems: "center",
  },
  scoreBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  scoreDesc: {
    fontSize: 13,
    color: MUTED,
    flex: 1,
  },
  featureRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    marginBottom: 16,
  },
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
  diffTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: GOLD,
  },
  diffDesc: {
    fontSize: 11,
    color: MUTED,
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
    marginLeft: 10,
  },
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
  scroll: {
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 0,
  },
  crown: {
    fontSize: 58,
    textAlign: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 38,
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
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    width: "100%",
  },
  stat: {
    alignItems: "center",
    flex: 1,
    minWidth: 70,
  },
  statVal: {
    fontSize: 24,
    fontWeight: "900",
  },
  statKey: {
    fontSize: 10,
    color: MUTED,
    fontWeight: "600",
    marginTop: 2,
  },
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
  newRecordText: {
    fontSize: 15,
    fontWeight: "800",
    color: GOLD,
  },
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
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: MUTED,
  },
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
  pauseBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(245,200,66,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  tbBox: {
    flex: 1,
    flexDirection: "column",
  },
  tbLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
    color: MUTED,
  },
  tbValue: {
    fontSize: 22,
    fontWeight: "900",
    color: INK,
    lineHeight: 26,
  },
  missDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  targetStrip: {
    marginHorizontal: 14,
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(245,200,66,0.3)",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    overflow: "hidden",
  },
  tsIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(245,200,66,0.35)",
    flexShrink: 0,
  },
  tsLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: "rgba(245,200,66,0.65)",
  },
  tsName: {
    fontSize: 20,
    fontWeight: "900",
    color: GOLD,
    marginTop: 2,
  },
  tsLeft: {
    fontSize: 11,
    color: MUTED,
    fontWeight: "600",
    marginTop: 2,
  },
  tsTimer: {
    fontSize: 28,
    fontWeight: "900",
    color: GOLD,
  },
  tsCombo: {
    fontSize: 11,
    fontWeight: "700",
    color: MUTED,
  },
  timerTrack: {
    height: 5,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 50,
    overflow: "hidden",
  },
  timerFill: {
    height: "100%",
    borderRadius: 50,
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: MUTED,
  },
  overlayBg: {
    flex: 1,
    backgroundColor: "rgba(8,7,12,0.88)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 30,
  },
  overlayEmoji: {
    fontSize: 56,
  },
  overlayTitle: {
    fontSize: 38,
    fontWeight: "900",
    color: GOLD,
    letterSpacing: -1,
    textAlign: "center",
  },
  overlaySub: {
    fontSize: 14,
    color: MUTED,
    fontWeight: "600",
    textAlign: "center",
  },
  overlayBtn: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
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
  revealBtn: {
    position: "absolute",
    bottom: 16,
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
