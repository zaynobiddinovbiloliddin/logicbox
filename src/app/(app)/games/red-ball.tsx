import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBoostsInventory } from "@/store/boosts-inventory";
import { useRetryBoost } from "@/hooks/use-retry-boost";
import RetryBoostButton from "@/components/shared/retry-boost-button";
import { useUserStats } from "@/store/user-stats";
import {
  Animated,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ChallengesModule } from "@/services/modules/challenges-module";
import { GamesModule } from "@/services/modules/games-module";
import SafeAreaWrapper from "@/components/shared/safe-area-wrapper";

// ─── Config ───────────────────────────────────────────────────────────────────

const COLS = 4;
const ROWS = 5;
const TOTAL = COLS * ROWS;
const GAME_TIME = 55;
const LIVES = 3;

const COLORS = {
  bg: "#0d1b2a",
  panel: "#112236",
  border: "#1e3a52",
  text: "#e2f0ff",
  muted: "#4a7b99",
  green: "#22c55e",
  greenDark: "#15803d",
  greenShine: "#4ade80",
  red: "#ef4444",
  redDark: "#991b1b",
  redShine: "#f87171",
  gold: "#fbbf24",
  accent: "#38bdf8",
};

type Screen = "start" | "game" | "result";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcSpeed(score: number): number {
  if (score <= 750) return 1400 - (score / 750) * 300;
  if (score <= 1500) return 1100;
  if (score <= 2000) return 980;
  if (score <= 2500) return 910;
  if (score <= 3100) return 840;
  return 750;
}

function heartStr(lives: number): string {
  return Array(Math.max(0, lives)).fill("❤️").join("") || "💀";
}

const { width: SW } = Dimensions.get("window");
const BALL_GAP = 10;
const GRID_H_PAD = 16;
const BALL_SIZE = Math.floor(
  (SW - GRID_H_PAD * 2 - BALL_GAP * (COLS - 1)) / COLS,
);

// ─── Score popup ──────────────────────────────────────────────────────────────

interface PopupItem {
  id: number;
  text: string;
  x: number;
  y: number;
  miss: boolean;
  anim: Animated.Value;
}

