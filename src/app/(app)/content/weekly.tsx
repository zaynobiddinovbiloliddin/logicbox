import { ChallengeDayCard } from "@/components/shared/challenge-day-card";
import { games } from "@/constants/games";
import GamePickerSheet, {
  type GameId,
} from "@/components/sheets/game-picker-sheet";
import Wrapper from "@/components/shared/wrapper";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useCountdown } from "@/hooks/use-cool-down";
import {
  canOpenChallengeDay,
  shouldStartChallengeDay,
} from "@/halpers/challenges";
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
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";

export default function WeeklyContent() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const gamePickerRef = useRef<BottomSheetModal>(null);
  const [loading, setLoading] = useState(true);
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
      setLoading(true);
      const [challengeData, progressData, daysData] = await Promise.all([
        ChallengesModule.getChallengeDetail(id as string),
        ChallengesModule.getChallengeProgress(id as string),
        ChallengesModule.getChallengeDays(id as string),
      ]);
      setChallenge(challengeData);
      setProgress(progressData);
      setDays(daysData);
    } catch (error) {
      console.error("Failed to fetch challenge content:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchRemoteGames();
      fetchData();
    }, [fetchData, fetchRemoteGames])
  );

  async function handleDayPress(day: any) {
    if (!canOpenChallengeDay(day) && !shouldStartChallengeDay(day)) return;

    try {
      const gamesData = await ChallengesModule.getDayGames(day.id);
      const merged = mergeAdFlags(gamesData.games ?? []);
      setDayGames(merged);
      setSelectedDay({ ...day, games: merged });
    } catch {
      setDayGames([]);
      setSelectedDay(day);
    }
    requestAnimationFrame(() => {
      gamePickerRef.current?.present();
    });
  }

  async function handleGameSelect(gameId: GameId, challengeDayGameId?: string | number) {
    gamePickerRef.current?.dismiss();

    if (!selectedDay) return;

    try {
      if (shouldStartChallengeDay(selectedDay)) {
        await ChallengesModule.startDay(selectedDay.id);
      }

      const game = games.find((g) => g.id === Number(gameId));
      if (game) {
        router.navigate({
          pathname: game.route as any,
          params: { 
            dayId: String(selectedDay.id), 
            gameId: String(game.id),
            challengeDayGameId: challengeDayGameId ? String(challengeDayGameId) : undefined
          },
        });
      }
    } catch (error) {
      console.error("Failed to start day:", error);
    }
  }

  const progressPercentage = progress
    ? (progress.completedDays / progress.totalDays) * 100
    : 0;

  // Timer logic - stabilized with useMemo
  const challengeEndDate = useMemo(() => {
    if (challenge?.endsAt) {
      return challenge.endsAt;
    }

    if (progress?.endsAt) {
      return progress.endsAt;
    }

    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
  }, [challenge?.endsAt, progress?.endsAt]);

  const {
    days: TIMER_DAYS,
    hours,
    minutes,
    seconds,
  } = useCountdown(challengeEndDate);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4D96FF" />
      </View>
    );
  }

  return (
    <>
      <Wrapper allowBounce={false}>
        <View style={styles.rootContainer}>
          <Pressable onPress={() => router.back()} style={styles.backRow}>
            <View style={styles.backBtn}>
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </View>
            <ThemedText style={styles.backText}>{t("content.weekly.back")}</ThemedText>
          </Pressable>

          <ThemedText type="title">{t("content.weekly.title")}</ThemedText>

          {/* Progress card */}
          <View style={styles.progressCard}>
            <LinearGradient
              colors={["rgba(77,150,255,0.08)", "rgba(199,125,255,0.06)"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.cardBorder} />
            <ThemedText style={styles.progressText}>
              {t("content.weekly.progress")}: {Math.round(progressPercentage)}%
            </ThemedText>
            <View style={styles.progressBarBackground}>
              <LinearGradient
                colors={["#4D96FF", "#C77DFF"]}
                style={[
                  styles.progressBarFill,
                  { width: `${progressPercentage}%` },
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
          </View>

          {/* Timer card */}
          <View style={styles.timerCard}>
            <LinearGradient
              colors={["rgba(77,150,255,0.08)", "rgba(199,125,255,0.06)"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.cardBorder} />
            <ThemedText style={styles.progressText}>
              {t("content.weekly.timeLeft")}
            </ThemedText>
            <View style={styles.timerRow}>
              {TIMER_DAYS > 0 && (
                <View style={styles.timerUnit}>
                  <LinearGradient
                    colors={["rgba(77,150,255,0.18)", "rgba(107,95,255,0.18)"]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <View style={styles.timerUnitBorder} />
                  <ThemedText style={styles.timerNum}>{TIMER_DAYS}</ThemedText>
                  <ThemedText style={styles.timerLabel}>{t("content.weekly.dayShort")}</ThemedText>
                </View>
              )}
              <View style={styles.timerUnit}>
                <LinearGradient
                  colors={["rgba(77,150,255,0.18)", "rgba(107,95,255,0.18)"]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View style={styles.timerUnitBorder} />
                <ThemedText style={styles.timerNum}>{hours}</ThemedText>
                <ThemedText style={styles.timerLabel}>{t("content.weekly.hourShort")}</ThemedText>
              </View>
              <ThemedText style={styles.timerSep}>:</ThemedText>
              <View style={styles.timerUnit}>
                <LinearGradient
                  colors={["rgba(77,150,255,0.18)", "rgba(107,95,255,0.18)"]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View style={styles.timerUnitBorder} />
                <ThemedText style={styles.timerNum}>{minutes}</ThemedText>
                <ThemedText style={styles.timerLabel}>{t("content.weekly.minuteShort")}</ThemedText>
              </View>
              <ThemedText style={styles.timerSep}>:</ThemedText>
              <View style={styles.timerUnit}>
                <LinearGradient
                  colors={["rgba(199,125,255,0.18)", "rgba(77,150,255,0.18)"]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View
                  style={[
                    styles.timerUnitBorder,
                    { borderColor: "rgba(199,125,255,0.3)" },
                  ]}
                />
                <ThemedText style={[styles.timerNum, { color: "#C77DFF" }]}>
                  {seconds}
                </ThemedText>
                <ThemedText style={styles.timerLabel}>{t("content.weekly.secondShort")}</ThemedText>
              </View>
            </View>
          </View>
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <LinearGradient
                colors={["rgba(77,150,255,0.1)", "rgba(107,95,255,0.08)"]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View
                style={[
                  styles.cardBorder,
                  { borderColor: "rgba(77,150,255,0.2)" },
                ]}
              />
              <ThemedText style={styles.infoTitle}>{t("content.weekly.totalScore")}</ThemedText>
              <ThemedText style={styles.infoValue}>
                {progress?.totalScore || 0}
              </ThemedText>
            </View>

            <TouchableOpacity
              onPress={() =>
                router.navigate({
                  pathname: "/(app)/content/top-raiting",
                  params: { id: id as string },
                })
              }
              style={styles.infoCard}
            >
              <LinearGradient
                colors={["rgba(199,125,255,0.1)", "rgba(77,150,255,0.08)"]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View
                style={[
                  styles.cardBorder,
                  { borderColor: "rgba(199,125,255,0.2)" },
                ]}
              />
              <ThemedText style={styles.infoTitle}>{t("content.weekly.rating")}</ThemedText>
              <ThemedText style={styles.infoValue}>{t("content.weekly.view")}</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Day list */}
          <View style={styles.container}>
            {days.map((day) => (
              <ChallengeDayCard
                key={day.id}
                day={day}
                challengeType="weekly"
                onPress={() => handleDayPress(day)}
                disabled={!canOpenChallengeDay(day) && !shouldStartChallengeDay(day)}
              />
            ))}
          </View>
        </View>
      </Wrapper>

      <GamePickerSheet
        ref={gamePickerRef}
        adDayId={selectedDay?.id}
        startDayBeforeAd={shouldStartChallengeDay(selectedDay)}
        games={dayGames}
        onSelect={handleGameSelect}
        onClose={() => {
          setSelectedDay(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  rootContainer: {
    padding: Spacing.x,
    rowGap: Spacing.three,
  },

  // Shared card border overlay
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },

  // Progress card
  progressCard: {
    padding: 16,
    borderRadius: 16,
    gap: 10,
    overflow: "hidden",
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
  },
  progressBarBackground: {
    height: 7,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
  },
  progressBarFill: {
    height: 7,
    borderRadius: 6,
  },

  // Timer card
  timerCard: {
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timerUnit: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  timerUnitBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(77,150,255,0.3)",
  },
  timerNum: {
    fontSize: 18,
    fontWeight: "800",
    color: "#4D96FF",
    letterSpacing: -0.5,
  },
  timerLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.3)",
    fontWeight: "600",
  },
  timerSep: {
    fontSize: 20,
    fontWeight: "800",
    color: "rgba(255,255,255,0.2)",
    marginBottom: 12,
  },

  // Info grid
  infoGrid: {
    flexDirection: "row",
    gap: 12,
  },
  infoCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    overflow: "hidden",
    gap: 4,
  },
  infoTitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600",
  },
  infoValue: {
    fontWeight: "800",
    fontSize: 14,
    color: "#fff",
    marginTop: 2,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "600",
  },
});
