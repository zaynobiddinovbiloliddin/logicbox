import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useBoostsInventory } from "@/store/boosts-inventory";
import { useRetryBoost } from "@/hooks/use-retry-boost";
import RetryBoostButton from "@/components/shared/retry-boost-button";
import { useUserStats } from "@/store/user-stats";
import { ChallengesModule } from "@/services/modules/challenges-module";
import { GamesModule } from "@/services/modules/games-module";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  ScrollView,
  Alert,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

// ─── Theme ────────────────────────────────────────────────────────────────────

const C = {
  bg: "#0a0a1a",
  card: "#12122a",
  accent1: "#f7c948",
  accent2: "#ff4f7b",
  accent3: "#4fdfff",
  green: "#3dff9a",
  purple: "#9b59f7",
  text: "#ffffff",
  muted: "#7070a0",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Op = "+" | "-" | "*" | "/";
type Level = "single" | "double";

interface Question {
  q: string;
  ans: number;
  op: Op;
  level: Level;
}

type Screen = "start" | "game" | "result";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rnd(a: number, b: number): number {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(ms: number, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const s = Math.floor(ms / 1000);
  const min = Math.floor(s / 60);
  const sec = s % 60;
  if (min > 0) return `${min}:${String(sec).padStart(2, "0")}`;
  return t("games.mathQuiz.timeSec", { s });
}

function generateWrongs(correct: number, op: Op): number[] {
  const wrongs = new Set<number>();
  const spread = op === "*" ? rnd(4, 14) : op === "/" ? rnd(2, 8) : rnd(3, 15);
  const generators = [
    () => correct + spread,
    () => correct - spread,
    () => correct + rnd(1, 6),
    () => correct - rnd(1, 6),
    () => correct + rnd(8, 20),
    () => correct - rnd(8, 20),
    () => Math.round(correct * 1.5),
  ];
  let tries = 0;
  while (wrongs.size < 3 && tries < 200) {
    const g = generators[Math.floor(Math.random() * generators.length)];
    const v = g();
    if (Number.isInteger(v) && v > 0 && v !== correct) wrongs.add(v);
    tries++;
  }
  return [...wrongs].slice(0, 3);
}

// ─── Question Generators ──────────────────────────────────────────────────────

function makeEasyPool(): Question[] {
  const pool: Question[] = [];

  // Addition single
  const a1 = rnd(9, 39),
    b1 = rnd(9, 39);
  pool.push({ q: `${a1} + ${b1} = ?`, ans: a1 + b1, op: "+", level: "single" });

  // Subtraction single
  const b2 = rnd(8, 28),
    a2 = rnd(b2 + 8, 64);
  pool.push({ q: `${a2} − ${b2} = ?`, ans: a2 - b2, op: "-", level: "single" });

  // Multiplication single
  const a3 = rnd(2, 7),
    b3 = rnd(11, 15);
  pool.push({ q: `${a3} × ${b3} = ?`, ans: a3 * b3, op: "*", level: "single" });

  // Division single
  const d4 = rnd(2, 7),
    q4 = rnd(4, 12);
  pool.push({ q: `${d4 * q4} ÷ ${d4} = ?`, ans: q4, op: "/", level: "single" });

  // Addition double (3 nums)
  const a5 = rnd(8, 24),
    b5 = rnd(8, 20),
    c5 = rnd(4, 16);
  pool.push({
    q: `${a5} + ${b5} + ${c5} = ?`,
    ans: a5 + b5 + c5,
    op: "+",
    level: "double",
  });

  // Subtraction double
  const c6 = rnd(4, 12),
    b6 = rnd(8, 20),
    a6 = rnd(b6 + c6 + 8, 72);
  pool.push({
    q: `${a6} − ${b6} − ${c6} = ?`,
    ans: a6 - b6 - c6,
    op: "-",
    level: "double",
  });

  // Multiply+add double
  const a7 = rnd(2, 5),
    b7 = rnd(11, 14),
    c7 = rnd(4, 16);
  pool.push({
    q: `${a7} × ${b7} + ${c7} = ?`,
    ans: a7 * b7 + c7,
    op: "*",
    level: "double",
  });

  // Multiply-sub double
  const a8 = rnd(3, 5),
    b8 = rnd(11, 14);
  const p8 = a8 * b8;
  const c8 = rnd(2, Math.min(p8 - 4, 20));
  pool.push({
    q: `${a8} × ${b8} − ${c8} = ?`,
    ans: p8 - c8,
    op: "*",
    level: "double",
  });

  // Divide+add double
  const d9 = rnd(2, 7),
    q9 = rnd(4, 10),
    c9 = rnd(2, 12);
  pool.push({
    q: `${d9 * q9} ÷ ${d9} + ${c9} = ?`,
    ans: q9 + c9,
    op: "/",
    level: "double",
  });

  // Add-then-multiply double (order of ops)
  const a10 = rnd(8, 24),
    b10 = rnd(2, 4),
    c10 = rnd(11, 14);
  pool.push({
    q: `${a10} + ${b10} × ${c10} = ?`,
    ans: a10 + b10 * c10,
    op: "+",
    level: "double",
  });

  // Extra to fill to at least 11: another addition single variant
  const a11 = rnd(9, 39),
    b11 = rnd(9, 39);
  pool.push({
    q: `${a11} + ${b11} = ?`,
    ans: a11 + b11,
    op: "+",
    level: "single",
  });

  return pool;
}

function makeHardPool(): Question[] {
  const pool: Question[] = [];

  // Addition single
  const a1 = rnd(11, 49),
    b1 = rnd(11, 49);
  pool.push({ q: `${a1} + ${b1} = ?`, ans: a1 + b1, op: "+", level: "single" });

  // Subtraction single
  const b2 = rnd(10, 35),
    a2 = rnd(b2 + 10, 80);
  pool.push({ q: `${a2} − ${b2} = ?`, ans: a2 - b2, op: "-", level: "single" });

  // Multiplication single
  const a3 = rnd(2, 9),
    b3 = rnd(11, 19);
  pool.push({ q: `${a3} × ${b3} = ?`, ans: a3 * b3, op: "*", level: "single" });

  // Division single
  const d4 = rnd(2, 9),
    q4 = rnd(5, 15);
  pool.push({ q: `${d4 * q4} ÷ ${d4} = ?`, ans: q4, op: "/", level: "single" });

  // Addition double
  const a5 = rnd(10, 30),
    b5 = rnd(10, 25),
    c5 = rnd(5, 20);
  pool.push({
    q: `${a5} + ${b5} + ${c5} = ?`,
    ans: a5 + b5 + c5,
    op: "+",
    level: "double",
  });

  // Multiply+add double
  const a6 = rnd(2, 6),
    b6 = rnd(11, 15),
    c6 = rnd(5, 20);
  pool.push({
    q: `${a6} × ${b6} + ${c6} = ?`,
    ans: a6 * b6 + c6,
    op: "*",
    level: "double",
  });

  // Multiply-sub double
  const a7 = rnd(3, 6),
    b7 = rnd(12, 17);
  const p7 = a7 * b7;
  const c7 = rnd(3, Math.min(p7 - 5, 25));
  pool.push({
    q: `${a7} × ${b7} − ${c7} = ?`,
    ans: p7 - c7,
    op: "*",
    level: "double",
  });

  // Divide+add double
  const d8 = rnd(2, 9),
    q8 = rnd(5, 12),
    c8 = rnd(3, 15);
  pool.push({
    q: `${d8 * q8} ÷ ${d8} + ${c8} = ?`,
    ans: q8 + c8,
    op: "/",
    level: "double",
  });

  // Add-then-multiply
  const a9 = rnd(10, 30),
    b9 = rnd(2, 5),
    c9 = rnd(11, 15);
  pool.push({
    q: `${a9} + ${b9} × ${c9} = ?`,
    ans: a9 + b9 * c9,
    op: "+",
    level: "double",
  });

  // Sum of products
  const a10 = rnd(2, 5),
    b10 = rnd(11, 14),
    c10 = rnd(3, 6),
    d10 = rnd(11, 15);
  pool.push({
    q: `${a10} × ${b10} + ${c10} × ${d10} = ?`,
    ans: a10 * b10 + c10 * d10,
    op: "*",
    level: "double",
  });

  return pool;
}

function generateQuestions(): Question[] {
  const easyPool = shuffle(makeEasyPool());
  const hardPool = shuffle(makeHardPool());
  return [...easyPool.slice(0, 11), ...hardPool.slice(0, 4)];
}

// ─── Timer Ring Component ─────────────────────────────────────────────────────

const RADIUS = 33;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface TimerRingProps {
  timeLeft: number;
  duration: number;
}

function TimerRing({ timeLeft, duration }: TimerRingProps) {
  const ratio = timeLeft / duration;
  const offset = CIRCUMFERENCE * (1 - ratio);
  const color = ratio > 0.6 ? C.accent3 : ratio > 0.3 ? C.accent1 : C.accent2;

  return (
    <View style={styles.timerContainer}>
      <Svg width={86} height={86}>
        <Circle
          cx={43}
          cy={43}
          r={RADIUS}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={6}
          fill="none"
        />
        <Circle
          cx={43}
          cy={43}
          r={RADIUS}
          stroke={color}
          strokeWidth={6}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation={-90}
          origin="43,43"
        />
      </Svg>
      <View style={styles.timerTextContainer}>
        <Text style={[styles.timerText, { color }]}>{Math.ceil(timeLeft)}</Text>
      </View>
    </View>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function MathQuiz() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { dayId, gameId, challengeDayGameId } = useLocalSearchParams();

  // ── Boost: 2x points ──────────────────────────────────────────────────────
  const { useBoost: consumeBoost } = useBoostsInventory();
  const doubleCount = useBoostsInventory((state) => state.inventory["math_double"] ?? 0);
  const { retryCount, hasRetry, activateRetry, getFinalScore } = useRetryBoost();
  const { addXP, addIQScore } = useUserStats();
  const [doubleUsedThisGame, setDoubleUsedThisGame] = useState(0);
  const [doubleActive, setDoubleActive] = useState(false);
  const doubleRef = useRef(false);

  const [screen, setScreen] = useState<Screen>("start");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [timeouts, setTimeouts] = useState(0);
  const [timeLeft, setTimeLeft] = useState(7.5);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<
    "default" | "correct" | "wrong" | "timeout"
  >("default");
  const [choices, setChoices] = useState<number[]>([]);
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(
    null,
  );
  const [displayScore, setDisplayScore] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [totalTime, setTotalTime] = useState(0);
  const [record, setRecord] = useState(0);
  const [globalBest, setGlobalBest] = useState(15000);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreCounterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answeredRef = useRef(false);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const correctRef = useRef(0);
  const wrongRef = useRef(0);
  const timeoutsRef = useRef(0);
  const scoreRef = useRef(0);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const correctScaleAnims = useRef<Animated.Value[]>([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  const clearAllTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (scoreCounterRef.current) clearInterval(scoreCounterRef.current);
  }, []);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const getDuration = useCallback((q: Question) => {
    return q.level === "single" ? 7.5 : 12.5;
  }, []);

  const buildChoices = useCallback((q: Question) => {
    const wrongs = generateWrongs(q.ans, q.op);
    const all = shuffle([q.ans, ...wrongs]);
    return all;
  }, []);

  const showToast = useCallback(
    (msg: string, color: string) => {
      setToast({ msg, color });
      toastOpacity.setValue(1);
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 800,
        delay: 500,
        useNativeDriver: true,
      }).start(() => setToast(null));
    },
    [toastOpacity],
  );

  const loadQuestion = useCallback(
    (qs: Question[], idx: number) => {
      answeredRef.current = false;
      setSelectedAnswer(null);
      setAnswerState("default");
      correctScaleAnims.forEach((a) => a.setValue(1));

      slideAnim.setValue(0);
      const q = qs[idx];
      const dur = getDuration(q);
      setTimeLeft(dur);
      setChoices(buildChoices(q));

      if (timerRef.current) clearInterval(timerRef.current);

      const interval = 250;
      let elapsed = 0;
      timerRef.current = setInterval(() => {
        elapsed += interval;
        const left = dur - elapsed / 1000;
        if (left <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeLeft(0);
          if (!answeredRef.current) {
            answeredRef.current = true;
            timeoutsRef.current += 1;
            setTimeouts((t) => t + 1);
            streakRef.current = 0;
            setStreak(0);
            setAnswerState("timeout");
            showToast(t("games.mathQuiz.toast.timeUp"), C.accent2);
            setTimeout(() => advanceQuestion(qs, idx), 1200);
          }
        } else {
          setTimeLeft(left);
        }
      }, interval);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [buildChoices, getDuration, showToast, slideAnim, correctScaleAnims],
  );

  const advanceQuestion = useCallback(
    (qs: Question[], idx: number) => {
      if (timerRef.current) clearInterval(timerRef.current);
      const nextIdx = idx + 1;

      Animated.timing(slideAnim, {
        toValue: -SCREEN_WIDTH,
        duration: 280,
        useNativeDriver: true,
      }).start(() => {
        slideAnim.setValue(SCREEN_WIDTH);
        if (nextIdx >= qs.length) {
          const total = Date.now() - startTime;
          setTotalTime(total);
          const finalScore = getFinalScore(scoreRef.current);
          const isNew = finalScore > record;
          if (isNew) {
            setRecord(finalScore);
            setIsNewRecord(true);
            if (finalScore > globalBest) {
              setGlobalBest(finalScore);
            }
          } else {
            setIsNewRecord(false);
          }
          const finalAcc = Math.round((correctRef.current / 15) * 100);
          const xpGain = Math.round(finalScore / 10) + (finalAcc > 80 ? 25 : 0);
          addXP(xpGain);
          addIQScore(finalAcc);

          (async () => {
            try {
              if (challengeDayGameId) {
                const res = await ChallengesModule.completeDayGame(challengeDayGameId as string, finalScore);
                if (res?.dayCompleted) {
                  Alert.alert(t("games.common.congratsTitle"), t("games.common.allDayGamesDone"));
                }
              } else {
                const response = await GamesModule.completeGame(gameId || 11);
                if (response.dayCompleted) {
                  Alert.alert(t("games.common.challengeTitle"), t("games.common.dayFinished"));
                }

                if (dayId) {
                  await ChallengesModule.submitDayScore(dayId as string, finalScore);
                }
              }
            } catch (error) {
              console.error("Failed to complete game:", error);
            }
          })();

          setScreen("result");
          animateScoreCounter(finalScore);
        } else {
          setCurrentIndex(nextIdx);
          loadQuestion(qs, nextIdx);
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 280,
            useNativeDriver: true,
          }).start();
        }
      });
    },
    [slideAnim, startTime, dayId, gameId, challengeDayGameId, animateScoreCounter, loadQuestion, addXP, addIQScore],
  );

  const animateScoreCounter = useCallback((finalScore: number) => {
    let current = 0;
    const steps = 55;
    const increment = finalScore / steps;
    if (scoreCounterRef.current) clearInterval(scoreCounterRef.current);
    scoreCounterRef.current = setInterval(() => {
      current += increment;
      if (current >= finalScore) {
        setDisplayScore(finalScore);
        if (scoreCounterRef.current) clearInterval(scoreCounterRef.current);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, 20);
  }, []);

  const handleAnswer = useCallback(
    (choice: number, choiceIdx: number) => {
      if (answeredRef.current) return;
      answeredRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);

      const qs = questions;
      const idx = currentIndex;
      const q = qs[idx];
      const dur = getDuration(q);

      setSelectedAnswer(choice);

      if (choice === q.ans) {
        const tBonus = Math.ceil((timeLeft / dur) * 10);
        const sBonus = Math.min(streakRef.current, 5) * 5;
        let gained = 10 + tBonus + sBonus;
        const wasDouble = doubleRef.current;
        if (wasDouble) {
          gained *= 2;
          doubleRef.current = false;
          setDoubleActive(false);
        }
        scoreRef.current += gained;
        setScore(scoreRef.current);

        streakRef.current += 1;
        setStreak(streakRef.current);
        if (streakRef.current > bestStreakRef.current) {
          bestStreakRef.current = streakRef.current;
          setBestStreak(streakRef.current);
        }
        correctRef.current += 1;
        setCorrect(correctRef.current);
        setAnswerState("correct");

        Animated.sequence([
          Animated.timing(correctScaleAnims[choiceIdx], {
            toValue: 1.12,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(correctScaleAnims[choiceIdx], {
            toValue: 1,
            duration: 120,
            useNativeDriver: true,
          }),
        ]).start();

        showToast(
          wasDouble ? t("games.mathQuiz.toast.doublePoints") : t("games.mathQuiz.toast.correct"),
          wasDouble ? C.accent1 : C.green,
        );
      } else {
        wrongRef.current += 1;
        setWrong(wrongRef.current);
        streakRef.current = 0;
        setStreak(0);
        setAnswerState("wrong");
        showToast(t("games.mathQuiz.toast.wrong"), C.accent2);
      }

      setTimeout(() => advanceQuestion(qs, idx), 1000);
    },
    [
      questions,
      currentIndex,
      getDuration,
      timeLeft,
      correctScaleAnims,
      showToast,
      advanceQuestion,
    ],
  );

  const useBoostDouble = useCallback(() => {
    if (doubleUsedThisGame >= 2 || doubleCount <= 0 || doubleRef.current)
      return;
    
    if (!consumeBoost("math_double")) return;

    doubleRef.current = true;
    setDoubleActive(true);
    setDoubleUsedThisGame((n) => n + 1);
  }, [doubleUsedThisGame, doubleCount, consumeBoost]);

  const startGame = useCallback(() => {
    const qs = generateQuestions();
    setQuestions(qs);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setCorrect(0);
    setWrong(0);
    setTimeouts(0);
    setDisplayScore(0);
    scoreRef.current = 0;
    streakRef.current = 0;
    bestStreakRef.current = 0;
    correctRef.current = 0;
    wrongRef.current = 0;
    timeoutsRef.current = 0;
    answeredRef.current = false;
    doubleRef.current = false;
    setDoubleActive(false);
    setDoubleUsedThisGame(0);
    slideAnim.setValue(0);
    setStartTime(Date.now());
    setScreen("game");
    loadQuestion(qs, 0);
  }, [slideAnim, loadQuestion]);

  const retryGame = useCallback(() => {
    clearAllTimers();
    startGame();
  }, [clearAllTimers, startGame]);

  // ─── Render: Start Screen ────────────────────────────────────────────────────

  if (screen === "start") {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 12 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={C.accent1} />
          <Text style={{ color: C.accent1, fontSize: 12, fontWeight: "700", marginLeft: 4 }}>
            {t("common.back")}
          </Text>
        </TouchableOpacity>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.startContent,
            { paddingTop: insets.top, paddingBottom: 16 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <Text style={styles.startEmoji}>🧮</Text>
          <Text style={styles.startTitle}>{t("games.mathQuiz.start.title")}</Text>
          <Text style={styles.startSubtitle}>{t("games.mathQuiz.start.subtitle")}</Text>

          {/* Main description card */}
          <View style={styles.descCard}>
            <Text style={styles.descCardTitle}>{t("games.mathQuiz.start.howToPlayTitle")}</Text>
            <Text style={styles.descCardText}>
              {t("games.mathQuiz.start.howToPlayDesc")}
            </Text>

            <View style={styles.descDivider} />

            {/* Levels */}
            <Text style={styles.descSectionTitle}>{t("games.mathQuiz.start.levelsTitle")}</Text>
            <View style={styles.levelRow}>
              <View style={styles.levelItem}>
                <View
                  style={[styles.levelDot, { backgroundColor: C.accent3 }]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.levelName, { color: C.accent3 }]}>
                    {t("games.mathQuiz.start.easyLabel")}
                  </Text>
                  <Text style={styles.levelDesc}>
                    {t("games.mathQuiz.start.easyDesc")}
                  </Text>
                </View>
              </View>
              <View style={styles.levelItem}>
                <View
                  style={[styles.levelDot, { backgroundColor: C.accent2 }]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.levelName, { color: C.accent2 }]}>
                    {t("games.mathQuiz.start.hardLabel")}
                  </Text>
                  <Text style={styles.levelDesc}>
                    {t("games.mathQuiz.start.hardDesc")}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.descDivider} />

            {/* Scoring */}
            <Text style={styles.descSectionTitle}>{t("games.mathQuiz.start.scoringTitle")}</Text>
            <View style={styles.scoreRuleRow}>
              <View style={styles.scoreRuleBadge}>
                <Text style={[styles.scoreRulePts, { color: C.accent1 }]}>
                  +10
                </Text>
              </View>
              <Text style={styles.scoreRuleText}>
                {t("games.mathQuiz.start.scoreCorrect")}
              </Text>
            </View>
            <View style={styles.scoreRuleRow}>
              <View style={styles.scoreRuleBadge}>
                <Text style={[styles.scoreRulePts, { color: C.accent3 }]}>
                  +10
                </Text>
              </View>
              <Text style={styles.scoreRuleText}>
                {t("games.mathQuiz.start.scoreSpeed")}
              </Text>
            </View>
            <View style={styles.scoreRuleRow}>
              <View style={styles.scoreRuleBadge}>
                <Text style={[styles.scoreRulePts, { color: C.purple }]}>
                  ×🔥
                </Text>
              </View>
              <Text style={styles.scoreRuleText}>
                {t("games.mathQuiz.start.scoreStreak")}
              </Text>
            </View>
          </View>

          {/* Operations row */}
          <View style={styles.opsRow}>
            {[
              { emoji: "➕", label: t("games.mathQuiz.start.ops.add") },
              { emoji: "➖", label: t("games.mathQuiz.start.ops.sub") },
              { emoji: "✖️", label: t("games.mathQuiz.start.ops.mul") },
              { emoji: "➗", label: t("games.mathQuiz.start.ops.div") },
            ].map((op, i) => (
              <View key={i} style={styles.opBox}>
                <Text style={styles.opEmoji}>{op.emoji}</Text>
                <Text style={styles.opLabel}>{op.label}</Text>
              </View>
            ))}
          </View>

        </ScrollView>

        <View style={[styles.startFooter, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity style={styles.startBtn} onPress={startGame}>
            <Text style={styles.startBtnText}>{t("games.mathQuiz.start.startBtn")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Render: Game Screen ─────────────────────────────────────────────────────

  if (screen === "game" && questions.length > 0) {
    const q = questions[currentIndex];
    const isHard = currentIndex >= 11;
    const dur = getDuration(q);

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />

        {/* Header */}
        <View style={[styles.gameHeader, { paddingTop: insets.top + 8 }]}>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${((currentIndex + 1) / 15) * 100}%` },
              ]}
            />
          </View>
          <View style={styles.headerRow}>
            <Text style={styles.scoreText}>
              <Text style={styles.scoreMuted}>{t("games.mathQuiz.game.scorePrefix")}</Text>
              <Text style={[styles.scoreNum, { color: C.accent1 }]}>
                {score}
              </Text>
            </Text>
            <Text style={styles.questionCount}>{currentIndex + 1} / 15</Text>
          </View>
        </View>

        {/* Question Card */}
        <Animated.View
          style={[
            styles.questionCard,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          <View style={styles.timerRow}>
            <TimerRing timeLeft={timeLeft} duration={dur} />
            <View style={styles.diffBadgeContainer}>
              <View
                style={[
                  styles.diffBadge,
                  {
                    backgroundColor: isHard
                      ? `${C.accent2}22`
                      : `${C.accent3}22`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.diffBadgeText,
                    { color: isHard ? C.accent2 : C.accent3 },
                  ]}
                >
                  {isHard ? t("games.mathQuiz.game.hard") : t("games.mathQuiz.game.easy")}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.questionText}>{q.q}</Text>

          {/* 2×2 Choices */}
          <View style={styles.choicesGrid}>
            {choices.map((choice, i) => {
              const label = ["A", "B", "C", "D"][i];
              let btnStyle: object = styles.choiceBtn;
              let textColor = C.text;
              let opacity = 1;

              if (answerState !== "default" && selectedAnswer !== null) {
                if (choice === q.ans) {
                  btnStyle = styles.choiceBtnCorrect;
                  textColor = C.green;
                } else if (
                  choice === selectedAnswer &&
                  answerState === "wrong"
                ) {
                  btnStyle = styles.choiceBtnWrong;
                  textColor = C.accent2;
                } else {
                  opacity = 0.3;
                }
              } else if (answerState === "timeout") {
                if (choice === q.ans) {
                  btnStyle = styles.choiceBtnCorrect;
                  textColor = C.green;
                } else {
                  opacity = 0.3;
                }
              }

              return (
                <Animated.View
                  key={i}
                  style={[
                    { width: "48%", marginBottom: 10, opacity },
                    { transform: [{ scale: correctScaleAnims[i] }] },
                  ]}
                >
                  <TouchableOpacity
                    style={btnStyle}
                    onPress={() => handleAnswer(choice, i)}
                    disabled={answeredRef.current}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.choiceLabel}>{label}</Text>
                    <Text style={[styles.choiceNum, { color: textColor }]}>
                      {choice}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>

          {/* Streak bar */}
          <View style={styles.streakBar}>
            {streak >= 2 && <Text style={styles.streakFire}>🔥</Text>}
            <Text style={styles.streakText}>
              {t("games.mathQuiz.game.streak")}{" "}
              <Text style={{ color: streak >= 3 ? C.accent1 : C.text }}>
                {streak}
              </Text>
            </Text>
          </View>
        </Animated.View>

        {/* Boost button — bottom right */}
        <TouchableOpacity
          style={[
            styles.boostBtn,
            doubleActive && styles.boostBtnActive,
            (doubleUsedThisGame >= 2 || doubleCount <= 0) &&
              styles.boostBtnDisabled,
            { bottom: insets.bottom + 24 },
          ]}
          onPress={useBoostDouble}
          disabled={doubleUsedThisGame >= 2 || doubleCount <= 0 || doubleActive}
        >
          <Text style={styles.boostBtnEmoji}>⚡</Text>
          <Text style={styles.boostBtnLabel}>×2</Text>
          {doubleCount > 0 && (
            <View style={styles.boostBadge}>
              <Text style={styles.boostBadgeText}>{doubleCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Toast */}
        {toast && (
          <Animated.View
            style={[styles.toast, { opacity: toastOpacity }]}
            pointerEvents="none"
          >
            <Text style={[styles.toastText, { color: toast.color }]}>
              {toast.msg}
            </Text>
          </Animated.View>
        )}
      </View>
    );
  }

  // ─── Render: Result Screen ───────────────────────────────────────────────────

  if (screen === "result") {
    const totalQ = 15;
    const accuracy = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;
    const pct = accuracy;

    let medal = "💪";
    let grade = t("games.mathQuiz.result.gradeTrain");
    let stars = 1;
    if (pct === 100) {
      medal = "🏆";
      grade = t("games.mathQuiz.result.gradePerfect");
      stars = 5;
    } else if (pct >= 83) {
      medal = "🥇";
      grade = t("games.mathQuiz.result.gradeExcellent");
      stars = 4;
    } else if (pct >= 67) {
      medal = "🥈";
      grade = t("games.mathQuiz.result.gradeGood");
      stars = 3;
    } else if (pct >= 50) {
      medal = "🥉";
      grade = t("games.mathQuiz.result.gradeNotBad");
      stars = 2;
    }

    const statRows = [
      {
        icon: "🏆",
        label: t("games.mathQuiz.result.stats.record"),
        value: String(Math.max(record, scoreRef.current)),
        color: C.accent1,
      },
      {
        icon: "✅",
        label: t("games.mathQuiz.result.stats.correct"),
        value: String(correct),
        color: C.green,
      },
      {
        icon: "❌",
        label: t("games.mathQuiz.result.stats.wrong"),
        value: String(wrong),
        color: C.accent2,
      },
      {
        icon: "⏱️",
        label: t("games.mathQuiz.result.stats.timeouts"),
        value: String(timeouts),
        color: C.muted,
      },
      {
        icon: "🔥",
        label: t("games.mathQuiz.result.stats.bestStreak"),
        value: String(bestStreak),
        color: C.accent1,
      },
      { icon: "⚡", label: t("games.mathQuiz.result.stats.accuracy"), value: `${accuracy}%`, color: C.purple },
      {
        icon: "⏱️",
        label: t("games.mathQuiz.result.stats.totalTime"),
        value: formatTime(totalTime, t),
        color: C.accent3,
      },
    ];

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.resultContent,
          { paddingTop: insets.top + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />

        <Text style={styles.medalEmoji}>{medal}</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Text
              key={s}
              style={[styles.star, { opacity: s <= stars ? 1 : 0.2 }]}
            >
              ★
            </Text>
          ))}
        </View>
        <Text style={[styles.gradeText, { color: C.accent1 }]}>{grade}</Text>

        {isNewRecord && (
          <View style={styles.recordBadge}>
            <Text style={styles.recordText}>{t("games.mathQuiz.result.newRecord")}</Text>
          </View>
        )}

        <View style={styles.statsRowComparison}>
          <View style={styles.statBox}>
            <View style={styles.statIconWrap}>
              <Ionicons name="globe-outline" size={16} color={C.accent1} />
            </View>
            <Text style={[styles.statNum, { color: C.accent1 }]}>
              {globalBest}
            </Text>
            <Text style={styles.statLabel}>{t("games.mathQuiz.result.best")}</Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.statIconWrap}>
              <Ionicons name="trophy-outline" size={16} color={C.green} />
            </View>
            <Text style={[styles.statNum, { color: C.green }]}>{record}</Text>
            <Text style={styles.statLabel}>{t("games.mathQuiz.result.myBest")}</Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.statIconWrap}>
              <Ionicons name="person-outline" size={16} color={C.accent2} />
            </View>
            <Text style={[styles.statNum, { color: C.accent2 }]}>
              {scoreRef.current}
            </Text>
            <Text style={styles.statLabel}>{t("games.mathQuiz.result.current")}</Text>
          </View>
        </View>

        <View style={styles.resultScoreBox}>
          <Text style={styles.resultScoreLabel}>{t("games.mathQuiz.result.finalScore")}</Text>
          <Text style={styles.resultScoreNum}>{displayScore}</Text>
        </View>

        <View style={styles.statsCard}>
          {statRows.map((row, i) => (
            <View
              key={i}
              style={[
                styles.statsRow,
                i < statRows.length - 1 && styles.statsRowBorder,
              ]}
            >
              <Text style={styles.statsIcon}>{row.icon}</Text>
              <Text style={styles.statsLabel}>{row.label}</Text>
              <Text style={[styles.statsValue, { color: row.color }]}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        <RetryBoostButton
          hasRetry={hasRetry}
          retryCount={retryCount}
          onPress={() => activateRetry(scoreRef.current, retryGame)}
          style={{ width: "100%" }}
        />
        <TouchableOpacity style={styles.retryBtn} onPress={retryGame}>
          <Text style={styles.retryBtnText}>{t("games.mathQuiz.result.tryAgain")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.homeBtn} onPress={() => router.back()}>
          <Text style={styles.homeBtnText}>{t("games.mathQuiz.result.home")}</Text>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>
    );
  }

  return <View style={styles.container} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  startFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: C.bg,
  },

  // ── Start ────────────────────────────────────────────────────────────────────
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    paddingHorizontal: 10,
    height: 42,
    borderRadius: 12,
    paddingRight: 2,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: `${C.accent1}33`,
    flexDirection: "row",
  },
  startContent: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  startEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  startTitle: {
    fontSize: 48,
    fontWeight: "900",
    color: C.accent1,
    letterSpacing: 8,
    marginBottom: 6,
  },
  startSubtitle: {
    fontSize: 15,
    color: C.muted,
    marginBottom: 28,
    letterSpacing: 1,
  },

  // Description card
  descCard: {
    width: "100%",
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: `${C.accent1}22`,
    marginBottom: 20,
    gap: 0,
  },
  descCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.text,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  descCardText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 20,
  },
  descDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginVertical: 16,
  },
  descSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 12,
    letterSpacing: 0.2,
  },

  // Level rows
  levelRow: {
    gap: 10,
  },
  levelItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  levelName: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  levelDesc: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    lineHeight: 17,
  },

  // Score rules
  scoreRuleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  scoreRuleBadge: {
    width: 42,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  scoreRulePts: {
    fontSize: 13,
    fontWeight: "800",
  },
  scoreRuleText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    flex: 1,
    lineHeight: 17,
  },

  // Ops row
  opsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
    width: "100%",
  },
  opBox: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: `${C.muted}44`,
    gap: 4,
  },
  opEmoji: {
    fontSize: 22,
  },
  opLabel: {
    fontSize: 9,
    color: C.muted,
    fontWeight: "600",
    textAlign: "center",
  },

  startBtn: {
    width: "100%",
    backgroundColor: C.accent1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: C.accent1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  startBtnText: {
    fontSize: 18,
    fontWeight: "900",
    color: C.bg,
    letterSpacing: 2,
  },

  // ── Game ─────────────────────────────────────────────────────────────────────
  gameHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: C.bg,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: `${C.muted}44`,
    borderRadius: 2,
    marginBottom: 10,
  },
  progressBarFill: {
    height: 4,
    backgroundColor: C.accent1,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreText: {
    fontSize: 15,
  },
  scoreMuted: {
    color: C.muted,
    fontWeight: "400",
  },
  scoreNum: {
    fontWeight: "800",
    fontSize: 18,
  },
  questionCount: {
    color: C.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  boostBtn: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(247,201,72,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(247,201,72,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  boostBtnActive: {
    backgroundColor: "rgba(247,201,72,0.35)",
    borderColor: C.accent1,
  },
  boostBtnDisabled: {
    opacity: 0.35,
  },
  boostBtnEmoji: {
    fontSize: 22,
  },
  boostBtnLabel: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: C.accent1,
    marginTop: -2,
    letterSpacing: 0.5,
  },
  boostBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: C.accent1,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  boostBadgeText: {
    color: "#000",
    fontSize: 9,
    fontWeight: "800",
  },
  questionCard: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  timerContainer: {
    width: 86,
    height: 86,
    alignItems: "center",
    justifyContent: "center",
  },
  timerTextContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  timerText: {
    fontSize: 20,
    fontWeight: "800",
  },
  diffBadgeContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  diffBadge: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  diffBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  questionText: {
    fontSize: 34,
    fontWeight: "900",
    color: C.text,
    textAlign: "center",
    marginBottom: 24,
    letterSpacing: 1,
    lineHeight: 42,
  },
  choicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  choiceBtn: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: `${C.muted}44`,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceBtnCorrect: {
    backgroundColor: `${C.green}18`,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.green,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceBtnWrong: {
    backgroundColor: `${C.accent2}18`,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.accent2,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceLabel: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  choiceNum: {
    fontSize: 28,
    fontWeight: "900",
    color: C.text,
  },
  streakBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    gap: 4,
  },
  streakFire: {
    fontSize: 20,
  },
  streakText: {
    fontSize: 15,
    color: C.muted,
    fontWeight: "600",
  },
  toast: {
    position: "absolute",
    top: "65%",
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "none",
  },
  toastText: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  // ── Result ───────────────────────────────────────────────────────────────────
  resultContent: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  medalEmoji: {
    fontSize: 72,
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  star: {
    fontSize: 28,
    color: C.accent1,
  },
  gradeText: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 3,
    marginBottom: 24,
  },
  statsRowComparison: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    justifyContent: "center",
    width: "100%",
  },
  statBox: {
    flex: 1,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: `${C.muted}22`,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
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
  statNum: { fontSize: 20, fontWeight: "900", lineHeight: 24 },
  statLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: C.muted,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
  recordBadge: {
    backgroundColor: C.accent1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 16,
    shadowColor: C.accent1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  recordText: {
    color: C.bg,
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1.5,
  },
  resultScoreBox: {
    backgroundColor: C.card,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 40,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: `${C.accent1}44`,
    width: "100%",
  },
  resultScoreLabel: {
    color: C.muted,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 4,
  },
  resultScoreNum: {
    fontSize: 52,
    fontWeight: "900",
    color: C.accent1,
  },
  statsCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    paddingVertical: 4,
    width: "100%",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: `${C.muted}22`,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  statsRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: `${C.muted}22`,
  },
  statsIcon: {
    fontSize: 18,
    width: 30,
  },
  statsLabel: {
    flex: 1,
    color: C.muted,
    fontSize: 14,
    fontWeight: "500",
  },
  statsValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  retryBtn: {
    backgroundColor: C.accent1,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 16,
    marginBottom: 12,
    width: "100%",
    alignItems: "center",
    shadowColor: C.accent1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  retryBtnText: {
    fontSize: 17,
    fontWeight: "900",
    color: C.bg,
    letterSpacing: 2,
  },
  homeBtn: {
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: `${C.muted}55`,
    width: "100%",
    alignItems: "center",
  },
  homeBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: C.muted,
  },
});
