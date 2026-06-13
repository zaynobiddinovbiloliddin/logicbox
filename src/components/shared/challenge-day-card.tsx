import React from "react";
import { Pressable, View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { ThemedView } from "../themed-view";
import { ThemedText } from "../themed-text";
import { LinearGradient } from "expo-linear-gradient";
import { formatChallengeDayLabel, formatChallengeTaskLabel } from "@/halpers/challenges";
import { useTranslation } from "react-i18next";
import type { ChallengeDay } from "@/types/challenges";

export function ChallengeDayCard({
  day,
  challengeType,
  onPress,
  disabled,
}: {
  day: ChallengeDay;
  challengeType: "daily" | "weekly" | "monthly";
  onPress?: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const isWeeklyOrMonthly =
    challengeType === "weekly" || challengeType === "monthly";
  const hasActivity = typeof day.activityToComplete === "number";
  
  // More robust completion check
  const allGamesCompleted = day.games && day.games.length > 0 && 
    day.games.every((g: any) => g.completed === true || g.completed > 0 || g.status === "completed");

  const isDone =
    day.status === "completed" ||
    allGamesCompleted ||
    (hasActivity && (day.activity || 0) >= (day.activityToComplete || 10));
    
  const isInProgress = day.status === "in_progress" || (day.games && day.games.some((g: any) => g.completed === true || g.completed > 0 || g.status === "completed"));
  const isLocked = day.status === "locked" && !day.canStart;
  const isLockedCanStart = day.status === "locked" && day.canStart;

  const getStatusDisplay = () => {
    if (day?.isUnlocked && day?.canStart) return t("components.challengeDayCard.status.unlocked");
    if (isDone) return t("components.challengeDayCard.status.done");
    if (isInProgress) return t("components.challengeDayCard.status.continue");
    if (isLockedCanStart) return t("components.challengeDayCard.status.start");
    return t("components.challengeDayCard.status.locked");
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(1) }],
    opacity: withTiming(1),
  }));

  const progress = hasActivity
    ? Math.min(((day.activity || 0) / (day.activityToComplete || 10)) * 100, 100)
    : 0;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable onPress={onPress} disabled={disabled}>
        <View style={[styles.dayCard, isLocked && styles.lockedCard]}>
          <LinearGradient
            colors={
              isDone
                ? ["rgba(77,150,255,0.07)", "rgba(34,197,94,0.05)"]
                : isInProgress || isLockedCanStart
                ? ["rgba(77,150,255,0.1)", "rgba(199,125,255,0.07)"]
                : ["rgba(255,255,255,0.02)", "rgba(255,255,255,0.02)"]
            }
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View
            style={[
              styles.cardBorder,
              isDone && { borderColor: "rgba(34,197,94,0.25)" },
              (isInProgress || isLockedCanStart) && {
                borderColor: "rgba(77,150,255,0.3)",
              },
            ]}
          />

          <View style={{ flex: 1, marginRight: 10 }}>
            <View>
              <ThemedText style={styles.dayTitle}>
                {formatChallengeDayLabel(day)}
              </ThemedText>
              {!isWeeklyOrMonthly && (
                <ThemedText style={styles.dayTask}>
                  {formatChallengeTaskLabel(day)}
                </ThemedText>
              )}
            </View>

            {hasActivity && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBarBackground}>
                  <LinearGradient
                    colors={["#4D96FF", "#C77DFF"]}
                    style={[styles.progressBarFill, { width: `${progress}%` }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                </View>
                <ThemedText style={styles.progressText}>
                  {day.activity || 0} / {day.activityToComplete || 10}
                </ThemedText>
              </View>
            )}

            {day.isUnlocked && (
              <ThemedText style={styles.unlockedBadge}>
                {t("components.challengeDayCard.unlockedBadge")}
              </ThemedText>
            )}
            {/* Progress dots/circles */}
            {(day.games || typeof day.totalGames === "number") && (
              <View style={styles.gamesList}>
                {day.games && day.games.length > 0 
                  ? day.games.map((g: any, idx: number) => {
                      const isGameDone = g.completed === true || g.completed > 0 || g.status === "completed";
                      return (
                        <View
                          key={g.challengeDayGameId || g.id || idx}
                          style={[
                            styles.gameDot,
                            isGameDone && styles.gameDotCompleted,
                          ]}
                        />
                      );
                    })
                  : Array.from({ length: day.totalGames || 5 }).map((_, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.gameDot,
                          idx < (day.completedGames || 0) && styles.gameDotCompleted,
                        ]}
                      />
                    ))
                }
              </View>
            )}
          </View>

          <ThemedText
            style={[
              styles.status,
              isDone && styles.statusDone,
              (isInProgress || isLockedCanStart) && styles.statusInProgress,
              isLocked && styles.statusClosed,
            ]}
          >
            {getStatusDisplay()}
          </ThemedText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dayCard: {
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    overflow: "hidden",
    minHeight: 80,
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  lockedCard: {
    opacity: 0.4,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.2,
  },
  dayTask: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginTop: 3,
  },
  status: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusDone: {
    color: "#22C55E",
  },
  statusInProgress: {
    color: "#4D96FF",
  },
  statusClosed: {
    color: "rgba(255,255,255,0.25)",
  },
  progressContainer: {
    marginTop: 8,
    gap: 4,
  },
  progressBarBackground: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
    width: "100%",
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "600",
  },
  unlockedBadge: {
    marginTop: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
    color: "#FFD93D",
    fontSize: 10,
    fontWeight: "700",
    backgroundColor: "rgba(255,217,61,0.12)",
  },
  gamesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  gameDot: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  gameDotCompleted: {
    backgroundColor: "#4D96FF",
    borderColor: "#4D96FF",
  },
});
