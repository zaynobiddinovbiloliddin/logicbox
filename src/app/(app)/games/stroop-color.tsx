import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  Modal,
  Share,
  Alert,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import SafeAreaWrapper from "@/components/shared/safe-area-wrapper";
import { useBoostsInventory } from "@/store/boosts-inventory";
import { useRetryBoost } from "@/hooks/use-retry-boost";
import RetryBoostButton from "@/components/shared/retry-boost-button";
import { useUserStats } from "@/store/user-stats";
import { ChallengesModule } from "@/services/modules/challenges-module";
import { GamesModule } from "@/services/modules/games-module";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS_HEX = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#ec4899"] as const;
const COLORS_COUNT = COLORS_HEX.length;

const DURATION = 60; // total game seconds
const ROUND_TIME = 2.4; // seconds per round
const MAX_LIVES = 3;
const STREAK_MAX = 6;
const COMBO_MULT = [1, 1, 1.5, 2, 3, 4, 5] as const;

type ColorIdx = 0 | 1 | 2 | 3 | 4 | 5;
type HitResult = "r" | "w";
type Screen = "start" | "game" | "result";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildOptions(currentColor: ColorIdx): [ColorIdx, ColorIdx] {
  const pool = Array.from({ length: COLORS_COUNT }, (_, i) => i) as ColorIdx[];
  const opts = shuffle(pool).slice(0, 2) as [ColorIdx, ColorIdx];
  if (!opts.includes(currentColor)) {
    opts[1] = currentColor;
  }
  return shuffle(opts) as [ColorIdx, ColorIdx];
}

function pickRound(): { colorIdx: ColorIdx; wordIdx: ColorIdx } {
  const colorIdx = Math.floor(Math.random() * COLORS_COUNT) as ColorIdx;
  let wordIdx: ColorIdx;
  if (Math.random() < 0.7) {
    do {
      wordIdx = Math.floor(Math.random() * COLORS_COUNT) as ColorIdx;
    } while (wordIdx === colorIdx);
  } else {
    wordIdx = colorIdx;
  }
  return { colorIdx, wordIdx };
}

function gradeResult(
  acc: number,
  correct: number,
): "S" | "A" | "B" | "C" | "D" {
  if (acc >= 95 && correct >= 25) return "S";
  if (acc >= 85 && correct >= 20) return "A";
  if (acc >= 70) return "B";
  if (acc >= 50) return "C";
  return "D";
}



// ─── Animated Ring ────────────────────────────────────────────────────────────

interface TimerRingProps {
  timeLeft: number;
}

function TimerRing({ timeLeft }: TimerRingProps) {
  // Clamp percentage between 0 and 1
  const pct = Math.max(0, Math.min(1, timeLeft / DURATION));
  const strokeColor =
    timeLeft > 10 ? "#eab308" : timeLeft > 5 ? "#f97316" : "#ef4444";
  const displayNum = Math.ceil(timeLeft);
  const isSmall = timeLeft <= 10;

  const SIZE = 68;
  const STROKE = 5;

  // The right half depletes first (pct from 1.0 down to 0.5)
  const rightProgress = Math.max(0, Math.min(1, (pct - 0.5) * 2));
  const rightRotate = 45 + (1 - rightProgress) * 180;

  // The left half depletes second (pct from 0.5 down to 0.0)
  const leftProgress = Math.max(0, Math.min(1, pct * 2));
  const leftRotate = -45 + (1 - leftProgress) * 180;

  return (
    <View
      style={{
        width: SIZE,
        height: SIZE,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Background Track */}
      <View
        style={{
          position: "absolute",
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          borderWidth: STROKE,
          borderColor: "#27272a",
        }}
      />

      {/* Right Half */}
      <View
        style={{
          position: "absolute",
          width: SIZE / 2,
          height: SIZE,
          right: 0,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            position: "absolute",
            width: SIZE,
            height: SIZE,
            right: 0,
            borderRadius: SIZE / 2,
            borderWidth: STROKE,
            // Apply color to only two edges to form a semi-circle
            borderTopColor: strokeColor,
            borderRightColor: strokeColor,
            borderBottomColor: "transparent",
            borderLeftColor: "transparent",
            transform: [{ rotate: `${rightRotate}deg` }],
          }}
        />
      </View>

      {/* Left Half */}
      <View
        style={{
          position: "absolute",
          width: SIZE / 2,
          height: SIZE,
          left: 0,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            position: "absolute",
            width: SIZE,
            height: SIZE,
            left: 0,
            borderRadius: SIZE / 2,
            borderWidth: STROKE,
            // Apply color to only two edges to form a semi-circle
            borderTopColor: strokeColor,
            borderLeftColor: strokeColor,
            borderBottomColor: "transparent",
            borderRightColor: "transparent",
            transform: [{ rotate: `${leftRotate}deg` }],
          }}
        />
      </View>

      {/* Number */}
      <Text
        style={{
          fontSize: isSmall ? 20 : 24,
          fontWeight: "900",
          color: "#fafafa",
          letterSpacing: 1,
        }}
      >
        {displayNum}
      </Text>
    </View>
  );
}

// ─── Combo Toast ──────────────────────────────────────────────────────────────

interface ComboToastProps {
  text: string;
  color: string;
}

function ComboToast({ text, color }: ComboToastProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(400),
      Animated.timing(anim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.comboToast,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [10, -20],
              }),
            },
            {
              scale: anim.interpolate({
                inputRange: [0, 0.4, 1],
                outputRange: [0.7, 1.12, 1],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={[styles.comboToastText, { color }]}>{text}</Text>
    </Animated.View>
  );
}

// ─── Answer Button ────────────────────────────────────────────────────────────

type BtnFlash = "idle" | "right" | "wrong";

interface AnsButtonProps {
  label: string;
  flash: BtnFlash;
  onPress: () => void;
  disabled: boolean;
}

function AnsButton({ label, flash, onPress, disabled }: AnsButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.93,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.04,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 70,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPress]);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (flash === "wrong") {
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: -6,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 6,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -4,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 4,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash]);

  const containerStyle =
    flash === "right"
      ? styles.ansBtnRight
      : flash === "wrong"
        ? styles.ansBtnWrong
        : styles.ansBtnIdle;

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.8}
      style={styles.ansBtnTouchable}
    >
      <Animated.View
        style={[
          styles.ansBtn,
          containerStyle,
          {
            transform: [{ scale: scaleAnim }, { translateX: shakeAnim }],
          },
        ]}
      >
        <Text style={styles.ansBtnText} numberOfLines={1} adjustsFontSizeToFit>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Word Box ─────────────────────────────────────────────────────────────────

