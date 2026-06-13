import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useBoostsInventory } from "@/store/boosts-inventory";
import { useRetryBoost } from "@/hooks/use-retry-boost";
import RetryBoostButton from "@/components/shared/retry-boost-button";
import { useUserStats } from "@/store/user-stats";
import {
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  FlatList,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import { ChallengesModule } from "@/services/modules/challenges-module";
import { GamesModule } from "@/services/modules/games-module";

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const COLORS = {
  bg: "#070410",
  neon: "#00ffb3",
  danger: "#ff2255",
  gold: "#ffe600",
  blue: "#00b3ff",
  white: "#ffffff",
  dark1: "#0e0b1e",
  dark2: "#12102a",
  border: "rgba(0,255,179,0.18)",
};

const EMOJI_POOL = [
  "🦊",
  "🐸",
  "🌊",
  "🔥",
  "⭐",
  "🍕",
  "🎮",
  "🚀",
  "💎",
  "🌈",
  "🦁",
  "🐬",
  "🌙",
  "❄️",
  "🎯",
  "🍎",
  "🌸",
  "🎪",
  "🦋",
  "🐙",
  "🍦",
  "🏆",
  "🎸",
  "🌵",
  "🦄",
  "🐲",
  "🍀",
  "🎭",
  "💡",
  "🔮",
  "🦅",
  "🐝",
  "🎃",
  "🌍",
  "🍄",
  "🎨",
  "🐠",
  "🦞",
  "🎱",
  "💥",
  "🧲",
  "🦜",
  "🍋",
  "🌺",
  "🐧",
  "🎲",
  "🦀",
  "🌻",
  "🍇",
  "🎠",
  "🐱",
  "🐭",
  "🐹",
  "🐰",
  "🐻",
  "🐼",
  "🐨",
  "🐯",
  "🐮",
  "🐷",
  "🦝",
  "🦡",
  "🦦",
  "🦥",
  "🦨",
  "🦔",
  "🐿",
  "🦫",
  "🦬",
  "🦙",
];

const PHASE_TARGETS = [1, 2, 3];
const PHASE_ROUND_TIMES = [8000, 9000, 10000];
const TOTAL_GAME_TIME = 80000; // ms
const REVEAL_TIME = 900; // ms
const GRID_SIZE = 36;
const COLS = 6;
const GRID_PADDING = 16;
const CELL_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2) / COLS;

type Screen = "start" | "game" | "result";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getPhaseIndex(elapsed: number): number {
  if (elapsed < 30000) return 0;
  if (elapsed < 60000) return 1;
  return 2;
}

function getRank(accuracy: number, t: (key: string) => string): string {
  if (accuracy >= 95) return t("games.shadowGame.rank.telepath");
  if (accuracy >= 80) return t("games.shadowGame.rank.lightning");
  if (accuracy >= 65) return t("games.shadowGame.rank.reflex");
  if (accuracy >= 50) return t("games.shadowGame.rank.shooter");
  return t("games.shadowGame.rank.newbie");
}

// ─── Score Pop Component ───────────────────────────────────────────────────────

interface ScorePopProps {
  value: string;
  color?: string;
}