function ScorePopup({ item }: { item: PopupItem }) {
  const translateY = item.anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -90],
  });
  const scale = item.anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [1, 1.3, 0.8],
  });
  const opacity = item.anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1, 0],
  });
  return (
    <Animated.Text
      style={[
        styles.scorePop,
        item.miss && styles.scorePopMiss,
        {
          left: item.x - 20,
          top: item.y - 20,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      {item.text}
    </Animated.Text>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RedBallGame() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { dayId, gameId, challengeDayGameId } = useLocalSearchParams();
  const [screen, setScreen] = useState<Screen>("start");
  const [balls, setBalls] = useState<boolean[]>(Array(TOTAL).fill(false));
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [popups, setPopups] = useState<PopupItem[]>([]);
  const [comboText, setComboText] = useState("");
  const [showCombo, setShowCombo] = useState(false);

  // result stats
  const [resScore, setResScore] = useState(0);
  const [globalBest, setGlobalBest] = useState(25000);
  const [resHits, setResHits] = useState(0);
  const [resMisses, setResMisses] = useState(0);
  const [resMaxCombo, setResMaxCombo] = useState(0);
  const [resTime, setResTime] = useState("0:00");
  const [isRecord, setIsRecord] = useState(false);

  // ── Boost: shield ────────────────────────────────────────────────────────────
  const { useBoost: consumeBoost } = useBoostsInventory();
  const shieldCount = useBoostsInventory((state) => state.inventory["red_ball_shield"] ?? 0);
  const { retryCount, hasRetry, activateRetry, getFinalScore } = useRetryBoost();
  const { addXP, addIQScore } = useUserStats();
  const [shieldUsedThisGame, setShieldUsedThisGame] = useState(0);
  const [shieldActive, setShieldActive] = useState(false);
  const shieldRef = useRef(false);

  const redIdx = useRef(-1);
  const scoreRef = useRef(0);
  const livesRef = useRef(LIVES);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const timeRef = useRef(GAME_TIME);
  const redAppearRef = useRef(0);
  const startTimeRef = useRef(0);
  const popupIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Flash overlay
  const flashAnim = useRef(new Animated.Value(0)).current;
  const flashColor = useRef("#22c55e33");

  // Combo label anim
  const comboOpacity = useRef(new Animated.Value(0)).current;

  // Screen shake anim
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (moveRef.current) clearInterval(moveRef.current);
  }, []);

  // ── place red ──
  const placeRed = useCallback((oldIdx?: number) => {
    let idx: number;
    do {
      idx = Math.floor(Math.random() * TOTAL);
    } while (idx === oldIdx);
    redIdx.current = idx;
    setBalls((prev) => {
      const next = Array(TOTAL).fill(false);
      next[idx] = true;
      return next;
    });
    redAppearRef.current = Date.now();
  }, []);

  // ── schedule move ──
  const scheduleMove = useCallback(() => {
    if (moveRef.current) clearInterval(moveRef.current);
    const speed = calcSpeed(scoreRef.current);
    moveRef.current = setInterval(() => {
      placeRed(redIdx.current);
    }, speed);
  }, [placeRed]);

  // ── flash ──
  const doFlash = useCallback(
    (color: string) => {
      flashColor.current = color;
      flashAnim.setValue(1);
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    },
    [flashAnim],
  );

  // ── shake ──
  const doShake = useCallback(() => {
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
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnim]);

  // ── score popup ──
  const spawnPopup = useCallback(
    (x: number, y: number, text: string, miss: boolean) => {
      const id = popupIdRef.current++;
      const anim = new Animated.Value(0);
      setPopups((p) => [...p, { id, text, x, y, miss, anim }]);
      Animated.timing(anim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }).start(() => {
        setPopups((p) => p.filter((pp) => pp.id !== id));
      });
    },
    [],
  );

  // ── show combo ──
  const triggerCombo = useCallback(
    (c: number) => {
      if (c < 2) {
        setShowCombo(false);
        return;
      }
      const msgs = [
        "",
        "",
        t("games.redBall.combo2"),
        t("games.redBall.combo3"),
        t("games.redBall.combo4"),
        t("games.redBall.combo5"),
      ];
      setComboText(msgs[Math.min(c, msgs.length - 1)] || t("games.redBall.comboGodlike", { combo: c }));
      setShowCombo(true);
      comboOpacity.setValue(1);
      Animated.timing(comboOpacity, {
        toValue: 0,
        duration: 1200,
        delay: 600,
        useNativeDriver: true,
      }).start(() => setShowCombo(false));
    },
    [comboOpacity],
  );

  // ── start game ──
  const startGame = useCallback(() => {
    clearTimers();
    scoreRef.current = 0;
    livesRef.current = LIVES;
    comboRef.current = 0;
    maxComboRef.current = 0;
    hitsRef.current = 0;
    missesRef.current = 0;
    timeRef.current = GAME_TIME;
    shieldRef.current = false;
    setShieldActive(false);
    setShieldUsedThisGame(0);
    setScore(0);
    setLives(LIVES);
    setCombo(0);
    setTimeLeft(GAME_TIME);
    setPopups([]);
    setShowCombo(false);
    startTimeRef.current = Date.now();

    placeRed();
    setScreen("game");

    timerRef.current = setInterval(() => {
      timeRef.current -= 0.1;
      if (timeRef.current <= 0) {
        timeRef.current = 0;
        endGame();
      }
      setTimeLeft(parseFloat(timeRef.current.toFixed(1)));
    }, 100);

    scheduleMove();
  }, [clearTimers, placeRed, scheduleMove]);

  // ── end game ──
  const endGame = useCallback(async () => {
    clearTimers();
    const best =
      parseInt(global?.localStorage?.getItem?.("rbg_best") ?? "0") || 0;
    const finalScore = getFinalScore(scoreRef.current);
    const record = finalScore > best;
    if (record) {
      global?.localStorage?.setItem?.("rbg_best", String(finalScore));
      if (finalScore > globalBest) {
        setGlobalBest(finalScore);
      }
    }

    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;

    const totalBalls = hitsRef.current + missesRef.current;
    const finalAcc =
      totalBalls > 0 ? Math.round((hitsRef.current / totalBalls) * 100) : 0;
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
            (gameId as string) || 9
          );
          if (response.dayCompleted) {
            Alert.alert(t("games.common.challengeTitle"), t("games.common.dayFinished"));
          }
          if (dayId) {
            await ChallengesModule.submitDayScore(dayId as string, finalScore);
          }
        }
      } catch (error) {
        console.error("Failed to complete game or submit score:", error);
      }
    })();

    setResScore(scoreRef.current);
    setResHits(hitsRef.current);
    setResMisses(missesRef.current);
    setResMaxCombo(maxComboRef.current);
    setResTime(`${mins}:${String(secs).padStart(2, "0")}`);
    setIsRecord(record);

    setTimeout(() => setScreen("result"), 400);
  }, [clearTimers, addXP, addIQScore, dayId, gameId]);

  // ── ball press ──
  const onBallPress = useCallback(
    (idx: number, px: number, py: number) => {
      if (screen !== "game") return;

      if (idx === redIdx.current) {
        const reaction = Date.now() - redAppearRef.current;
        let base =
          reaction < 200 ? 20 : reaction < 500 ? 15 : reaction < 900 ? 10 : 7;
        const newCombo = comboRef.current + 1;
        comboRef.current = newCombo;
        if (newCombo > maxComboRef.current) maxComboRef.current = newCombo;
        const earned = base + newCombo * 2;
        scoreRef.current += earned;
        hitsRef.current++;

        setScore(scoreRef.current);
        setCombo(newCombo);
        doFlash("#22c55e33");
        spawnPopup(px, py, `+${earned}`, false);
        triggerCombo(newCombo);
        placeRed(idx);
        scheduleMove();
      } else {
        comboRef.current = 0;
        missesRef.current++;
        setCombo(0);
        if (shieldRef.current) {
          shieldRef.current = false;
          setShieldActive(false);
          spawnPopup(px, py, "🛡️", false);
          doFlash("#38bdf833");
        } else {
          livesRef.current--;
          setLives(livesRef.current);
          doFlash("#ef444444");
          doShake();
          spawnPopup(px, py, "✗", true);
          if (livesRef.current <= 0) endGame();
        }
      }
    },
    [
      screen,
      doFlash,
      doShake,
      spawnPopup,
      triggerCombo,
      placeRed,
      scheduleMove,
      endGame,
    ],
  );

  useEffect(() => () => clearTimers(), [clearTimers]);

  const timerWarning = timeLeft <= 7;
  const progress = timeLeft / GAME_TIME;

  // ─── Start screen ─────────────────────────────────────────────────────────

  if (screen === "start") {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" />

        {/* Back button */}
        <TouchableOpacity
          style={[styles.start_backBtn, { top: insets.top + 12 }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={COLORS.accent} />
          <Text style={{ color: COLORS.accent, fontSize: 12, fontWeight: "700", marginLeft: 4 }}>
            {t("common.back")}
          </Text>
        </TouchableOpacity>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.start_scrollContent,
            { paddingTop: insets.top },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <Text style={styles.start_heroEmoji}>🔴</Text>
          <Text style={styles.start_title}>{t("games.redBall.start.title")}</Text>
          <Text style={styles.start_subtitle}>
            {t("games.redBall.start.subtitle")}
          </Text>

          {/* Description card */}
          <View style={styles.start_descCard}>
            {/* How to play */}
            <Text style={styles.start_descTitle}>{t("games.redBall.start.howToPlayTitle")}</Text>
            <Text style={styles.start_descText}>
              {t("games.redBall.start.howToPlayDesc")}
            </Text>

            <View style={styles.start_divider} />

            {/* Mechanics */}
            <Text style={styles.start_sectionTitle}>{t("games.redBall.start.featuresTitle")}</Text>
            <View style={styles.start_mechRow}>
              <View
                style={[
                  styles.start_mechDot,
                  { backgroundColor: COLORS.green },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.start_mechName}>{t("games.redBall.start.speedUpTitle")}</Text>
                <Text style={styles.start_mechDesc}>
                  {t("games.redBall.start.speedUpDesc")}
                </Text>
              </View>
            </View>
            <View style={styles.start_mechRow}>
              <View
                style={[styles.start_mechDot, { backgroundColor: COLORS.red }]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.start_mechName}>{t("games.redBall.start.speedBonusTitle")}</Text>
                <Text style={styles.start_mechDesc}>
                  {t("games.redBall.start.speedBonusDesc")}
                </Text>
              </View>
            </View>
            <View style={styles.start_mechRow}>
              <View
                style={[styles.start_mechDot, { backgroundColor: COLORS.gold }]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.start_mechName}>{t("games.redBall.start.comboTitle")}</Text>
                <Text style={styles.start_mechDesc}>
                  {t("games.redBall.start.comboDesc")}
                </Text>
              </View>
            </View>

            <View style={styles.start_divider} />

            {/* Scoring */}
            <Text style={styles.start_sectionTitle}>{t("games.redBall.start.scoringTitle")}</Text>
            <View style={styles.start_scoreRow}>
              <View
                style={[
                  styles.start_scoreBadge,
                  { backgroundColor: COLORS.accent },
                ]}
              >
                <Text style={styles.start_scorePts}>+20</Text>
              </View>
              <Text style={styles.start_scoreText}>
                {t("games.redBall.start.scoreFastest")}
              </Text>
            </View>
            <View style={styles.start_scoreRow}>
              <View
                style={[
                  styles.start_scoreBadge,
                  { backgroundColor: COLORS.green },
                ]}
              >
                <Text style={styles.start_scorePts}>+15</Text>
              </View>
              <Text style={styles.start_scoreText}>
                {t("games.redBall.start.scoreFast")}
              </Text>
            </View>
            <View style={styles.start_scoreRow}>
              <View
                style={[
                  styles.start_scoreBadge,
                  { backgroundColor: COLORS.gold },
                ]}
              >
                <Text style={[styles.start_scorePts, { color: "#1a1a00" }]}>
                  +10
                </Text>
              </View>
              <Text style={styles.start_scoreText}>{t("games.redBall.start.scoreNormal")}</Text>
            </View>
            <View style={styles.start_scoreRow}>
              <View
                style={[
                  styles.start_scoreBadge,
                  { backgroundColor: COLORS.accent },
                ]}
              >
                <Text style={styles.start_scorePts}>×2</Text>
              </View>
              <Text style={styles.start_scoreText}>
                {t("games.redBall.start.scoreCombo")}
              </Text>
            </View>
          </View>

          {/* Feature pills */}
          <View style={styles.start_featureRow}>
            {[
              { emoji: "⏱️", label: t("games.redBall.start.featureTime") },
              { emoji: "❤️", label: t("games.redBall.start.featureLives") },
              { emoji: "🟢", label: t("games.redBall.start.featureGrid") },
              { emoji: "🔥", label: t("games.redBall.start.featureCombo") },
            ].map((f) => (
              <View key={f.label} style={styles.start_featureBox}>
                <Text style={styles.start_featureEmoji}>{f.emoji}</Text>
                <Text style={styles.start_featureLabel}>{f.label}</Text>
              </View>
            ))}
          </View>

        </ScrollView>

        {/* Sticky play button */}
        <View style={[styles.start_footer, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={styles.start_playBtn}
            onPress={startGame}
            activeOpacity={0.85}
          >
            <Text style={styles.start_playBtnText}>{t("games.redBall.start.playBtn")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Result screen ────────────────────────────────────────────────────────

  if (screen === "result") {
    let emoji = "😐",
      title = t("games.redBall.result.titleNotBad");
    if (resScore >= 200) {
      emoji = "🔥";
      title = t("games.redBall.result.titleLegend");
    } else if (resScore >= 120) {
      emoji = "⚡";
      title = t("games.redBall.result.titleLightning");
    } else if (resScore >= 60) {
      emoji = "🎯";
      title = t("games.redBall.result.titleSharp");
    } else if (resScore < 20) {
      emoji = "😅";
      title = t("games.redBall.result.titleRetry");
    }

    return (
      <SafeAreaWrapper>
        <View style={styles.root}>
          <StatusBar barStyle="light-content" />
          <View style={styles.resultContent}>
            <Text style={styles.resultEmoji}>{emoji}</Text>
            <Text style={styles.resultTitle}>{title}</Text>

            <View style={styles.statsRowComparison}>
              <View style={styles.statBoxComparison}>
                <View style={styles.statIconWrap}>
                  <Ionicons
                    name="globe-outline"
                    size={16}
                    color={COLORS.gold}
                  />
                </View>
                <Text
                  style={[styles.statNumComparison, { color: COLORS.gold }]}
                >
                  {globalBest}
                </Text>
                <Text style={styles.statLabelComparison}>{t("games.redBall.result.best")}</Text>
              </View>
              <View style={styles.statBoxComparison}>
                <View style={styles.statIconWrap}>
                  <Ionicons
                    name="trophy-outline"
                    size={16}
                    color={COLORS.accent || "#e8c87a"}
                  />
                </View>
                <Text
                  style={[
                    styles.statNumComparison,
                    { color: COLORS.accent || "#e8c87a" },
                  ]}
                >
                  {Math.max(resScore, 0)}
                </Text>
                <Text style={styles.statLabelComparison}>{t("games.redBall.result.myBest")}</Text>
              </View>
              <View style={styles.statBoxComparison}>
                <View style={styles.statIconWrap}>
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={COLORS.danger}
                  />
                </View>
                <Text
                  style={[styles.statNumComparison, { color: COLORS.danger }]}
                >
                  {resScore}
                </Text>
                <Text style={styles.statLabelComparison}>{t("games.redBall.result.current")}</Text>
              </View>
            </View>

            {isRecord && (
              <View style={styles.recordBadge}>
                <Text style={styles.recordText}>{t("games.redBall.result.newRecord")}</Text>
              </View>
            )}
            <View style={styles.statsGrid}>
              <View style={styles.statsRow}>
                <View
                  style={[
                    styles.statCard,
                    styles.statCardHighlight,
                    { flex: 1 },
                  ]}
                >
                  <View style={styles.statIconWrap}>
                    <Ionicons
                      name="star-outline"
                      size={16}
                      color={COLORS.gold}
                    />
                  </View>
                  <Text style={[styles.statCardNum, { color: COLORS.gold }]}>
                    {resScore}
                  </Text>
                  <Text style={styles.statCardLbl}>{t("games.redBall.result.points")}</Text>
                </View>
                <View style={[styles.statCard, { flex: 1 }]}>
                  <View style={styles.statIconWrap}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={16}
                      color={COLORS.green}
                    />
                  </View>
                  <Text style={styles.statCardNum}>{resHits}</Text>
                  <Text style={styles.statCardLbl}>{t("games.redBall.result.hits")}</Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={[styles.statCard, { flex: 1 }]}>
                  <View style={styles.statIconWrap}>
                    <Ionicons
                      name="close-circle-outline"
                      size={16}
                      color={COLORS.danger}
                    />
                  </View>
                  <Text style={styles.statCardNum}>{resMisses}</Text>
                  <Text style={styles.statCardLbl}>{t("games.redBall.result.misses")}</Text>
                </View>
                <View style={[styles.statCard, { flex: 1 }]}>
                  <View style={styles.statIconWrap}>
                    <Ionicons
                      name="flash-outline"
                      size={16}
                      color={COLORS.accent}
                    />
                  </View>
                  <Text style={styles.statCardNum}>{resMaxCombo}</Text>
                  <Text style={styles.statCardLbl}>{t("games.redBall.result.maxCombo")}</Text>
                </View>
              </View>
              <View style={[styles.statCard, { width: "100%" }]}>
                <View style={styles.statIconWrap}>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={COLORS.muted}
                  />
                </View>
                <Text style={styles.statCardNum}>{resTime}</Text>
                <Text style={styles.statCardLbl}>{t("games.redBall.result.time")}</Text>
              </View>
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.btnSecondary, { flex: 1 }]}
                onPress={() => setScreen("start")}
                activeOpacity={0.8}
              >
                <Text style={styles.btnSecondaryText}>{t("games.redBall.result.menu")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, { flex: 1 }]}
                onPress={startGame}
                activeOpacity={0.8}
              >
                <Text style={styles.btnPrimaryText}>{t("games.redBall.result.tryAgain")}</Text>
              </TouchableOpacity>
            </View>
            <RetryBoostButton
              hasRetry={hasRetry}
              retryCount={retryCount}
              onPress={() => activateRetry(scoreRef.current, startGame)}
              style={{ width: "100%", marginTop: 8 }}
            />
          </View>
        </View>
      </SafeAreaWrapper>
    );
  }

  // ─── Game screen ──────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Flash overlay */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: flashColor.current,
            opacity: flashAnim,
            zIndex: 50,
          },
        ]}
      />

      {/* Score popups */}
      {popups.map((p) => (
        <ScorePopup key={p.id} item={p} />
      ))}

      <Animated.View
        style={[{ flex: 1 }, { transform: [{ translateX: shakeAnim }] }]}
      >
        <View style={{ flex: 1 }}>
          {/* HUD */}
          <View style={[styles.hud, { paddingTop: insets.top + 12 }]}>
            <View style={styles.hudBox}>
              <Text style={styles.hudLabel}>{t("games.redBall.hud.time")}</Text>
              <Text
                style={[styles.hudValue, timerWarning && styles.hudValueWarn]}
              >
                {Math.ceil(timeLeft)}
              </Text>
            </View>
            <View style={[styles.hudBox, styles.hudCenter]}>
              <Text style={styles.hudLabel}>{t("games.redBall.hud.points")}</Text>
              <Text style={[styles.hudValue, styles.hudValueGold]}>
                {score}
              </Text>
            </View>
            <View style={styles.hudBox}>
              <Text style={styles.hudLabel}>{t("games.redBall.hud.lives")}</Text>
              <Text style={styles.hudValue}>{heartStr(lives)}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.hudBox,
                styles.shieldBtn,
                shieldActive && styles.shieldBtnActive,
                (shieldCount === 0 || shieldUsedThisGame >= 2) &&
                  styles.shieldBtnDepleted,
              ]}
              onPress={() => {
                if (
                  shieldCount <= 0 ||
                  shieldRef.current ||
                  shieldUsedThisGame >= 2
                )
                  return;
                
                const success = consumeBoost("red_ball_shield");
                if (!success) return;

                shieldRef.current = true;
                setShieldActive(true);
                setShieldUsedThisGame((c) => c + 1);
              }}
              disabled={shieldCount === 0 || shieldUsedThisGame >= 2}
              activeOpacity={0.75}
            >
              <Text style={styles.shieldEmoji}>🛡️</Text>
              {!shieldActive && shieldCount > 0 && (
                <View style={styles.shieldBadge}>
                  <Text style={styles.shieldBadgeText}>{shieldCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Progress bar */}
          <View style={styles.progressWrap}>
            <View
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>

          {/* Combo label */}
          {showCombo && (
            <Animated.Text
              style={[styles.comboLabel, { opacity: comboOpacity }]}
            >
              {comboText}
            </Animated.Text>
          )}

          {/* Grid */}
          <View style={styles.gridWrap}>
            <View style={styles.grid}>
              {balls.map((isRed, i) => (
                <BallCell
                  key={i}
                  isRed={isRed}
                  onPress={(px, py) => onBallPress(i, px, py)}
                />
              ))}
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Ball cell ────────────────────────────────────────────────────────────────

function BallCell({
  isRed,
  onPress,
}: {
  isRed: boolean;
  onPress: (px: number, py: number) => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = (e: any) => {
    const { pageX, pageY } = e.nativeEvent;
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: isRed ? 1.5 : 0.88,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      scaleAnim.setValue(1);
    });
    onPress(pageX, pageY);
  };

  return (
    <TouchableWithoutFeedback onPress={handlePress}>
      <Animated.View
        style={[
          styles.ball,
          isRed ? styles.ballRed : styles.ballGreen,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.ballShine} />
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  start_footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: COLORS.bg,
  },
  safeArea: {
    flex: 1,
  },

  // ── Back btn ──
  backBtn: {
    position: "absolute",
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  backBtnText: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.accent,
  },

  // ── Start screen (new) ──
  start_backBtn: {
    position: "absolute",
    left: 16,
    paddingHorizontal: 10,
    height: 40,
    borderRadius: 12,
    paddingRight: 2,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.accent,
    letterSpacing: 2,
    marginBottom: 8,
    textAlign: "center",
  },
  start_subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  start_descCard: {
    width: "100%",
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.muted,
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
    color: COLORS.muted,
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
    paddingVertical: 3,
    alignItems: "center",
  },
  start_scorePts: {
    fontSize: 12,
    fontWeight: "900",
    color: "#fff",
  },
  start_scoreText: {
    fontSize: 12,
    color: COLORS.muted,
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
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.muted,
    fontWeight: "600",
    textAlign: "center",
  },
  start_playBtn: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: COLORS.red,
    alignItems: "center",
    shadowColor: COLORS.red,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  start_playBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 2,
  },

  // ── Start ──
  startContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logoBall: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.red,
    shadowColor: COLORS.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
    marginBottom: 28,
  },
  startTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 2,
    marginBottom: 10,
    textAlign: "center",
  },
  startSub: {
    fontSize: 14,
    color: "#8fb3cc",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 48,
  },
  btnPlay: {
    width: "100%",
    maxWidth: 280,
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: COLORS.red,
    alignItems: "center",
    shadowColor: COLORS.red,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  btnPlayText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 2,
  },

  // ── HUD ──
  hud: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  hudBox: {
    flex: 1,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  hudCenter: {
    flex: 1.5,
    borderColor: "rgba(251,191,36,0.3)",
    backgroundColor: "rgba(251,191,36,0.06)",
  },
  hudLabel: {
    fontSize: 9,
    letterSpacing: 2,
    color: COLORS.muted,
    fontWeight: "700",
    marginBottom: 2,
  },
  hudValue: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.text,
  },
  hudValueWarn: {
    color: COLORS.red,
  },
  hudValueGold: {
    fontSize: 26,
    color: COLORS.gold,
  },

  // ── Progress ──
  progressWrap: {
    marginHorizontal: 16,
    marginTop: 10,
    height: 5,
    backgroundColor: "#1a3a52",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.accent,
    borderRadius: 4,
  },

  // ── Combo ──
  comboLabel: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.gold,
    letterSpacing: 1,
    marginTop: 8,
  },

  // ── Grid ──
  gridWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: GRID_H_PAD,
    paddingTop: 8,
    paddingBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: BALL_GAP,
    width: "100%",
    justifyContent: "center",
  },
  ball: {
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  ballGreen: {
    backgroundColor: COLORS.green,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  ballRed: {
    backgroundColor: COLORS.red,
    shadowColor: COLORS.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 10,
  },
  ballShine: {
    position: "absolute",
    top: "12%",
    left: "22%",
    width: "28%",
    height: "20%",
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 99,
    transform: [{ rotate: "-30deg" }],
  },

  // ── Score popup ──
  scorePop: {
    position: "absolute",
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.gold,
    zIndex: 100,
    pointerEvents: "none",
  } as any,
  scorePopMiss: {
    color: COLORS.red,
    fontSize: 20,
  },

  // ── Result ──
  resultContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  resultEmoji: {
    fontSize: 64,
    marginBottom: 6,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.gold,
    letterSpacing: 1,
    marginBottom: 20,
  },
  statsRowComparison: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    justifyContent: "center",
    width: "100%",
    maxWidth: 320,
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
    color: COLORS.muted,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
  recordBadge: {
    backgroundColor: COLORS.gold,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 16,
  },
  recordText: {
    color: "#1a1a00",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: "column",
    gap: 8,
    width: "100%",
    maxWidth: 320,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statCard: {
    backgroundColor: COLORS.panel,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    marginBottom: 6,
  },
  statCardHighlight: {
    borderColor: "rgba(251,191,36,0.3)",
    backgroundColor: "rgba(251,191,36,0.03)",
  },
  statCardNum: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
  },
  statCardLbl: {
    fontSize: 9,
    color: COLORS.muted,
    letterSpacing: 1.5,
    fontWeight: "700",
    marginTop: 2,
    textTransform: "uppercase",
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    maxWidth: 320,
  },
  btnSecondary: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.panel,
    alignItems: "center",
  },
  btnSecondaryText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },
  btnPrimary: {
    borderRadius: 14,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  shieldBtn: {
    flex: 0.8,
    borderColor: "rgba(56,189,248,0.3)",
  },
  shieldBtnActive: {
    borderColor: "rgba(56,189,248,0.8)",
    backgroundColor: "rgba(56,189,248,0.12)",
  },
  shieldBtnDepleted: {
    opacity: 0.3,
  },
  shieldEmoji: {
    fontSize: 22,
  },
  shieldBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  shieldBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#000",
  },
});
