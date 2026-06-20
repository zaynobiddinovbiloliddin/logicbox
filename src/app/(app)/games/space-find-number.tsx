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
import { GamesModule } from "@/services/modules/games-module";
import { Alert } from "react-native";

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get("window");

const LEVELS = [
  { planetKey: "games.spaceFindNumber.planets.mercury", size: 4, count: 16, timeLimit: 58 },
  { planetKey: "games.spaceFindNumber.planets.venus", size: 4, count: 16, timeLimit: 49 },
  { planetKey: "games.spaceFindNumber.planets.earth", size: 4, count: 16, timeLimit: 39 },
  { planetKey: "games.spaceFindNumber.planets.mars", size: 4, count: 16, timeLimit: 32 },
  { planetKey: "games.spaceFindNumber.planets.jupiter", size: 5, count: 25, timeLimit: 51 },
  { planetKey: "games.spaceFindNumber.planets.saturn", size: 5, count: 25, timeLimit: 42 },
  { planetKey: "games.spaceFindNumber.planets.uranus", size: 5, count: 25, timeLimit: 32 },
  { planetKey: "games.spaceFindNumber.planets.neptune", size: 6, count: 36, timeLimit: 71 },
] as const;

type Level = (typeof LEVELS)[number];

type Screen = "start" | "game" | "win" | "gameover" | "finalvictory";

