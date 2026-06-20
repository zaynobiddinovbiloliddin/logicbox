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
  Dimensions,
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
import { useBoostsInventory } from "@/store/boosts-inventory";
import { useRetryBoost } from "@/hooks/use-retry-boost";
import RetryBoostButton from "@/components/shared/retry-boost-button";
import { useUserStats } from "@/store/user-stats";
import { ChallengesModule } from "@/services/modules/challenges-module";

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get("window");

const TOTAL = 38;

const ZONES = {
  perfect: 0.08,
  good: 0.16,
  ok: 0.28,
};

const PTS = { perfect: 1000, good: 500, ok: 150, miss: 0 } as const;

const COMBO_MULT = [1, 1, 1.5, 2, 2.5, 3] as const;

const MULT_COLORS = [
  "#444",
  "#444",
  "#40c4ff",
  "#00e676",
  "#f0c040",
  "#f0c040",
] as const;

type HitResult = "perfect" | "good" | "ok" | "miss";
type Screen = "start" | "game" | "result";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSpeed(att: number): number {
  if (att <= 6) return 0.35 + (0.55 - 0.35) * ((att - 1) / 5);
  if (att <= 14) return 0.55 + (1.1 - 0.55) * ((att - 6) / 8);
  if (att <= 23) return 1.1 + (1.2 - 1.1) * ((att - 14) / 9);
  if (att <= 32) return 1.2 + (1.7 - 1.2) * ((att - 23) / 9);
  return 1.7 + (2.0 - 1.7) * ((att - 32) / 6);
}

function fmtMs(ms: number, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (!ms) return "—";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  const dec = Math.floor((ms % 1000) / 100);
  return m > 0
    ? t("games.udarTiming.timeMinSec", { m, sec, dec })
    : t("games.udarTiming.timeSec", { sec, dec });
}

function evaluatePos(pos: number): { result: HitResult; pts: number } {
  const dist = Math.abs(pos - 0.5);
  if (dist <= ZONES.perfect) return { result: "perfect", pts: PTS.perfect };
  if (dist <= ZONES.good) return { result: "good", pts: PTS.good };
  if (dist <= ZONES.ok) return { result: "ok", pts: PTS.ok };
  return { result: "miss", pts: 0 };
}

function gradeGame(
  perfect: number,
  good: number,
  ok: number,
): "S" | "A" | "B" | "C" | "D" {
  if (perfect >= 30) return "S";
  if (perfect >= 22) return "A";
  if (good + perfect >= 28) return "B";
  if (ok + good + perfect >= 28) return "C";
  return "D";
}


// ─── Track dimensions ─────────────────────────────────────────────────────────

const TRACK_H = 54;
const TRACK_PADDING = 32; // horizontal screen padding
const TRACK_W = SCREEN_W - TRACK_PADDING * 2;
const NEEDLE_W = 4;

// Zone pixel widths (centered)
const zoneOkW = ZONES.ok * 2 * TRACK_W;
const zoneGoodW = ZONES.good * 2 * TRACK_W;
const zonePerfectW = ZONES.perfect * 2 * TRACK_W;

// ─── Hit Result Colors ────────────────────────────────────────────────────────

const HIT_COLORS: Record<HitResult, string> = {
  perfect: "#f0c040",
  good: "#00e676",
  ok: "#40c4ff",
  miss: "#ff2d2d",
};


// ─── Attempt Dot ─────────────────────────────────────────────────────────────

interface AttemptDotProps {
  state: HitResult | "pending" | "current";
}

