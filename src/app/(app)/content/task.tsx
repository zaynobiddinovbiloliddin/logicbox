import Wrapper from "@/components/shared/wrapper";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { getCurrentChallengeDay } from "@/halpers/challenges";
import { getDailyGames } from "@/halpers/daily-games";
import { openAdScreen } from "@/halpers/open-ad-screen";
import { useCountdown } from "@/hooks/use-cool-down";
import { ChallengesModule } from "@/services/modules/challenges-module";
import {
  UNLOCK_WAIT_MS,
  useDailyChallengeProgress,
} from "@/store/daily-challenge-progress";
import type {
  Challenge,
  ChallengeDay,
  ChallengeProgress,
} from "@/types/challenges";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

export default function DailyTaskList() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [progress, setProgress] = useState<ChallengeProgress | null>(null);
  const [days, setDays] = useState<ChallengeDay[]>([]);
  const [infoModalVisible, setInfoModalVisible] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  const todaysGames = useMemo(() => getDailyGames(6), []);

  const ensureFresh = useDailyChallengeProgress((s) => s.ensureFresh);
  const unlockStartFor = useDailyChallengeProgress((s) => s.unlockStartFor);
  const completedAt = useDailyChallengeProgress((s) => s.completedAt);
  const adUnlocked = useDailyChallengeProgress((s) => s.adUnlocked);
  const markCompleted = useDailyChallengeProgress((s) => s.markCompleted);
  const markAdUnlocked = useDailyChallengeProgress((s) => s.markAdUnlocked);

  useEffect(() => {
    ensureFresh();
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, [ensureFresh]);

  const fetchData = useCallback(async () => {
    if (!id) return;

    try {
      const [challengeData, progressData, daysData] = await Promise.all([
        ChallengesModule.getChallengeDetail(id),
        ChallengesModule.getChallengeProgress(id),
        ChallengesModule.getChallengeDays(id),
      ]);

      setChallenge(challengeData);
      setProgress(progressData);
      setDays(daysData);
    } catch (error) {
      console.error("Failed to fetch daily challenge content:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  type GameSlotStatus = "locked" | "countdown" | "ready" | "done";

  function getSlotStatus(index: number): GameSlotStatus {
    if (completedAt[index]) return "done";
    const unlockStart = unlockStartFor(index);
    if (unlockStart === null) return "locked";
    if (adUnlocked[index] || now - unlockStart >= UNLOCK_WAIT_MS) return "ready";
    return "countdown";
  }

  function getRemainingLabel(index: number) {
    const unlockStart = unlockStartFor(index);
    if (unlockStart === null) return "";
    const remainingMs = Math.max(UNLOCK_WAIT_MS - (now - unlockStart), 0);
    const totalMinutes = Math.ceil(remainingMs / 60000);
    const hoursLeft = Math.floor(totalMinutes / 60);
    const minutesLeft = totalMinutes % 60;
    if (hoursLeft > 0) {
      return t("content.task.unlockInHours", { hours: hoursLeft, minutes: minutesLeft });
    }
    return t("content.task.unlockInMinutes", { minutes: minutesLeft });
  }

  function navigateToGame(game: (typeof todaysGames)[number]) {
    const currentDay = getCurrentChallengeDay(days);
    router.navigate({
      pathname: game.route as any,
      params: {
        gameId: String(game.id),
        dayId: currentDay ? String(currentDay.id) : undefined,
      },
    });
  }

  function handleTodaysGamePress(game: (typeof todaysGames)[number], index: number) {
    const status = getSlotStatus(index);
    if (status !== "ready") return;
    markCompleted(index);
    navigateToGame(game);
  }

  function handleWatchAdPress(game: (typeof todaysGames)[number], index: number) {
    markAdUnlocked(index);
    markCompleted(index);
    openAdScreen({
      gameId: game.id,
      targetPath: String(game.route),
    });
  }

  const progressPercentage = progress
    ? (progress.completedDays / progress.totalDays) * 100
    : 0;

  const challengeEndDate = useMemo(() => {
    if (challenge?.endsAt) return challenge.endsAt;
    if (progress?.endsAt) return progress.endsAt;
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date;
  }, [challenge?.endsAt, progress?.endsAt]);

  const { days: TIMER_DAYS, hours, minutes, seconds } = useCountdown(challengeEndDate);

  const progressAnim = useAnimatedStyle(() => ({
    width: withSpring(`${progressPercentage}%`, { damping: 20, stiffness: 90 }),
  }));

  if (loading && !challenge) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#0A0A14' }}>
        <ActivityIndicator size="large" color="#4D96FF" />
      </View>
    );
  }

  return (
    <>
      <Wrapper>
        <View style={styles.rootContainer}>
          <Pressable onPress={() => router.back()} style={styles.backRow}>
            <View style={styles.backBtn}><Ionicons name="chevron-back" size={20} color="#fff" /></View>
            <ThemedText style={styles.backText}>{t("content.task.back")}</ThemedText>
          </Pressable>

          <ThemedText type="title" style={{ color: "#fff" }}>{t("content.task.title")}</ThemedText>

          <View style={styles.timerCard}>
            <LinearGradient colors={["rgba(77,150,255,0.08)", "rgba(199,125,255,0.06)"]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.cardBorder} />
            <ThemedText style={styles.timerLabel}>{t("content.task.timeLeft")}</ThemedText>
            <ThemedText type="subtitle" style={styles.timerValue}>
              {TIMER_DAYS > 0 && `${TIMER_DAYS}${t("content.task.dayShort")} `}
              {hours}{t("content.task.hourShort")} {minutes}{t("content.task.minuteShort")} {seconds}{t("content.task.secondShort")}
            </ThemedText>
          </View>

          <View style={styles.progressCard}>
            <LinearGradient colors={["rgba(77,150,255,0.08)", "rgba(199,125,255,0.06)"]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.cardBorder} />
            <ThemedText style={styles.progressText}>
              {t("content.task.progress")} {Math.round(progressPercentage)}%
            </ThemedText>
            <View style={styles.progressBarBackground}>
              <Animated.View style={[styles.progressBarFill, progressAnim]} />
            </View>
          </View>

          <ThemedText style={styles.todaysGamesTitle}>
            {t("content.task.todaysGames")}
          </ThemedText>
          <View style={styles.gamesGrid}>
            {todaysGames.map((game, index) => {
              const status = getSlotStatus(index);
              const isLocked = status === "locked";
              const isDone = status === "done";
              const isCountdown = status === "countdown";

              return (
                <TouchableOpacity
                  key={game.id}
                  style={styles.gameTile}
                  activeOpacity={0.85}
                  disabled={isLocked || isDone || isCountdown}
                  onPress={() => handleTodaysGamePress(game, index)}
                >
                  <LinearGradient
                    colors={
                      isLocked
                        ? ["rgba(255,255,255,0.03)", "rgba(255,255,255,0.02)"]
                        : [`${game.from}22`, `${game.to}11`]
                    }
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <View
                    style={[
                      styles.cardBorder,
                      { borderColor: isLocked ? "rgba(255,255,255,0.07)" : `${game.from}33` },
                    ]}
                  />

                  {isDone && (
                    <View style={styles.doneBadge}>
                      <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
                    </View>
                  )}

                  <View style={[styles.gameTileIconWrap, (isLocked || isCountdown) && styles.gameTileIconDim]}>
                    {isLocked ? (
                      <Ionicons name="lock-closed" size={28} color="rgba(255,255,255,0.25)" />
                    ) : (
                      <Image source={game.icon} style={styles.gameTileIcon} contentFit="contain" />
                    )}
                  </View>

                  <ThemedText
                    style={[styles.gameTileTitle, (isLocked || isCountdown) && styles.gameTileTitleDim]}
                    numberOfLines={2}
                  >
                    {game.title}
                  </ThemedText>

                  {isCountdown && (
                    <>
                      <ThemedText style={styles.gameTileCountdown}>
                        {getRemainingLabel(index)}
                      </ThemedText>
                      <TouchableOpacity
                        style={styles.gameTileAdBtn}
                        activeOpacity={0.85}
                        onPress={() => handleWatchAdPress(game, index)}
                      >
                        <Ionicons name="play-circle" size={14} color="#0A0A14" />
                        <ThemedText style={styles.gameTileAdBtnText}>
                          {t("content.task.startNow")}
                        </ThemedText>
                      </TouchableOpacity>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Wrapper>

      <Modal
        visible={infoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <LinearGradient
              colors={["rgba(77,150,255,0.12)", "rgba(199,125,255,0.08)"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.modalBorder} />
            <ThemedText style={styles.modalTitle}>{t("content.task.infoModal.title")}</ThemedText>
            <ThemedText style={styles.modalBody}>{t("content.task.infoModal.body")}</ThemedText>
            <TouchableOpacity
              style={styles.modalOkBtn}
              activeOpacity={0.85}
              onPress={() => setInfoModalVisible(false)}
            >
              <ThemedText style={styles.modalOkBtnText}>{t("content.task.infoModal.ok")}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  rootContainer: { padding: Spacing.x, gap: Spacing.three },
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  backText: { color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: "600" },
  cardBorder: { ...StyleSheet.absoluteFillObject, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  timerCard: { padding: 16, borderRadius: 16, alignItems: "center", gap: 8, overflow: "hidden" },
  timerLabel: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "600" },
  timerValue: { fontSize: 20, fontWeight: "800", color: "#fff" },
  progressCard: { padding: 16, borderRadius: 16, gap: 10, overflow: "hidden" },
  progressText: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.6)" },
  progressBarBackground: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.07)", overflow: "hidden" },
  progressBarFill: { height: 8, borderRadius: 4, backgroundColor: "#FFD700" },
  todaysGamesTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },
  gamesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gameTile: {
    width: "47%",
    borderRadius: 16,
    padding: 14,
    overflow: "hidden",
    alignItems: "center",
    gap: 8,
    minHeight: 110,
    justifyContent: "center",
  },
  gameTileIconWrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  gameTileIconDim: {
    opacity: 0.6,
  },
  gameTileIcon: {
    width: "100%",
    height: "100%",
  },
  gameTileTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  gameTileTitleDim: {
    color: "rgba(255,255,255,0.4)",
  },
  doneBadge: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  gameTileCountdown: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  gameTileAdBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFD93D",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  gameTileAdBtnText: {
    color: "#0A0A14",
    fontSize: 11,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 24,
    padding: 22,
    overflow: "hidden",
    backgroundColor: "#0F1020",
    gap: 14,
  },
  modalBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(77,150,255,0.25)",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  modalBody: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    lineHeight: 20,
  },
  modalOkBtn: {
    backgroundColor: "#4D96FF",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  modalOkBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
});