type CellState = "idle" | "found" | "wrong";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(sec: number): string {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// ─── Cell Component ───────────────────────────────────────────────────────────

interface CellProps {
  num: number;
  state: CellState;
  onPress: () => void;
  size: number;
  isHighlighted?: boolean;
}

function Cell({ num, state, onPress, size, isHighlighted }: CellProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.88,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: state === "idle" ? 1.12 : 1,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPress, state]);

  // Run bounce when state becomes "found"
  useEffect(() => {
    if (state === "found") {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.18,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const cellStyle =
    state === "found"
      ? styles.cellFound
      : state === "wrong"
        ? styles.cellWrong
        : isHighlighted
          ? styles.cellHighlighted
          : styles.cellIdle;

  const textStyle =
    state === "found"
      ? styles.cellTextFound
      : state === "wrong"
        ? styles.cellTextWrong
        : styles.cellText;

  const fontSize = size > 60 ? 20 : size > 48 ? 17 : size > 38 ? 14 : 12;

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={state === "found"}
      activeOpacity={0.75}
    >
      <Animated.View
        style={[
          styles.cell,
          cellStyle,
          { width: size, height: size, borderRadius: size * 0.22 },
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Text style={[textStyle, { fontSize }]}>{num}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Starfield ────────────────────────────────────────────────────────────────

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  anim: Animated.Value;
  duration: number;
  delay: number;
}

function Starfield() {
  const stars = useMemo<Star[]>(() => {
    return Array.from({ length: 25 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.6,
      anim: new Animated.Value(0.2),
      duration: 2000 + Math.random() * 4000,
      delay: Math.random() * 4000,
    }));
  }, []);

  useEffect(() => {
    const loops = stars.map((star) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(star.anim, {
            toValue: 1,
            duration: star.duration / 2,
            delay: star.delay,
            useNativeDriver: true,
          }),
          Animated.timing(star.anim, {
            toValue: 0.2,
            duration: star.duration / 2,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return loop;
    });
    return () => loops.forEach((l) => l.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {stars.map((star) => (
        <Animated.View
          key={star.id}
          style={{
            position: "absolute",
            left: `${star.x}%` as any,
            top: `${star.y}%` as any,
            width: star.size,
            height: star.size,
            borderRadius: star.size / 2,
            backgroundColor: "white",
            opacity: star.anim,
          }}
        />
      ))}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SpaceFindNumber() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { dayId, gameId, challengeDayGameId } = useLocalSearchParams();

  // ── Screens ─────────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<Screen>("start");

  // ── Game state ───────────────────────────────────────────────────────────────
  const [levelIdx, setLevelIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);

  // ── Level state ──────────────────────────────────────────────────────────────
  const [numbers, setNumbers] = useState<number[]>([]);
  const [cellStates, setCellStates] = useState<CellState[]>([]);
  const [current, setCurrent] = useState(1);
  const [found, setFound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  // ── Radar boost ──────────────────────────────────────────────────────────────
  const { useBoost: consumeBoost } = useBoostsInventory();
  const radarCount = useBoostsInventory((state) => state.inventory["space_radar"] ?? 0);
  const { retryCount, hasRetry, activateRetry, getFinalScore } = useRetryBoost();
  const { addXP, addIQScore } = useUserStats();

  const completeGameFlow = useCallback(
    async (finalScore: number) => {
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
            (gameId as string) || "4"
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
    },
    [dayId, gameId, challengeDayGameId],
  );
  const [radarUsed, setRadarUsed] = useState(false);
  const [radarLeft, setRadarLeft] = useState(0);

  // ── Combo toast ──────────────────────────────────────────────────────────────
  const [comboText, setComboText] = useState<string | null>(null);
  const comboAnim = useRef(new Animated.Value(0)).current;

  // ── Timer shake anim ─────────────────────────────────────────────────────────
  const timerShake = useRef(new Animated.Value(0)).current;

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const level: Level = LEVELS[levelIdx];
  const PADDING = 32;
  const GRID_PADDING = 16;
  const GAP = 7;
  const gridW = SCREEN_W - PADDING - GRID_PADDING * 2;
  const cellSize = Math.floor((gridW - GAP * (level.size - 1)) / level.size);
  const isLow = timeLeft <= 10;
  const progPct = found / level.count;

  // ─────────────────────────────────────────────────────────────────────────────
  // Combo toast
  // ─────────────────────────────────────────────────────────────────────────────

  const showCombo = useCallback((text: string) => {
    setComboText(text);
    comboAnim.setValue(0);
    Animated.sequence([
      Animated.timing(comboAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.delay(500),
      Animated.timing(comboAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setComboText(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Timer shake
  // ─────────────────────────────────────────────────────────────────────────────

  const shakeLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const startShake = useCallback(() => {
    shakeLoopRef.current?.stop();
    shakeLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(timerShake, { toValue: 3, duration: 80, useNativeDriver: true }),
        Animated.timing(timerShake, { toValue: -3, duration: 80, useNativeDriver: true }),
        Animated.timing(timerShake, { toValue: 0, duration: 80, useNativeDriver: true }),
      ]),
    );
    shakeLoopRef.current.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopShake = useCallback(() => {
    shakeLoopRef.current?.stop();
    shakeLoopRef.current = null;
    timerShake.setValue(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Load level
  // ─────────────────────────────────────────────────────────────────────────────

  const handleRadar = useCallback(() => {
    if (radarUsed || radarCount <= 0 || screen !== "game") return;
    
    const success = consumeBoost("space_radar");
    if (!success) return;

    setRadarUsed(true);
    setRadarLeft(8);
  }, [radarUsed, radarCount, consumeBoost, screen]);

  const loadLevel = useCallback(
    (idx: number) => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopShake();

      const lvl = LEVELS[idx];
      const nums = shuffle(Array.from({ length: lvl.count }, (_, i) => i + 1));
      setNumbers(nums);
      setCellStates(Array(lvl.count).fill("idle" as CellState));
      setCurrent(1);
      setFound(0);
      setTimeLeft(lvl.timeLimit);
      setLevelIdx(idx);
      setRadarLeft(0);
    },
    [stopShake],
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Start game
  // ─────────────────────────────────────────────────────────────────────────────

  const startGame = useCallback(() => {
    if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    setScore(0);
    setLives(3);
    setCombo(0);
    setTotalSeconds(0);
    setRadarUsed(false);
    setRadarLeft(0);
    setScreen("game");
    loadLevel(0);

    totalTimerRef.current = setInterval(() => {
      setTotalSeconds((s) => s + 1);
    }, 1000);
  }, [loadLevel]);

  const navigateToGames = useCallback(() => {
    if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    setScreen("game");
    router.push("/games");
  }, [router]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Next level
  // ─────────────────────────────────────────────────────────────────────────────

  const nextLevel = useCallback(() => {
    const next = levelIdx + 1;
    if (next >= LEVELS.length) {
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
      const finalAcc = Math.round((lives / 3) * 100);
      const xpGain = Math.round(score / 10) + (finalAcc > 80 ? 25 : 0);
      addXP(xpGain);
      addIQScore(finalAcc);
      completeGameFlow(getFinalScore(score));
      setScreen("finalvictory");
      return;
    }
    setCombo(0);
    setScreen("game");
    loadLevel(next);
  }, [levelIdx, loadLevel, lives, score, addXP, addIQScore, completeGameFlow]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Game over
  // ─────────────────────────────────────────────────────────────────────────────

  const triggerGameOver = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    stopShake();
    setBestScore((prev) => Math.max(prev, score));
    const xpGain = Math.round(score / 10);
    addXP(xpGain);
    addIQScore(0);
    completeGameFlow(getFinalScore(score));
    setScreen("gameover");
  }, [stopShake, score, addXP, addIQScore, completeGameFlow]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Level timer
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (screen !== "game") return;
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [numbers, screen]);

  // ─────────────────────────────────────────────────────────────────────────────
  // React to timeLeft hitting 0
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (timeLeft === 0 && screen === "game") {
      triggerGameOver();
    }
  }, [timeLeft, screen, triggerGameOver]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Shake when low on time
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isLow && screen === "game") {
      startShake();
    } else {
      stopShake();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLow, screen]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Cell press handler
  // ─────────────────────────────────────────────────────────────────────────────

  const onCellPress = useCallback(
    (num: number, idx: number) => {
      if (screen !== "game") return;

      if (num === current) {
        // Correct!
        if (radarLeft > 0) setRadarLeft((r) => r - 1);
        const newCombo = combo + 1;
        const pts = 10 * newCombo;
        setCombo(newCombo);
        setScore((s) => s + pts);
        setFound((f) => {
          const newFound = f + 1;

          setCellStates((prev) => {
            const next = [...prev];
            next[idx] = "found";
            return next;
          });
          setCurrent(current + 1);

          if (newCombo >= 3) {
            showCombo(t("games.spaceFindNumber.combo", { combo: newCombo }));
          }

          if (newFound === level.count) {
            // Level complete
            if (timerRef.current) clearInterval(timerRef.current);
            stopShake();
            const timeBonus = timeLeft * 2;
            setScore((s) => {
              const finalScore = s + timeBonus;
              return finalScore;
            });
            const isLast = levelIdx >= LEVELS.length - 1;
            if (isLast && totalTimerRef.current) {
              clearInterval(totalTimerRef.current);
            }
            setTimeout(() => setScreen("win"), 600);
          }

          return newFound;
        });
      } else {
        // Wrong!
        setCombo(0);
        const newLives = lives - 1;
        setLives(newLives);

        setCellStates((prev) => {
          const next = [...prev];
          next[idx] = "wrong";
          return next;
        });

        setTimeout(() => {
          setCellStates((prev) => {
            const next = [...prev];
            if (next[idx] === "wrong") next[idx] = "idle";
            return next;
          });
        }, 400);

        if (newLives <= 0) {
          setTimeout(() => triggerGameOver(), 300);
        }
      }
    },
    [
      screen,
      current,
      combo,
      lives,
      level,
      levelIdx,
      timeLeft,
      showCombo,
      triggerGameOver,
      stopShake,
    ],
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Render cells as rows
  // ─────────────────────────────────────────────────────────────────────────────

  const rows = useMemo(() => {
    const result: { num: number; idx: number }[][] = [];
    for (let r = 0; r < numbers.length; r += level.size) {
      result.push(
        numbers.slice(r, r + level.size).map((num, col) => ({
          num,
          idx: r + col,
        })),
      );
    }
    return result;
  }, [numbers, level.size]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Hearts
  // ─────────────────────────────────────────────────────────────────────────────

  const heartsEl = useMemo(() => {
    return Array.from({ length: 3 }, (_, i) => (
      <Text key={i} style={[styles.heart, i >= lives && styles.heartLost]}>
        ❤️
      </Text>
    ));
  }, [lives]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* BG gradient */}
      <LinearGradient
        colors={["#030a1a", "#06112a", "#030a1a"]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Nebula overlay */}
      <LinearGradient
        colors={["transparent", "rgba(123,95,255,0.07)", "transparent"]}
        start={{ x: 0.2, y: 0.3 }}
        end={{ x: 0.8, y: 0.7 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <Starfield />

      <SafeAreaView style={styles.safe}>
        <View style={styles.app}>
          {/* ── Top bar ── */}
          <View style={styles.topbar}>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreBadgeText}>⭐ {score}</Text>
            </View>

            <Text style={styles.title}>{t("games.spaceFindNumber.title")}</Text>

            <TouchableOpacity
              style={[styles.radarBtn, (radarUsed || radarCount <= 0) && styles.radarBtnUsed]}
              onPress={handleRadar}
              disabled={radarUsed || radarCount <= 0}
            >
              <Text style={styles.radarEmoji}>📡</Text>
              <Text style={[styles.radarLabel, (radarUsed || radarCount <= 0) && styles.radarLabelUsed]}>
                {radarLeft > 0 ? `×${radarLeft}` : radarUsed ? t("games.spaceFindNumber.radarDepleted") : t("games.spaceFindNumber.radar")}
              </Text>
              {!radarUsed && radarCount > 0 && (
                <View style={styles.radarBadge}>
                  <Text style={styles.radarBadgeText}>{radarCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* ── HUD ── */}
          <View style={styles.hud}>
            {/* Lives */}
            <View style={styles.livesRow}>{heartsEl}</View>

            {/* Timer */}
            <Animated.Text
              style={[
                styles.timer,
                isLow && styles.timerDanger,
                { transform: [{ translateX: timerShake }] },
              ]}
            >
              {formatTime(timeLeft)}
            </Animated.Text>

            {/* Score */}
            <View style={styles.scoreWrap}>
              <Text style={styles.scoreLabel}>{t("games.spaceFindNumber.score")}</Text>
              <Text style={styles.score}>{score}</Text>
            </View>
          </View>

          {/* ── Progress bar ── */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: `${progPct * 100}%` as any },
              ]}
            />
          </View>

          {/* ── Total time ── */}
          <View style={styles.totalTimeRow}>
            <Text style={styles.totalTimeLabel}>{t("games.spaceFindNumber.totalTime")}</Text>
            <Text style={styles.totalTimeValue}>
              {formatTime(totalSeconds)}
            </Text>
          </View>

          {/* ── Find prompt ── */}
          <View style={styles.findPrompt}>
            <Text style={styles.findLabel}>{t("games.spaceFindNumber.findPlanet")}</Text>
            <Text style={styles.findNumber}>{current}</Text>
            <Text style={styles.levelBadge}>
              {t("games.spaceFindNumber.levelWithName", { level: levelIdx + 1, name: t(level.planetKey) })}
            </Text>
          </View>

          {/* ── Grid ── */}
          <View style={[styles.gridCard, { padding: GRID_PADDING }]}>
            {rows.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.gridRow}>
                {row.map(({ num, idx }) => (
                  <Cell
                    key={idx}
                    num={num}
                    state={cellStates[idx] ?? "idle"}
                    onPress={() => onCellPress(num, idx)}
                    size={cellSize}
                    isHighlighted={radarLeft > 0 && num === current}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>

      {/* ── Combo toast ── */}
      {comboText && (
        <Animated.View
          style={[
            styles.comboToast,
            {
              opacity: comboAnim,
              transform: [
                {
                  scale: comboAnim.interpolate({
                    inputRange: [0, 0.4, 1],
                    outputRange: [0.5, 1.15, 1],
                  }),
                },
                {
                  translateY: comboAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, -20],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.comboText}>{comboText}</Text>
        </Animated.View>
      )}

      {/* ── Start Screen ── */}
      <Modal visible={screen === "start"} transparent animationType="fade">
        <View style={styles.overlay}>
          <LinearGradient
            colors={["rgba(3,10,26,0.97)", "rgba(6,17,42,0.97)"]}
            style={StyleSheet.absoluteFillObject}
          />
          <Starfield />

          {/* Back button */}
          <TouchableOpacity
            style={[styles.start_backBtn, { top: insets.top + 12 }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color="#00ffe0" />
            <Text style={{ color: "#00ffe0", fontSize: 12, fontWeight: "700", marginLeft: 4 }}>
              {t("common.back")}
            </Text>
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={[
              styles.start_scrollContent,
              { paddingTop: insets.top + 64 },
            ]}
            showsVerticalScrollIndicator={false}
            style={{ width: "100%" }}
          >
            {/* Hero */}
            <Text style={styles.start_heroEmoji}>🚀</Text>
            <Text style={styles.start_title}>{t("games.spaceFindNumber.start.title")}</Text>
            <Text style={styles.start_subtitle}>
              {t("games.spaceFindNumber.start.subtitle")}
            </Text>

            {/* Description card */}
            <View style={styles.start_descCard}>
              {/* How to play */}
              <Text style={styles.start_descTitle}>{t("games.spaceFindNumber.start.howToPlayTitle")}</Text>
              <Text style={styles.start_descText}>
                {t("games.spaceFindNumber.start.howToPlayDesc")}
              </Text>

              <View style={styles.start_divider} />

              {/* Mechanics */}
              <Text style={styles.start_sectionTitle}>{t("games.spaceFindNumber.start.levelsTitle")}</Text>
              <View style={styles.start_mechRow}>
                <View
                  style={[styles.start_mechDot, { backgroundColor: "#00ffe0" }]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.start_mechName}>MERCURY — VENUS</Text>
                  <Text style={styles.start_mechDesc}>{t("games.spaceFindNumber.start.levelsEasy")}</Text>
                </View>
              </View>
              <View style={styles.start_mechRow}>
                <View
                  style={[styles.start_mechDot, { backgroundColor: "#7b5fff" }]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.start_mechName}>EARTH — MARS</Text>
                  <Text style={styles.start_mechDesc}>{t("games.spaceFindNumber.start.levelsMedium")}</Text>
                </View>
              </View>
              <View style={styles.start_mechRow}>
                <View
                  style={[styles.start_mechDot, { backgroundColor: "#ef4444" }]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.start_mechName}>JUPITER — NEPTUNE</Text>
                  <Text style={styles.start_mechDesc}>
                    {t("games.spaceFindNumber.start.levelsHard")}
                  </Text>
                </View>
              </View>

              <View style={styles.start_divider} />

              {/* Scoring */}
              <Text style={styles.start_sectionTitle}>{t("games.spaceFindNumber.start.scoringTitle")}</Text>
              <View style={styles.start_scoreRow}>
                <View
                  style={[
                    styles.start_scoreBadge,
                    { backgroundColor: "#00ffe0" },
                  ]}
                >
                  <Text style={[styles.start_scorePts, { color: "#030a1a" }]}>
                    ⚡
                  </Text>
                </View>
                <Text style={styles.start_scoreText}>
                  {t("games.spaceFindNumber.start.scoreCorrect")}
                </Text>
              </View>
              <View style={styles.start_scoreRow}>
                <View
                  style={[
                    styles.start_scoreBadge,
                    { backgroundColor: "#7b5fff" },
                  ]}
                >
                  <Text style={styles.start_scorePts}>🔥</Text>
                </View>
                <Text style={styles.start_scoreText}>
                  {t("games.spaceFindNumber.start.scoreCombo")}
                </Text>
              </View>
              <View style={styles.start_scoreRow}>
                <View
                  style={[
                    styles.start_scoreBadge,
                    { backgroundColor: "rgba(255,255,255,0.12)" },
                  ]}
                >
                  <Text style={styles.start_scorePts}>❤️</Text>
                </View>
                <Text style={styles.start_scoreText}>{t("games.spaceFindNumber.start.scoreLives")}</Text>
              </View>
            </View>

            {/* Feature boxes */}
            <View style={styles.start_featureRow}>
              {[
                { emoji: "🪐", label: t("games.spaceFindNumber.start.featureLevels") },
                { emoji: "⏱️", label: t("games.spaceFindNumber.start.featureTimer") },
                { emoji: "❤️", label: t("games.spaceFindNumber.start.featureLives") },
                { emoji: "🌟", label: t("games.spaceFindNumber.start.featureCombo") },
              ].map((f) => (
                <View key={f.label} style={styles.start_featureBox}>
                  <Text style={styles.start_featureEmoji}>{f.emoji}</Text>
                  <Text style={styles.start_featureLabel}>{f.label}</Text>
                </View>
              ))}
            </View>

            {/* Play button */}
            <TouchableOpacity
              style={styles.start_playBtn}
              onPress={startGame}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#7b5fff", "#00ffe0"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.start_playBtnGrad}
              >
                <Text style={styles.start_playBtnText}>{t("games.spaceFindNumber.start.playBtn")}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Win Screen ── */}
      <Modal visible={screen === "win"} transparent animationType="fade">
        <View style={styles.overlay}>
          <LinearGradient
            colors={["rgba(3,10,26,0.97)", "rgba(6,17,42,0.97)"]}
            style={StyleSheet.absoluteFillObject}
          />
          <Starfield />
          <Text style={[styles.rocketEmoji, { fontSize: 62 }]}>🏆</Text>
          <Text style={[styles.screenTitle, styles.screenTitleWin]}>
            {t("games.spaceFindNumber.winTitle")}
          </Text>
          <Text style={styles.screenSub}>{t("games.spaceFindNumber.winSub")}</Text>
          <Text style={styles.screenScore}>{score}</Text>
          <Text style={styles.screenTimeText}>
            {t("games.spaceFindNumber.totalTimeInline")}{" "}
            <Text style={styles.screenTimeVal}>{formatTime(totalSeconds)}</Text>
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={nextLevel}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#7b5fff", "#00ffe0"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGrad}
            >
              <Text style={styles.primaryBtnText}>{t("games.spaceFindNumber.nextBtn")}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Game Over Screen ── */}
      <Modal visible={screen === "gameover"} transparent animationType="fade">
        <View style={styles.overlay}>
          <LinearGradient
            colors={["rgba(3,10,26,0.97)", "rgba(6,17,42,0.97)"]}
            style={StyleSheet.absoluteFillObject}
          />
          <Starfield />
          <Text style={[styles.rocketEmoji, { fontSize: 62 }]}>💥</Text>
          <Text style={[styles.screenTitle, styles.screenTitleLose]}>
            {t("games.spaceFindNumber.gameOverTitle")}
          </Text>

          <View style={styles.statsRowComparison}>
            <View style={styles.statBoxComparison}>
              <View style={styles.statIconWrap}>
                <Ionicons name="trophy-outline" size={16} color="#00ffe0" />
              </View>
              <Text style={[styles.statNumComparison, { color: "#00ffe0" }]}>
                {Math.max(bestScore, score)}
              </Text>
              <Text style={styles.statLabelComparison}>{t("games.spaceFindNumber.best")}</Text>
            </View>
            <View style={styles.statBoxComparison}>
              <View style={styles.statIconWrap}>
                <Ionicons name="person-outline" size={16} color="#ff4d4d" />
              </View>
              <Text style={[styles.statNumComparison, { color: "#ff4d4d" }]}>
                {score}
              </Text>
              <Text style={styles.statLabelComparison}>{t("games.spaceFindNumber.yourRecord")}</Text>
            </View>
          </View>

          <Text style={styles.screenSub}>{t("games.spaceFindNumber.levelScore", { level: levelIdx + 1 })}</Text>
          <Text style={styles.screenScore}>{score}</Text>
          <Text style={styles.screenTimeText}>
            {t("games.spaceFindNumber.totalTimeInline")}{" "}
            <Text style={styles.screenTimeVal}>{formatTime(totalSeconds)}</Text>
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={startGame}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#7b5fff", "#00ffe0"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGrad}
            >
              <Text style={styles.primaryBtnText}>{t("games.spaceFindNumber.retryShort")}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={navigateToGames}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#7b5fff", "#00ffe0"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGrad}
            >
              <Text style={styles.primaryBtnText}>{t("games.spaceFindNumber.home")}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Final Victory Screen ── */}
      <Modal
        visible={screen === "finalvictory"}
        transparent
        animationType="fade"
      >
        <View style={styles.overlay}>
          <LinearGradient
            colors={["rgba(3,10,26,0.97)", "rgba(6,17,42,0.97)"]}
            style={StyleSheet.absoluteFillObject}
          />
          <Starfield />
          <Text style={[styles.rocketEmoji, { fontSize: 70 }]}>🌌</Text>
          <Text style={[styles.screenTitle, styles.screenTitleWin]}>
            {t("games.spaceFindNumber.finalTitle")}
          </Text>
          <Text style={styles.screenSub}>{t("games.spaceFindNumber.finalSub")}</Text>
          <Text style={styles.screenScore}>{score}</Text>
          <Text style={styles.screenTimeText}>
            {t("games.spaceFindNumber.totalTimeInline")}{" "}
            <Text style={styles.screenTimeVal}>{formatTime(totalSeconds)}</Text>
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={startGame}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#7b5fff", "#00ffe0"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGrad}
            >
              <Text style={styles.primaryBtnText}>{t("games.spaceFindNumber.retry")}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <RetryBoostButton
            hasRetry={hasRetry}
            retryCount={retryCount}
            onPress={() => activateRetry(score, startGame)}
            style={{ width: "100%", marginTop: 8 }}
          />
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#030a1a",
  },
  safe: {
    flex: 1,
  },
  app: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },

  // ── Top bar ──────────────────────────────────────────────────────────────────
  topbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    color: "#00ffe0",
    letterSpacing: 2,
    flex: 1,
    textAlign: "center",
  },
  scoreBadge: {
    backgroundColor: "rgba(255,215,0,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scoreBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffd700",
  },

  // ── HUD ──────────────────────────────────────────────────────────────────────
  hud: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,255,224,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,255,224,0.14)",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  livesRow: {
    flexDirection: "row",
    gap: 4,
  },
  heart: {
    fontSize: 22,
  },
  heartLost: {
    opacity: 0.25,
  },
  timer: {
    fontSize: 26,
    fontWeight: "700",
    color: "#00ffe0",
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
  timerDanger: {
    color: "#ff3250",
  },
  scoreWrap: {
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: 9,
    letterSpacing: 2,
    color: "rgba(255,255,255,0.4)",
  },
  score: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffd700",
  },

  // ── Progress ─────────────────────────────────────────────────────────────────
  progressTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: "#00ffe0",
  },

  // ── Total time ───────────────────────────────────────────────────────────────
  totalTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(123,95,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(123,95,255,0.18)",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  totalTimeLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: "rgba(255,255,255,0.4)",
  },
  totalTimeValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7b5fff",
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },

  // ── Find prompt ──────────────────────────────────────────────────────────────
  findPrompt: {
    backgroundColor: "rgba(123,95,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(123,95,255,0.35)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  findLabel: {
    fontSize: 11,
    letterSpacing: 3,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 2,
  },
  findNumber: {
    fontSize: 42,
    fontWeight: "900",
    color: "#fff",
    lineHeight: 52,
  },
  levelBadge: {
    fontSize: 10,
    letterSpacing: 2,
    color: "#ffd700",
    opacity: 0.8,
  },

  // ── Grid ─────────────────────────────────────────────────────────────────────
  gridCard: {
    backgroundColor: "rgba(10,30,70,0.6)",
    borderWidth: 1,
    borderColor: "rgba(0,255,224,0.1)",
    borderRadius: 18,
    gap: 7,
    flex: 1,
    justifyContent: "center",
  },
  gridRow: {
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
  },

  // ── Cell ─────────────────────────────────────────────────────────────────────
  cell: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cellIdle: {
    backgroundColor: "rgba(10,30,70,0.75)",
    borderColor: "rgba(0,255,224,0.14)",
  },
  cellFound: {
    backgroundColor: "rgba(0,255,160,0.18)",
    borderColor: "rgba(0,255,160,0.55)",
  },
  cellWrong: {
    backgroundColor: "rgba(255,50,80,0.28)",
    borderColor: "#ff3250",
  },
  cellHighlighted: {
    backgroundColor: "rgba(255,215,0,0.22)",
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  cellText: {
    fontWeight: "700",
    color: "#e8f4ff",
  },
  cellTextFound: {
    fontWeight: "700",
    color: "rgba(0,255,160,0.55)",
  },
  cellTextWrong: {
    fontWeight: "700",
    color: "#ff3250",
  },

  // ── Combo toast ───────────────────────────────────────────────────────────────
  comboToast: {
    position: "absolute",
    alignSelf: "center",
    top: "45%",
    zIndex: 300,
    pointerEvents: "none" as any,
  },
  comboText: {
    fontSize: 30,
    fontWeight: "900",
    color: "#ffd700",
    letterSpacing: 2,
    textAlign: "center",
  },

  // ── Overlay screens ───────────────────────────────────────────────────────────
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  rocketEmoji: {
    fontSize: 62,
  },
  screenTitle: {
    fontSize: 40,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 46,
    letterSpacing: 2,
  },
  screenTitleStart: {
    color: "#7b5fff",
  },
  screenTitleWin: {
    color: "#00ffe0",
  },
  screenTitleLose: {
    color: "#ff3250",
  },
  statsRowComparison: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    marginTop: 10,
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 30,
  },
  statBoxComparison: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  statNumComparison: { fontSize: 26, fontWeight: "900", lineHeight: 28 },
  statLabelComparison: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: "rgba(255,255,255,0.5)",
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
  screenSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
    letterSpacing: 2,
    textAlign: "center",
  },
  screenScore: {
    fontSize: 44,
    fontWeight: "900",
    color: "#ffd700",
  },
  screenTimeText: {
    fontSize: 13,
    letterSpacing: 1,
    color: "rgba(255,255,255,0.5)",
  },
  screenTimeVal: {
    color: "#7b5fff",
    fontWeight: "700",
  },

  // ── Features row ─────────────────────────────────────────────────────────────
  featuresRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    maxWidth: 320,
  },
  featurePill: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  featurePillText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 1,
  },

  // ── Primary button ────────────────────────────────────────────────────────────
  primaryBtn: {
    borderRadius: 50,
    overflow: "hidden",
    marginTop: 4,
  },
  primaryBtnGrad: {
    paddingHorizontal: 44,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 3,
    color: "#030a1a",
  },

  // ── Start screen (new) ────────────────────────────────────────────────────────
  start_backBtn: {
    position: "absolute",
    left: 16,
    paddingHorizontal: 10,
    height: 40,
    borderRadius: 12,
    paddingRight: 2,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(0,255,224,0.2)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    flexDirection: "row",
  },
  start_scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    alignItems: "center",
  },
  start_heroEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  start_title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#00ffe0",
    letterSpacing: 2,
    marginBottom: 8,
    textAlign: "center",
  },
  start_subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  start_descCard: {
    width: "100%",
    backgroundColor: "rgba(10,20,50,0.85)",
    borderWidth: 1,
    borderColor: "rgba(0,255,224,0.12)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  start_descTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  start_descText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 20,
    marginBottom: 4,
  },
  start_divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginVertical: 14,
  },
  start_sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 10,
  },
  start_mechRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  start_mechDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  start_mechName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  start_mechDesc: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 17,
  },
  start_scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  start_scoreBadge: {
    minWidth: 40,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
  },
  start_scorePts: {
    fontSize: 13,
    fontWeight: "900",
    color: "#fff",
  },
  start_scoreText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    flex: 1,
  },
  start_featureRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginBottom: 20,
  },
  start_featureBox: {
    flex: 1,
    backgroundColor: "rgba(10,20,50,0.85)",
    borderWidth: 1,
    borderColor: "rgba(0,255,224,0.12)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
  },
  start_featureEmoji: {
    fontSize: 20,
  },
  start_featureLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.45)",
    fontWeight: "600",
    textAlign: "center",
  },
  start_playBtn: {
    width: "100%",
    borderRadius: 50,
    overflow: "hidden",
  },
  start_playBtnGrad: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  // Radar boost
  radarBtn: {
    backgroundColor: "rgba(255,215,0,0.12)",
    borderWidth: 1.5,
    borderColor: "#FFD700",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    gap: 1,
  },
  radarBtnUsed: {
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
    opacity: 0.4,
  },
  radarEmoji: { fontSize: 16 },
  radarLabel: { color: "#FFD700", fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  radarLabelUsed: { color: "rgba(255,255,255,0.3)" },
  radarBadge: {
    position: "absolute",
    top: -7,
    right: -7,
    backgroundColor: "#FFD700",
    borderRadius: 9,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  radarBadgeText: { color: "#030a1a", fontSize: 9, fontWeight: "900" },

  start_playBtnText: {
    color: "#030a1a",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 3,
  },
});