function AttemptDot({ state }: AttemptDotProps) {
  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === "current") {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0.25,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      blinkAnim.setValue(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const bgColor =
    state === "perfect"
      ? "#f0c040"
      : state === "good"
        ? "#00e676"
        : state === "ok"
          ? "#40c4ff"
          : state === "miss"
            ? "#444"
            : state === "current"
              ? "#f5f5f0"
              : "#2e2e2e";

  const glowColor =
    state === "perfect"
      ? "rgba(240,192,64,0.6)"
      : state === "good"
        ? "rgba(0,230,118,0.5)"
        : state === "ok"
          ? "rgba(64,196,255,0.5)"
          : undefined;

  return (
    <Animated.View
      style={[
        styles.attemptDot,
        { backgroundColor: bgColor },
        glowColor
          ? {
              shadowColor: glowColor,
              shadowOpacity: 1,
              shadowRadius: 4,
              elevation: 3,
            }
          : undefined,
        { opacity: blinkAnim },
      ]}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UdarTiming() {
  const { t } = useTranslation();

  const GRADE_TITLES = useMemo<Record<string, string>>(() => ({
    S: t("games.udarTiming.grade.s"),
    A: t("games.udarTiming.grade.a"),
    B: t("games.udarTiming.grade.b"),
    C: t("games.udarTiming.grade.c"),
    D: t("games.udarTiming.grade.d"),
  }), [t]);

  const HIT_LABELS = useMemo<Record<HitResult, string>>(() => ({
    perfect: t("games.udarTiming.hitLabel.perfect"),
    good: t("games.udarTiming.hitLabel.good"),
    ok: t("games.udarTiming.hitLabel.ok"),
    miss: t("games.udarTiming.hitLabel.miss"),
  }), [t]);

  const insets = useSafeAreaInsets();
  const { dayId, gameId, challengeDayGameId } = useLocalSearchParams();

  // ── Screen ───────────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<Screen>("start");

  // ── Persistent ───────────────────────────────────────────────────────────────
  const [bestScore, setBestScore] = useState(0);
  const [bestTime, setBestTime] = useState<number | null>(null);

  // ── Game state ───────────────────────────────────────────────────────────────
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  const [attempt, setAttempt] = useState(0);
  const [hitResults, setHitResults] = useState<HitResult[]>([]);
  const [totalMs, setTotalMs] = useState(0);

  // ── Round display state ───────────────────────────────────────────────────────
  const [statusText, setStatusText] = useState(t("games.udarTiming.status.tapHit"));
  const [statusColor, setStatusColor] = useState("#666");
  const [lastResult, setLastResult] = useState<HitResult | null>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [comboVisible, setComboVisible] = useState(false);
  const [comboLabel, setComboLabel] = useState("×1");
  const [multPct, setMultPct] = useState(0);
  const [multColor, setMultColor] = useState("#444");
  const [multLabel, setMultLabel] = useState("×1");
  const [tapDisabled, setTapDisabled] = useState(false);
  const [tapColor, setTapColor] = useState<HitResult | null>(null);

  // ── Needle animation ──────────────────────────────────────────────────────────
  const needleAnim = useRef(new Animated.Value(0)).current; // 0..1 → pixel left

  // ── Flash overlay ─────────────────────────────────────────────────────────────
  const flashAnim = useRef(new Animated.Value(0)).current;
  const [flashColor, setFlashColor] = useState("transparent");

  // ── Combo badge anim ──────────────────────────────────────────────────────────
  const comboBadgeAnim = useRef(new Animated.Value(0)).current;

  // ── Float score anim ─────────────────────────────────────────────────────────
  const [floatPts, setFloatPts] = useState<number | null>(null);
  const [floatColor, setFloatColor] = useState("#f0c040");
  const floatAnim = useRef(new Animated.Value(0)).current;

  // ── Boost: slow motion ───────────────────────────────────────────────────────
  const { useBoost: consumeBoost } = useBoostsInventory();
  const slowCount = useBoostsInventory((state) => state.inventory["udar_slow"] ?? 0);
  const { retryCount, hasRetry, activateRetry, getFinalScore } = useRetryBoost();
  const { addXP, addIQScore } = useUserStats();
  const [slowHitsLeft, setSlowHitsLeft] = useState(0);
  const slowHitsRef = useRef(0);

  // ── Refs for needle loop ──────────────────────────────────────────────────────
  const posRef = useRef(0);
  const dirRef = useRef(1);
  const speedRef = useRef(0.35);
  const lastTRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const gameActiveRef = useRef(false);
  const attemptRef = useRef(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const perfectRef = useRef(0);
  const hitResultsRef = useRef<HitResult[]>([]);
  const gameStartTsRef = useRef<number | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // Needle RAF loop
  // ─────────────────────────────────────────────────────────────────────────────

  const startNeedle = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    lastTRef.current = null;
    let frameCount = 0;

    const loop = (ts: number) => {
      if (!gameActiveRef.current) return;
      if (!lastTRef.current) lastTRef.current = ts;
      const dt = Math.min((ts - lastTRef.current) / 1000, 0.05);
      lastTRef.current = ts;

      posRef.current += dirRef.current * speedRef.current * dt;
      if (posRef.current >= 1) { posRef.current = 1; dirRef.current = -1; }
      if (posRef.current <= 0) { posRef.current = 0; dirRef.current = 1; }

      // Update native value every 2nd frame (30fps) to reduce JS→native bridge calls
      frameCount++;
      if (frameCount % 2 === 0) {
        needleAnim.setValue(posRef.current * (TRACK_W - NEEDLE_W));
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopNeedle = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Flash screen
  // ─────────────────────────────────────────────────────────────────────────────

  const triggerFlash = useCallback((result: HitResult) => {
    if (result === "ok" || result === "miss") {
      if (result === "miss") {
        setFlashColor("rgba(255,45,45,0.09)");
        flashAnim.setValue(1);
        Animated.timing(flashAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }
      return;
    }
    setFlashColor("rgba(240,192,64,0.08)");
    flashAnim.setValue(1);
    Animated.timing(flashAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────────
  // Float score
  // ─────────────────────────────────────────────────────────────────────────────

  const triggerFloat = useCallback((pts: number, result: HitResult) => {
    if (pts <= 0) return;
    setFloatPts(pts);
    setFloatColor(HIT_COLORS[result]);
    floatAnim.setValue(0);
    Animated.timing(floatAnim, {
      toValue: 1,
      duration: 900,
      useNativeDriver: true,
    }).start(() => {
      setFloatPts(null);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────────
  // Evaluate tap
  // ─────────────────────────────────────────────────────────────────────────────

  const evaluateTap = useCallback(() => {
    const { result, pts } = evaluatePos(posRef.current);

    // track results
    const newResults = [...hitResultsRef.current, result];
    hitResultsRef.current = newResults;
    setHitResults(newResults);

    // combo
    let newCombo = comboRef.current;
    if (result !== "miss") {
      newCombo = Math.min(newCombo + 1, COMBO_MULT.length - 1);
      if (newCombo > maxComboRef.current) {
        maxComboRef.current = newCombo;
        setMaxCombo(newCombo);
      }
    } else {
      newCombo = 0;
    }
    comboRef.current = newCombo;
    setCombo(newCombo);

    if (result === "perfect") {
      perfectRef.current++;
    }

    const mult = COMBO_MULT[Math.min(newCombo, COMBO_MULT.length - 1)];
    const earned = Math.round(pts * mult);
    scoreRef.current += earned;
    setScore(scoreRef.current);
    setDisplayScore(scoreRef.current);

    // speed for next attempt
    speedRef.current = getSpeed(attemptRef.current);
    if (slowHitsRef.current > 0) {
      speedRef.current = 0.35;
      slowHitsRef.current--;
      setSlowHitsLeft(slowHitsRef.current);
    }

    // status & visuals
    setLastResult(result);
    setStatusColor(HIT_COLORS[result]);
    setStatusText(HIT_LABELS[result] + (earned > 0 ? ` +${earned}` : ""));

    // tap button color flash
    setTapColor(result);
    setTimeout(() => setTapColor(null), 400);

    // combo badge
    if (mult > 1) {
      setComboLabel(`×${mult}`);
      setComboVisible(true);
      comboBadgeAnim.setValue(0);
      Animated.timing(comboBadgeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      setTimeout(() => {
        Animated.timing(comboBadgeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setComboVisible(false));
      }, 700);
    }

    // mult bar
    const multPct = Math.min((newCombo / 5) * 100, 100);
    setMultPct(multPct);
    setMultColor(MULT_COLORS[Math.min(newCombo, MULT_COLORS.length - 1)]);
    setMultLabel(`×${mult}`);

    // combo stat display
    const displayMult = COMBO_MULT[Math.min(newCombo, COMBO_MULT.length - 1)];
    setComboLabel(`×${displayMult}`);

    // flash + float
    triggerFlash(result);
    triggerFloat(earned, result);

    const att = attemptRef.current;

    if (att >= TOTAL) {
      setTapDisabled(true);
      setStatusText("");
      setTimeout(() => endGame(), 900);
    } else {
      setStatusText(t("games.udarTiming.status.tapHit"));
      setStatusColor("#666");
    }
  }, [triggerFlash, triggerFloat, endGame]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────────
  // End game
  // ─────────────────────────────────────────────────────────────────────────────

  const endGame = useCallback(async () => {
    gameActiveRef.current = false;
    stopNeedle();

    const ms = gameStartTsRef.current
      ? Math.round(Date.now() - gameStartTsRef.current)
      : 0;
    setTotalMs(ms);

    const finalScore = getFinalScore(scoreRef.current);
    const isNewScore = finalScore > bestScore && finalScore > 0;
    const isSameScoreFaster =
      finalScore === bestScore && bestTime !== null && ms < bestTime;

    if (isNewScore) {
      setBestScore(finalScore);
      setBestTime(ms);
    } else if (isSameScoreFaster) {
      setBestTime(ms);
    }

    const finalAcc = Math.round((perfectRef.current / TOTAL) * 100);
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
            (gameId as string) || 6
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

    setScreen("result");
  }, [bestScore, bestTime, stopNeedle, addXP, addIQScore, dayId, gameId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Start game
  // ─────────────────────────────────────────────────────────────────────────────

  const startGame = useCallback(() => {
    stopNeedle();

    // reset refs
    posRef.current = 0;
    dirRef.current = 1;
    speedRef.current = 0.35;
    attemptRef.current = 0;
    scoreRef.current = 0;
    comboRef.current = 0;
    maxComboRef.current = 0;
    perfectRef.current = 0;
    hitResultsRef.current = [];
    gameStartTsRef.current = null;
    lastTRef.current = null;

    // reset state
    setScore(0);
    setCombo(0);
    setMaxCombo(0);

    setAttempt(0);
    setHitResults([]);
    setTotalMs(0);
    setDisplayScore(0);
    setStatusText(t("games.udarTiming.status.tapHit"));
    setStatusColor("#666");
    setLastResult(null);
    setComboVisible(false);
    setMultPct(0);
    setMultColor("#444");
    setMultLabel("×1");
    setTapDisabled(false);
    setTapColor(null);
    setFloatPts(null);
    needleAnim.setValue(0);
    slowHitsRef.current = 0;
    setSlowHitsLeft(0);

    gameActiveRef.current = true;
    setScreen("game");

    startNeedle();
  }, [startNeedle, stopNeedle]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────────
  // Boost: slow motion
  // ─────────────────────────────────────────────────────────────────────────────

  const useSlowBoost = useCallback(() => {
    if (slowCount <= 0 || !gameActiveRef.current || slowHitsLeft > 0) return;
    
    if (!consumeBoost("udar_slow")) return;

    slowHitsRef.current = 5;
    setSlowHitsLeft(5);
  }, [slowCount, consumeBoost, slowHitsLeft]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Handle tap button press
  // ─────────────────────────────────────────────────────────────────────────────

  const onTap = useCallback(() => {
    if (!gameActiveRef.current) return;
    if (attemptRef.current >= TOTAL) return;

    attemptRef.current++;
    if (!gameStartTsRef.current) gameStartTsRef.current = Date.now();

    setAttempt(attemptRef.current);
    evaluateTap();
  }, [evaluateTap]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Cleanup
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      gameActiveRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Result derivations
  // ─────────────────────────────────────────────────────────────────────────────

  const resultData = useMemo(() => {
    const perfect = hitResults.filter((r) => r === "perfect").length;
    const good = hitResults.filter((r) => r === "good").length;
    const ok = hitResults.filter((r) => r === "ok").length;
    const miss = hitResults.filter((r) => r === "miss").length;
    const grade = gradeGame(perfect, good, ok);
    const isNew =
      (score > bestScore && score > 0) ||
      (score === bestScore &&
        bestTime !== null &&
        totalMs < bestTime &&
        score > 0);

    const hitStr = hitResults
      .map((r) => ({ perfect: "🟡", good: "🟢", ok: "🔵", miss: "⬛" })[r])
      .join("");

    const shareText = t("games.udarTiming.shareText", {
      hitStr,
      score,
      grade,
      perfect,
      total: TOTAL,
      time: fmtMs(totalMs, t),
    });

    return { perfect, good, ok, miss, grade, isNew, shareText };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({ message: resultData.shareText });
    } catch {
      Alert.alert(t("games.udarTiming.shareTitle"), resultData.shareText);
    }
  }, [resultData.shareText]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Attempt dots
  // ─────────────────────────────────────────────────────────────────────────────

  const attemptDots = useMemo(() => {
    return Array.from({ length: TOTAL }, (_, i) => {
      let state: HitResult | "pending" | "current";
      if (i < hitResults.length) state = hitResults[i];
      else if (i === attempt && attempt < TOTAL) state = "current";
      else state = "pending";
      return <AttemptDot key={i} state={state} />;
    });
  }, [hitResults, attempt]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Tap button border color
  // ─────────────────────────────────────────────────────────────────────────────

  const tapBorderColor =
    tapColor === "perfect"
      ? "#f0c040"
      : tapColor === "good"
        ? "#00e676"
        : tapColor === "ok"
          ? "#40c4ff"
          : tapColor === "miss"
            ? "#ff2d2d"
            : "#2e2e2e";

  // ─────────────────────────────────────────────────────────────────────────────
  // Current combo mult display
  // ─────────────────────────────────────────────────────────────────────────────

  const currentMult = COMBO_MULT[Math.min(combo, COMBO_MULT.length - 1)];

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* BG */}
      <LinearGradient
        colors={["#080808", "#0e0e0e", "#080808"]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Screen flash overlay */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: flashColor, opacity: flashAnim, zIndex: 100 },
        ]}
      />

      {/* ── START SCREEN ── */}
      <Modal visible={screen === "start"} transparent animationType="fade">
        <View style={styles.startNew_modal}>
          <LinearGradient
            colors={["#080808", "#111111"]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Back button */}
          <TouchableOpacity
            style={[styles.startNew_backBtn, { top: insets.top + 12 }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color="#f0c040" />
            <Text style={{ color: "#f0c040", fontSize: 12, fontWeight: "700", marginLeft: 4 }}>
              {t("common.back")}
            </Text>
          </TouchableOpacity>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.startNew_scroll,
              { paddingTop: insets.top + 64, paddingBottom: 16 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero */}
            <Text style={styles.startNew_emoji}>🎯</Text>
            <Text style={styles.startNew_title}>{t("games.udarTiming.start.title")}</Text>
            <Text style={styles.startNew_subtitle}>{t("games.udarTiming.start.subtitle")}</Text>

            {/* Description card */}
            <View style={styles.startNew_card}>
              <Text style={styles.startNew_cardTitle}>{t("games.udarTiming.start.howToPlayTitle")}</Text>
              <Text style={styles.startNew_cardText}>
                {t("games.udarTiming.start.howToPlayDesc", { total: TOTAL })}
              </Text>

              <View style={styles.startNew_divider} />

              {/* Zones */}
              <Text style={styles.startNew_sectionTitle}>{t("games.udarTiming.start.zonesTitle")}</Text>
              {[
                {
                  color: "#f0c040",
                  name: "PERFECT",
                  desc: t("games.udarTiming.start.zonePerfect"),
                },
                {
                  color: "#00e676",
                  name: "GOOD",
                  desc: t("games.udarTiming.start.zoneGood"),
                },
                {
                  color: "#40c4ff",
                  name: "OK",
                  desc: t("games.udarTiming.start.zoneOk"),
                },
                {
                  color: "#666666",
                  name: "MISS",
                  desc: t("games.udarTiming.start.zoneMiss"),
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
              <Text style={styles.startNew_sectionTitle}>{t("games.udarTiming.start.scoringTitle")}</Text>
              {[
                { badge: "PERFECT", badgeColor: "#f0c040", text: t("games.udarTiming.start.scorePerfect") },
                { badge: "GOOD", badgeColor: "#00e676", text: t("games.udarTiming.start.scoreGood") },
                { badge: "OK", badgeColor: "#40c4ff", text: t("games.udarTiming.start.scoreOk") },
                {
                  badge: "🔥",
                  badgeColor: "#f0c040",
                  text: t("games.udarTiming.start.scoreCombo"),
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

            {/* Features row */}
            <View style={styles.startNew_featRow}>
              {[
                { emoji: "🎯", label: t("games.udarTiming.start.featureAttempts") },
                { emoji: "⏱️", label: t("games.udarTiming.start.featureRhythm") },
                { emoji: "🏆", label: t("games.udarTiming.start.featureRecord") },
                { emoji: "⚡", label: t("games.udarTiming.start.featureAccuracy") },
              ].map((f, i) => (
                <View key={i} style={styles.startNew_featBox}>
                  <Text style={styles.startNew_featEmoji}>{f.emoji}</Text>
                  <Text style={styles.startNew_featLabel}>{f.label}</Text>
                </View>
              ))}
            </View>

            {/* Best score */}
            <View style={styles.startNew_hiRow}>
              <Text style={styles.startNew_hiLabel}>{t("games.udarTiming.start.sessionRecord")}</Text>
              <Text style={styles.startNew_hiVal}>
                {bestScore > 0 ? bestScore : "—"}
              </Text>
            </View>

          </ScrollView>

          <View
            style={[
              styles.startNew_footer,
              { paddingBottom: insets.bottom + 12 },
            ]}
          >
            <TouchableOpacity
              style={styles.startNew_startBtn}
              onPress={startGame}
              activeOpacity={0.85}
            >
              <Text style={styles.startNew_startBtnText}>{t("games.udarTiming.start.startBtn")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── RESULT SCREEN ── */}
      <Modal visible={screen === "result"} transparent animationType="fade">
        <SafeAreaView style={styles.modalBg}>
          <LinearGradient
            colors={["#080808", "#111111"]}
            style={StyleSheet.absoluteFillObject}
          />
          <ScrollView
            contentContainerStyle={styles.resultScroll}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={[
                styles.resTitle,
                resultData.grade === "D"
                  ? styles.resTitleLose
                  : styles.resTitleWin,
              ]}
            >
              {GRADE_TITLES[resultData.grade]}
            </Text>

            <View style={styles.resDivider} />

            <View style={styles.statsRowComparison}>
              <View style={styles.statBoxComparison}>
                <View style={styles.statIconWrap}>
                  <Ionicons name="trophy-outline" size={16} color="#f0c040" />
                </View>
                <Text style={[styles.statNumComparison, { color: "#f0c040" }]}>
                  {bestScore}
                </Text>
                <Text style={styles.statLabelComparison}>{t("games.udarTiming.result.best")}</Text>
              </View>
              <View style={styles.statBoxComparison}>
                <View style={styles.statIconWrap}>
                  <Ionicons name="person-outline" size={16} color="#e05c6a" />
                </View>
                <Text style={[styles.statNumComparison, { color: "#e05c6a" }]}>
                  {score}
                </Text>
                <Text style={styles.statLabelComparison}>{t("games.udarTiming.result.yourRecord")}</Text>
              </View>
            </View>

            {/* Stats grid */}
            <View style={styles.resGrid}>
              <View style={styles.resBox}>
                <Text style={[styles.resVal, { color: "#f0c040" }]}>
                  {score}
                </Text>
                <Text style={styles.resLbl}>{t("games.udarTiming.result.score")}</Text>
              </View>
              <View style={styles.resBox}>
                <Text style={styles.resVal}>×{maxCombo}</Text>
                <Text style={styles.resLbl}>{t("games.udarTiming.result.maxCombo")}</Text>
              </View>
              <View style={styles.resBox}>
                <Text style={styles.resVal}>
                  {resultData.perfect}/{TOTAL}
                </Text>
                <Text style={styles.resLbl}>{t("games.udarTiming.result.perfect")}</Text>
              </View>
              <View style={styles.resBox}>
                <Text style={[styles.resVal, { color: "#40c4ff" }]}>
                  {fmtMs(totalMs, t)}
                </Text>
                <Text style={styles.resLbl}>{t("games.udarTiming.result.time")}</Text>
              </View>
            </View>

            {/* Hit dots */}
            <View style={styles.resHitsRow}>
              {hitResults.map((r, i) => {
                const dotColor =
                  r === "perfect"
                    ? {
                        bg: "rgba(240,192,64,0.2)",
                        border: "rgba(240,192,64,0.4)",
                        color: "#f0c040",
                      }
                    : r === "good"
                      ? {
                          bg: "rgba(0,230,118,0.15)",
                          border: "rgba(0,230,118,0.3)",
                          color: "#00e676",
                        }
                      : r === "ok"
                        ? {
                            bg: "rgba(64,196,255,0.15)",
                            border: "rgba(64,196,255,0.3)",
                            color: "#40c4ff",
                          }
                        : {
                            bg: "rgba(255,255,255,0.04)",
                            border: "#222",
                            color: "#444",
                          };
                const icon =
                  r === "perfect"
                    ? "★"
                    : r === "good"
                      ? "●"
                      : r === "ok"
                        ? "○"
                        : "×";
                return (
                  <View
                    key={i}
                    style={[
                      styles.resHitDot,
                      {
                        backgroundColor: dotColor.bg,
                        borderColor: dotColor.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.resHitText, { color: dotColor.color }]}
                    >
                      {icon}
                    </Text>
                  </View>
                );
              })}
            </View>

            {resultData.isNew && (
              <Text style={styles.newRecText}>{t("games.udarTiming.result.newRecord")}</Text>
            )}

            <View style={styles.shareBox}>
              <Text style={styles.shareText}>{resultData.shareText}</Text>
            </View>

            <View style={styles.resBtnsRow}>
              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={handleShare}
                activeOpacity={0.8}
              >
                <Text style={styles.ghostBtnText}>{t("games.udarTiming.result.share")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={startGame}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>{t("games.udarTiming.result.tryAgain")}</Text>
              </TouchableOpacity>
              <RetryBoostButton
                hasRetry={hasRetry}
                retryCount={retryCount}
                onPress={() => activateRetry(scoreRef.current, startGame)}
                style={{ marginTop: 8, width: "100%" }}
              />
            </View>

            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <Text style={styles.backText}>{t("games.udarTiming.result.exit")}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── GAME SCREEN ── */}
      {screen === "game" && (
        <SafeAreaView style={styles.safe}>
          <View style={styles.gameApp}>
            {/* Header */}
            <View style={styles.headerWrap}>
              <View style={styles.titleWrap}>
                <Text style={styles.titleWhite}>У</Text>
                <Text style={styles.titleRed}>ДАР</Text>
              </View>
            </View>

            <Text style={styles.taglineSmall}>{t("games.udarTiming.game.tagline")}</Text>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>{t("games.udarTiming.game.points")}</Text>
                <Text style={[styles.statVal, { color: "#f0c040" }]}>
                  {displayScore}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>{t("games.udarTiming.game.combo")}</Text>
                <Text style={styles.statVal}>×{currentMult}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.statBox,
                  slowCount === 0 && styles.boostBtnDepleted,
                  slowHitsLeft > 0 && styles.boostBtnActive,
                  { position: "relative" },
                ]}
                onPress={useSlowBoost}
                disabled={slowCount === 0 || slowHitsLeft > 0}
                activeOpacity={0.75}
              >
                <Text style={styles.statLabel}>
                  {slowHitsLeft > 0 ? t("games.udarTiming.game.slowActive") : t("games.udarTiming.game.slow")}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    marginTop: 3,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>🐢</Text>
                  {slowHitsLeft > 0 && (
                    <Text style={[styles.statVal, { marginTop: 0 }]}>
                      {slowHitsLeft}
                    </Text>
                  )}
                </View>

                {/* Badge for count */}
                {slowHitsLeft === 0 && slowCount > 0 && (
                  <View
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      backgroundColor: "#40c4ff",
                      borderRadius: 10,
                      width: 18,
                      height: 18,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1.5,
                      borderColor: "#111",
                    }}
                  >
                    <Text
                      style={{
                        color: "#000",
                        fontSize: 9,
                        fontWeight: "900",
                      }}
                    >
                      {slowCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Attempt dots */}
            <View style={styles.attemptDots}>{attemptDots}</View>

            {/* Arena */}
            <View style={styles.arena}>
              {/* Status */}
              <Text style={[styles.statusLine, { color: statusColor }]}>
                {statusText}
              </Text>

              {/* Track */}
              <View style={styles.trackWrap}>
                <View style={styles.track}>
                  {/* Zone: ok (widest) */}
                  <View
                    style={[
                      styles.zoneBase,
                      styles.zoneOk,
                      { left: (TRACK_W - zoneOkW) / 2, width: zoneOkW },
                    ]}
                  />
                  {/* Zone: good */}
                  <View
                    style={[
                      styles.zoneBase,
                      styles.zoneGood,
                      { left: (TRACK_W - zoneGoodW) / 2, width: zoneGoodW },
                    ]}
                  />
                  {/* Zone: perfect */}
                  <View
                    style={[
                      styles.zoneBase,
                      styles.zonePerfect,
                      {
                        left: (TRACK_W - zonePerfectW) / 2,
                        width: zonePerfectW,
                      },
                    ]}
                  />

                  {/* Center tick */}
                  <View style={styles.centerTick} />

                  {/* Needle */}
                  <Animated.View
                    style={[
                      styles.needle,
                      lastResult === "perfect"
                        ? styles.needlePerfect
                        : lastResult === "good"
                          ? styles.needleGood
                          : lastResult === "ok"
                            ? styles.needleOk
                            : lastResult === "miss"
                              ? styles.needleMiss
                              : styles.needleIdle,
                      { transform: [{ translateX: needleAnim }] },
                    ]}
                  />
                </View>
              </View>

              {/* Score display + combo badge */}
              <View style={styles.scoreDisplayWrap}>
                <Text
                  style={[
                    styles.scoreDisplay,
                    lastResult === "perfect"
                      ? { color: "#f0c040" }
                      : lastResult === "good"
                        ? { color: "#00e676" }
                        : lastResult === "ok"
                          ? { color: "#40c4ff" }
                          : lastResult === "miss"
                            ? { color: "#666" }
                            : { color: "#f5f5f0" },
                  ]}
                >
                  {displayScore}
                </Text>
                {comboVisible && (
                  <Animated.View
                    style={[
                      styles.comboBadge,
                      {
                        opacity: comboBadgeAnim,
                        transform: [{ scale: comboBadgeAnim }],
                      },
                    ]}
                  >
                    <Text style={styles.comboBadgeText}>{comboLabel}</Text>
                  </Animated.View>
                )}
              </View>

              {/* Mult bar */}
              <View style={styles.multRow}>
                <Text style={styles.multRowLabel}>{t("games.udarTiming.game.speed")}</Text>
                <View style={styles.multTrack}>
                  <View
                    style={[
                      styles.multFill,
                      {
                        width: `${multPct}%` as any,
                        backgroundColor: multColor,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.multRowVal}>{multLabel}</Text>
              </View>
            </View>

            {/* Float score */}
            {floatPts !== null && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.floatScore,
                  {
                    opacity: floatAnim.interpolate({
                      inputRange: [0, 0.2, 0.8, 1],
                      outputRange: [0, 1, 1, 0],
                    }),
                    transform: [
                      {
                        translateY: floatAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -60],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={[styles.floatScoreText, { color: floatColor }]}>
                  +{floatPts}
                </Text>
              </Animated.View>
            )}

            {/* Tap button */}
            <TouchableOpacity
              style={[
                styles.tapBtn,
                { borderColor: tapBorderColor },
                tapDisabled && styles.tapBtnDisabled,
              ]}
              onPress={onTap}
              disabled={tapDisabled}
              activeOpacity={0.75}
            >
              <Text style={styles.tapBtnText}>{t("games.udarTiming.game.tapBtn")}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#080808",
  },
  safe: {
    flex: 1,
  },

  // ── Game layout ───────────────────────────────────────────────────────────────
  gameApp: {
    flex: 1,
    paddingHorizontal: TRACK_PADDING,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 10,
    alignItems: "center",
  },

  // ── Header ────────────────────────────────────────────────────────────────────
  headerWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  boostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#111",
  },
  boostBtnActive: {
    borderColor: "rgba(64,196,255,0.5)",
    backgroundColor: "rgba(64,196,255,0.08)",
  },
  boostBtnDepleted: {
    opacity: 0.3,
  },
  boostBtnEmoji: {
    fontSize: 20,
  },
  boostBtnRight: {
    gap: 1,
  },
  boostBtnLabel: {
    fontSize: 7,
    letterSpacing: 2,
    color: "#555",
    fontWeight: "700",
  },
  boostBtnCount: {
    fontSize: 12,
    fontWeight: "900",
    color: "#f5f5f0",
    letterSpacing: 1,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    fontSize: 22,
    color: "#f5f5f0",
    lineHeight: 26,
  },
  titleWrap: {
    flexDirection: "row",
    gap: 0,
  },
  titleWhite: {
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: 8,
    color: "#f5f5f0",
    lineHeight: 44,
  },
  titleRed: {
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: 8,
    color: "#ff2d2d",
    lineHeight: 44,
  },
  taglineSmall: {
    fontSize: 9,
    letterSpacing: 4,
    color: "#444",
    textTransform: "uppercase",
    marginTop: -6,
  },

  // ── Stats ─────────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  statBox: {
    flex: 1,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 8,
    letterSpacing: 3,
    color: "#444",
    textTransform: "uppercase",
  },
  statVal: {
    fontSize: 20,
    fontWeight: "600",
    color: "#f5f5f0",
    marginTop: 3,
    letterSpacing: 1,
  },

  // ── Attempt dots ──────────────────────────────────────────────────────────────
  attemptDots: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "center",
    width: "100%",
  },
  attemptDot: {
    width: 16,
    height: 5,
    borderRadius: 3,
  },

  // ── Arena ─────────────────────────────────────────────────────────────────────
  arena: {
    width: "100%",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#2e2e2e",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 0,
    alignItems: "center",
    gap: 14,
  },
  statusLine: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 4,
    textAlign: "center",
    minHeight: 26,
  },

  // ── Track ─────────────────────────────────────────────────────────────────────
  trackWrap: {
    width: "100%",
    paddingHorizontal: 0,
  },
  track: {
    width: TRACK_W,
    alignSelf: "center",
    height: TRACK_H,
    backgroundColor: "#181818",
    borderWidth: 1,
    borderColor: "#2e2e2e",
    borderRadius: 32,
    overflow: "hidden",
    position: "relative",
  },
  zoneBase: {
    position: "absolute",
    top: 0,
    bottom: 0,
  },
  zoneOk: {
    backgroundColor: "rgba(64,196,255,0.12)",
  },
  zoneGood: {
    backgroundColor: "rgba(0,230,118,0.18)",
  },
  zonePerfect: {
    backgroundColor: "rgba(240,192,64,0.28)",
    borderWidth: 1,
    borderColor: "rgba(240,192,64,0.3)",
  },
  centerTick: {
    position: "absolute",
    top: "20%",
    bottom: "20%",
    left: "50%",
    width: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  needle: {
    position: "absolute",
    top: 6,
    bottom: 6,
    width: NEEDLE_W,
    borderRadius: 2,
  },
  needleIdle: {
    backgroundColor: "#f5f5f0",
    shadowColor: "#fff",
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
  needlePerfect: {
    backgroundColor: "#f0c040",
    shadowColor: "#f0c040",
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  needleGood: {
    backgroundColor: "#00e676",
    shadowColor: "#00e676",
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  needleOk: {
    backgroundColor: "#40c4ff",
    shadowColor: "#40c4ff",
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  needleMiss: {
    backgroundColor: "#ff2d2d",
    shadowColor: "#ff2d2d",
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },

  // ── Score display ─────────────────────────────────────────────────────────────
  scoreDisplayWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    position: "relative",
  },
  scoreDisplay: {
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: 4,
    lineHeight: 52,
    textAlign: "center",
  },
  comboBadge: {
    position: "absolute",
    top: -12,
    right: -20,
    backgroundColor: "#ff2d2d",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  comboBadgeText: {
    fontSize: 11,
    letterSpacing: 2,
    color: "#f5f5f0",
    fontWeight: "700",
  },

  // ── Mult bar ──────────────────────────────────────────────────────────────────
  multRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    paddingHorizontal: 16,
  },
  multRowLabel: {
    fontSize: 9,
    letterSpacing: 3,
    color: "#444",
    textTransform: "uppercase",
  },
  multTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "#222",
    borderRadius: 2,
    overflow: "hidden",
  },
  multFill: {
    height: "100%",
    borderRadius: 2,
  },
  multRowVal: {
    fontSize: 12,
    color: "#f5f5f0",
    minWidth: 28,
    textAlign: "right",
  },

  // ── Float score ───────────────────────────────────────────────────────────────
  floatScore: {
    position: "absolute",
    alignSelf: "center",
    top: "50%",
    zIndex: 200,
    pointerEvents: "none" as any,
  },
  floatScoreText: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
  },

  // ── Tap button ────────────────────────────────────────────────────────────────
  tapBtn: {
    width: "100%",
    paddingVertical: 18,
    backgroundColor: "#111",
    borderWidth: 2,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  tapBtnDisabled: {
    opacity: 0.4,
  },
  tapBtnText: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 6,
    color: "#f5f5f0",
  },

  // ── Shared modal / result styles still needed ─────────────────────────────────
  modalBg: {
    flex: 1,
    backgroundColor: "#080808",
  },
  primaryBtn: {
    backgroundColor: "#f0c040",
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#080808",
    textTransform: "uppercase",
  },

  // ── Start screen (new) ────────────────────────────────────────────────────────
  startNew_modal: {
    flex: 1,
    backgroundColor: "#080808",
  },
  startNew_backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    paddingHorizontal: 10,
    height: 42,
    borderRadius: 12,
    paddingRight: 2,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(240,192,64,0.2)",
    flexDirection: "row",
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
    color: "#f0c040",
    letterSpacing: 8,
    marginBottom: 6,
  },
  startNew_subtitle: {
    fontSize: 15,
    color: "#666666",
    marginBottom: 28,
    letterSpacing: 1,
    textAlign: "center",
  },
  startNew_card: {
    width: "100%",
    backgroundColor: "#111111",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(240,192,64,0.13)",
    marginBottom: 20,
  },
  startNew_cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#f5f5f0",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  startNew_cardText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 20,
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
    minWidth: 52,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    paddingHorizontal: 6,
  },
  startNew_scoreBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  startNew_scoreText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    flex: 1,
    lineHeight: 17,
  },
  startNew_featRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
    width: "100%",
  },
  startNew_featBox: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(240,192,64,0.15)",
    gap: 4,
  },
  startNew_featEmoji: {
    fontSize: 22,
  },
  startNew_featLabel: {
    fontSize: 9,
    color: "#666666",
    fontWeight: "600",
    textAlign: "center",
  },
  startNew_hiRow: {
    alignItems: "center",
    gap: 2,
    marginBottom: 16,
  },
  startNew_hiLabel: {
    fontSize: 9,
    letterSpacing: 4,
    color: "#444444",
    textTransform: "uppercase",
  },
  startNew_hiVal: {
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: 4,
    color: "#f0c040",
  },
  startNew_footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "#080808",
  },
  startNew_startBtn: {
    width: "100%",
    backgroundColor: "#f0c040",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#f0c040",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  startNew_startBtnText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#080808",
    letterSpacing: 2,
  },

  // ── Result screen ─────────────────────────────────────────────────────────────
  resultScroll: {
    flexGrow: 1,
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  resTitle: {
    fontSize: 64,
    fontWeight: "900",
    letterSpacing: 6,
    textAlign: "center",
    lineHeight: 68,
  },
  resTitleWin: {
    color: "#f0c040",
  },
  resTitleLose: {
    color: "#ff2d2d",
  },
  resDivider: {
    width: 60,
    height: 1,
    backgroundColor: "#f0c040",
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
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  statNumComparison: { fontSize: 26, fontWeight: "900", lineHeight: 28 },
  statLabelComparison: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: "#444",
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
  resGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    width: "100%",
    maxWidth: 320,
  },
  resBox: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  resVal: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 2,
    color: "#f5f5f0",
  },
  resLbl: {
    fontSize: 8,
    letterSpacing: 3,
    color: "#444",
    marginTop: 2,
    textTransform: "uppercase",
  },
  resHitsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    justifyContent: "center",
    maxWidth: 320,
  },
  resHitDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  resHitText: {
    fontSize: 9,
    fontWeight: "700",
  },
  newRecText: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 4,
    color: "#f0c040",
    textAlign: "center",
  },
  shareBox: {
    backgroundColor: "#181818",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    maxWidth: 320,
    width: "100%",
  },
  shareText: {
    fontSize: 11,
    letterSpacing: 1,
    color: "#666",
    lineHeight: 20,
    textAlign: "center",
  },
  resBtnsRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: "#2e2e2e",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  ghostBtnText: {
    fontSize: 11,
    letterSpacing: 2,
    color: "#666",
    textTransform: "uppercase",
  },
  backText: {
    fontSize: 12,
    letterSpacing: 2,
    color: "#444",
    marginTop: 4,
  },
});