const ScorePop: React.FC<ScorePopProps> = ({ value, color = COLORS.neon }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -60,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.Text
      style={[styles.scorePop, { color, opacity, transform: [{ translateY }] }]}
    >
      {value}
    </Animated.Text>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ShadowGame() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { dayId, gameId, challengeDayGameId } = useLocalSearchParams();

  // ── Boost: reveal ─────────────────────────────────────────────────────────
  const { useBoost: consumeBoost } = useBoostsInventory();
  const { addXP, addIQScore } = useUserStats();
  const revealCount = useBoostsInventory((state) => state.inventory["shadow_reveal"] ?? 0);
  const { retryCount, hasRetry, activateRetry, getFinalScore } = useRetryBoost();
  const [revealUsedThisGame, setRevealUsedThisGame] = useState(0);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<Screen>("start");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [globalProgress, setGlobalProgress] = useState(0);
  const [roundProgress, setRoundProgress] = useState(1);
  const [displayEmojis, setDisplayEmojis] = useState<string[]>([]);
  const [showingTargets, setShowingTargets] = useState(false);
  const [currentTargets, setCurrentTargets] = useState<string[]>([]);
  const [foundEmojis, setFoundEmojis] = useState<Set<string>>(new Set());
  const [scorePops, setScorePops] =
    useState<{ id: number; value: string; color: string }[]>();
  const [flashColor, setFlashColor] = useState<string>(COLORS.danger);

  // ── Result state ──────────────────────────────────────────────────────────
  const [resultScore, setResultScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [globalBest, setGlobalBest] = useState(18500);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [resultAccuracy, setResultAccuracy] = useState(0);
  const [resultMaxCombo, setResultMaxCombo] = useState(0);
  const [resultRounds, setResultRounds] = useState(0);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const correctRef = useRef(0);
  const wrongRef = useRef(0);
  const roundRef = useRef(0);
  const elapsedRef = useRef(0);
  const gameRunning = useRef(false);
  const locked = useRef(false);
  const targets = useRef<string[]>([]);
  const found = useRef<Set<string>>(new Set());
  const roundStartRef = useRef(0);
  const gameStartRef = useRef(0);
  const globalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextRoundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const popIdRef = useRef(0);

  // ── Animated values ───────────────────────────────────────────────────────
  const flashOpacity = useRef(new Animated.Value(0)).current;

  // ── Cleanup ───────────────────────────────────────────────────────────────
  const clearAll = useCallback(() => {
    if (globalTimerRef.current) clearInterval(globalTimerRef.current);
    if (roundTimerRef.current) clearInterval(roundTimerRef.current);
    if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);
    globalTimerRef.current = null;
    roundTimerRef.current = null;
    revealTimeoutRef.current = null;
    nextRoundTimeoutRef.current = null;
  }, []);

  useEffect(() => {
    return () => clearAll();
  }, [clearAll]);

  // ── Flash overlay ─────────────────────────────────────────────────────────
  const triggerFlash = useCallback(
    (color: string) => {
      setFlashColor(color);
      flashOpacity.setValue(0.45);
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    },
    [flashOpacity],
  );

  // ── Score pop ─────────────────────────────────────────────────────────────
  const addScorePop = useCallback((value: string, color: string) => {
    const id = popIdRef.current++;
    setScorePops((prev) => [...(prev ?? []), { id, value, color }]);
    setTimeout(() => {
      setScorePops((prev) => (prev ?? []).filter((p) => p.id !== id));
    }, 1000);
  }, []);

  // ── End game ──────────────────────────────────────────────────────────────
  const endGame = useCallback(async () => {
    if (!gameRunning.current) return;
    gameRunning.current = false;
    clearAll();

    const totalAttempts = correctRef.current + wrongRef.current;
    const accuracy =
      totalAttempts === 0
        ? 0
        : Math.round((correctRef.current / totalAttempts) * 100);

    const finalScore = getFinalScore(scoreRef.current);
    const isNew = finalScore > bestScore;
    if (isNew) {
      setBestScore(finalScore);
      setIsNewRecord(true);
      if (finalScore > globalBest) {
        setGlobalBest(finalScore);
      }
    } else {
      setIsNewRecord(false);
    }

    const xpGain = Math.round(finalScore / 10) + (accuracy > 80 ? 25 : 0);
    addXP(xpGain);
    addIQScore(accuracy);

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
            (gameId as string) || 10
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
    setResultAccuracy(accuracy);
    setResultMaxCombo(maxComboRef.current);
    setResultRounds(roundRef.current);
    setScreen("result");
  }, [clearAll, bestScore, globalBest, addXP, addIQScore, dayId, gameId]);

  // ── Next round ────────────────────────────────────────────────────────────
  const startNextRound = useCallback(() => {
    if (!gameRunning.current) return;

    if (roundTimerRef.current) clearInterval(roundTimerRef.current);
    roundTimerRef.current = null;

    const elapsed = elapsedRef.current;
    const phaseIdx = getPhaseIndex(elapsed);
    const targetCount = PHASE_TARGETS[phaseIdx];
    const phaseName = (phaseIdx + 1) as 1 | 2 | 3;

    roundRef.current += 1;
    setRound(roundRef.current);
    setPhase(phaseName);

    // Build grid
    const shuffled = shuffleArray(EMOJI_POOL);
    const selected36 = shuffled.slice(0, GRID_SIZE);
    const roundTargets = selected36.slice(0, targetCount);
    const rest = selected36.slice(targetCount);
    const gridEmojis = shuffleArray([...roundTargets, ...rest]);

    targets.current = roundTargets;
    found.current = new Set();

    setCurrentTargets(roundTargets);
    setFoundEmojis(new Set());
    setDisplayEmojis(gridEmojis);
    setRoundProgress(1);

    locked.current = true;

    // Reveal targets
    setShowingTargets(true);
    revealTimeoutRef.current = setTimeout(() => {
      if (!gameRunning.current) return;
      setShowingTargets(false);
      locked.current = false;

      // Start round timer
      const phaseDur = PHASE_ROUND_TIMES[phaseIdx];
      roundStartRef.current = Date.now();

      roundTimerRef.current = setInterval(() => {
        if (!gameRunning.current) {
          if (roundTimerRef.current) clearInterval(roundTimerRef.current);
          return;
        }
        const roundElapsed = Date.now() - roundStartRef.current;
        const progress = Math.max(0, 1 - roundElapsed / phaseDur);
        setRoundProgress(progress);

        if (roundElapsed >= phaseDur) {
          // Timeout
          if (roundTimerRef.current) clearInterval(roundTimerRef.current);
          roundTimerRef.current = null;

          if (!gameRunning.current) return;
          locked.current = true;
          wrongRef.current += 1;
          comboRef.current = 0;
          setCombo(0);
          livesRef.current = Math.max(0, livesRef.current - 1);
          setLives(livesRef.current);
          triggerFlash(COLORS.danger);

          if (livesRef.current <= 0) {
            nextRoundTimeoutRef.current = setTimeout(() => endGame(), 850);
          } else {
            nextRoundTimeoutRef.current = setTimeout(() => {
              locked.current = false;
              startNextRound();
            }, 850);
          }
        }
      }, 100);
    }, REVEAL_TIME);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endGame, triggerFlash]);

  // ── Start game ────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    clearAll();

    // Reset all refs
    scoreRef.current = 0;
    livesRef.current = 3;
    comboRef.current = 0;
    maxComboRef.current = 0;
    correctRef.current = 0;
    wrongRef.current = 0;
    roundRef.current = 0;
    elapsedRef.current = 0;
    gameRunning.current = true;
    locked.current = false;
    targets.current = [];
    found.current = new Set();

    // Reset state
    setScore(0);
    setLives(3);
    setCombo(0);
    setRound(0);
    setPhase(1);
    setGlobalProgress(0);
    setRoundProgress(1);
    setDisplayEmojis([]);
    setShowingTargets(false);
    setCurrentTargets([]);
    setFoundEmojis(new Set());
    setScorePops([]);
    setRevealUsedThisGame(0);
    flashOpacity.setValue(0);

    gameStartRef.current = Date.now();
    setScreen("game");

    // Global timer
    globalTimerRef.current = setInterval(() => {
      if (!gameRunning.current) {
        if (globalTimerRef.current) clearInterval(globalTimerRef.current);
        return;
      }
      const now = Date.now();
      const elapsed = now - gameStartRef.current;
      elapsedRef.current = elapsed;
      const progress = Math.min(1, elapsed / TOTAL_GAME_TIME);
      setGlobalProgress(progress);

      const phaseIdx = getPhaseIndex(elapsed);
      setPhase((phaseIdx + 1) as 1 | 2 | 3);

      if (elapsed >= TOTAL_GAME_TIME) {
        if (globalTimerRef.current) clearInterval(globalTimerRef.current);
        globalTimerRef.current = null;
        endGame();
      }
    }, 200);

    // Start first round after small delay
    nextRoundTimeoutRef.current = setTimeout(() => {
      startNextRound();
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearAll, endGame, flashOpacity]);

  // Need to set up startNextRound reference after startGame definition
  // Attach startNextRound to ref so endGame/startGame can call latest version
  const startNextRoundRef = useRef(startNextRound);
  useEffect(() => {
    startNextRoundRef.current = startNextRound;
  }, [startNextRound]);

  // ── Handle tap on grid cell ───────────────────────────────────────────────
  const handleCellPress = useCallback(
    (emoji: string) => {
      if (!gameRunning.current || locked.current) return;

      const phaseIdx = getPhaseIndex(elapsedRef.current);
      const phaseDur = PHASE_ROUND_TIMES[phaseIdx];
      const roundElapsed = Date.now() - roundStartRef.current;

      if (targets.current.includes(emoji) && !found.current.has(emoji)) {
        // Correct
        found.current.add(emoji);
        setFoundEmojis(new Set(found.current));
        correctRef.current += 1;

        const allFound = targets.current.every((t) => found.current.has(t));

        if (allFound) {
          // Round complete
          if (roundTimerRef.current) clearInterval(roundTimerRef.current);
          roundTimerRef.current = null;
          locked.current = true;

          comboRef.current += 1;
          if (comboRef.current > maxComboRef.current) {
            maxComboRef.current = comboRef.current;
          }

          const targetCount = PHASE_TARGETS[phaseIdx];
          const speedBonus = Math.round(
            Math.max(0, 1 - roundElapsed / phaseDur) * 30,
          );
          const roundScore =
            10 * targetCount + speedBonus + (comboRef.current - 1) * 7;
          scoreRef.current += roundScore;
          setScore(scoreRef.current);
          setCombo(comboRef.current);

          triggerFlash(COLORS.neon);
          addScorePop(`+${roundScore}`, COLORS.neon);

          nextRoundTimeoutRef.current = setTimeout(() => {
            if (!gameRunning.current) return;
            locked.current = false;
            startNextRoundRef.current();
          }, 500);
        }
      } else if (!targets.current.includes(emoji)) {
        // Wrong tap
        locked.current = true;
        wrongRef.current += 1;
        comboRef.current = 0;
        setCombo(0);
        livesRef.current = Math.max(0, livesRef.current - 1);
        setLives(livesRef.current);
        triggerFlash(COLORS.danger);

        if (roundTimerRef.current) clearInterval(roundTimerRef.current);
        roundTimerRef.current = null;

        if (livesRef.current <= 0) {
          nextRoundTimeoutRef.current = setTimeout(() => endGame(), 850);
        } else {
          nextRoundTimeoutRef.current = setTimeout(() => {
            if (!gameRunning.current) return;
            locked.current = false;
            startNextRoundRef.current();
          }, 850);
        }
      }
    },
    [addScorePop, endGame, triggerFlash],
  );

  // ── Phase badge ───────────────────────────────────────────────────────────
  const getPhaseBadge = () => {
    if (phase === 1) return { label: t("games.shadowGame.phaseBadge.one"), color: COLORS.neon };
    if (phase === 2) return { label: t("games.shadowGame.phaseBadge.two"), color: COLORS.gold };
    return { label: t("games.shadowGame.phaseBadge.three"), color: COLORS.danger };
  };

  // ── Render cells ──────────────────────────────────────────────────────────
  const renderCell = useCallback(
    ({ item }: { item: string }) => {
      const isTarget = targets.current.includes(item);
      const isFound = foundEmojis.has(item);

      return (
        <TouchableWithoutFeedback onPress={() => handleCellPress(item)}>
          <View style={[styles.gridCell, isFound && styles.gridCellFound]}>
            <Text style={styles.gridEmoji}>{item}</Text>
          </View>
        </TouchableWithoutFeedback>
      );
    },
    [foundEmojis, handleCellPress],
  );

  const keyExtractor = useCallback(
    (item: string, index: number) => `${item}-${index}`,
    [],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Start Screen
  // ─────────────────────────────────────────────────────────────────────────

  if (screen === "start") {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

        {/* Back button */}
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 12 }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={COLORS.neon} />
        </TouchableOpacity>

        <View style={styles.startContent}>
          <Text style={styles.startTitle}>{t("games.shadowGame.start.title")}</Text>
          <Text style={styles.startSubtitle}>{t("games.shadowGame.start.subtitle")}</Text>

          <View style={styles.startDescCard}>
            <Text style={styles.startDescText}>
              {t("games.shadowGame.start.desc")}
            </Text>

            <View style={styles.startDivider} />

            <View style={styles.startPhasesList}>
              <View style={styles.startPhaseRow}>
                <View
                  style={[
                    styles.startPhaseDot,
                    { backgroundColor: COLORS.neon },
                  ]}
                />
                <Text style={[styles.startPhaseText, { color: COLORS.neon }]}>
                  {t("games.shadowGame.start.phase1")}
                </Text>
              </View>
              <View style={styles.startPhaseRow}>
                <View
                  style={[
                    styles.startPhaseDot,
                    { backgroundColor: COLORS.gold },
                  ]}
                />
                <Text style={[styles.startPhaseText, { color: COLORS.gold }]}>
                  {t("games.shadowGame.start.phase2")}
                </Text>
              </View>
              <View style={styles.startPhaseRow}>
                <View
                  style={[
                    styles.startPhaseDot,
                    { backgroundColor: COLORS.danger },
                  ]}
                />
                <Text style={[styles.startPhaseText, { color: COLORS.danger }]}>
                  {t("games.shadowGame.start.phase3")}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.playBtn}
            onPress={startGame}
            activeOpacity={0.8}
          >
            <Text style={styles.playBtnText}>{t("games.shadowGame.start.playBtn")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Result Screen
  // ─────────────────────────────────────────────────────────────────────────

  if (screen === "result") {
    const rank = getRank(resultAccuracy, t);
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        <View style={styles.resultContent}>
          <Text style={styles.resultRank}>{rank}</Text>
          <Text style={styles.resultScore}>{resultScore}</Text>
          <Text style={styles.resultScoreLabel}>{t("games.shadowGame.result.points")}</Text>

          {isNewRecord && (
            <View style={styles.recordBadge}>
              <Text style={styles.recordText}>{t("games.shadowGame.result.newRecord")}</Text>
            </View>
          )}

          <View style={styles.statsRowComparison}>
            <View style={styles.statBoxComparison}>
              <View style={styles.statIconWrap}>
                <Ionicons name="globe-outline" size={16} color="#00ffb3" />
              </View>
              <Text style={[styles.statNumComparison, { color: "#00ffb3" }]}>
                {globalBest}
              </Text>
              <Text style={styles.statLabelComparison}>{t("games.shadowGame.result.best")}</Text>
            </View>
            <View style={styles.statBoxComparison}>
              <View style={styles.statIconWrap}>
                <Ionicons name="trophy-outline" size={16} color={COLORS.gold} />
              </View>
              <Text style={[styles.statNumComparison, { color: COLORS.gold }]}>
                {Math.max(resultScore, bestScore)}
              </Text>
              <Text style={styles.statLabelComparison}>{t("games.shadowGame.result.myBest")}</Text>
            </View>
            <View style={styles.statBoxComparison}>
              <View style={styles.statIconWrap}>
                <Ionicons name="person-outline" size={16} color="#ff4d4d" />
              </View>
              <Text style={[styles.statNumComparison, { color: "#ff4d4d" }]}>
                {resultScore}
              </Text>
              <Text style={styles.statLabelComparison}>{t("games.shadowGame.result.current")}</Text>
            </View>
          </View>

          <View style={styles.resultStatsRow}>
            <View style={styles.resultStat}>
              <View style={styles.statIconWrap}>
                <Ionicons
                  name="stats-chart-outline"
                  size={16}
                  color="#00ffb3"
                />
              </View>
              <Text style={styles.resultStatValue}>{resultAccuracy}%</Text>
              <Text style={styles.resultStatLabel}>{t("games.shadowGame.result.accuracy")}</Text>
            </View>
            <View style={styles.resultStatDivider} />
            <View style={styles.resultStat}>
              <View style={styles.statIconWrap}>
                <Ionicons name="flash-outline" size={16} color="#00ffb3" />
              </View>
              <Text style={styles.resultStatValue}>×{resultMaxCombo}</Text>
              <Text style={styles.resultStatLabel}>{t("games.shadowGame.result.maxCombo")}</Text>
            </View>
            <View style={styles.resultStatDivider} />
            <View style={styles.resultStat}>
              <View style={styles.statIconWrap}>
                <Ionicons name="layers-outline" size={16} color="#00ffb3" />
              </View>
              <Text style={styles.resultStatValue}>{resultRounds}</Text>
              <Text style={styles.resultStatLabel}>{t("games.shadowGame.result.rounds")}</Text>
            </View>
          </View>

          <View style={styles.resultBtnsRow}>
            <TouchableOpacity
              style={[styles.resultBtn, styles.resultBtnPrimary]}
              onPress={startGame}
              activeOpacity={0.8}
            >
              <Text style={styles.resultBtnPrimaryText}>
                {t("games.shadowGame.result.tryAgain")}
              </Text>
            </TouchableOpacity>
            <RetryBoostButton
              hasRetry={hasRetry}
              retryCount={retryCount}
              onPress={() => activateRetry(scoreRef.current, startGame)}
              style={{ marginTop: 8, width: "100%" }}
            />
            <TouchableOpacity
              style={[styles.resultBtn, styles.resultBtnSecondary]}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={styles.resultBtnSecondaryText}>{t("games.shadowGame.result.menu")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Game Screen
  // ─────────────────────────────────────────────────────────────────────────

  const phaseBadge = getPhaseBadge();

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Flash overlay */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: flashColor, opacity: flashOpacity, zIndex: 999 },
        ]}
      />

      {/* Score pops */}
      <View pointerEvents="none" style={styles.scorePopContainer}>
        {(scorePops ?? []).map((p) => (
          <ScorePop key={p.id} value={p.value} color={p.color} />
        ))}
      </View>

      {/* HUD */}
      <View style={styles.hud}>
        <View style={styles.hudLeft}>
          <Text style={styles.hudScore}>{score}</Text>
          {combo > 1 && <Text style={styles.hudCombo}>{t("games.shadowGame.combo", { combo })}</Text>}
        </View>

        <TouchableOpacity
          style={[
            styles.revealBtn,
            (revealCount === 0 || revealUsedThisGame >= 2) &&
              styles.revealBtnDepleted,
          ]}
          onPress={() => {
            if (
              revealCount <= 0 ||
              revealUsedThisGame >= 2 ||
              showingTargets ||
              !gameRunning.current
            )
              return;
            
            const success = consumeBoost("shadow_reveal");
            if (!success) return;

            setRevealUsedThisGame((c) => c + 1);
            setShowingTargets(true);
            setTimeout(() => {
              if (gameRunning.current) setShowingTargets(false);
            }, REVEAL_TIME);
          }}
          disabled={revealCount === 0 || revealUsedThisGame >= 2}
          activeOpacity={0.75}
        >
          <Text style={styles.revealBtnEmoji}>👁️</Text>
          {revealUsedThisGame < 2 && revealCount > 0 && (
            <View style={styles.revealBadge}>
              <Text style={styles.revealBadgeText}>{revealCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.hudCenter}>
          <Text style={[styles.hudPhaseBadge, { color: phaseBadge.color }]}>
            {phaseBadge.label}
          </Text>
        </View>
        <View style={styles.hudRight}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.liveDot,
                i < lives
                  ? { backgroundColor: COLORS.neon }
                  : { backgroundColor: "rgba(255,34,85,0.25)" },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Global progress bar */}
      <View style={styles.globalBarTrack}>
        <View
          style={[styles.globalBarFill, { width: `${globalProgress * 100}%` }]}
        />
      </View>

      {/* Round timer bar */}
      <View style={styles.roundBarTrack}>
        <Animated.View
          style={[
            styles.roundBarFill,
            {
              width: `${roundProgress * 100}%`,
              backgroundColor:
                roundProgress < 0.25 ? COLORS.danger : COLORS.blue,
            },
          ]}
        />
      </View>

      {/* Target boxes */}
      <View style={styles.targetArea}>
        {currentTargets.map((emoji, idx) => {
          const isFound = foundEmojis.has(emoji);
          return (
            <View
              key={`target-${idx}`}
              style={[
                styles.targetBox,
                showingTargets && styles.targetBoxRevealed,
                isFound && styles.targetBoxFound,
              ]}
            >
              {showingTargets || isFound ? (
                <Text style={styles.targetEmoji}>{emoji}</Text>
              ) : (
                <View style={styles.targetHidden}>
                  <Text style={styles.targetHiddenText}>?</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Emoji grid */}
      <View style={styles.gridContainer}>
        <FlatList
          data={displayEmojis}
          renderItem={renderCell}
          keyExtractor={keyExtractor}
          numColumns={COLS}
          scrollEnabled={false}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // ── Start ────────────────────────────────────────────────────────────────
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 12,
    paddingRight: 2,
    backgroundColor: "rgba(0,255,179,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,255,179,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    color: COLORS.neon,
    fontSize: 16,
    fontWeight: "600",
    shadowColor: COLORS.neon,
    shadowRadius: 6,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 0 },
  },
  startContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  startTitle: {
    fontSize: 64,
    fontWeight: "900",
    color: COLORS.neon,
    letterSpacing: 10,
    shadowColor: COLORS.neon,
    shadowRadius: 20,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 0 },
    marginBottom: 6,
  },
  startSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 28,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  startDescCard: {
    backgroundColor: "rgba(0,255,179,0.04)",
    borderColor: "rgba(0,255,179,0.15)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 28,
    width: "100%",
    gap: 14,
  },
  startDescText: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
  },
  startDivider: {
    height: 1,
    backgroundColor: "rgba(0,255,179,0.1)",
  },
  startPhasesList: {
    gap: 8,
  },
  startPhaseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  startPhaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  startPhaseText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  playBtn: {
    backgroundColor: COLORS.neon,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 60,
    shadowColor: COLORS.neon,
    shadowRadius: 18,
    shadowOpacity: 0.7,
    shadowOffset: { width: 0, height: 0 },
  },
  playBtnText: {
    color: COLORS.bg,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 3,
  },

  // ── HUD ──────────────────────────────────────────────────────────────────
  hud: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,255,179,0.1)",
  },
  hudLeft: {
    flex: 1,
    alignItems: "flex-start",
  },
  hudScore: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: "800",
  },
  hudCombo: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    shadowColor: COLORS.gold,
    shadowRadius: 6,
    shadowOpacity: 0.8,
    shadowOffset: { width: 0, height: 0 },
  },
  hudCenter: {
    flex: 2,
    alignItems: "center",
  },
  hudPhaseBadge: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textAlign: "center",
    shadowRadius: 8,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 0 },
  },
  hudRight: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 5,
  },
  liveDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    shadowColor: COLORS.neon,
    shadowRadius: 4,
    shadowOpacity: 0.9,
    shadowOffset: { width: 0, height: 0 },
  },

  // ── Progress bars ─────────────────────────────────────────────────────────
  globalBarTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    width: "100%",
  },
  globalBarFill: {
    height: 4,
    backgroundColor: COLORS.neon,
    shadowColor: COLORS.neon,
    shadowRadius: 4,
    shadowOpacity: 0.7,
    shadowOffset: { width: 0, height: 0 },
  },
  roundBarTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.04)",
    width: "100%",
    marginBottom: 8,
  },
  roundBarFill: {
    height: 4,
    shadowRadius: 4,
    shadowOpacity: 0.7,
    shadowOffset: { width: 0, height: 0 },
  },

  // ── Target area ───────────────────────────────────────────────────────────
  targetArea: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 80,
  },
  targetBox: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1.5,
    borderColor: "rgba(0,255,179,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  targetBoxRevealed: {
    borderColor: COLORS.neon,
    backgroundColor: "rgba(0,255,179,0.08)",
    shadowColor: COLORS.neon,
    shadowRadius: 12,
    shadowOpacity: 0.8,
    shadowOffset: { width: 0, height: 0 },
  },
  targetBoxFound: {
    borderColor: COLORS.neon,
    backgroundColor: "rgba(0,255,179,0.12)",
    shadowColor: COLORS.neon,
    shadowRadius: 10,
    shadowOpacity: 0.9,
    shadowOffset: { width: 0, height: 0 },
  },
  targetEmoji: {
    fontSize: 34,
  },
  targetHidden: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: "rgba(0,255,179,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  targetHiddenText: {
    color: "rgba(0,255,179,0.3)",
    fontSize: 22,
    fontWeight: "900",
  },

  // ── Grid ─────────────────────────────────────────────────────────────────
  gridContainer: {
    flex: 1,
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 8,
  },
  gridContent: {
    gap: 4,
  },
  gridRow: {
    gap: 4,
    justifyContent: "space-between",
  },
  gridCell: {
    width: CELL_SIZE - 4,
    height: CELL_SIZE - 4,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  gridCellFound: {
    backgroundColor: "rgba(0,255,179,0.1)",
    borderColor: COLORS.neon,
    shadowColor: COLORS.neon,
    shadowRadius: 8,
    shadowOpacity: 0.7,
    shadowOffset: { width: 0, height: 0 },
  },
  gridEmoji: {
    fontSize: CELL_SIZE * 0.42,
  },

  // ── Score pop ─────────────────────────────────────────────────────────────
  scorePopContainer: {
    position: "absolute",
    top: "35%",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 500,
    pointerEvents: "none",
  },
  scorePop: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1,
    shadowRadius: 12,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 0 },
    position: "absolute",
  },

  // ── Result ────────────────────────────────────────────────────────────────
  resultContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  resultRank: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.neon,
    letterSpacing: 3,
    marginBottom: 8,
    textTransform: "uppercase",
    shadowColor: COLORS.neon,
    shadowRadius: 14,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 0 },
  },
  resultScore: {
    fontSize: 80,
    fontWeight: "900",
    color: COLORS.white,
    lineHeight: 88,
  },
  resultScoreLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 24,
  },
  statsRowComparison: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    justifyContent: "center",
    width: "100%",
  },
  statBoxComparison: {
    flex: 1,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  statNumComparison: { fontSize: 20, fontWeight: "900", lineHeight: 24 },
  statLabelComparison: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
  recordBadge: {
    backgroundColor: COLORS.gold,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 20,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  recordText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1.5,
  },
  resultStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    paddingHorizontal: 12,
    width: "100%",
    marginBottom: 32,
    gap: 8,
  },
  resultStat: {
    flex: 1,
    alignItems: "center",
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  resultStatValue: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.white,
  },
  resultStatLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 2,
    fontWeight: "700",
  },
  resultStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(0,255,179,0.15)",
  },
  resultBtnsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  resultBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  resultBtnPrimary: {
    backgroundColor: COLORS.neon,
    shadowColor: COLORS.neon,
    shadowRadius: 14,
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 0 },
  },
  resultBtnPrimaryText: {
    color: COLORS.bg,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  resultBtnSecondary: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  resultBtnSecondaryText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    fontWeight: "700",
  },
  revealBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(0,255,179,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,255,179,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  revealBtnDepleted: {
    opacity: 0.3,
  },
  revealBtnEmoji: {
    fontSize: 20,
  },
  revealBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.neon,
    alignItems: "center",
    justifyContent: "center",
  },
  revealBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: COLORS.bg,
  },
});
