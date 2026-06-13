import SafeAreaWrapper from "@/components/shared/safe-area-wrapper";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { storage } from "@/store/mmkv";
import {
  Animated,
  Dimensions,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBoostsInventory } from "@/store/boosts-inventory";
import { useRetryBoost } from "@/hooks/use-retry-boost";
import RetryBoostButton from "@/components/shared/retry-boost-button";
import { useUserStats } from "@/store/user-stats";
import { ChallengesModule } from "@/services/modules/challenges-module";
import { GamesModule } from "@/services/modules/games-module";

const { width: SCREEN_W } = Dimensions.get("window");

const LETTERS = "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЫЭЮЯ".split("");

const LEVELS = [
  { levelKey: "games.findLetter.levels.easy", cols: 3, total: 9, time: 20 },
  { levelKey: "games.findLetter.levels.medium", cols: 3, total: 12, time: 24 },
  { levelKey: "games.findLetter.levels.hard", cols: 4, total: 16, time: 28 },
  { levelKey: "games.findLetter.levels.expert", cols: 4, total: 20, time: 32 },
  { levelKey: "games.findLetter.levels.master", cols: 5, total: 25, time: 34 },
];

const COLORS = {
  bg: "#080e1f",
  panel: "rgba(255,255,255,0.05)",
  border: "rgba(255,255,255,0.10)",
  accent: "#c8a96e",
  accent2: "#7eb8f7",
  danger: "#e05c6a",
  green: "#6edba8",
  text: "#f0ece4",
  muted: "rgba(240,236,228,0.4)",
};

const TOTAL_ROUNDS = 12;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildRound(level: (typeof LEVELS)[0]) {
  const answer = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const others = shuffle(LETTERS.filter((l) => l !== answer)).slice(
    0,
    level.total - 2,
  );
  return { answer, letters: shuffle([answer, answer, ...others]) };
}

const LIVES_ICONS = ["💔", "❤️", "❤️❤️", "❤️❤️❤️"];

// ─── Letter Button ────────────────────────────────────────────────────────────
type BtnState = "idle" | "correct" | "wrong";