interface WordBoxProps {
  word: string;
  color: string;
  flash: "idle" | "right" | "wrong";
  roundPct: number;
}

function WordBox({ word, color, flash, roundPct }: WordBoxProps) {
  const { t } = useTranslation();
  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (flash !== "idle") {
      flashAnim.setValue(1);
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash]);

  const bgColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      "#111113",
      flash === "right" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
    ],
  });

  const barColor =
    roundPct > 0.5 ? "#22c55e" : roundPct > 0.25 ? "#eab308" : "#ef4444";

  return (
    <Animated.View style={[styles.wordBox, { backgroundColor: bgColor }]}>
      <Text style={[styles.wordTask, { color }]}>{word}</Text>
      <Text style={styles.wordInstr}>{t("games.stroopColor.game.tapColor")}</Text>
      {/* round timer bar */}
      <View style={styles.roundBarTrack}>
        <View
          style={[
            styles.roundBarFill,
            {
              width: `${roundPct * 100}%` as any,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StroopColor() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { dayId, gameId, challengeDayGameId } = useLocalSearchParams();

  const COLOR_NAMES = useMemo(() => [
    t("games.stroopColor.colors.red"),
    t("games.stroopColor.colors.blue"),
    t("games.stroopColor.colors.green"),
    t("games.stroopColor.colors.yellow"),
    t("games.stroopColor.colors.purple"),
    t("games.stroopColor.colors.pink"),
  ], [t]);

  const GRADE_TITLES: Record<string, string> = useMemo(() => ({
    S: t("games.stroopColor.grades.S"),
    A: t("games.stroopColor.grades.A"),
    B: t("games.stroopColor.grades.B"),
    C: t("games.stroopColor.grades.C"),
    D: t("games.stroopColor.grades.D"),
  }), [t]);

  // ── Screen ───────────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<Screen>("start");

  // ── Persistent ───────────────────────────────────────────────────────────────
  const [bestScore, setBestScore] = useState(0);

  // ── Game state ───────────────────────────────────────────────────────────────
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [roundPct, setRoundPct] = useState(1);
  const [results, setResults] = useState<HitResult[]>([]);
  const [tapTimes, setTapTimes] = useState<number[]>([]);

  // ── Round state ───────────────────────────────────────────────────────────────
  const [colorIdx, setColorIdx] = useState<ColorIdx>(0);
  const [wordIdx, setWordIdx] = useState<ColorIdx>(0);
  const [options, setOptions] = useState<[ColorIdx, ColorIdx]>([0, 1]);
  const [wordFlash, setWordFlash] = useState<"idle" | "right" | "wrong">(
    "idle",
  );
  const [btn0Flash, setBtn0Flash] = useState<BtnFlash>("idle");
  const [btn1Flash, setBtn1Flash] = useState<BtnFlash>("idle");
  const [busy, setBusy] = useState(false);

  // ── Demo color on start screen ────────────────────────────────────────────────
  const [demoColorIdx, setDemoColorIdx] = useState(0);

  // ── Combo toast ───────────────────────────────────────────────────────────────
  const [comboToast, setComboToast] = useState<{
    text: string;
    color: string;
    key: number;
  } | null>(null);

  // ── Shield boost ──────────────────────────────────────────────────────────────
  const { useBoost: consumeBoost } = useBoostsInventory();
  const shieldCount = useBoostsInventory((state) => state.inventory["stroop_shield"] ?? 0);
  const { retryCount, hasRetry, activateRetry, getFinalScore } = useRetryBoost();
  const [shieldActive, setShieldActive] = useState(false);
  const [boostsUsed, setBoostsUsed] = useState(0);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const gameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTapTs = useRef<number>(0);
  const gameOnRef = useRef(false);
  const shieldActiveRef = useRef(false);

  // live refs for state inside intervals
  const streakRef = useRef(streak);
  const livesRef = useRef(lives);
  const scoreRef = useRef(score);
  const totalRef = useRef(total);
  const resultsRef = useRef(results);
  const tapTimesRef = useRef(tapTimes);
  const correctRef = useRef(correct);
  const maxStreakRef = useRef(maxStreak);

  useEffect(() => {
    streakRef.current = streak;
  }, [streak]);
  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  useEffect(() => {
    totalRef.current = total;
  }, [total]);
  useEffect(() => {
    resultsRef.current = results;
  }, [results]);
  useEffect(() => {
    tapTimesRef.current = tapTimes;
  }, [tapTimes]);
  useEffect(() => {
    correctRef.current = correct;
  }, [correct]);
  useEffect(() => {
    maxStreakRef.current = maxStreak;
  }, [maxStreak]);
  useEffect(() => {
    shieldActiveRef.current = shieldActive;
  }, [shieldActive]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Demo color cycle
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const id = setInterval(() => {
      setDemoColorIdx((i) => (i + 1) % COLORS_COUNT);
    }, 900);
    return () => clearInterval(id);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Load round
  // ─────────────────────────────────────────────────────────────────────────────

  const handleShield = useCallback(() => {
    if (
      shieldActive ||
      shieldCount <= 0 ||
      !gameOnRef.current ||
      boostsUsed >= 2
    )
      return;
    
    const success = consumeBoost("stroop_shield");
    if (!success) return;

    setShieldActive(true);
    setBoostsUsed((c) => c + 1);
  }, [shieldActive, shieldCount, consumeBoost, boostsUsed]);

  const loadRound = useCallback(() => {
    const r = pickRound();
    const ci = r.colorIdx;
    const wi = r.wordIdx;
    const opts = buildOptions(ci);
    setColorIdx(ci);
    setWordIdx(wi);
    setOptions(opts);
    setWordFlash("idle");
    setBtn0Flash("idle");
    setBtn1Flash("idle");
    setBusy(false);
    lastTapTs.current = Date.now();

    // round countdown
    if (roundTimerRef.current) clearInterval(roundTimerRef.current);
    let rt = ROUND_TIME;
    setRoundPct(1);
    roundTimerRef.current = setInterval(() => {
      if (!gameOnRef.current) {
        clearInterval(roundTimerRef.current!);
        return;
      }
      rt = Math.max(0, rt - 0.05);
      setRoundPct(rt / ROUND_TIME);
      if (rt <= 0) {
        clearInterval(roundTimerRef.current!);
        handleTimeout();
      }
    }, 50);
  }, [handleTimeout]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────────
  // Handle timeout (round timer expired)
  // ─────────────────────────────────────────────────────────────────────────────

  const handleTimeout = useCallback(() => {
    if (!gameOnRef.current) return;
    setBusy(true);
    setStreak(0);
    streakRef.current = 0;
    setResults((r) => {
      const n = [...r, "w" as HitResult];
      resultsRef.current = n;
      return n;
    });
    setTotal((t) => {
      const n = t + 1;
      totalRef.current = n;
      return n;
    });
    setWordFlash("wrong");

    if (shieldActiveRef.current) {
      setShieldActive(false);
      setTimeout(() => {
        setWordFlash("idle");
        loadRound();
      }, 300);
      return;
    }

    const newLives = livesRef.current - 1;
    setLives(newLives);
    livesRef.current = newLives;

    setTimeout(() => {
      setWordFlash("idle");
      if (newLives <= 0) {
        endGame();
      } else {
        loadRound();
      }
    }, 300);
  }, [loadRound, endGame]); // eslint-disable-line react-hooks/exhaustive-deps

  const { addXP, addIQScore } = useUserStats();

  // ─────────────────────────────────────────────────────────────────────────────
  // End game
  // ─────────────────────────────────────────────────────────────────────────────

  const endGame = useCallback(async () => {
    if (!gameOnRef.current) return;
    gameOnRef.current = false;
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (roundTimerRef.current) clearInterval(roundTimerRef.current);
    
    // Calculate final stats for XP
    const finalScore = getFinalScore(scoreRef.current);
    const finalAcc = totalRef.current > 0 ? Math.round((correctRef.current / totalRef.current) * 100) : 0;
    
    // Add XP: 10% of score + bonus for accuracy
    const xpGain = Math.round(finalScore / 10) + (finalAcc > 80 ? 25 : 0);
    addXP(xpGain);
    addIQScore(finalAcc); // Accuracy is a proxy for performance here

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
            (gameId as string) || "5",
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

    setBusy(true);
    setScreen("result");
  }, [addXP, addIQScore, dayId, gameId, challengeDayGameId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Start game
  // ─────────────────────────────────────────────────────────────────────────────

  const startGame = useCallback(() => {
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (roundTimerRef.current) clearInterval(roundTimerRef.current);

    // reset all state
    setScore(0);
    scoreRef.current = 0;
    setCorrect(0);
    correctRef.current = 0;
    setTotal(0);
    totalRef.current = 0;
    setStreak(0);
    streakRef.current = 0;
    setMaxStreak(0);
    maxStreakRef.current = 0;
    setLives(MAX_LIVES);
    livesRef.current = MAX_LIVES;
    setTimeLeft(DURATION);
    setResults([]);
    resultsRef.current = [];
    setTapTimes([]);
    tapTimesRef.current = [];
    setWordFlash("idle");
    setBtn0Flash("idle");
    setBtn1Flash("idle");
    setBusy(false);
    setComboToast(null);
    setShieldActive(false);
    setBoostsUsed(0);

    gameOnRef.current = true;
    setScreen("game");

    // main countdown
    let tl = DURATION;
    gameTimerRef.current = setInterval(() => {
      if (!gameOnRef.current) {
        clearInterval(gameTimerRef.current!);
        return;
      }
      tl = Math.max(0, tl - 0.1);
      setTimeLeft(tl);
      if (tl <= 0) {
        clearInterval(gameTimerRef.current!);
        endGame();
      }
    }, 100);

    loadRound();
  }, [loadRound, endGame]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Handle answer
  // ─────────────────────────────────────────────────────────────────────────────

  const onAnswer = useCallback(
    (chosenIdx: ColorIdx, btnPos: 0 | 1) => {
      if (!gameOnRef.current || busy) return;
      if (roundTimerRef.current) clearInterval(roundTimerRef.current);
      setBusy(true);

      const ms = Math.round(Date.now() - lastTapTs.current);
      const newTapTimes = [...tapTimesRef.current, ms];
      setTapTimes(newTapTimes);
      tapTimesRef.current = newTapTimes;

      const newTotal = totalRef.current + 1;
      setTotal(newTotal);
      totalRef.current = newTotal;

      const isCorrect = chosenIdx === colorIdx;

      if (isCorrect) {
        const newStreak = Math.min(streakRef.current + 1, STREAK_MAX);
        setStreak(newStreak);
        streakRef.current = newStreak;

        if (newStreak > maxStreakRef.current) {
          setMaxStreak(newStreak);
          maxStreakRef.current = newStreak;
        }

        const mult = COMBO_MULT[Math.min(newStreak, COMBO_MULT.length - 1)];
        const pts = Math.round(100 * mult + Math.max(0, (500 - ms) / 5));
        const newScore = scoreRef.current + pts;
        setScore(newScore);
        scoreRef.current = newScore;

        const newCorrect = correctRef.current + 1;
        setCorrect(newCorrect);
        correctRef.current = newCorrect;

        const newResults = [...resultsRef.current, "r" as HitResult];
        setResults(newResults);
        resultsRef.current = newResults;

        setWordFlash("right");
        if (btnPos === 0) setBtn0Flash("right");
        else setBtn1Flash("right");

        if (newStreak >= 3) {
          setComboToast({
            text: t("games.stroopColor.game.comboToast", { mult }),
            color: COLORS_HEX[chosenIdx],
            key: Date.now(),
          });
        }
      } else {
        setStreak(0);
        streakRef.current = 0;

        const newResults = [...resultsRef.current, "w" as HitResult];
        setResults(newResults);
        resultsRef.current = newResults;

        setWordFlash("wrong");
        if (btnPos === 0) setBtn0Flash("wrong");
        else setBtn1Flash("wrong");

        if (shieldActiveRef.current) {
          setShieldActive(false);
          setTimeout(() => {
            setWordFlash("idle");
            setBtn0Flash("idle");
            setBtn1Flash("idle");
            loadRound();
          }, 350);
          return;
        }

        const newLives = livesRef.current - 1;
        setLives(newLives);
        livesRef.current = newLives;

        if (newLives <= 0) {
          setTimeout(() => endGame(), 350);
          return;
        }
      }

      setTimeout(() => {
        setWordFlash("idle");
        setBtn0Flash("idle");
        setBtn1Flash("idle");
        loadRound();
      }, 120);
    },
    [busy, colorIdx, loadRound, endGame],
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Result derivations
  // ─────────────────────────────────────────────────────────────────────────────

  const resultData = useMemo(() => {
    const acc = total > 0 ? Math.round((correct / total) * 100) : 0;
    const avgMs = tapTimes.length
      ? Math.round(tapTimes.reduce((a, b) => a + b, 0) / tapTimes.length)
      : 0;
    const grade = gradeResult(acc, correct);
    const isNew = score > bestScore && score > 0;
    const brain = avgMs < 350 ? "🧠⚡" : "🧠";
    const bar = results
      .slice(0, 20)
      .map((r) => (r === "r" ? "🟢" : "🔴"))
      .join("");
    const shareText = t("games.stroopColor.result.shareText", {
      brain,
      bar: `${bar}${results.length > 20 ? "…" : ""}`,
      score,
      grade,
      acc,
      avgMs,
      best: isNew ? score : bestScore,
    });
    return { acc, avgMs, grade, isNew, shareText };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]); // only recompute when screen changes to "result"

  // update bestScore when result screen opens
  useEffect(() => {
    if (screen === "result" && score > bestScore && score > 0) {
      setBestScore(score);
    }
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────────
  // Copy / Share
  // ─────────────────────────────────────────────────────────────────────────────

  const handleShare = useCallback(async () => {
    try {
      await Share.share({ message: resultData.shareText });
    } catch {
      Alert.alert(t("games.stroopColor.result.share"), resultData.shareText);
    }
  }, [resultData.shareText]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Streak dots
  // ─────────────────────────────────────────────────────────────────────────────

  const streakDots = useMemo(
    () =>
      Array.from({ length: STREAK_MAX }, (_, i) => (
        <View
          key={i}
          style={[styles.streakDot, i < streak && styles.streakDotOn]}
        />
      )),
    [streak],
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Hearts
  // ─────────────────────────────────────────────────────────────────────────────

  const heartsEl = useMemo(
    () =>
      Array.from({ length: MAX_LIVES }, (_, i) => (
        <Text key={i} style={[styles.life, i >= lives && styles.lifeLost]}>
          ❤️
        </Text>
      )),
    [lives],
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Cleanup on unmount
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      gameOnRef.current = false;
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (roundTimerRef.current) clearInterval(roundTimerRef.current);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Combo mult display
  // ─────────────────────────────────────────────────────────────────────────────

  const comboLabel = `×${COMBO_MULT[Math.min(streak, COMBO_MULT.length - 1)]}`;

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* BG */}
      <LinearGradient
        colors={["#09090b", "#0f0f12", "#09090b"]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── START SCREEN ── */}
      <Modal visible={screen === "start"} transparent animationType="fade">
        <View style={styles.startNew_modal}>
          <LinearGradient
            colors={["#09090b", "#111113"]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Back button */}
          <TouchableOpacity
            style={[styles.startNew_backBtn, { top: insets.top + 12 }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color="#ef4444" />
          </TouchableOpacity>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.startNew_scroll,
              { paddingTop: insets.top + 64 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero */}
            <Text style={styles.startNew_emoji}>🎨</Text>
            <Text style={styles.startNew_title}>{t("games.stroopColor.start.title")}</Text>
            <Text style={styles.startNew_subtitle}>
              {t("games.stroopColor.start.subtitle")}
            </Text>

            {/* Description card */}
            <View style={styles.startNew_card}>
              <Text style={styles.startNew_cardTitle}>{t("games.stroopColor.start.howTitle")}</Text>
              <Text style={styles.startNew_cardText}>
                {t("games.stroopColor.start.howDesc")}
              </Text>

              {/* Demo word */}
              <Text
                style={[
                  styles.startNew_demoWord,
                  { color: COLORS_HEX[demoColorIdx] },
                ]}
              >
                {t("games.stroopColor.colors.red")}
              </Text>
              <Text style={styles.startNew_demoHint}>
                {t("games.stroopColor.start.demoHint")}
              </Text>

              <View style={styles.startNew_divider} />

              {/* Rules */}
              <Text style={styles.startNew_sectionTitle}>{t("games.stroopColor.start.rulesTitle")}</Text>
              {[
                {
                  color: "#ef4444",
                  name: t("games.stroopColor.start.rules.pickColorName"),
                  desc: t("games.stroopColor.start.rules.pickColorDesc"),
                },
                {
                  color: "#eab308",
                  name: t("games.stroopColor.start.rules.sixtySecName"),
                  desc: t("games.stroopColor.start.rules.sixtySecDesc"),
                },
                {
                  color: "#ef4444",
                  name: t("games.stroopColor.start.rules.livesName"),
                  desc: t("games.stroopColor.start.rules.livesDesc"),
                },
              ].map((item, i) => (
                <View key={i} style={styles.startNew_ruleItem}>
                  <View
                    style={[
                      styles.startNew_ruleDot,
                      { backgroundColor: item.color },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.startNew_ruleName, { color: item.color }]}
                    >
                      {item.name}
                    </Text>
                    <Text style={styles.startNew_ruleDesc}>{item.desc}</Text>
                  </View>
                </View>
              ))}

              <View style={styles.startNew_divider} />

              {/* Scoring */}
              <Text style={styles.startNew_sectionTitle}>{t("games.stroopColor.start.scoringTitle")}</Text>
              {[
                {
                  badge: "+10",
                  badgeColor: "#ef4444",
                  text: t("games.stroopColor.start.scoring.perCorrect"),
                },
                {
                  badge: "🔥",
                  badgeColor: "#eab308",
                  text: t("games.stroopColor.start.scoring.combo"),
                },
                {
                  badge: "⏱️",
                  badgeColor: "#3b82f6",
                  text: t("games.stroopColor.start.scoring.speed"),
                },
              ].map((item, i) => (
                <View key={i} style={styles.startNew_scoreRow}>
                  <View style={styles.startNew_scoreBadge}>
                    <Text
                      style={[
                        styles.startNew_scoreBadgeText,
                        { color: item.badgeColor },
                      ]}
                    >
                      {item.badge}
                    </Text>
                  </View>
                  <Text style={styles.startNew_scoreText}>{item.text}</Text>
                </View>
              ))}
            </View>

            {/* Color features row */}
            <View style={styles.startNew_featRow}>
              {[
                { hex: "#ef4444", name: t("games.stroopColor.colors.red") },
                { hex: "#3b82f6", name: t("games.stroopColor.colors.blue") },
                { hex: "#22c55e", name: t("games.stroopColor.colors.green") },
                { hex: "#eab308", name: t("games.stroopColor.colors.yellow") },
                { hex: "#a855f7", name: t("games.stroopColor.colors.purpleFull") },
                { hex: "#f97316", name: t("games.stroopColor.colors.orange") },
              ].map((c, i) => (
                <View key={i} style={styles.startNew_featBox}>
                  <View
                    style={[
                      styles.startNew_colorCircle,
                      { backgroundColor: c.hex },
                    ]}
                  />
                  <Text style={styles.startNew_featLabel}>{c.name}</Text>
                </View>
              ))}
            </View>

            {/* Best score */}
            <View style={styles.startNew_hiRow}>
              <Text style={styles.startNew_hiLabel}>{t("games.stroopColor.start.record")}</Text>
              <Text style={styles.startNew_hiVal}>
                {bestScore > 0 ? bestScore : "—"}
              </Text>
            </View>

            {/* Start button */}
            <TouchableOpacity
              style={styles.startNew_startBtn}
              onPress={startGame}
              activeOpacity={0.85}
            >
              <Text style={styles.startNew_startBtnText}>{t("games.stroopColor.start.startBtn")}</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* ── GAME SCREEN ── */}
      {screen === "game" && (
        <SafeAreaView style={styles.safe}>
          <View style={styles.gameApp}>
            {/* Top row: stats + timer */}
            <View style={styles.topRow}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { color: "#eab308" }]}>
                    {score}
                  </Text>
                  <Text style={styles.statLbl}>{t("games.stroopColor.game.score")}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{comboLabel}</Text>
                  <Text style={styles.statLbl}>{t("games.stroopColor.game.combo")}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{correct}</Text>
                  <Text style={styles.statLbl}>{t("games.stroopColor.game.correct")}</Text>
                </View>
              </View>
              <TimerRing timeLeft={timeLeft} />
            </View>

            {/* Streak dots + boost + hearts */}
            <View style={styles.subRow}>
              <View style={styles.streakRow}>{streakDots}</View>
              <TouchableOpacity
                style={[
                  styles.focusBtn,
                  (shieldActive ||
                    shieldCount <= 0 ||
                    boostsUsed >= 2) &&
                    styles.focusBtnUsed,
                ]}
                onPress={handleShield}
                disabled={
                  shieldActive ||
                  shieldCount <= 0 ||
                  boostsUsed >= 2
                }
              >
                <Text style={styles.focusEmoji}>🛡️</Text>
                <Text
                  style={[
                    styles.focusLabel,
                    (shieldActive ||
                      shieldCount <= 0 ||
                      boostsUsed >= 2) &&
                      styles.focusLabelUsed,
                  ]}
                >
                  {shieldActive
                    ? t("games.stroopColor.game.shieldActive")
                    : boostsUsed >= 2
                      ? t("games.stroopColor.game.shieldDepleted")
                      : t("games.stroopColor.game.shield")}
                </Text>
                {!shieldActive &&
                  shieldCount > 0 &&
                  boostsUsed < 2 && (
                    <View style={styles.focusBadge}>
                      <Text style={styles.focusBadgeText}>
                        {shieldCount}
                      </Text>
                    </View>
                  )}
              </TouchableOpacity>
              <View style={styles.livesRow}>{heartsEl}</View>
            </View>

            {/* Word box */}
            <WordBox
              word={COLOR_NAMES[wordIdx]}
              color={COLORS_HEX[colorIdx]}
              flash={wordFlash}
              roundPct={roundPct}
            />

            {/* Answer buttons */}
            <View style={styles.btnGrid}>
              <AnsButton
                label={COLOR_NAMES[options[0]]}
                flash={btn0Flash}
                onPress={() => onAnswer(options[0], 0)}
                disabled={busy}
              />
              <AnsButton
                label={COLOR_NAMES[options[1]]}
                flash={btn1Flash}
                onPress={() => onAnswer(options[1], 1)}
                disabled={busy}
              />
            </View>
          </View>
        </SafeAreaView>
      )}

      {/* ── RESULT SCREEN ── */}
      <Modal visible={screen === "result"} transparent animationType="fade">
        <SafeAreaWrapper>
          <LinearGradient
            colors={["#09090b", "#111113"]}
            style={StyleSheet.absoluteFillObject}
          />
          <ScrollView
            contentContainerStyle={styles.resultScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text
              style={[
                styles.resultTitle,
                resultData.grade === "D"
                  ? styles.resultTitleLose
                  : styles.resultTitleWin,
              ]}
            >
              {GRADE_TITLES[resultData.grade]}
            </Text>

            <View style={styles.resultDivider} />

            <View style={styles.statsRowComparison}>
              <View style={styles.statBoxComparison}>
                <View style={styles.statIconWrap}>
                  <Ionicons name="trophy-outline" size={16} color="#eab308" />
                </View>
                <Text style={[styles.statNumComparison, { color: "#eab308" }]}>
                  {bestScore}
                </Text>
                <Text style={styles.statLabelComparison}>{t("games.stroopColor.result.best")}</Text>
              </View>
              <View style={styles.statBoxComparison}>
                <View style={styles.statIconWrap}>
                  <Ionicons name="person-outline" size={16} color="#ef4444" />
                </View>
                <Text style={[styles.statNumComparison, { color: "#ef4444" }]}>
                  {score}
                </Text>
                <Text style={styles.statLabelComparison}>{t("games.stroopColor.result.yourRecord")}</Text>
              </View>
            </View>

            {/* Stats grid */}
            <View style={styles.resultGrid}>
              <View style={styles.rBox}>
                <View style={styles.statIconWrap}>
                  <Ionicons name="star-outline" size={16} color="#eab308" />
                </View>
                <Text style={[styles.rVal, { color: "#eab308" }]}>{score}</Text>
                <Text style={styles.rLbl}>{t("games.stroopColor.result.score")}</Text>
              </View>
              <View style={styles.rBox}>
                <View style={styles.statIconWrap}>
                  <Ionicons name="trophy-outline" size={16} color="#eab308" />
                </View>
                <Text style={styles.rVal}>{Math.max(bestScore, score)}</Text>
                <Text style={styles.rLbl}>{t("games.stroopColor.result.record")}</Text>
              </View>
              <View style={styles.rBox}>
                <View style={styles.statIconWrap}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={16}
                    color="#22c55e"
                  />
                </View>
                <Text style={styles.rVal}>
                  {correct}/{total}
                </Text>
                <Text style={styles.rLbl}>{t("games.stroopColor.result.correct")}</Text>
              </View>
              <View style={styles.rBox}>
                <View style={styles.statIconWrap}>
                  <Ionicons
                    name="stats-chart-outline"
                    size={16}
                    color="#3b82f6"
                  />
                </View>
                <Text style={styles.rVal}>{resultData.acc}%</Text>
                <Text style={styles.rLbl}>{t("games.stroopColor.result.accuracy")}</Text>
              </View>
              <View style={styles.rBox}>
                <View style={styles.statIconWrap}>
                  <Ionicons name="flash-outline" size={16} color="#3b82f6" />
                </View>
                <Text style={[styles.rVal, { color: "#3b82f6" }]}>
                  {resultData.avgMs} {t("games.stroopColor.units.ms")}
                </Text>
                <Text style={styles.rLbl}>{t("games.stroopColor.result.reaction")}</Text>
              </View>
            </View>

            {/* Hit dots */}
            <View style={styles.hitsRow}>
              {results.map((r, i) => (
                <View
                  key={i}
                  style={[
                    styles.hitDot,
                    r === "r" ? styles.hitDotRight : styles.hitDotWrong,
                  ]}
                >
                  <Text
                    style={[
                      styles.hitDotText,
                      { color: r === "r" ? "#22c55e" : "#71717a" },
                    ]}
                  >
                    {r === "r" ? "✓" : "×"}
                  </Text>
                </View>
              ))}
            </View>

            {/* New record badge */}
            {resultData.isNew && (
              <Text style={styles.newRec}>{t("games.stroopColor.result.newRecord")}</Text>
            )}

            {/* Share box */}
            <View style={styles.shareBox}>
              <Text style={styles.shareText}>{resultData.shareText}</Text>
            </View>

            {/* Buttons */}
            <View style={styles.resultBtnsRow}>
              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={handleShare}
                activeOpacity={0.8}
              >
                <Text style={styles.ghostBtnText}>{t("games.stroopColor.result.shareBtn")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.solidBtn}
                onPress={startGame}
                activeOpacity={0.85}
              >
                <Text style={styles.solidBtnText}>{t("games.stroopColor.result.tryAgain")}</Text>
              </TouchableOpacity>
              <RetryBoostButton
                hasRetry={hasRetry}
                retryCount={retryCount}
                onPress={() => activateRetry(scoreRef.current, startGame)}
                style={{ marginTop: 8, width: "100%" }}
              />
            </View>

            {/* Back */}
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <Text style={styles.backText}>{t("games.stroopColor.result.exit")}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaWrapper>
      </Modal>

      {/* ── Combo Toast (global overlay) ── */}
      {comboToast && (
        <ComboToast
          key={comboToast.key}
          text={comboToast.text}
          color={comboToast.color}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  safe: {
    flex: 1,
  },

  // ── Game layout ───────────────────────────────────────────────────────────────
  gameApp: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statVal: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fafafa",
    letterSpacing: 1,
  },
  statLbl: {
    fontSize: 8,
    letterSpacing: 3,
    color: "#52525b",
    marginTop: 1,
  },
  subRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  streakRow: {
    flexDirection: "row",
    gap: 5,
  },
  streakDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#27272a",
  },
  streakDotOn: {
    backgroundColor: "#eab308",
  },
  livesRow: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
  },
  life: {
    fontSize: 20,
    lineHeight: 24,
  },
  lifeLost: {
    opacity: 0.15,
  },

  // ── Word box ──────────────────────────────────────────────────────────────────
  wordBox: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#3f3f46",
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 8,
    minHeight: 140,
    justifyContent: "center",
  },
  wordTask: {
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: 5,
    textAlign: "center",
    lineHeight: 62,
  },
  wordInstr: {
    fontSize: 10,
    letterSpacing: 3,
    color: "#52525b",
    textTransform: "uppercase",
  },
  roundBarTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "#27272a",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 8,
  },
  roundBarFill: {
    height: "100%",
    borderRadius: 2,
  },

  // ── Answer buttons ────────────────────────────────────────────────────────────
  btnGrid: {
    flexDirection: "row",
    gap: 12,
    flex: 1,
  },
  ansBtnTouchable: {
    flex: 1,
  },
  ansBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  ansBtnIdle: {
    backgroundColor: "#18181b",
    borderColor: "#3f3f46",
  },
  ansBtnRight: {
    backgroundColor: "rgba(34,197,94,0.10)",
    borderColor: "#22c55e",
  },
  ansBtnWrong: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderColor: "#ef4444",
  },
  ansBtnText: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
    color: "#fafafa",
    textAlign: "center",
  },

  // ── Combo toast ───────────────────────────────────────────────────────────────
  comboToast: {
    position: "absolute",
    alignSelf: "center",
    top: "42%",
    zIndex: 200,
    pointerEvents: "none" as any,
  },
  comboToastText: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 4,
    textAlign: "center",
  },

  // ── Start screen (new) ────────────────────────────────────────────────────────
  startNew_modal: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  startNew_backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: 12,
    paddingRight: 2,
    backgroundColor: "#111113",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  startNew_scroll: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  startNew_emoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  startNew_title: {
    fontSize: 48,
    fontWeight: "900",
    color: "#ef4444",
    letterSpacing: 8,
    marginBottom: 6,
  },
  startNew_subtitle: {
    fontSize: 15,
    color: "#71717a",
    marginBottom: 28,
    letterSpacing: 1,
    textAlign: "center",
  },
  startNew_card: {
    width: "100%",
    backgroundColor: "#111113",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.13)",
    marginBottom: 20,
  },
  startNew_cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fafafa",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  startNew_cardText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 20,
    marginBottom: 16,
  },
  startNew_demoWord: {
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: 6,
    textAlign: "center",
    paddingVertical: 6,
  },
  startNew_demoHint: {
    fontSize: 11,
    color: "#52525b",
    textAlign: "center",
    letterSpacing: 1,
    marginBottom: 4,
  },
  startNew_divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginVertical: 16,
  },
  startNew_sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  startNew_ruleItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  startNew_ruleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  startNew_ruleName: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  startNew_ruleDesc: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    lineHeight: 17,
  },
  startNew_scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  startNew_scoreBadge: {
    width: 42,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  startNew_scoreBadgeText: {
    fontSize: 13,
    fontWeight: "800",
  },
  startNew_scoreText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    flex: 1,
    lineHeight: 17,
  },
  startNew_featRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginBottom: 24,
    width: "100%",
  },
  startNew_featBox: {
    alignItems: "center",
    gap: 4,
    minWidth: 60,
  },
  startNew_colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  startNew_featLabel: {
    fontSize: 8,
    color: "#52525b",
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  startNew_hiRow: {
    alignItems: "center",
    gap: 2,
    marginBottom: 16,
  },
  startNew_hiLabel: {
    fontSize: 9,
    letterSpacing: 4,
    color: "#52525b",
    textTransform: "uppercase",
  },
  startNew_hiVal: {
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: 3,
    color: "#ef4444",
  },
  startNew_startBtn: {
    width: "100%",
    backgroundColor: "#ef4444",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  startNew_startBtnText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 2,
  },

  // ── Result screen ─────────────────────────────────────────────────────────────
  resultOverlay: {
    flex: 1,
  },
  resultScroll: {
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 40,
    flexGrow: 1,
  },
  resultTitle: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 6,
    textAlign: "center",
    lineHeight: 64,
  },
  resultTitleWin: {
    color: "#eab308",
  },
  resultTitleLose: {
    color: "#71717a",
  },
  resultDivider: {
    width: 60,
    height: 1,
    backgroundColor: "#eab308",
    opacity: 0.5,
  },
  statsRowComparison: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
    justifyContent: "center",
    width: "100%",
    maxWidth: 320,
  },
  statBoxComparison: {
    flex: 1,
    backgroundColor: "#111113",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  statNumComparison: { fontSize: 26, fontWeight: "900", lineHeight: 28 },
  statLabelComparison: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: "#52525b",
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
  resultGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    width: "100%",
    maxWidth: 320,
  },
  rBox: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#111113",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
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
  rVal: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#fafafa",
  },
  rLbl: {
    fontSize: 8,
    letterSpacing: 2,
    color: "#52525b",
    marginTop: 4,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  hitsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "center",
    maxWidth: 320,
  },
  hitDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  hitDotRight: {
    backgroundColor: "rgba(34,197,94,0.15)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
  },
  hitDotWrong: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  hitDotText: {
    fontSize: 8,
    fontWeight: "700",
  },
  newRec: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 4,
    color: "#eab308",
    textAlign: "center",
  },
  shareBox: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    maxWidth: 320,
    width: "100%",
  },
  shareText: {
    fontSize: 11,
    letterSpacing: 1,
    color: "#71717a",
    lineHeight: 20,
    textAlign: "center",
  },
  resultBtnsRow: {
    flexDirection: "row",
    gap: 10,
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: "#3f3f46",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  ghostBtnText: {
    fontSize: 11,
    letterSpacing: 2,
    color: "#71717a",
    textTransform: "uppercase",
  },
  solidBtn: {
    backgroundColor: "#fafafa",
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  solidBtnText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#09090b",
    textTransform: "uppercase",
  },
  backText: {
    fontSize: 12,
    letterSpacing: 2,
    color: "#52525b",
    marginTop: 4,
  },

  // Focus boost
  focusBtn: {
    backgroundColor: "rgba(78,205,196,0.12)",
    borderWidth: 1.5,
    borderColor: "#4ECDC4",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    gap: 1,
  },
  focusBtnUsed: {
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
    opacity: 0.4,
  },
  focusEmoji: { fontSize: 14 },
  focusLabel: {
    color: "#4ECDC4",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  focusLabelUsed: { color: "rgba(255,255,255,0.3)" },
  focusBadge: {
    position: "absolute",
    top: -7,
    right: -7,
    backgroundColor: "#4ECDC4",
    borderRadius: 9,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  focusBadgeText: { color: "#09090b", fontSize: 9, fontWeight: "900" },
});
