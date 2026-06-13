import { ChallengeDayCard } from "@/components/shared/challenge-day-card";
import GamePickerSheet, {
  type GameId,
} from "@/components/sheets/game-picker-sheet";
import Wrapper from "@/components/shared/wrapper";
import { ThemedText } from "@/components/themed-text";
import { games as localGames } from "@/constants/games";
import { Spacing } from "@/constants/theme";
import {
  canOpenChallengeDay,
} from "@/halpers/challenges";
import { useCountdown } from "@/hooks/use-cool-down";
import { ChallengesModule } from "@/services/modules/challenges-module";
import { GamesModule } from "@/services/modules/games-module";
import type {
  Challenge,
  ChallengeDay,
  ChallengeDayGame,
  ChallengeProgress,
} from "@/types/challenges";
import type { RemoteGame } from "@/types/games";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
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
  const gamePickerRef = useRef<BottomSheetModal>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [progress, setProgress] = useState<ChallengeProgress | null>(null);
  const [days, setDays] = useState<ChallengeDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<ChallengeDay | null>(null);
  const [dayGames, setDayGames] = useState<ChallengeDayGame[]>([]);
  const [remoteGames, setRemoteGames] = useState<RemoteGame[]>([]);

  const fetchRemoteGames = useCallback(async () => {
    try {
      const data = await GamesModule.getGames();
      setRemoteGames(Array.isArray(data) ? data : data.games ?? []);
    } catch {}
  }, []);

  function mergeAdFlags(dayGamesList: ChallengeDayGame[]) {
    return dayGamesList.map((dg) => {
      const remote = remoteGames.find((rg) => rg.id === dg.game?.id);
      return {
        ...dg,
        withReclam: dg.withReclam ?? dg.game?.withReclam ?? remote?.withReclam ?? false,
        reclamSeen: dg.reclamSeen ?? dg.game?.reclamSeen ?? remote?.reclamSeen ?? false,
        reclamSkipPrice: dg.reclamSkipPrice ?? dg.game?.reclamSkipPrice ?? remote?.reclamSkipPrice ?? 20,
      };
    });
  }

  const fetchData = useCallback(async () => {
    if (!id) return;

    try {
      const [challengeData, progressData, daysData] = await Promise.all([
        ChallengesModule.getChallengeDetail(id),
        ChallengesModule.getChallengeProgress(id),
        ChallengesModule.getChallengeDays(id),
      ]);

      // Enrich each day with its games so ChallengeDayCard can show progress/checkboxes
      const enrichedDays = await Promise.all(
        daysData.map(async (day: any) => {
          try {
            const gData = await ChallengesModule.getDayGames(day.id);
            return { ...day, games: gData.games };
          } catch {
            return day;
          }
        })
      );

      setChallenge(challengeData);
      setProgress(progressData);
      setDays(enrichedDays);
    } catch (error) {
      console.error("Failed to fetch daily challenge content:", error);
    } finally {
      setLoading(false);
      setActionLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchRemoteGames();
      fetchData();
    }, [fetchData, fetchRemoteGames])
  );

  async function handleDayPress(day: any) {
    if (!canOpenChallengeDay(day)) return;

    try {
      setActionLoading(true);
      const gamesData = await ChallengesModule.getDayGames(day.id);
      const merged = mergeAdFlags(gamesData.games);
      setDayGames(merged);
      const enrichedDay = { ...day, games: merged };
      setSelectedDay(enrichedDay);
      setDays(prev => prev.map(d => d.id === day.id ? enrichedDay : d));
      setActionLoading(false);
      requestAnimationFrame(() => {
        gamePickerRef.current?.present();
      });
    } catch (error) {
      setActionLoading(false);
      Alert.alert(t("content.task.errorTitle"), t("content.task.loadDayGamesError"));
    }
  }

  async function handleGameSelect(gameId: GameId, challengeDayGameId?: string | number) {
    gamePickerRef.current?.dismiss();

    if (!selectedDay) return;

    const localGame = localGames.find((g) => g.id === Number(gameId));
    if (localGame) {
      router.navigate({
        pathname: localGame.route as any,
        params: { 
          dayId: String(selectedDay.id), 
          gameId: String(localGame.id),
          challengeDayGameId: challengeDayGameId ? String(challengeDayGameId) : undefined
        },
      });
    }
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

          <ThemedText type="title">{t("content.task.title")}</ThemedText>

          {/* Action Loader Overlay */}
          {actionLoading && (
            <View style={styles.actionLoader}>
              <ActivityIndicator size="large" color="#FFD700" />
            </View>
          )}

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

          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <LinearGradient colors={["rgba(77,150,255,0.1)", "rgba(107,95,255,0.08)"]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <View style={[styles.cardBorder, { borderColor: "rgba(77,150,255,0.2)" }]} />
              <ThemedText style={styles.infoTitle}>{t("content.task.totalScore")}</ThemedText>
              <ThemedText style={styles.infoValue}>{progress?.totalScore || 0}</ThemedText>
            </View>
            <TouchableOpacity onPress={() => router.navigate({ pathname: "/(app)/content/top-raiting", params: { id: id as string } })} style={styles.infoCard}>
              <LinearGradient pointerEvents="none" colors={["rgba(199,125,255,0.1)", "rgba(77,150,255,0.08)"]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <View pointerEvents="none" style={[styles.cardBorder, { borderColor: "rgba(199,125,255,0.2)" }]} />
              <ThemedText style={styles.infoTitle}>{t("content.task.rating")}</ThemedText>
              <ThemedText style={styles.infoValue}>{t("content.task.view")}</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.container}>
            {days.map((day) => (
              <ChallengeDayCard key={day.id} day={day} challengeType="daily" onPress={() => handleDayPress(day)} disabled={actionLoading || !canOpenChallengeDay(day)} />
            ))}
          </View>
        </View>
      </Wrapper>

      <GamePickerSheet
        ref={gamePickerRef}
        adDayId={selectedDay?.id}
        games={dayGames}
        onSelect={handleGameSelect}
        onClose={() => { setSelectedDay(null); }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  rootContainer: { padding: Spacing.x, gap: Spacing.three },
  container: { gap: 12 },
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
  infoGrid: { flexDirection: "row", gap: 12 },
  infoCard: { flex: 1, padding: 16, borderRadius: 16, alignItems: "center", overflow: "hidden", gap: 4 },
  infoTitle: { fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: "600" },
  infoValue: { fontWeight: "800", fontSize: 14, color: "#fff", marginTop: 2 },
  actionLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16
  }
});