function LetterBtn({
  letter,
  state,
  onPress,
  disabled,
  size,
  highlighted,
}: {
  letter: string;
  state: BtnState;
  onPress: () => void;
  disabled: boolean;
  size: number;
  highlighted?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (disabled) return;
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.84,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  const stateStyle =
    state === "correct"
      ? styles.lbtnCorrect
      : state === "wrong"
        ? styles.lbtnWrong
        : highlighted
          ? styles.lbtnHighlighted
          : styles.lbtnIdle;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={handlePress}
        disabled={disabled}
        style={[styles.lbtn, { width: size, height: size }, stateStyle]}
      >
        <Text style={[styles.lbtnText, { fontSize: size * 0.38 }]}>
          {letter}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FindTheLetter() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { dayId, gameId, challengeDayGameId } = useLocalSearchParams();
  const [screen, setScreen] = useState<"start" | "game" | "gameover">("start");
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [lives, setLives] = useState(3);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [roundData, setRoundData] = useState(() => buildRound(LEVELS[0]));
  const [timeLeft, setTimeLeft] = useState(LEVELS[0].time);
  const [maxTime, setMaxTime] = useState(LEVELS[0].time);
  const [busy, setBusy] = useState(false);
  const [btnStates, setBtnStates] = useState<BtnState[]>(() =>
    Array(LEVELS[0].total).fill("idle"),
  );
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(
    null,
  );
  const [gameOver, setGameOver] = useState<{ won: boolean } | null>(null);

  const { useBoost: consumeBoost } = useBoostsInventory();
  const { addXP, addIQScore } = useUserStats();
  const boostCount = useBoostsInventory((state) => state.inventory["find_letter_hint"] ?? 0);
  const { retryCount, hasRetry, activateRetry, getFinalScore } = useRetryBoost();
  const [hintActive, setHintActive] = useState(false);
  const [boostsUsed, setBoostsUsed] = useState(0);

  const [bestScore, setBestScore] = useState<number>(() => {
    return storage.getNumber("fl_bestScore") ?? 0;
  });

  useEffect(() => {
    const handleEnd = async () => {
      if (gameOver) {
        if (score > bestScore) {
          setBestScore(score);
          storage.set("fl_bestScore", score);
        }
        const finalAcc = TOTAL_ROUNDS > 0 ? Math.round((correct / TOTAL_ROUNDS) * 100) : 0;
        const xpGain = Math.round(score / 10) + (finalAcc > 80 ? 25 : 0);
        addXP(xpGain);
        addIQScore(finalAcc);

        const submitScore = getFinalScore(score);
        (async () => {
          try {
            if (challengeDayGameId) {
              const res = await ChallengesModule.completeDayGame(
                challengeDayGameId as string,
                submitScore,
              );
              if (res?.dayCompleted) {
                Alert.alert(t("games.common.congratsTitle"), t("games.common.allDayGamesDone"));
              }
            } else {
              const response = await GamesModule.completeGame(
                (gameId as string) || "3",
              );
              if (response.dayCompleted) {
                Alert.alert(t("games.common.challengeTitle"), t("games.common.dayFinished"));
              }
            }

            if (dayId && !challengeDayGameId) {
              await ChallengesModule.submitDayScore(dayId as string, submitScore);
            }
          } catch (error) {
            console.error("Failed to complete game/submit score:", error);
          }
        })();
      }
    };
    handleEnd();
  }, [gameOver, score, bestScore, dayId, gameId, challengeDayGameId, addXP, addIQScore]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const timerBarAnim = useRef(new Animated.Value(1)).current;

  const level = LEVELS[Math.min(Math.floor(round / 2), LEVELS.length - 1)];
  const gridW = SCREEN_W - 32 - 28; // screen - padding - card padding
  const cellSize = Math.floor((gridW - (level.cols - 1) * 6) / level.cols);

  // ── Animate feedback banner ─────────────────────────────────────────────────
  const showFeedback = (msg: string, ok: boolean) => {
    setFeedback({ msg, ok });
    feedbackAnim.setValue(0);
    Animated.timing(feedbackAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  // ── Timer bar animation ─────────────────────────────────────────────────────
  const animateTimerBar = (from: number, to: number, duration: number) => {
    timerBarAnim.setValue(from);
    Animated.timing(timerBarAnim, {
      toValue: to,
      duration,
      useNativeDriver: false,
    }).start();
  };

  // ── Hint boost ───────────────────────────────────────────────────────────────
  const handleHint = useCallback(() => {
    if (boostCount <= 0 || busy || screen !== "game" || boostsUsed >= 2) return;
    
    const success = consumeBoost("find_letter_hint");
    if (!success) return;

    setBoostsUsed((c) => c + 1);
    setHintActive(true);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHintActive(false), 3000);
  }, [boostCount, busy, screen, consumeBoost, boostsUsed]);

  // ── Start a round ────────────────────────────────────────────────────────────
  const startRound = useCallback((roundNum: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setHintActive(false);
    const lvl = LEVELS[Math.min(Math.floor(roundNum / 2), LEVELS.length - 1)];
    const data = buildRound(lvl);
    setRoundData(data);
    setTimeLeft(lvl.time);
    setMaxTime(lvl.time);
    setBtnStates(Array(lvl.total).fill("idle"));
    setFeedback(null);
    setBusy(false);
    animateTimerBar(1, 0, lvl.time * 1000);
  }, []);

  // ── Initialize first round ────────────────────────────────────────────────────
  useEffect(() => {
    startRound(0);
  }, []);

  // ── Timer tick ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "game" || busy || gameOver) return;
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
  }, [screen, roundData, busy, gameOver]);

  // ── Handle time up ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "game") return;
    if (timeLeft === 0 && !busy && !gameOver) handleTimeUp();
  }, [timeLeft, screen]);

  const handleTimeUp = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setBusy(true);
    setBtnStates((prev) =>
      prev.map((_, i) =>
        roundData.letters[i] === roundData.answer ? "correct" : "idle",
      ),
    );
    showFeedback(t("games.findLetter.feedback.timeUp", { answer: roundData.answer }), false);
    setStreak(0);
    setScore((s) => Math.max(0, s - 50));

    setLives((prev) => {
      const next = prev - 1;
      setRound((r) => {
        const nr = r + 1;
        if (next <= 0) {
          setTimeout(() => setGameOver({ won: false }), 1200);
        } else if (nr >= TOTAL_ROUNDS) {
          setTimeout(() => setGameOver({ won: true }), 1500);
        } else {
          setTimeout(() => startRound(nr), 1600);
        }
        return nr;
      });
      return next;
    });
  }, [roundData, startRound]);

  // ── Pick a letter ─────────────────────────────────────────────────────────────
  const pick = useCallback(
    (letter: string, idx: number) => {
      if (busy) return;
      if (timerRef.current) clearInterval(timerRef.current);
      setBusy(true);

      const isCorrect = letter === roundData.answer;

      setBtnStates((prev) =>
        prev.map((_, i) => {
          if (roundData.letters[i] === roundData.answer) return "correct";
          if (i === idx && !isCorrect) return "wrong";
          return "idle";
        }),
      );

      if (isCorrect) {
        setStreak((s) => {
          const ns = s + 1;
          setScore((sc) => {
            const bonus = Math.max(0, timeLeft) * 2;
            const sBonus = ns >= 3 ? 50 : 0;
            showFeedback(
              ns >= 3
                ? t("games.findLetter.feedback.correctStreak", { points: 100 + bonus, streak: ns })
                : t("games.findLetter.feedback.correct", { points: 100 + bonus }),
              true,
            );
            return sc + 100 + bonus + sBonus;
          });
          return ns;
        });
        setCorrect((c) => c + 1);
      } else {
        setStreak(0);
        setScore((s) => Math.max(0, s - 30));
        showFeedback(t("games.findLetter.feedback.wrong", { answer: roundData.answer }), false);
      }

      setLives((prev) => {
        const nl = isCorrect ? prev : prev - 1;
        setRound((r) => {
          const nr = r + 1;
          if (!isCorrect && nl <= 0) {
            setTimeout(() => setGameOver({ won: false }), 1200);
          } else if (nr >= TOTAL_ROUNDS) {
            setTimeout(() => setGameOver({ won: true }), 1500);
          } else {
            setTimeout(() => startRound(nr), 1500);
          }
          return nr;
        });
        return nl;
      });
    },
    [busy, roundData, timeLeft, startRound],
  );

  // ── Restart ───────────────────────────────────────────────────────────────────
  const restart = () => {
    setScore(0);
    setRound(0);
    setLives(3);
    setCorrect(0);
    setStreak(0);
    setGameOver(null);
    setFeedback(null);
    setBusy(false);
    setHintActive(false);
    setBoostsUsed(0);
    startRound(0);
  };

  const navigateToMain = useCallback(() => {
    setScore(0);
    setRound(0);
    setLives(3);
    setCorrect(0);
    setStreak(0);
    setGameOver(null);
    setFeedback(null);
    setBusy(false);
    setBoostsUsed(0);
    startRound(0);
    router.push("/games");
  }, [startRound]);

  // ── Start game from start screen ──────────────────────────────────────────────
  const startGame = () => {
    setScore(0);
    setRound(0);
    setLives(3);
    setCorrect(0);
    setStreak(0);
    setGameOver(null);
    setFeedback(null);
    setBusy(false);
    setHintActive(false);
    setBoostsUsed(0);
    startRound(0);
    setScreen("game");
  };

  const isLow = timeLeft <= 4;

  // ─────────────────────────────────────────────────────────────────────────────
  // ── Start Screen ─────────────────────────────────────────────────────────────
  if (screen === "start") {
    return (
      <SafeAreaWrapper
        header={
          <>
            <LinearGradient
              colors={["#0c1a2e", "#071222", "#0c1a2e"]}
              style={StyleSheet.absoluteFillObject}
            />
            {/* Back button */}
            <TouchableOpacity
              style={[start_styles.backBtn, { top: insets.top + 12 }]}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" color="#38bdf8" size={20} />
            </TouchableOpacity>
          </>
        }
      >
        <StatusBar barStyle="light-content" />

        <View style={start_styles.scrollContent}>
          {/* Hero emoji */}
          <Text style={start_styles.heroEmoji}>❄️</Text>

          {/* Title */}
          <Text style={start_styles.startTitle}>{t("games.findLetter.start.title")}</Text>

          {/* Subtitle */}
          <Text style={start_styles.startSubtitle}>
            {t("games.findLetter.start.subtitle")}
          </Text>

          {/* Main description card */}
          <View style={start_styles.infoCard}>
            {/* How to play */}
            <Text style={start_styles.infoCardHeading}>{t("games.findLetter.start.howTitle")}</Text>
            <Text style={start_styles.infoCardDesc}>
              {t("games.findLetter.start.howDesc")}
            </Text>

            {/* Divider */}
            <View style={start_styles.divider} />

            {/* Difficulty section */}
            <Text style={start_styles.mechanicsTitle}>{t("games.findLetter.start.difficultyTitle")}</Text>
            <View style={{ gap: 8, marginTop: 8 }}>
              <View style={start_styles.mechRow}>
                <View
                  style={[start_styles.dot, { backgroundColor: "#38bdf8" }]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={start_styles.mechRowTitle}>
                    {t("games.findLetter.start.difficulty.r14")}
                  </Text>
                  <Text style={start_styles.mechRowDesc}>
                    {t("games.findLetter.start.difficulty.r14Desc")}
                  </Text>
                </View>
              </View>
              <View style={start_styles.mechRow}>
                <View
                  style={[start_styles.dot, { backgroundColor: "#0ea5e9" }]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={start_styles.mechRowTitle}>
                    {t("games.findLetter.start.difficulty.r58")}
                  </Text>
                  <Text style={start_styles.mechRowDesc}>
                    {t("games.findLetter.start.difficulty.r58Desc")}
                  </Text>
                </View>
              </View>
              <View style={start_styles.mechRow}>
                <View
                  style={[start_styles.dot, { backgroundColor: "#ef4444" }]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={start_styles.mechRowTitle}>
                    {t("games.findLetter.start.difficulty.r912")}
                  </Text>
                  <Text style={start_styles.mechRowDesc}>
                    {t("games.findLetter.start.difficulty.r912Desc")}
                  </Text>
                </View>
              </View>
            </View>

            {/* Divider */}
            <View style={start_styles.divider} />

            {/* Scoring */}
            <Text style={start_styles.mechanicsTitle}>{t("games.findLetter.start.scoringTitle")}</Text>
            <View style={{ gap: 8, marginTop: 8 }}>
              <View style={start_styles.scoreRow}>
                <View
                  style={[
                    start_styles.scoreBadge,
                    {
                      backgroundColor: "rgba(56,189,248,0.2)",
                      borderColor: "rgba(56,189,248,0.5)",
                    },
                  ]}
                >
                  <Text
                    style={[start_styles.scoreBadgeText, { color: "#38bdf8" }]}
                  >
                    +10
                  </Text>
                </View>
                <Text style={start_styles.scoreRowDesc}>
                  {t("games.findLetter.start.scoring.perLetter")}
                </Text>
              </View>
              <View style={start_styles.scoreRow}>
                <View
                  style={[
                    start_styles.scoreBadge,
                    {
                      backgroundColor: "rgba(251,191,36,0.2)",
                      borderColor: "rgba(251,191,36,0.5)",
                    },
                  ]}
                >
                  <Text
                    style={[start_styles.scoreBadgeText, { color: "#fbbf24" }]}
                  >
                    ⏱️
                  </Text>
                </View>
                <Text style={start_styles.scoreRowDesc}>{t("games.findLetter.start.scoring.speedBonus")}</Text>
              </View>
              <View style={start_styles.scoreRow}>
                <View
                  style={[
                    start_styles.scoreBadge,
                    {
                      backgroundColor: "rgba(239,68,68,0.2)",
                      borderColor: "rgba(239,68,68,0.5)",
                    },
                  ]}
                >
                  <Text
                    style={[start_styles.scoreBadgeText, { color: "#fca5a5" }]}
                  >
                    ❤️
                  </Text>
                </View>
                <Text style={start_styles.scoreRowDesc}>
                  {t("games.findLetter.start.scoring.livesRule")}
                </Text>
              </View>
            </View>
          </View>

          {/* Features row */}
          <View style={start_styles.featuresRow}>
            {[
              { emoji: "🔤", label: t("games.findLetter.start.features.rounds") },
              { emoji: "❤️", label: t("games.findLetter.start.features.lives") },
              { emoji: "⏱️", label: t("games.findLetter.start.features.timer") },
              { emoji: "📈", label: t("games.findLetter.start.features.difficulty") },
            ].map((f) => (
              <View key={f.label} style={start_styles.featureBox}>
                <Text style={start_styles.featureEmoji}>{f.emoji}</Text>
                <Text style={start_styles.featureLabel}>{f.label}</Text>
              </View>
            ))}
          </View>

          {/* Start button */}
          <TouchableOpacity
            style={start_styles.startBtn}
            onPress={startGame}
            activeOpacity={0.85}
          >
            <Text style={start_styles.startBtnText}>{t("games.findLetter.start.startBtn")}</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </View>
      </SafeAreaWrapper>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#0c1a2e", "#071222", "#0c1a2e"]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaWrapper>
        <View style={styles.app}>
          {/* ── Top bar ── */}
          <View style={styles.topbar}>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreBadgeText}>⭐ {score}</Text>
            </View>

            <Text style={styles.title}>{t("games.findLetter.game.title")}</Text>

            <TouchableOpacity
              style={[
                styles.boostBtn,
                (boostCount <= 0 || boostsUsed >= 2) && styles.boostBtnUsed,
              ]}
              onPress={handleHint}
              disabled={boostCount <= 0 || boostsUsed >= 2}
            >
              <Text style={styles.boostEmoji}>🔍</Text>
              <Text
                style={[
                  styles.boostLabel,
                  (boostCount <= 0 || boostsUsed >= 2) && styles.boostLabelUsed,
                ]}
              >
                {boostsUsed >= 2
                  ? t("games.findLetter.game.hintDepleted")
                  : t("games.findLetter.game.hint")}
              </Text>
              {boostCount > 0 && boostsUsed < 2 && (
                <View style={styles.boostBadge}>
                  <Text style={styles.boostBadgeText}>{boostCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Stats row ── */}
          <View style={styles.statsRow}>
            {(
              [
                [t("games.findLetter.game.round"), String(Math.min(round + 1, TOTAL_ROUNDS))],
                [t("games.findLetter.game.correct"), String(correct)],
                [t("games.findLetter.game.lives"), LIVES_ICONS[Math.max(0, lives)]],
              ] as [string, string][]
            ).map(([lbl, val]) => (
              <View key={lbl} style={styles.statBox}>
                <Text style={styles.statLbl}>{lbl}</Text>
                <Text style={styles.statVal}>{val}</Text>
              </View>
            ))}
          </View>

          {/* ── Question card ── */}
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>
              {t("games.findLetter.game.questionPrefix")}{" "}
              <Text style={styles.questionHighlight}>{t("games.findLetter.game.questionHighlight")}</Text>?
            </Text>
            <Text style={styles.roundLbl}>
              {t("games.findLetter.game.roundProgress", {
                current: Math.min(round + 1, TOTAL_ROUNDS),
                total: TOTAL_ROUNDS,
                level: t(level.levelKey),
              })}
            </Text>
          </View>

          {/* ── Grid card ── */}
          <View style={styles.gridCard}>
            {/* ── Timer bar (NEW — inside grid card, full width) ── */}
            <View style={styles.timerRow}>
              <View style={styles.timerTrack}>
                <Animated.View
                  style={[
                    styles.timerFill,
                    {
                      width: timerBarAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0%", "100%"],
                      }),
                      backgroundColor: isLow ? "#ef4444" : "#38bdf8",
                      shadowColor: isLow ? "#ef4444" : "#38bdf8",
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.timerNum,
                  { color: isLow ? "#ef4444" : "#38bdf8" },
                ]}
              >
                {timeLeft}s
              </Text>
            </View>
            ,{""}
            {""}
            {/* ── Letter grid ── */}
            <View style={[styles.grid, { gap: 6 }]}>
              {Array.from({
                length: Math.ceil(roundData.letters.length / level.cols),
              }).map((_, row) => (
                <View key={row} style={styles.gridRow}>
                  {roundData.letters
                    .slice(row * level.cols, (row + 1) * level.cols)
                    .map((letter, col) => {
                      const idx = row * level.cols + col;
                      return (
                        <LetterBtn
                          key={idx}
                          letter={letter}
                          state={btnStates[idx] ?? "idle"}
                          onPress={() => pick(letter, idx)}
                          disabled={busy}
                          size={cellSize}
                          highlighted={
                            hintActive && letter === roundData.answer
                          }
                        />
                      );
                    })}
                </View>
              ))}
            </View>
          </View>

          {/* ── Feedback banner ── */}
          {feedback && (
            <Animated.View
              style={[
                styles.feedback,
                feedback.ok ? styles.feedbackOk : styles.feedbackBad,
                {
                  opacity: feedbackAnim,
                  transform: [
                    {
                      translateY: feedbackAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [8, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text
                style={[
                  styles.feedbackText,
                  feedback.ok ? styles.feedbackTextOk : styles.feedbackTextBad,
                ]}
              >
                {feedback.msg}
              </Text>
            </Animated.View>
          )}
        </View>
      </SafeAreaWrapper>

      {/* ── Game Over Modal ── */}
      <Modal visible={!!gameOver} transparent animationType="fade">
        <View style={styles.endOverlay}>
          <Text style={styles.endEmoji}>{gameOver?.won ? "🏆" : "💔"}</Text>
          <Text style={styles.endTitle}>
            {gameOver?.won
              ? t("games.findLetter.result.win")
              : t("games.findLetter.result.lose")}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <View style={styles.statIconWrap}>
                <Ionicons
                  name="trophy-outline"
                  size={16}
                  color={COLORS.green}
                />
              </View>
              <Text style={[styles.statNum, { color: COLORS.green }]}>
                {Math.max(bestScore, score)}
              </Text>
              <Text style={styles.statLabel}>{t("games.findLetter.result.best")}</Text>
            </View>
            <View style={styles.statBox}>
              <View style={styles.statIconWrap}>
                <Ionicons name="star-outline" size={16} color={COLORS.danger} />
              </View>
              <Text style={[styles.statNum, { color: COLORS.danger }]}>
                {score}
              </Text>
              <Text style={styles.statLabel}>{t("games.findLetter.result.score")}</Text>
            </View>
          </View>

          <Text style={styles.endScore}>{t("games.findLetter.result.scoreValue", { score })}</Text>
          <Text style={styles.endInfo}>
            {t("games.findLetter.result.summary", {
              correct,
              round,
              accuracy: round > 0 ? Math.round((correct / round) * 100) : 0,
              lives: Math.max(0, lives),
            })}
          </Text>
          <RetryBoostButton
            hasRetry={hasRetry}
            retryCount={retryCount}
            onPress={() => activateRetry(score, restart)}
            style={{ width: "100%", marginBottom: 8 }}
          />
          <TouchableOpacity
            style={styles.restartBtn}
            onPress={restart}
            activeOpacity={0.85}
          >
            <Text style={styles.restartBtnText}>{t("games.findLetter.result.tryAgain")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.restartBtn}
            onPress={navigateToMain}
            activeOpacity={0.85}
          >
            <Text style={styles.restartBtnText}>{t("games.findLetter.result.back")}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

// ─── Start Screen Styles ──────────────────────────────────────────────────────
const start_styles = StyleSheet.create({
  backBtn: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 12,
    paddingRight: 2,
    backgroundColor: "rgba(56,189,248,0.15)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.3)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  scrollContent: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  heroEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  startTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#38bdf8",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 8,
  },
  startSubtitle: {
    fontSize: 15,
    color: "#7dd3fc",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 22,
  },
  infoCard: {
    backgroundColor: "#071830",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.22)",
    marginBottom: 20,
    width: "100%",
  },
  infoCardHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: "#f0f9ff",
    marginBottom: 8,
  },
  infoCardDesc: {
    fontSize: 13,
    color: "#7dd3fc",
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginVertical: 16,
  },
  mechanicsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#f0f9ff",
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
  },
  mechRowTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#e0f2fe",
  },
  mechRowDesc: {
    fontSize: 12,
    color: "#7dd3fc",
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
  scoreRowDesc: {
    fontSize: 13,
    color: "#7dd3fc",
    flex: 1,
  },
  featuresRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginBottom: 28,
  },
  featureBox: {
    flex: 1,
    backgroundColor: "#071830",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.18)",
    paddingVertical: 12,
    alignItems: "center",
    gap: 6,
  },
  featureEmoji: {
    fontSize: 22,
  },
  featureLabel: {
    fontSize: 10,
    color: "#7dd3fc",
    fontWeight: "700",
    textAlign: "center",
  },
  startBtn: {
    backgroundColor: "#38bdf8",
    paddingVertical: 16,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
    shadowColor: "#38bdf8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  startBtnText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0c1a2e",
    letterSpacing: 2,
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0c1a2e" },
  app: { flex: 1, paddingHorizontal: 16, paddingBottom: 24, gap: 10 },

  // Topbar
  topbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 18,
    backgroundColor: "rgba(56,189,248,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(125,211,252,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#38bdf8",
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    color: "#38bdf8",
    letterSpacing: 1,
    flex: 1,
    textAlign: "center",
  },
  scoreBadge: {
    backgroundColor: "rgba(251,191,36,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(251,191,36,0.45)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  scoreBadgeText: { fontSize: 14, fontWeight: "900", color: "#fbbf24" },

  // Stats
  statsRow: { flexDirection: "row", gap: 8 },
  statBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1.5,
    borderColor: "rgba(125,211,252,0.18)",
    borderRadius: 14,
    paddingVertical: 9,
    alignItems: "center",
  },
  statLbl: {
    fontSize: 9,
    color: "#7dd3fc",
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  statVal: { fontSize: 18, fontWeight: "900", color: "#f0f9ff" },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statNum: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#fafafa",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#a1a1aa",
    marginTop: 4,
    letterSpacing: 1,
  },

  // Round progress
  progTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 99,
    overflow: "hidden",
  },
  progFill: { height: "100%", borderRadius: 99, backgroundColor: "#0ea5e9" },

  // Question
  questionCard: {
    backgroundColor: "rgba(14,165,233,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(125,211,252,0.3)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  questionText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#f0f9ff",
    textAlign: "center",
    lineHeight: 24,
  },
  questionHighlight: { color: "#fbbf24" },
  roundLbl: { marginTop: 6, fontSize: 10, color: "#7dd3fc", fontWeight: "700" },

  // Grid card
  gridCard: {
    backgroundColor: "#071830",
    borderWidth: 2,
    borderColor: "rgba(125,211,252,0.25)",
    borderRadius: 20,
    padding: 14,
    gap: 12,
  },

  // ── Timer bar (new style) ──
  timerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  timerTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(125,211,252,0.1)",
    borderRadius: 99,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.15)",
  },
  timerFill: {
    height: "100%",
    borderRadius: 99,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  timerNum: {
    fontSize: 13,
    fontWeight: "900",
    minWidth: 30,
    textAlign: "right",
  },

  // Grid
  grid: { gap: 6 },
  gridRow: { flexDirection: "row", gap: 6 },

  // Letter buttons
  lbtn: {
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  lbtnIdle: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(125,211,252,0.15)",
  },
  lbtnHighlighted: {
    backgroundColor: "rgba(77,150,255,0.25)",
    borderColor: "#4D96FF",
    shadowColor: "#4D96FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  lbtnCorrect: {
    backgroundColor: "rgba(34,197,94,0.25)",
    borderColor: "#22c55e",
  },
  lbtnWrong: {
    backgroundColor: "rgba(239,68,68,0.22)",
    borderColor: "#ef4444",
  },
  lbtnText: { fontWeight: "900", color: "#e0f2fe" },

  // Feedback
  feedback: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
  },
  feedbackOk: {
    backgroundColor: "rgba(34,197,94,0.18)",
    borderColor: "rgba(34,197,94,0.45)",
  },
  feedbackBad: {
    backgroundColor: "rgba(239,68,68,0.16)",
    borderColor: "rgba(239,68,68,0.4)",
  },
  feedbackText: { fontSize: 13, fontWeight: "800", textAlign: "center" },
  feedbackTextOk: { color: "#86efac" },
  feedbackTextBad: { color: "#fca5a5" },

  // End screen
  endOverlay: {
    flex: 1,
    backgroundColor: "rgba(7,24,48,0.97)",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    padding: 30,
  },
  endEmoji: { fontSize: 60 },
  endTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#fbbf24",
    textAlign: "center",
  },
  endScore: { fontSize: 22, fontWeight: "900", color: "#fbbf24" },
  endInfo: {
    fontSize: 13,
    color: "#7dd3fc",
    lineHeight: 24,
    textAlign: "center",
  },
  restartBtn: {
    backgroundColor: "#0ea5e9",
    borderRadius: 99,
    paddingHorizontal: 38,
    paddingVertical: 15,
    marginTop: 8,
  },
  restartBtnText: { color: "#fff", fontSize: 15, fontWeight: "900" },

  // Boost
  boostBtn: {
    backgroundColor: "rgba(77,150,255,0.12)",
    borderWidth: 1.5,
    borderColor: "#4D96FF",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    gap: 1,
  },
  boostBtnUsed: {
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
    opacity: 0.4,
  },
  boostEmoji: { fontSize: 14 },
  boostLabel: {
    color: "#4D96FF",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  boostLabelUsed: { color: "rgba(255,255,255,0.3)" },
  boostBadge: {
    position: "absolute",
    top: -7,
    right: -7,
    backgroundColor: "#4D96FF",
    borderRadius: 9,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  boostBadgeText: { color: "#fff", fontSize: 9, fontWeight: "900" },
});
