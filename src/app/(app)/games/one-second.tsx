import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
  Share,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { createMMKV } from "react-native-mmkv";
import { router, useLocalSearchParams } from "expo-router";
import { useBoostsInventory } from "@/store/boosts-inventory";
import { useRetryBoost } from "@/hooks/use-retry-boost";
import RetryBoostButton from "@/components/shared/retry-boost-button";
import { useUserStats } from "@/store/user-stats";
import { ChallengesModule } from "@/services/modules/challenges-module";
import { GamesModule } from "@/services/modules/games-module";
import { Alert } from "react-native";

// ─── Animated SVG Circle ─────────────────────────────────────────────────────
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── Storage ─────────────────────────────────────────────────────────────────
const storage = createMMKV({ id: "onesecond-game" });

// ─── Constants ────────────────────────────────────────────────────────────────
const TARGET = 1000; // ms
const ROUNDS = 20;
const CIRCUMF = 471; // 2π×75

// ─── Color palette (mirrors CSS variables) ────────────────────────────────────
const C = {
  bg: "#060608",
  s1: "#0e0e12",
  s2: "#14141a",
  b1: "#1e1e28",
  b2: "#2a2a38",
  text: "#f0f0f8",
  dim: "#40405a",
  dim2: "#606080",
  acc: "#7c6fff",
  acc2: "#5040cc",
  ok: "#34d399",
  warn: "#f59e0b",
  bad: "#f87171",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────
type ClassType = "perfect" | "good" | "ok" | "bad";
type Screen = "start" | "game" | "result";
type CircleState = "wait" | "hold" | "perfect" | "good" | "warn" | "bad";
type PhaseStyle = "normal" | "go" | "done";
type GradeType = {
  max: number;
  cls: "s" | "a" | "b" | "c";
  label: string;
  title: string;
  sub: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcPts(dev: number): number {
  if (dev <= 20) return 1000;
  if (dev <= 50) return 800;
  if (dev <= 100) return 600;
  if (dev <= 200) return 400;
  if (dev <= 350) return 200;
  return 50;
}

function classify(dev: number): ClassType {
  if (dev <= 30) return "perfect";
  if (dev <= 80) return "good";
  if (dev <= 200) return "ok";
  return "bad";
}

// ─── Color / label maps ───────────────────────────────────────────────────────
const CLS_COLOR: Record<ClassType, string> = {
  perfect: C.ok,
  good: C.acc,
  ok: C.warn,
  bad: C.bad,
};

const DOT_ICON: Record<ClassType, string> = {
  perfect: "★",
  good: "●",
  ok: "○",
  bad: "×",
};

const GRADE_COLOR: Record<string, string> = {
  s: C.ok,
  a: C.acc,
  b: C.warn,
  c: C.bad,
};

const CIRCLE_BORDER: Record<CircleState, string> = {
  wait: C.b2,
  hold: C.acc,
  perfect: C.ok,
  good: C.acc,
  warn: C.warn,
  bad: C.bad,
};

// ─── Confetti item ────────────────────────────────────────────────────────────
interface ConfettiItem {
  id: number;
  x: number;
  size: number;
  color: string;
  round: boolean;
  anim: Animated.Value;
  delay: number;
}

// ══════════════════════════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function OneSecondGame() {
  const insets = useSafeAreaInsets();
  const { dayId, gameId, challengeDayGameId } = useLocalSearchParams();
  const { t } = useTranslation();

  const GRADES: GradeType[] = useMemo(
    () => [
      {
        max: 30,
        cls: "s",
        label: t("games.oneSecond.grades.legend.label"),
        title: t("games.oneSecond.grades.legend.title"),
        sub: t("games.oneSecond.grades.legend.sub"),
      },
      {
        max: 60,
        cls: "a",
        label: t("games.oneSecond.grades.master.label"),
        title: t("games.oneSecond.grades.master.title"),
        sub: t("games.oneSecond.grades.master.sub"),
      },
      {
        max: 120,
        cls: "b",
        label: t("games.oneSecond.grades.good.label"),
        title: t("games.oneSecond.grades.good.title"),
        sub: t("games.oneSecond.grades.good.sub"),
      },
      {
        max: 250,
        cls: "c",
        label: t("games.oneSecond.grades.average.label"),
        title: t("games.oneSecond.grades.average.title"),
        sub: t("games.oneSecond.grades.average.sub"),
      },
      {
        max: 9999,
        cls: "c",
        label: t("games.oneSecond.grades.train.label"),
        title: t("games.oneSecond.grades.train.title"),
        sub: t("games.oneSecond.grades.train.sub"),
      },
    ],
    [t],
  );
  const CLS_LABEL: Record<ClassType, string> = {
    perfect: t("games.oneSecond.class.perfect"),
    good: t("games.oneSecond.class.good"),
    ok: t("games.oneSecond.class.ok"),
    bad: t("games.oneSecond.class.bad"),
  };

  // ── Screen
  const [screen, setScreen] = useState<Screen>("start");

  // ── Persistent best scores (lazy init from MMKV)
  const [bestAvgDev, setBestAvgDev] = useState<number | null>(() => {
    const v = storage.getNumber("osg_bestAvg");
    return v !== undefined ? v : null;
  });
  const [bestScore, setBestScore] = useState<number>(() => {
    return storage.getNumber("osg_bestScore") ?? 0;
  });

  // ── Round / score UI
  const [roundUI, setRoundUI] = useState(1);
  const [scoreUI, setScoreUI] = useState(0);
  const [classifs, setClassifs] = useState<ClassType[]>([]);
  const [miniRes, setMiniRes] = useState<(ClassType | null)[]>(
    Array(ROUNDS).fill(null),
  );

  // ── Phase / circle UI
  const [phaseText, setPhaseText] = useState(t("games.oneSecond.phase.tapHold"));
  const [phaseStyle, setPhaseStyle] = useState<PhaseStyle>("normal");
  const [circState, setCircState] = useState<CircleState>("wait");
  const [circLabel, setCircLabel] = useState(t("games.oneSecond.circle.hold"));
  const [circNum, setCircNum] = useState("1.0");
  const [circRes, setCircRes] = useState("");
  const [circResCls, setCircResCls] = useState<ClassType | null>(null);
  const [ringColor, setRingColor] = useState<string>(C.acc);

  // ── Deviation bar
  const [devVisible, setDevVisible] = useState(false);
  const [devPct, setDevPct] = useState(0);
  const [devColor, setDevColor] = useState<string>(C.acc);
  const [devRight, setDevRight] = useState(true);

  // ── Float score
  const [floatPts, setFloatPts] = useState<number | null>(null);
  const [floatCol, setFloatCol] = useState<string>(C.acc);
  const floatAnim = useRef(new Animated.Value(0)).current;

  // ── Confetti
  const [confetti, setConfetti] = useState<ConfettiItem[]>([]);

  // ── New-record blink
  const recBlink = useRef(new Animated.Value(1)).current;

  // ── Animated ring offset (SVG strokeDashoffset)
  const ringOffsetAnim = useRef(new Animated.Value(CIRCUMF)).current;

  // ── Result data (set when game ends)
  const [resultData, setResultData] = useState<{
    avg: number;
    worst: number;
    perfect: number;
    grade: GradeType;
    devs: number[];
    classifs: ClassType[];
    score: number;
    isNew: boolean;
    shareText: string;
  } | null>(null);

  // ── Game-logic refs (avoid stale closures in RAF / timeouts)
  const holdingRef = useRef(false);
  const waitingRef = useRef(false);
  const gameOnRef = useRef(false);
  const pressTs = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);
  const roundRef = useRef(0);
  const scoreRef = useRef(0);
  const devsRef = useRef<number[]>([]);
  const clsRef = useRef<ClassType[]>([]);
  const bestAvgRef = useRef<number | null>(null);
  const bestScoRef = useRef(0);

  // ── Boost: double points ─────────────────────────────────────────────────────
  const { useBoost: consumeBoost } = useBoostsInventory();
  const boostUsesLeft = useBoostsInventory((state) => state.inventory["one_second_double"] ?? 0);
  const { retryCount, hasRetry, activateRetry, getFinalScore } = useRetryBoost();
  const { addXP, addIQScore } = useUserStats();
  const doubleNextRef = useRef(false);
  const [doubleActive, setDoubleActive] = useState(false);
  const [boostsUsed, setBoostsUsed] = useState(0);

  // Callback refs break circular-dep chain
  const releaseRef = useRef<() => void>(() => {});
  const nextRoundRef = useRef<() => void>(() => {});
  const endGameRef = useRef<() => void>(() => {});

  // Sync best-score refs whenever state changes
  useEffect(() => {
    bestAvgRef.current = bestAvgDev;
    bestScoRef.current = bestScore;
  }, [bestAvgDev, bestScore]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      gameOnRef.current = false;
    };
  }, []);

  // New-record blink loop
  useEffect(() => {
    if (resultData?.isNew) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(recBlink, {
            toValue: 0.4,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(recBlink, {
            toValue: 1.0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      recBlink.stopAnimation();
      recBlink.setValue(1);
    }
  }, [resultData?.isNew]); // eslint-disable-line react-hooks/exhaustive-deps

  // ════════════════════════════════════════════════════════════════════════════
  //  EFFECTS
  // ════════════════════════════════════════════════════════════════════════════

  const triggerFloat = useCallback(
    (pts: number, color: string) => {
      floatAnim.setValue(0);
      setFloatPts(pts);
      setFloatCol(color);
      Animated.timing(floatAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }).start(() => setFloatPts(null));
    },
    [floatAnim],
  );

  const spawnConfetti = useCallback(() => {
    const cols = [C.acc, C.ok, C.text, C.warn, "#a855f7"];
    const items: ConfettiItem[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: 5 + Math.random() * 7,
      color: cols[i % cols.length],
      round: Math.random() > 0.5,
      anim: new Animated.Value(0),
      delay: Math.random() * 800,
    }));
    setConfetti(items);
    items.forEach((item) => {
      Animated.timing(item.anim, {
        toValue: 1,
        duration: 1500 + Math.random() * 1500,
        delay: item.delay,
        useNativeDriver: true,
      }).start();
    });
    setTimeout(() => setConfetti([]), 4000);
  }, []);

  // ════════════════════════════════════════════════════════════════════════════
  //  PHASE HELPERS
  // ════════════════════════════════════════════════════════════════════════════

  const resetToWait = useCallback(() => {
    setPhaseText(t("games.oneSecond.phase.tapHold"));
    setPhaseStyle("normal");
    setCircState("wait");
    setCircLabel(t("games.oneSecond.circle.hold"));
    setCircNum("1.0");
    setCircRes("");
    setCircResCls(null);
    setRingColor(C.acc);
    ringOffsetAnim.setValue(CIRCUMF);
    setDevVisible(false);
  }, [ringOffsetAnim, t]);

  // ════════════════════════════════════════════════════════════════════════════
  //  RAF RING ANIMATION
  // ════════════════════════════════════════════════════════════════════════════

  const animateRing = useCallback(() => {
    if (!holdingRef.current || pressTs.current === null) return;
    const elapsed = performance.now() - pressTs.current;
    const pct = Math.min(elapsed / TARGET, 1);
    ringOffsetAnim.setValue(CIRCUMF * (1 - pct));
    setCircNum((elapsed / 1000).toFixed(2));
    if (elapsed < TARGET * 2) {
      rafId.current = requestAnimationFrame(animateRing);
    } else {
      // Auto-release at 2 s
      releaseRef.current();
    }
  }, [ringOffsetAnim]);

  // ════════════════════════════════════════════════════════════════════════════
  //  SHOW RESULT
  // ════════════════════════════════════════════════════════════════════════════

  const showResult = useCallback(
    (dev: number, cls: ClassType, pts: number, elapsed: number) => {
      if (rafId.current) cancelAnimationFrame(rafId.current);

      const stateMap: Record<ClassType, CircleState> = {
        perfect: "perfect",
        good: "good",
        ok: "warn",
        bad: "bad",
      };
      const sign = elapsed >= TARGET ? "+" : "−";

      setCircState(stateMap[cls]);
      setCircLabel(CLS_LABEL[cls]);
      setCircNum((elapsed / 1000).toFixed(3));
      setCircRes(`${sign}${dev}${t("games.oneSecond.units.ms")}`);
      setCircResCls(cls);
      setPhaseText(t("games.oneSecond.phase.points", { points: pts }));
      setPhaseStyle("done");
      setRingColor(CLS_COLOR[cls]);

      // Deviation bar
      const barPct = Math.min((Math.abs(elapsed - TARGET) / 500) * 50, 50);
      const goRight = elapsed >= TARGET;
      setDevPct(barPct);
      setDevColor(CLS_COLOR[cls]);
      setDevRight(goRight);
      setDevVisible(true);

      triggerFloat(pts, CLS_COLOR[cls]);
    },
    [triggerFloat, t],
  );

  // ════════════════════════════════════════════════════════════════════════════
  //  RELEASE
  // ════════════════════════════════════════════════════════════════════════════

  const release = useCallback(() => {
    if (!gameOnRef.current || !holdingRef.current) return;
    holdingRef.current = false;

    const elapsed = performance.now() - (pressTs.current ?? 0);
    const dev = Math.abs(elapsed - TARGET);
    const cls = classify(dev);
    const basePts = calcPts(dev);
    const doubled = doubleNextRef.current;
    const pts = doubled ? basePts * 2 : basePts;
    if (doubled) {
      doubleNextRef.current = false;
      setDoubleActive(false);
    }

    devsRef.current.push(dev);
    clsRef.current.push(cls);
    scoreRef.current += pts;

    setClassifs([...clsRef.current]);
    setMiniRes((prev) => {
      const next = [...prev];
      next[clsRef.current.length - 1] = cls;
      return next;
    });

    showResult(Math.round(dev), cls, pts, elapsed);

    const currentRound = roundRef.current;
    if (currentRound >= ROUNDS) {
      gameOnRef.current = false;
      setTimeout(() => endGameRef.current(), 1200);
    } else {
      setTimeout(() => nextRoundRef.current(), 1100);
    }
  }, [showResult]);

  releaseRef.current = release;

  // ════════════════════════════════════════════════════════════════════════════
  //  PRESS
  // ════════════════════════════════════════════════════════════════════════════

  const press = useCallback(() => {
    if (!gameOnRef.current || !waitingRef.current || holdingRef.current) return;
    holdingRef.current = true;
    waitingRef.current = false;
    pressTs.current = performance.now();

    setPhaseText(t("games.oneSecond.phase.holding"));
    setPhaseStyle("go");
    setCircState("hold");
    setCircLabel(t("games.oneSecond.circle.hold"));
    setCircNum("");
    setCircRes("");
    setCircResCls(null);
    setRingColor(C.acc);

    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(animateRing);
  }, [animateRing, t]);

  // ════════════════════════════════════════════════════════════════════════════
  //  NEXT ROUND
  // ════════════════════════════════════════════════════════════════════════════

  const nextRound = useCallback(() => {
    if (!gameOnRef.current) return;
    roundRef.current++;
    setRoundUI(roundRef.current);
    setScoreUI(scoreRef.current);
    resetToWait();
    waitingRef.current = true;
    holdingRef.current = false;
    pressTs.current = null;
  }, [resetToWait]);

  nextRoundRef.current = nextRound;

  // ════════════════════════════════════════════════════════════════════════════
  //  END GAME
  // ════════════════════════════════════════════════════════════════════════════

  const endGame = useCallback(async () => {
    const devs = devsRef.current;
    const cls = clsRef.current;
    const finalScore = getFinalScore(scoreRef.current);

    const avg = Math.round(devs.reduce((a, b) => a + b, 0) / devs.length);
    const worst = Math.round(Math.max(...devs));
    const perfectCnt = cls.filter((c) => c === "perfect").length;
    const grade =
      [...GRADES].find((g) => avg <= g.max) ?? GRADES[GRADES.length - 1];

    const isNewDev = bestAvgRef.current === null || avg < bestAvgRef.current;
    const isNewScore = finalScore > bestScoRef.current;

    if (isNewDev) {
      setBestAvgDev(avg);
      storage.set("osg_bestAvg", avg);
      bestAvgRef.current = avg;
    }
    if (isNewScore) {
      setBestScore(finalScore);
      storage.set("osg_bestScore", finalScore);
      bestScoRef.current = finalScore;
    }

    const isNew = isNewDev || isNewScore;

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
            (gameId as string) || "7",
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

    const bar = cls
      .map(
        (c) =>
          (
            ({ perfect: "🟢", good: "🔵", ok: "🟡", bad: "🔴" }) as Record<
              ClassType,
              string
            >
          )[c],
      )
      .join("");

    const shareText = [
      t("games.oneSecond.share.title"),
      bar,
      t("games.oneSecond.share.offsetLevel", { avg, level: grade.label }),
      t("games.oneSecond.share.perfectScore", {
        perfect: perfectCnt,
        score: finalScore,
      }),
      t("games.oneSecond.share.challenge"),
    ].join("\n");

    setResultData({
      avg,
      worst,
      perfect: perfectCnt,
      grade,
      isNew,
      shareText,
      devs: [...devs],
      classifs: [...cls],
      score: finalScore,
    });

    const finalAcc = Math.round((perfectCnt / 20) * 100);
    const xpGain = Math.round(finalScore / 10) + (finalAcc > 80 ? 25 : 0);
    addXP(xpGain);
    addIQScore(finalAcc);
    setScreen("result");
    if (isNew) setTimeout(() => spawnConfetti(), 200);
  }, [spawnConfetti, addXP, addIQScore, dayId, gameId, challengeDayGameId, GRADES, t]);

  endGameRef.current = endGame;

  // ════════════════════════════════════════════════════════════════════════════
  //  START GAME
  // ════════════════════════════════════════════════════════════════════════════

  const startGame = useCallback(() => {
    roundRef.current = 0;
    scoreRef.current = 0;
    devsRef.current = [];
    clsRef.current = [];
    holdingRef.current = false;
    waitingRef.current = false;
    gameOnRef.current = true;
    doubleNextRef.current = false;
    if (rafId.current) cancelAnimationFrame(rafId.current);
    setDoubleActive(false);
    setBoostsUsed(0);

    setRoundUI(1);
    setScoreUI(0);
    setClassifs([]);
    setMiniRes(Array(ROUNDS).fill(null));
    setResultData(null);
    setConfetti([]);
    setScreen("game");

    setTimeout(() => nextRoundRef.current(), 300);
  }, []);

  // ── Share
  const handleShare = useCallback(async () => {
    if (!resultData) return;
    try {
      await Share.share({ message: resultData.shareText });
    } catch {
      /* noop */
    }
  }, [resultData]);

  // ════════════════════════════════════════════════════════════════════════════
  //  DERIVED UI
  // ════════════════════════════════════════════════════════════════════════════

  const dots = useMemo(
    () =>
      Array.from({ length: ROUNDS }, (_, i) => {
        if (i < classifs.length)
          return classifs[i] as ClassType | "empty" | "current";
        if (i === classifs.length) return "current" as const;
        return "empty" as const;
      }),
    [classifs],
  );

  const dotBg: Record<string, string> = {
    perfect: C.ok,
    good: C.acc,
    ok: C.warn,
    bad: C.bad,
    current: C.dim2,
    empty: C.b2,
  };

  // Mini-result tile colors
  const miniBg: Record<ClassType, string> = {
    perfect: "rgba(52,211,153,0.1)",
    good: "rgba(124,111,255,0.1)",
    ok: "rgba(245,158,11,0.1)",
    bad: "rgba(248,113,113,0.1)",
  };
  const miniBorder: Record<ClassType, string> = {
    perfect: "rgba(52,211,153,0.3)",
    good: "rgba(124,111,255,0.3)",
    ok: "rgba(245,158,11,0.3)",
    bad: "rgba(248,113,113,0.3)",
  };

  // Hit-list tile colors (result screen)
  const hitBg: Record<ClassType, string> = {
    perfect: "rgba(52,211,153,0.1)",
    good: "rgba(124,111,255,0.1)",
    ok: "rgba(245,158,11,0.1)",
    bad: "rgba(248,113,113,0.1)",
  };
  const hitBorder: Record<ClassType, string> = {
    perfect: "rgba(52,211,153,0.3)",
    good: "rgba(124,111,255,0.3)",
    ok: "rgba(245,158,11,0.3)",
    bad: "rgba(248,113,113,0.3)",
  };

  // Float-score animation
  const floatTransY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -50],
  });
  const floatOpacity = floatAnim.interpolate({
    inputRange: [0, 0.1, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  // ════════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* ── Confetti overlay ── */}
      {confetti.map((item) => {
        const op = item.anim.interpolate({
          inputRange: [0, 0.1, 0.8, 1],
          outputRange: [0, 1, 1, 0],
        });
        const ty = item.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-20, 300],
        });
        return (
          <Animated.View
            key={item.id}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: `${item.x}%` as any,
              top: -10,
              width: item.size,
              height: item.size,
              backgroundColor: item.color,
              borderRadius: item.round ? item.size / 2 : 2,
              opacity: op,
              transform: [{ translateY: ty }],
              zIndex: 500,
            }}
          />
        );
      })}

      {/* ══════════════════════════════
          START SCREEN
      ══════════════════════════════ */}
      {screen === "start" && (
        <View style={styles.startScreen}>
          <StatusBar barStyle="light-content" backgroundColor={C.bg} />

          {/* Back button */}
          <TouchableOpacity
            style={[styles.startBackBtn, { top: insets.top + 12 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color={C.acc} />
          </TouchableOpacity>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.startScrollContent,
              { paddingTop: insets.top + 64 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero */}
            <Text style={styles.startHeroEmoji}>⏱️</Text>
            <Text style={styles.startMainTitle}>{t("games.oneSecond.start.title")}</Text>
            <Text style={styles.startMainSubtitle}>
              {t("games.oneSecond.start.subtitle")}
            </Text>

            {/* Description card */}
            <View style={styles.startDescCard}>
              <Text style={styles.startDescCardTitle}>{t("games.oneSecond.start.howToPlayTitle")}</Text>
              <Text style={styles.startDescText}>
                {t("games.oneSecond.start.howToPlayDesc")}
              </Text>

              <View style={styles.startDescDivider} />

              {/* Mechanics */}
              <Text style={styles.startDescSectionTitle}>{t("games.oneSecond.start.mechanicsTitle")}</Text>
              {(
                [
                  [
                    C.acc,
                    t("games.oneSecond.start.mechanics.tapHoldName"),
                    t("games.oneSecond.start.mechanics.tapHoldDesc"),
                  ],
                  [
                    C.ok,
                    t("games.oneSecond.start.mechanics.releaseName"),
                    t("games.oneSecond.start.mechanics.releaseDesc"),
                  ],
                  [
                    C.warn,
                    t("games.oneSecond.start.mechanics.roundsName"),
                    t("games.oneSecond.start.mechanics.roundsDesc"),
                  ],
                ] as [string, string, string][]
              ).map(([color, name, desc], i) => (
                <View key={i} style={styles.startMechanicRow}>
                  <View
                    style={[
                      styles.startMechanicDot,
                      { backgroundColor: color },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.startMechanicName, { color }]}>
                      {name}
                    </Text>
                    <Text style={styles.startMechanicDesc}>{desc}</Text>
                  </View>
                </View>
              ))}

              <View style={styles.startDescDivider} />

              {/* Scoring */}
              <Text style={styles.startDescSectionTitle}>{t("games.oneSecond.start.scoringTitle")}</Text>
              <View style={styles.startScoreRuleRow}>
                <View style={styles.startScoreRuleBadge}>
                  <Text style={[styles.startScoreRulePts, { color: C.ok }]}>
                    1000
                  </Text>
                </View>
                <Text style={styles.startScoreRuleText}>
                  {t("games.oneSecond.start.scoring.max")}
                </Text>
              </View>
              <View style={styles.startScoreRuleRow}>
                <View style={styles.startScoreRuleBadge}>
                  <Text style={[styles.startScoreRulePts, { color: C.acc }]}>
                    800
                  </Text>
                </View>
                <Text style={styles.startScoreRuleText}>
                  {t("games.oneSecond.start.scoring.good")}
                </Text>
              </View>
              <View style={styles.startScoreRuleRow}>
                <View style={styles.startScoreRuleBadge}>
                  <Text style={[styles.startScoreRulePts, { color: C.warn }]}>
                    50
                  </Text>
                </View>
                <Text style={styles.startScoreRuleText}>
                  {t("games.oneSecond.start.scoring.min")}
                </Text>
              </View>
            </View>

            {/* Feature pills */}
            <View style={styles.startFeatureRow}>
              {[
                { emoji: "🎯", label: t("games.oneSecond.start.features.accuracy") },
                { emoji: "🔁", label: t("games.oneSecond.start.features.rounds") },
                { emoji: "🏆", label: t("games.oneSecond.start.features.records") },
              ].map((feat, i) => (
                <View key={i} style={styles.startFeatureBox}>
                  <Text style={styles.startFeatureEmoji}>{feat.emoji}</Text>
                  <Text style={styles.startFeatureLabel}>{feat.label}</Text>
                </View>
              ))}
            </View>

            {/* High scores */}
            {(bestAvgDev !== null || bestScore > 0) && (
              <View style={styles.startHiWrap}>
                <View style={styles.startHiBox}>
                  <Text style={styles.startHiLbl}>{t("games.oneSecond.start.bestOffset")}</Text>
                  <Text style={[styles.startHiVal, { color: C.ok }]}>
                    {bestAvgDev !== null ? `${bestAvgDev}${t("games.oneSecond.units.ms")}` : "—"}
                  </Text>
                </View>
                <View style={styles.startHiBox}>
                  <Text style={styles.startHiLbl}>{t("games.oneSecond.start.bestScore")}</Text>
                  <Text style={[styles.startHiVal, { color: C.acc }]}>
                    {bestScore > 0 ? String(bestScore) : "—"}
                  </Text>
                </View>
              </View>
            )}

            {/* Start button */}
            <TouchableOpacity style={styles.startPlayBtn} onPress={startGame}>
              <Text style={styles.startPlayBtnText}>{t("games.oneSecond.start.startBtn")}</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      )}

      {/* ══════════════════════════════
          GAME SCREEN
      ══════════════════════════════ */}
      {screen === "game" && (
        <SafeAreaView style={styles.safe}>
          <View style={styles.gameContent}>
            {/* Header */}
            <View style={styles.gameHeader}>
              <View>
                <Text style={styles.roundLbl}>{t("games.oneSecond.game.attempt")}</Text>
                <Text style={styles.roundNum}>
                  <Text style={{ color: C.text }}>{roundUI}</Text>
                  <Text style={{ color: C.dim2 }}>/20</Text>
                </Text>
              </View>

              {/* Dots progress */}
              <View style={styles.dotsRow}>
                {dots.map((cls, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      { backgroundColor: dotBg[cls] ?? C.b2 },
                    ]}
                  />
                ))}
              </View>

              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text style={styles.roundLbl}>{t("games.oneSecond.game.score")}</Text>
                <Text style={[styles.roundNum, { color: C.acc }]}>
                  {scoreUI}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.boostBtn,
                    (boostUsesLeft <= 0 || boostsUsed >= 2) &&
                      styles.boostBtnDepleted,
                    doubleActive && styles.boostBtnActive,
                  ]}
                  onPress={() => {
                    if (
                      boostUsesLeft <= 0 ||
                      doubleNextRef.current ||
                      boostsUsed >= 2
                    )
                      return;
                    
                    const success = consumeBoost("one_second_double");
                    if (!success) return;

                    doubleNextRef.current = true;
                    setDoubleActive(true);
                    setBoostsUsed((u) => u + 1);
                  }}
                  disabled={boostUsesLeft <= 0 || boostsUsed >= 2}
                  activeOpacity={0.75}
                >
                  <Text style={styles.boostBtnEmoji}>⚡</Text>
                  <Text style={styles.boostBtnText}>
                    {doubleActive
                      ? t("games.oneSecond.game.boost.active")
                      : boostsUsed >= 2
                        ? t("games.oneSecond.game.boost.depleted")
                        : t("games.oneSecond.game.boost.default")}
                  </Text>
                  {!doubleActive && boostUsesLeft > 0 && boostsUsed < 2 && (
                    <View style={styles.boostBadge}>
                      <Text style={styles.boostBadgeText}>{boostUsesLeft}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Arena ── */}
            <View style={styles.arena}>
              {/* Phase label */}
              <Text
                style={[
                  styles.phaseTxt,
                  phaseStyle === "go" && { color: C.ok },
                  phaseStyle === "done" && { color: C.acc },
                ]}
              >
                {phaseText}
              </Text>

              {/* Circle container */}
              <View style={styles.circleOuter}>
                {/* SVG progress ring (behind, no touch) */}
                <Svg
                  width={160}
                  height={160}
                  style={[
                    StyleSheet.absoluteFillObject,
                    { transform: [{ rotate: "-90deg" }] },
                  ]}
                  pointerEvents="none"
                >
                  {/* Track */}
                  <Circle
                    cx={80}
                    cy={80}
                    r={75}
                    fill="none"
                    stroke={C.b2}
                    strokeWidth={3}
                  />
                  {/* Progress */}
                  <AnimatedCircle
                    cx={80}
                    cy={80}
                    r={75}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeDasharray={String(CIRCUMF)}
                    strokeDashoffset={ringOffsetAnim as any}
                  />
                </Svg>

                {/* Full-area transparent press target */}
                <Pressable
                  style={StyleSheet.absoluteFillObject}
                  onPressIn={press}
                  onPressOut={release}
                />

                {/* Visual inner button face (no touch events) */}
                <View
                  pointerEvents="none"
                  style={[
                    styles.circleInner,
                    { borderColor: CIRCLE_BORDER[circState] },
                    circState === "hold" && styles.circleInnerHold,
                    circState === "perfect" && styles.circleInnerPerfect,
                  ]}
                >
                  <Text style={styles.circLabel}>{circLabel}</Text>
                  {!!circNum && <Text style={styles.circNum}>{circNum}</Text>}
                  <Text
                    style={[
                      styles.circResult,
                      circResCls ? { color: CLS_COLOR[circResCls] } : undefined,
                    ]}
                  >
                    {circRes || " "}
                  </Text>
                </View>
              </View>

              {/* Float score */}
              {floatPts !== null && (
                <Animated.Text
                  pointerEvents="none"
                  style={[
                    styles.floatScore,
                    {
                      color: floatCol,
                      textShadowColor: floatCol,
                      opacity: floatOpacity,
                      transform: [{ translateY: floatTransY }],
                    },
                  ]}
                >
                  +{floatPts}
                </Animated.Text>
              )}

              {/* Deviation bar */}
              {devVisible && (
                <View style={styles.devBarWrap}>
                  <View style={styles.devBarTrack}>
                    <View style={styles.devBarCenter} />
                    <View
                      style={[
                        styles.devBarFill,
                        {
                          width: `${devPct}%` as any,
                          backgroundColor: devColor,
                          left: (devRight ? "50%" : `${50 - devPct}%`) as any,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.devBarLblRow}>
                    <Text style={styles.devBarLbl}>−500{t("games.oneSecond.units.ms")}</Text>
                    <Text style={styles.devBarLbl}>0</Text>
                    <Text style={styles.devBarLbl}>+500{t("games.oneSecond.units.ms")}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Mini results strip */}
            <View style={styles.miniStrip}>
              {miniRes.map((cls, i) => (
                <View
                  key={i}
                  style={[
                    styles.miniRes,
                    cls
                      ? {
                          backgroundColor: miniBg[cls],
                          borderColor: miniBorder[cls],
                        }
                      : undefined,
                  ]}
                >
                  {cls && (
                    <Text style={{ fontSize: 10, color: CLS_COLOR[cls] }}>
                      {DOT_ICON[cls]}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        </SafeAreaView>
      )}

      {/* ══════════════════════════════
          RESULT SCREEN
      ══════════════════════════════ */}
      {screen === "result" && resultData && (
        <SafeAreaView style={styles.safe}>
          <ScrollView
            contentContainerStyle={styles.resultScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Grade header */}
            <View style={styles.rHeader}>
              <Text
                style={[
                  styles.rTitle,
                  { color: GRADE_COLOR[resultData.grade.cls] },
                ]}
              >
                {resultData.grade.title}
              </Text>
            </View>

            <View style={styles.rDivider} />

            <View style={styles.statsRowComparison}>
              <View style={styles.statBoxComparison}>
                <View style={styles.statIconWrap}>
                  <Ionicons name="trophy-outline" size={16} color="#4ECDC4" />
                </View>
                <Text style={[styles.statNumComparison, { color: "#4ECDC4" }]}>
                  {bestScore ? bestScore.toFixed(2) : "—"}
                </Text>
                <Text style={styles.statLabelComparison}>{t("games.oneSecond.result.bestOffset")}</Text>
              </View>
              <View style={styles.statBoxComparison}>
                <View style={styles.statIconWrap}>
                  <Ionicons name="person-outline" size={16} color="#FF6B6B" />
                </View>
                <Text style={[styles.statNumComparison, { color: "#FF6B6B" }]}>
                  {Math.abs(resultData.avg).toFixed(2)}
                </Text>
                <Text style={styles.statLabelComparison}>{t("games.oneSecond.result.yourOffset")}</Text>
              </View>
            </View>

            {/* Main metric */}
            <View style={styles.rMain}>
              <Text
                style={[
                  styles.rMainVal,
                  { color: GRADE_COLOR[resultData.grade.cls] },
                ]}
              >
                {resultData.avg}{t("games.oneSecond.units.ms")}
              </Text>
              <Text style={styles.rMainLbl}>
                {t("games.oneSecond.result.avgOffset")}
              </Text>
              <Text style={styles.rMainSub}>{resultData.grade.sub}</Text>
            </View>

            {/* Stats grid */}
            <View style={styles.rGrid}>
              {(
                [
                  [String(resultData.score), t("games.oneSecond.result.stats.score")],
                  [bestScore > 0 ? String(bestScore) : "—", t("games.oneSecond.result.stats.record")],
                  [`${resultData.perfect}/20`, t("games.oneSecond.result.stats.perfect")],
                  [`${resultData.worst}${t("games.oneSecond.units.ms")}`, t("games.oneSecond.result.stats.worst")],
                ] as [string, string][]
              ).map(([v, l], i) => (
                <View key={i} style={styles.rBox}>
                  <Text style={styles.rV}>{v}</Text>
                  <Text style={styles.rL}>{l}</Text>
                </View>
              ))}
            </View>

            {/* Hit list */}
            <View style={styles.rHits}>
              {resultData.devs.map((dev, i) => {
                const cls = resultData.classifs[i];
                return (
                  <View
                    key={i}
                    style={[
                      styles.rHit,
                      {
                        backgroundColor: hitBg[cls],
                        borderColor: hitBorder[cls],
                      },
                    ]}
                  >
                    <Text style={[styles.rHitTxt, { color: CLS_COLOR[cls] }]}>
                      {Math.round(dev)}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* New record */}
            {resultData.isNew && (
              <Animated.Text style={[styles.newRec, { opacity: recBlink }]}>
                {t("games.oneSecond.result.newRecord")}
              </Animated.Text>
            )}

            {/* Share card */}
            <View style={styles.shareCard}>
              <Text style={styles.shareText}>{resultData.shareText}</Text>
            </View>

            {/* Action buttons */}
            <View style={styles.btnsRow}>
              <Pressable style={styles.ghostBtn} onPress={handleShare}>
                <Text style={styles.ghostBtnTxt}>{t("games.oneSecond.result.share")}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.startBtn,
                  pressed && styles.startBtnPressed,
                ]}
                onPress={startGame}
              >
                <Text style={styles.startBtnTxt}>{t("games.oneSecond.result.tryAgain")}</Text>
              </Pressable>
              <RetryBoostButton
                hasRetry={hasRetry}
                retryCount={retryCount}
                onPress={() => activateRetry(scoreRef.current, startGame)}
                style={{ marginTop: 8, width: "100%" }}
              />
            </View>

            <Pressable onPress={() => router.back()}>
              <Text style={styles.navBackTxt}>{t("games.oneSecond.result.backHome")}</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      )}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  STYLES
// ══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  safe: {
    flex: 1,
  },

  // ── START SCREEN ────────────────────────────────────────────────────────────
  startScreen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: C.bg,
  },
  startBackBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: 12,
    paddingRight: 2,
    backgroundColor: C.s1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: `${C.acc}33`,
  },
  startScrollContent: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  startHeroEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  startMainTitle: {
    fontSize: 48,
    fontWeight: "900",
    color: C.acc,
    letterSpacing: 8,
    marginBottom: 6,
    textAlign: "center",
  },
  startMainSubtitle: {
    fontSize: 15,
    color: C.dim2,
    marginBottom: 28,
    letterSpacing: 1,
    textAlign: "center",
  },
  startDescCard: {
    width: "100%",
    backgroundColor: C.s1,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: `${C.acc}22`,
    marginBottom: 20,
  },
  startDescCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.text,
    marginBottom: 10,
  },
  startDescText: {
    fontSize: 13,
    color: "rgba(240,240,248,0.55)",
    lineHeight: 20,
  },
  startDescDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginVertical: 16,
  },
  startDescSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 12,
  },
  startMechanicRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  startMechanicDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  startMechanicName: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  startMechanicDesc: {
    fontSize: 12,
    color: "rgba(240,240,248,0.4)",
    lineHeight: 17,
  },
  startScoreRuleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  startScoreRuleBadge: {
    width: 42,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  startScoreRulePts: {
    fontSize: 13,
    fontWeight: "800",
  },
  startScoreRuleText: {
    fontSize: 12,
    color: "rgba(240,240,248,0.5)",
    flex: 1,
    lineHeight: 17,
  },
  startFeatureRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
    width: "100%",
  },
  startFeatureBox: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: C.s1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: `${C.dim2}44`,
    gap: 4,
  },
  startFeatureEmoji: {
    fontSize: 22,
  },
  startFeatureLabel: {
    fontSize: 9,
    color: C.dim2,
    fontWeight: "600",
    textAlign: "center",
  },
  startHiWrap: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 20,
  },
  startHiBox: {
    alignItems: "center",
  },
  startHiLbl: {
    fontSize: 8,
    letterSpacing: 3,
    color: C.dim,
    textTransform: "uppercase",
  },
  startHiVal: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 2,
  },
  startPlayBtn: {
    width: "100%",
    backgroundColor: C.acc,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: C.acc,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  startPlayBtnText: {
    fontSize: 18,
    fontWeight: "900",
    color: C.bg,
    letterSpacing: 2,
  },

  // kept for result screen reuse
  startBtn: {
    backgroundColor: C.acc,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 28,
    width: 200,
    alignItems: "center",
    shadowColor: C.acc2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  startBtnPressed: {
    transform: [{ translateY: 3 }],
    shadowOffset: { width: 0, height: 1 },
  },
  startBtnTxt: {
    fontSize: 8,
    letterSpacing: 3,
    color: "#060608",
    fontWeight: "600",
    textTransform: "uppercase",
  },

  // ── GAME SCREEN ─────────────────────────────────────────────────────────────
  gameContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 28,
    justifyContent: "space-between",
    alignItems: "center",
  },
  gameHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  boostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${C.dim}66`,
    backgroundColor: C.s1,
  },
  boostBtnActive: {
    borderColor: `${C.warn}88`,
    backgroundColor: `${C.warn}18`,
  },
  boostBtnDepleted: {
    opacity: 0.3,
  },
  boostBtnEmoji: {
    fontSize: 13,
  },
  boostBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: C.dim2,
    letterSpacing: 0.5,
  },
  boostBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#f7c948",
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  boostBadgeText: {
    color: "#18181b",
    fontSize: 9,
    fontWeight: "900",
  },
  roundLbl: {
    fontSize: 10,
    letterSpacing: 3,
    color: C.dim2,
    textTransform: "uppercase",
  },
  roundNum: {
    fontSize: 22,
    fontWeight: "700",
    color: C.text,
  },
  dotsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 130,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Arena card
  arena: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: C.s1,
    borderWidth: 1,
    borderColor: C.b2,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 32,
    paddingHorizontal: 20,
    minHeight: 260,
    position: "relative",
  },
  phaseTxt: {
    fontSize: 10,
    letterSpacing: 4,
    color: C.dim2,
    textTransform: "uppercase",
    textAlign: "center",
    minHeight: 14,
  },

  // Circle (outer transparent wrapper, 160×160)
  circleOuter: {
    width: 160,
    height: 160,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },

  // Visual inner button (mirrors .circle-btn in CSS)
  circleInner: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 68,
    backgroundColor: C.s2,
    borderWidth: 1,
    borderColor: C.b2,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  circleInnerHold: {
    borderColor: C.acc,
    shadowColor: C.acc,
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  circleInnerPerfect: {
    borderColor: C.ok,
    shadowColor: C.ok,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  circLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    color: C.dim2,
    textTransform: "uppercase",
    textAlign: "center",
  },
  circNum: {
    fontSize: 40,
    fontWeight: "900",
    color: C.text,
    lineHeight: 44,
  },
  circResult: {
    fontSize: 11,
    letterSpacing: 2,
    color: C.dim2,
    textAlign: "center",
  },

  // Float score (absolute inside arena)
  floatScore: {
    position: "absolute",
    top: "30%" as any,
    alignSelf: "center",
    fontSize: 22,
    fontWeight: "700",
    textShadowRadius: 12,
    zIndex: 300,
  },

  // Deviation bar
  devBarWrap: {
    width: 160,
  },
  devBarTrack: {
    width: "100%",
    height: 4,
    backgroundColor: C.b1,
    borderRadius: 2,
    overflow: "hidden",
    position: "relative",
  },
  devBarCenter: {
    position: "absolute",
    left: "50%" as any,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    transform: [{ translateX: -1 }],
  },
  devBarFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  devBarLblRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  devBarLbl: {
    fontSize: 9,
    color: C.dim,
  },

  // Mini results strip
  miniStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    width: "100%",
  },
  miniRes: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.b1,
    borderWidth: 1,
    borderColor: C.b2,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── RESULT SCREEN ────────────────────────────────────────────────────────────
  resultScroll: {
    flexGrow: 1,
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  rHeader: {
    alignItems: "center",
  },
  rGradeLbl: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 6,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  rTitle: {
    fontSize: 48,
    fontWeight: "900",
    lineHeight: 52,
    letterSpacing: -1,
  },
  rDivider: {
    width: 60,
    height: 1,
    backgroundColor: C.acc,
    opacity: 0.5,
    marginBottom: 20,
  },
  statsRowComparison: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    justifyContent: "center",
    width: "100%",
  },
  statBoxComparison: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  statNumComparison: { fontSize: 24, fontWeight: "900", lineHeight: 26 },
  statLabelComparison: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: "#52525b",
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  rMain: {
    alignItems: "center",
    backgroundColor: C.s1,
    borderWidth: 1,
    borderColor: C.b1,
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 340,
  },
  rMainVal: {
    fontSize: 64,
    fontWeight: "900",
    lineHeight: 68,
    letterSpacing: -2,
    textAlign: "center",
  },
  rMainLbl: {
    fontSize: 9,
    letterSpacing: 3,
    color: C.dim2,
    textTransform: "uppercase",
    marginTop: 4,
    textAlign: "center",
  },
  rMainSub: {
    fontSize: 12,
    color: C.dim2,
    marginTop: 8,
    lineHeight: 18,
    textAlign: "center",
  },
  rGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    width: "100%",
    maxWidth: 340,
  },
  rBox: {
    flex: 1,
    minWidth: "45%" as any,
    backgroundColor: C.s1,
    borderWidth: 1,
    borderColor: C.b1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  rV: {
    fontSize: 22,
    fontWeight: "700",
    color: C.text,
    lineHeight: 26,
  },
  rL: {
    fontSize: 8,
    letterSpacing: 2,
    color: C.dim,
    textTransform: "uppercase",
    marginTop: 4,
  },
  rHits: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    justifyContent: "center",
    maxWidth: 340,
  },
  rHit: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  rHitTxt: {
    fontSize: 9,
    fontWeight: "500",
  },
  newRec: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 3,
    color: C.ok,
    textAlign: "center",
  },
  shareCard: {
    backgroundColor: C.s2,
    borderWidth: 1,
    borderColor: C.b1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxWidth: 340,
    width: "100%",
  },
  shareText: {
    fontSize: 11,
    letterSpacing: 1,
    color: C.dim2,
    textAlign: "center",
    lineHeight: 20,
  },
  btnsRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: C.b2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  ghostBtnTxt: {
    fontSize: 11,
    letterSpacing: 2,
    color: C.dim2,
    textTransform: "uppercase",
  },
  navBackTxt: {
    fontSize: 11,
    letterSpacing: 2,
    color: C.dim2,
    marginTop: 8,
  },
});
