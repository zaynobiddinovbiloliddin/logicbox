import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChallengesModule } from "@/services/modules/challenges-module";
import { GamesModule } from "@/services/modules/games-module";
import {
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import {
  GEOGRAPHY_QUESTIONS,
  GeographyQuestion,
} from "../../../constants/geography-questions";
import { storage } from "../../../store/mmkv";
import { useBoostsInventory } from "@/store/boosts-inventory";
import { useRetryBoost } from "@/hooks/use-retry-boost";
import RetryBoostButton from "@/components/shared/retry-boost-button";
import { useUserStats } from "@/store/user-stats";

const { width } = Dimensions.get("window");

// Colors
const C = {
  bg: "#050a14",
  card: "#0d1826",
  card2: "#111f33",
  blue: "#00c8ff",
  gold: "#ffd700",
  green: "#00ff88",
  red: "#ff4466",
  purple: "#a855f7",
  text: "#e8f4ff",
  muted: "#7090b0",
  border: "rgba(0,200,255,0.15)",
};

type Screen = "start" | "game" | "result" | "db";

interface GameHistory {
  score: number;
  correct: number;
  date: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function GeographyQuiz() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const CATEGORIES = useMemo(() => [
    { id: "all", name: t("games.geographyQuiz.categories.all"), emoji: "🌐" },
    { id: "capitals", name: t("games.geographyQuiz.categories.capitals"), emoji: "🏛️" },
    { id: "flags", name: t("games.geographyQuiz.categories.flags"), emoji: "🚩" },
    { id: "continents", name: t("games.geographyQuiz.categories.continents"), emoji: "🗺️" },
    { id: "oceans", name: t("games.geographyQuiz.categories.oceans"), emoji: "🌊" },
    { id: "countries", name: t("games.geographyQuiz.categories.countries"), emoji: "🌍" },
    { id: "mountains", name: t("games.geographyQuiz.categories.mountains"), emoji: "⛰️" },
    { id: "rivers", name: t("games.geographyQuiz.categories.rivers"), emoji: "🏞️" },
    { id: "geography", name: t("games.geographyQuiz.categories.geography"), emoji: "🧭" },
    { id: "food", name: t("games.geographyQuiz.categories.food"), emoji: "🍜" },
    { id: "customs", name: t("games.geographyQuiz.categories.customs"), emoji: "🎎" },
  ], [t]);

  const CAT_NAMES: Record<string, string> = useMemo(() => ({
    capitals: t("games.geographyQuiz.catNames.capitals"),
    flags: t("games.geographyQuiz.catNames.flags"),
    continents: t("games.geographyQuiz.catNames.continents"),
    oceans: t("games.geographyQuiz.catNames.oceans"),
    countries: t("games.geographyQuiz.catNames.countries"),
    mountains: t("games.geographyQuiz.catNames.mountains"),
    rivers: t("games.geographyQuiz.catNames.rivers"),
    geography: t("games.geographyQuiz.catNames.geography"),
    food: t("games.geographyQuiz.catNames.food"),
    customs: t("games.geographyQuiz.catNames.customs"),
  }), [t]);
  const { dayId, gameId, challengeDayGameId } = useLocalSearchParams();
  const [screen, setScreen] = useState<Screen>("start");
  const [selectedCat, setSelectedCat] = useState("all");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "easy",
  );

  // Game state
  const [gamePool, setGamePool] = useState<GeographyQuestion[]>([]);
  const gamePoolRef = useRef<GeographyQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const currentIdxRef = useRef(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [answered, setAnswered] = useState(false);
  const answeredRef = useRef(false);
  const [selectedAns, setSelectedAns] = useState<number | null>(null);
  const [shuffledAns, setShuffledAns] = useState<
    { text: string; idx: number }[]
  >([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerMax, setTimerMax] = useState(30);
  const [gameReview, setGameReview] = useState<
    { q: GeographyQuestion; chosen: number; correct: boolean }[]
  >([]);
  const { useBoost: consumeBoost } = useBoostsInventory();
  const { addXP, addIQScore } = useUserStats();
  const boostCount = useBoostsInventory((state) => state.inventory["geo_50_50"] ?? 0);
  const { retryCount, hasRetry, activateRetry, getFinalScore } = useRetryBoost();
  const [eliminatedIdxs, setEliminatedIdxs] = useState<number[]>([]);
  const [boostsUsed, setBoostsUsed] = useState(0);

  // Persistent stats
  const [bestScore, setBestScore] = useState(0);
  const [globalBest, setGlobalBest] = useState(21000);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [history, setHistory] = useState<GameHistory[]>([]);

  // DB screen state
  const [dbSearch, setDbSearch] = useState("");
  const [dbFilterCat, setDbFilterCat] = useState("all");
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const timerAnim = useRef(new Animated.Value(0)).current;
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadStats();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadStats = () => {
    const saved = storage.getString("geography_quiz_stats");
    if (saved) {
      const parsed = JSON.parse(saved);
      setBestScore(parsed.bestScore || 0);
      setGamesPlayed(parsed.gamesPlayed || 0);
      setHistory(parsed.history || []);
    }
  };

  const saveStats = (newScore: number, newCorrect: number) => {
    const isNew = newScore > bestScore;
    const newBest = Math.max(bestScore, newScore);
    const newPlayed = gamesPlayed + 1;
    const newHistory = [
      { score: newScore, correct: newCorrect, date: Date.now() },
      ...history,
    ].slice(0, 10);

    setBestScore(newBest);
    setIsNewRecord(isNew);
    if (newScore > globalBest) {
      setGlobalBest(newScore);
    }
    setGamesPlayed(newPlayed);
    setHistory(newHistory);

    storage.set(
      "geography_quiz_stats",
      JSON.stringify({
        bestScore: newBest,
        gamesPlayed: newPlayed,
        history: newHistory,
      }),
    );
  };

  const startGame = () => {
    let pool = [...GEOGRAPHY_QUESTIONS];
    if (selectedCat !== "all") {
      pool = pool.filter((q) => q.cat === selectedCat);
    }
    if (pool.length < 12) pool = [...GEOGRAPHY_QUESTIONS]; // fallback if not enough questions

    const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, 12);
    gamePoolRef.current = shuffled;
    setGamePool(shuffled);
    currentIdxRef.current = 0;
    setCurrentIdx(0);
    setScore(0);
    setStreak(0);
    setCorrect(0);
    setWrong(0);
    setGameReview([]);
    setEliminatedIdxs([]);
    setBoostsUsed(0);
    setIsNewRecord(false);
    setScreen("game");
    loadQuestion(shuffled[0], 0);
  };

  const handleBoost50 = () => {
    if (boostCount <= 0 || answered || boostsUsed >= 2) return;
    
    const success = consumeBoost("geo_50_50");
    if (!success) return;

    const q = gamePoolRef.current[currentIdxRef.current];
    const wrongOnes = shuffledAns
      .filter((a) => a.idx !== q.correct)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
      .map((a) => a.idx);
    setEliminatedIdxs(wrongOnes);
    setBoostsUsed((prev) => prev + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const loadQuestion = (q: GeographyQuestion, idx: number) => {
    answeredRef.current = false;
    setAnswered(false);
    setSelectedAns(null);
    setEliminatedIdxs([]);
    const answers = q.answers
      .map((a, i) => ({ text: a, idx: i }))
      .sort(() => Math.random() - 0.5);
    setShuffledAns(answers);

    const max =
      q.difficulty === "hard" ? 20 : q.difficulty === "medium" ? 25 : 30;
    setTimerMax(max);
    setTimeLeft(max);
    startTimer(max);

    slideAnim.setValue(20);
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const startTimer = (max: number) => {
    if (timerInterval.current) clearInterval(timerInterval.current);
    timerAnim.setValue(0);
    Animated.timing(timerAnim, {
      toValue: 1,
      duration: max * 1000,
      useNativeDriver: true,
    }).start();

    timerInterval.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerInterval.current) clearInterval(timerInterval.current);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeOut = () => {
    if (timerInterval.current) clearInterval(timerInterval.current);
    if (answeredRef.current) return;
    answeredRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setAnswered(true);
    setWrong((v) => v + 1);
    setStreak(0);
    setGameReview((prev) => [
      ...prev,
      {
        q: gamePoolRef.current[currentIdxRef.current],
        chosen: -1,
        correct: false,
      },
    ]);
    setTimeout(advance, 1500);
  };

  const handleAnswer = (chosenIdx: number) => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    if (timerInterval.current) clearInterval(timerInterval.current);
    setAnswered(true);
    setSelectedAns(chosenIdx);

    const q = gamePoolRef.current[currentIdxRef.current];
    const isCorrect = chosenIdx === q.correct;

    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCorrect((v) => v + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      const bonus = newStreak >= 3 ? Math.floor(newStreak / 3) * 50 : 0;
      setScore((v) => v + 100 + bonus + timeLeft * 5);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setWrong((v) => v + 1);
      setStreak(0);
    }

    setGameReview((prev) => [
      ...prev,
      { q, chosen: chosenIdx, correct: isCorrect },
    ]);
    setTimeout(advance, 1500);
  };

  const advance = () => {
    const idx = currentIdxRef.current;
    if (idx < 11) {
      const next = idx + 1;
      currentIdxRef.current = next;
      setCurrentIdx(next);
      loadQuestion(gamePoolRef.current[next], next);
    } else {
      endGame();
    }
  };

  const endGame = async () => {
    const finalAcc = Math.round((correct / 12) * 100);
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
            (gameId as string) || "2",
          );
          if (response.dayCompleted) {
            Alert.alert(t("games.common.challengeTitle"), t("games.common.dayFinished"));
          }
        }

        if (dayId && !challengeDayGameId) {
          await ChallengesModule.submitDayScore(dayId as string, submitScore);
        }
      } catch (error) {
        console.error("Failed to complete game:", error);
      }
    })();

    setScreen("result");
    saveStats(score, correct);
  };

  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = timerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, circumference],
  });

  const renderStart = () => (
    <View style={{ flex: 1 }}>
      <TouchableOpacity
        style={[styles.backBtnStart, { top: insets.top + 12 }]}
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back" size={24} color={C.blue} />
        <Text style={{ color: C.blue, fontSize: 12, fontWeight: "700", marginLeft: 4 }}>
          {t("common.back")}
        </Text>
      </TouchableOpacity>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.globeIcon}>🌍</Text>
          <Text style={styles.title}>{t("games.geographyQuiz.start.title")}</Text>
          <Text style={styles.subtitle}>{t("games.geographyQuiz.start.subtitle")}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statChipLabel}>{t("games.geographyQuiz.start.questionsLabel")}</Text>
            <Text style={styles.statChipValue}>
              {GEOGRAPHY_QUESTIONS.length}
            </Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statChipLabel}>{t("games.geographyQuiz.start.bestLabel")}</Text>
            <Text style={styles.statChipValue}>{bestScore || "—"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("games.geographyQuiz.start.chooseCategory")}</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCat === cat.id;
              const count =
                cat.id === "all"
                  ? GEOGRAPHY_QUESTIONS.length
                  : GEOGRAPHY_QUESTIONS.filter((q) => q.cat === cat.id).length;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catCard, isSelected && styles.catCardSelected]}
                  onPress={() => {
                    setSelectedCat(cat.id);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <View style={styles.catInfo}>
                    <Text
                      style={[
                        styles.catName,
                        isSelected && styles.catTextSelected,
                      ]}
                    >
                      {cat.name}
                    </Text>
                    <Text style={styles.catCount}>{t("games.geographyQuiz.start.questionsShort", { count })}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/*<View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("games.geographyQuiz.start.difficultyLabel")}</Text>
          <View style={styles.diffRow}>
            {(["easy", "medium", "hard"] as const).map((d) => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.diffBtn,
                  difficulty === d && styles.diffBtnActive,
                ]}
                onPress={() => {
                  setDifficulty(d);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={styles.diffEmoji}>
                  {d === "easy" ? "😊" : d === "medium" ? "🤔" : "🔥"}
                </Text>
                <Text
                  style={[
                    styles.diffText,
                    difficulty === d && styles.diffTextActive,
                  ]}
                >
                  {d === "easy"
                    ? t("games.geographyQuiz.start.difficulty.easy")
                    : d === "medium"
                      ? t("games.geographyQuiz.start.difficulty.medium")
                      : t("games.geographyQuiz.start.difficulty.hard")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>*/}

        <View style={styles.linksRow}>
          <TouchableOpacity
            style={styles.dbBtn}
            onPress={() => setScreen("db")}
          >
            <Text style={styles.dbBtnText}>{t("games.geographyQuiz.start.dbBtn")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dbBtn}
            onPress={() => router.navigate('/games/geography-training')}
          >
            <Text style={styles.dbBtnText}>{t("games.geographyQuiz.start.trainingBtn")}</Text>
          </TouchableOpacity>
        </View>

        {history.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionLabel}>{t("games.geographyQuiz.start.lastResults")}</Text>
            {history.slice(0, 3).map((h, i) => (
              <View key={i} style={styles.historyItem}>
                <Text style={styles.historyRank}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                </Text>
                <Text style={styles.historyCorrect}>{t("games.geographyQuiz.start.correctOf12", { correct: h.correct })}</Text>
                <Text style={styles.historyScore}>{h.score} ★</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.startFooter, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.startBtn} onPress={startGame}>
          <LinearGradient
            colors={["#0066cc", "#00aaff"]}
            style={styles.startBtnGradient}
          >
            <Text style={styles.startBtnText}>{t("games.geographyQuiz.start.startBtn")}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderGame = () => {
    const q = gamePool[currentIdx];
    if (!q) return null;

    return (
      <View style={[styles.gameContainer, { paddingTop: insets.top }]}>
        <View style={styles.gameHeader}>
          {streak >= 2 && (
            <View style={styles.streakWrap}>
              <Text style={styles.streakText}>🔥 {streak}</Text>
            </View>
          )}

          <View style={styles.timerWrap}>
            <Svg width={40} height={40} viewBox="0 0 44 44">
              <Circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke={C.card2}
                strokeWidth="3"
              />
              <AnimatedCircle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke={
                  timeLeft <= 5 ? C.red : timeLeft <= 10 ? C.gold : C.blue
                }
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 22 22)"
              />
            </Svg>

            <View style={styles.timerNumWrap}>
              <Text
                style={[
                  styles.timerNum,
                  {
                    color:
                      timeLeft <= 5 ? C.red : timeLeft <= 10 ? C.gold : C.text,
                  },
                ]}
              >
                {timeLeft}
              </Text>
            </View>
          </View>
          <View style={styles.scoreWrap}>
            <Text style={styles.scoreText}>{score}</Text>
          </View>
          <View style={styles.progressTextWrap}>
            <Text style={styles.progressText}>
              {t("games.geographyQuiz.game.questionProgress", { current: currentIdx + 1 })}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.boostHeaderBtn,
              (boostCount <= 0 || answered || boostsUsed >= 2) &&
                styles.boostHeaderBtnUsed,
            ]}
            onPress={handleBoost50}
            disabled={boostCount <= 0 || answered || boostsUsed >= 2}
          >
            <Text
              style={[
                styles.boostHeaderText,
                (boostCount <= 0 || answered || boostsUsed >= 2) &&
                  styles.boostHeaderTextUsed,
              ]}
            >
              {boostsUsed >= 2 ? t("games.geographyQuiz.game.boostDepleted") : "50:50"}
            </Text>
            {boostCount > 0 && boostsUsed < 2 && (
              <View style={styles.boostBadge}>
                <Text style={styles.boostBadgeText}>{boostCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${(currentIdx / 12) * 100}%` },
            ]}
          />
        </View>

        <Animated.View
          style={[styles.qCard, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.qCatBadge}>
            <Text style={styles.qCatBadgeText}>
              {(q.flag ? q.flag + " " : "") + (CAT_NAMES[q.cat] || t("games.geographyQuiz.game.geography"))}
            </Text>
          </View>

          {q.cat === "flags" && q.flag && (
            <Text style={styles.flagDisplay}>{q.flag}</Text>
          )}

          <Text style={styles.qText}>{q.q}</Text>
        </Animated.View>

        <View style={styles.ansGrid}>
          {shuffledAns.map((ans, i) => {
            const isSelected = selectedAns === ans.idx;
            const isCorrect = ans.idx === q.correct;
            const showCorrect = answered && isCorrect;
            const showWrong = answered && isSelected && !isCorrect;
            const isEliminated = eliminatedIdxs.includes(ans.idx);

            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.ansBtn,
                  showCorrect && styles.ansBtnCorrect,
                  showWrong && styles.ansBtnWrong,
                  isEliminated && styles.ansBtnEliminated,
                ]}
                onPress={() => handleAnswer(ans.idx)}
                disabled={answered || isEliminated}
              >
                <View
                  style={[
                    styles.ansLetterWrap,
                    showCorrect && styles.ansLetterCorrect,
                    showWrong && styles.ansLetterWrong,
                  ]}
                >
                  <Text
                    style={[
                      styles.ansLetter,
                      (showCorrect || showWrong) && styles.ansLetterActive,
                      isEliminated && styles.ansLetterEliminated,
                    ]}
                  >
                    {["A", "B", "C", "D"][i]}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.ansText,
                    isEliminated && styles.ansTextEliminated,
                  ]}
                >
                  {isEliminated ? "—" : ans.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderResult = () => {
    const isGreat = correct >= 10;
    const isGood = correct >= 7;
    const isOk = correct >= 4;

    return (
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 40 },
        ]}
      >
        <View style={styles.resultHero}>
          <Text style={styles.resultEmoji}>
            {isGreat ? "🏆" : isGood ? "🥈" : isOk ? "🥉" : "😐"}
          </Text>
          <Text
            style={[
              styles.resultGrade,
              {
                color: isGreat
                  ? C.gold
                  : isGood
                    ? C.blue
                    : isOk
                      ? C.purple
                      : C.red,
              },
            ]}
          >
            {isGreat
              ? t("games.geographyQuiz.result.gradeExcellent")
              : isGood
                ? t("games.geographyQuiz.result.gradeGood")
                : isOk
                  ? t("games.geographyQuiz.result.gradeNotBad")
                  : t("games.geographyQuiz.result.gradeTryAgain")}
          </Text>
          <Text style={styles.resultSubtitle}>
            {isGreat
              ? t("games.geographyQuiz.result.subExcellent")
              : isGood
                ? t("games.geographyQuiz.result.subGood")
                : isOk
                  ? t("games.geographyQuiz.result.subNotBad")
                  : t("games.geographyQuiz.result.subTryAgain")}
          </Text>

          {isNewRecord && (
            <View style={styles.recordBadge}>
              <Text style={styles.recordText}>{t("games.geographyQuiz.result.newRecord")}</Text>
            </View>
          )}

          <View style={styles.statsRowComparison}>
            <View style={styles.statBoxComparison}>
              <View style={styles.statIconWrap}>
                <Ionicons name="globe-outline" size={16} color={C.blue} />
              </View>
              <Text style={[styles.statNumComparison, { color: C.blue }]}>
                {globalBest}
              </Text>
              <Text style={styles.statLabelComparison}>{t("games.geographyQuiz.result.best")}</Text>
            </View>
            <View style={styles.statBoxComparison}>
              <View style={styles.statIconWrap}>
                <Ionicons
                  name="trophy-outline"
                  size={16}
                  color={C.accent2 || "#c4a35a"}
                />
              </View>
              <Text
                style={[
                  styles.statNumComparison,
                  { color: C.accent2 || "#c4a35a" },
                ]}
              >
                {bestScore}
              </Text>
              <Text style={styles.statLabelComparison}>{t("games.geographyQuiz.result.myBest")}</Text>
            </View>
            <View style={styles.statBoxComparison}>
              <View style={styles.statIconWrap}>
                <Ionicons name="person-outline" size={16} color={C.accent1} />
              </View>
              <Text style={[styles.statNumComparison, { color: C.accent1 }]}>
                {score}
              </Text>
              <Text style={styles.statLabelComparison}>{t("games.geographyQuiz.result.current")}</Text>
            </View>
          </View>
        </View>

        <View style={styles.resultScoreCard}>
          <Text style={styles.bigScoreNum}>{score}</Text>
          <Text style={styles.bigScoreLabel}>{t("games.geographyQuiz.result.pointsScored")}</Text>

          <View style={styles.resStatsGrid}>
            <View style={styles.resStatBox}>
              <Text style={[styles.resStatNum, { color: C.green }]}>
                {correct}
              </Text>
              <Text style={styles.resStatLabel}>{t("games.geographyQuiz.result.correct")}</Text>
            </View>
            <View style={styles.resStatBox}>
              <Text style={[styles.resStatNum, { color: C.red }]}>{wrong}</Text>
              <Text style={styles.resStatLabel}>{t("games.geographyQuiz.result.wrong")}</Text>
            </View>
            <View style={styles.resStatBox}>
              <Text style={[styles.resStatNum, { color: C.blue }]}>
                {correct + wrong}
              </Text>
              <Text style={styles.resStatLabel}>{t("games.geographyQuiz.result.total")}</Text>
            </View>
          </View>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.sectionLabel}>{t("games.geographyQuiz.result.reviewTitle")}</Text>
          {gameReview.map((item, i) => (
            <View
              key={i}
              style={[
                styles.reviewItem,
                { borderLeftColor: item.correct ? C.green : C.red },
              ]}
            >
              <Text style={styles.reviewIcon}>
                {item.correct ? "✅" : "❌"}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.reviewQ} numberOfLines={2}>
                  {item.q.q}
                </Text>
                <Text style={styles.reviewA}>
                  {item.correct ? t("games.geographyQuiz.result.reviewCorrectPrefix") : t("games.geographyQuiz.result.reviewYourAnswerPrefix")}
                  <Text style={{ color: item.correct ? C.green : C.red }}>
                    {item.chosen === -1
                      ? t("games.geographyQuiz.result.timeOut")
                      : item.q.answers[item.chosen]}
                  </Text>
                </Text>
                {!item.correct && (
                  <Text style={styles.reviewCorrect}>
                    {t("games.geographyQuiz.result.reviewRightAnswerPrefix")} {item.q.answers[item.q.correct]}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.resButtons}>
          <RetryBoostButton
            hasRetry={hasRetry}
            retryCount={retryCount}
            onPress={() => activateRetry(score, startGame)}
            style={{ width: "100%", marginBottom: 8 }}
          />
          <TouchableOpacity style={styles.retryBtn} onPress={startGame}>
            <Text style={styles.retryBtnText}>{t("games.geographyQuiz.result.retry")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => setScreen("start")}
          >
            <Text style={styles.homeBtnText}>{t("games.geographyQuiz.result.home")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderDB = () => {
    const filtered = GEOGRAPHY_QUESTIONS.filter((q) => {
      const matchSearch = q.q.toLowerCase().includes(dbSearch.toLowerCase());
      const matchCat = dbFilterCat === "all" || q.cat === dbFilterCat;
      return matchSearch && matchCat;
    });

    return (
      <View style={[styles.dbContainer, { paddingTop: insets.top }]}>
        <View style={styles.dbHeader}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setScreen("start")}
          >
            <Ionicons name="arrow-back" size={24} color={C.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.dbTitle}>{t("games.geographyQuiz.db.title")}</Text>
            <Text style={styles.dbSubtitle}>
              {t("games.geographyQuiz.db.subtitle", { count: GEOGRAPHY_QUESTIONS.length })}
            </Text>
          </View>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={C.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t("games.geographyQuiz.db.searchPlaceholder")}
            placeholderTextColor={C.muted}
            value={dbSearch}
            onChangeText={setDbSearch}
          />
        </View>

        <View style={{ height: 50 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterTabs}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.filterTab,
                  dbFilterCat === cat.id && styles.filterTabActive,
                ]}
                onPress={() => setDbFilterCat(cat.id)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    dbFilterCat === cat.id && styles.filterTabTextActive,
                  ]}
                >
                  {cat.emoji} {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          contentContainerStyle={styles.dbList}
          showsVerticalScrollIndicator={false}
        >
          {filtered.slice(0, 100).map((q) => (
            <TouchableOpacity
              key={q.id}
              style={[styles.dbQCard, expandedQ === q.id && styles.dbQCardOpen]}
              onPress={() => setExpandedQ(expandedQ === q.id ? null : q.id)}
            >
              <View style={styles.dbQHeader}>
                <View style={[styles.dbQBadge, { backgroundColor: C.border }]}>
                  <Text style={styles.dbQBadgeText}>
                    {CAT_NAMES[q.cat] || t("games.geographyQuiz.game.geography")}
                  </Text>
                </View>
                <Text
                  style={styles.dbQText}
                  numberOfLines={expandedQ === q.id ? undefined : 2}
                >
                  {q.q}
                </Text>
              </View>
              {expandedQ === q.id && (
                <View style={styles.dbQAnswers}>
                  {q.answers.map((a, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dbAnsItem,
                        i === q.correct && styles.dbAnsCorrect,
                      ]}
                    >
                      <Text style={styles.dbAnsLetter}>
                        {["A", "B", "C", "D"][i]}
                      </Text>
                      <Text
                        style={[
                          styles.dbAnsText,
                          i === q.correct && {
                            color: C.green,
                            fontWeight: "700",
                          },
                        ]}
                      >
                        {a}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ))}
          {filtered.length > 100 && (
            <Text style={styles.dbLimitText}>
              {t("games.geographyQuiz.db.limitText")}
            </Text>
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {screen === "start" && renderStart()}
        {screen === "game" && renderGame()}
        {screen === "result" && renderResult()}
        {screen === "db" && renderDB()}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  globeIcon: {
    fontSize: 64,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: C.blue,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 3,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 30,
  },
  statChip: {
    backgroundColor: C.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    gap: 6,
  },
  statChipLabel: {
    fontSize: 12,
    color: C.blue,
  },
  statChipValue: {
    fontSize: 12,
    color: C.text,
    fontWeight: "700",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    color: C.muted,
    letterSpacing: 2,
    marginBottom: 12,
    marginLeft: 4,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  catCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    width: (width - 50) / 2,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  catCardSelected: {
    borderColor: C.blue,
    backgroundColor: "rgba(0,200,255,0.1)",
  },
  catEmoji: {
    fontSize: 22,
  },
  catInfo: {
    flex: 1,
  },
  catName: {
    fontSize: 12,
    fontWeight: "700",
    color: C.muted,
  },
  catTextSelected: {
    color: C.blue,
  },
  catCount: {
    fontSize: 10,
    color: C.muted,
    marginTop: 1,
  },
  diffRow: {
    flexDirection: "row",
    gap: 10,
  },
  diffBtn: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  diffBtnActive: {
    borderColor: C.gold,
    backgroundColor: "rgba(255,215,0,0.1)",
  },
  diffEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  diffText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.muted,
  },
  diffTextActive: {
    color: C.gold,
  },
  startFooter: {
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: C.bg,
  },
  startBtn: {
    borderRadius: 16,
    overflow: "hidden",
    height: 60,
  },
  startBtnGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  startBtnText: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },
  linksRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  dbBtn: {
    alignSelf: "center",
    padding: 10,
  },
  dbBtnText: {
    color: C.muted,
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  historySection: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  historyItem: {
    backgroundColor: C.card,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  historyRank: {
    fontSize: 18,
    width: 30,
  },
  historyCorrect: {
    flex: 1,
    color: C.text,
    fontWeight: "700",
    fontSize: 14,
  },
  historyScore: {
    color: C.gold,
    fontWeight: "900",
    fontSize: 14,
  },

  // Game Styles
  gameContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  gameHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    backgroundColor: C.card,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  progressTextWrap: {
    // flex: 1,
  },
  progressText: {
    fontSize: 12,
    color: C.muted,
  },
  progressBold: {
    fontSize: 16,
    color: C.blue,
    fontWeight: "900",
  },
  streakWrap: {
    backgroundColor: "rgba(255,215,0,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  streakText: {
    color: C.gold,
    fontWeight: "900",
    fontSize: 14,
  },
  timerWrap: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  timerNumWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  timerNum: {
    fontSize: 12,
    fontWeight: "900",
  },
  scoreWrap: {
    // flex: 1,
    // alignItems: "flex-end",
  },
  scoreText: {
    fontSize: 16,
    color: C.gold,
    fontWeight: "900",
  },
  progressBarBg: {
    height: 6,
    backgroundColor: C.card2,
    borderRadius: 3,
    marginBottom: 20,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: C.blue,
    borderRadius: 3,
  },
  qCard: {
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 200,
    justifyContent: "center",
  },
  qCatBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "rgba(0,200,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,200,255,0.2)",
  },
  qCatBadgeText: {
    color: C.blue,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  flagDisplay: {
    fontSize: 64,
    marginBottom: 16,
  },
  qText: {
    fontSize: 20,
    fontWeight: "800",
    color: C.text,
    textAlign: "center",
    lineHeight: 28,
  },
  ansGrid: {
    gap: 12,
  },
  ansBtn: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: C.border,
  },
  ansBtnCorrect: {
    borderColor: C.green,
    backgroundColor: "rgba(0,255,136,0.1)",
  },
  ansBtnWrong: {
    borderColor: C.red,
    backgroundColor: "rgba(255,68,102,0.1)",
  },
  ansLetterWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.card2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  ansLetterCorrect: {
    backgroundColor: C.green,
  },
  ansLetterWrong: {
    backgroundColor: C.red,
  },
  ansLetter: {
    fontSize: 12,
    fontWeight: "900",
    color: C.muted,
  },
  ansLetterActive: {
    color: C.bg,
  },
  ansText: {
    flex: 1,
    color: C.text,
    fontSize: 15,
    fontWeight: "600",
  },

  // Result Styles
  resultHero: {
    alignItems: "center",
    marginBottom: 30,
  },
  resultEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  resultGrade: {
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 8,
  },
  resultSubtitle: {
    fontSize: 15,
    color: C.muted,
    textAlign: "center",
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  statsRowComparison: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    justifyContent: "center",
    paddingHorizontal: 20,
    width: "100%",
  },
  statBoxComparison: {
    flex: 1,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: `${C.muted}22`,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  statNumComparison: { fontSize: 20, fontWeight: "900", lineHeight: 24 },
  statLabelComparison: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: C.muted,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
  recordBadge: {
    backgroundColor: C.gold,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 20,
    shadowColor: C.gold,
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
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  resultScoreCard: {
    backgroundColor: C.card,
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 30,
  },
  bigScoreNum: {
    fontSize: 64,
    fontWeight: "900",
    color: C.gold,
  },
  bigScoreLabel: {
    fontSize: 12,
    color: C.muted,
    letterSpacing: 2,
    marginTop: -4,
    marginBottom: 20,
  },
  resStatsGrid: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
  },
  resStatBox: {
    flex: 1,
    backgroundColor: C.card2,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
  },
  resStatNum: {
    fontSize: 20,
    fontWeight: "900",
  },
  resStatLabel: {
    fontSize: 9,
    color: C.muted,
    marginTop: 4,
    letterSpacing: 1,
  },
  reviewSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  reviewItem: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    borderLeftWidth: 4,
  },
  reviewIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  reviewQ: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
    marginBottom: 4,
  },
  reviewA: {
    fontSize: 12,
    color: C.muted,
  },
  reviewCorrect: {
    fontSize: 12,
    color: C.green,
    marginTop: 2,
    fontWeight: "600",
  },
  resButtons: {
    paddingHorizontal: 20,
    gap: 12,
  },
  retryBtn: {
    backgroundColor: C.blue,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  retryBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
  },
  homeBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.border,
  },
  homeBtnText: {
    color: C.muted,
    fontSize: 16,
    fontWeight: "700",
  },

  // DB Styles
  dbContainer: {
    flex: 1,
  },
  dbHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    backgroundColor: C.card,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  dbTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.text,
  },
  dbSubtitle: {
    fontSize: 12,
    color: C.muted,
  },
  searchBar: {
    backgroundColor: C.card,
    marginHorizontal: 20,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: C.text,
    fontSize: 15,
  },
  filterTabs: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterTab: {
    backgroundColor: C.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    height: 36,
  },
  filterTabActive: {
    backgroundColor: C.blue,
    borderColor: C.blue,
  },
  filterTabText: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  filterTabTextActive: {
    color: C.bg,
  },
  dbList: {
    padding: 20,
    gap: 10,
  },
  dbQCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  dbQCardOpen: {
    borderColor: C.blue,
    backgroundColor: C.card2,
  },
  dbQHeader: {
    flexDirection: "row",
    gap: 12,
  },
  dbQBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    height: 20,
  },
  dbQBadgeText: {
    fontSize: 9,
    color: C.blue,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  dbQText: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    fontWeight: "600",
    lineHeight: 20,
  },
  dbQAnswers: {
    marginTop: 16,
    gap: 8,
  },
  dbAnsItem: {
    backgroundColor: C.bg,
    padding: 10,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  dbAnsCorrect: {
    borderColor: C.green,
    backgroundColor: "rgba(0,255,136,0.05)",
  },
  dbAnsLetter: {
    width: 20,
    fontSize: 11,
    color: C.muted,
    fontWeight: "700",
  },
  dbAnsText: {
    fontSize: 13,
    color: C.text,
  },
  dbLimitText: {
    textAlign: "center",
    color: C.muted,
    fontSize: 12,
    marginVertical: 20,
  },
  backBtnStart: {
    position: "absolute",
    left: 16,
    paddingHorizontal: 10,
    paddingRight: 2,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
    zIndex: 100,
    flexDirection: "row",
  },

  // Boost styles
  boostHeaderBtn: {
    backgroundColor: "rgba(255,215,0,0.12)",
    borderWidth: 1.5,
    borderColor: C.gold,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: 6,
  },
  boostHeaderBtnUsed: {
    backgroundColor: C.card2,
    borderColor: C.border,
    opacity: 0.4,
  },
  boostHeaderText: {
    color: C.gold,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  boostHeaderTextUsed: {
    color: C.muted,
  },
  ansBtnEliminated: {
    opacity: 0.3,
    borderColor: C.border,
  },
  ansLetterEliminated: {
    color: C.muted,
  },
  ansTextEliminated: {
    color: C.muted,
  },
  boostRow: {
    alignItems: "center",
    marginTop: 16,
  },
  boostBtn: {
    backgroundColor: "rgba(255,215,0,0.12)",
    borderWidth: 1.5,
    borderColor: C.gold,
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  boostBtnUsed: {
    backgroundColor: C.card,
    borderColor: C.border,
    opacity: 0.4,
  },
  boostBtnText: {
    color: C.gold,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
  },
  boostBtnTextUsed: {
    color: C.muted,
  },
  boostBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: C.gold,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  boostBadgeText: {
    color: C.bg,
    fontSize: 10,
    fontWeight: "900",
  },
});
