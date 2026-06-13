import SafeAreaWrapper from "@/components/shared/safe-area-wrapper";
import { games } from "@/constants/games";
import { ChallengesModule } from "@/services/modules/challenges-module";
import { GamesModule } from "@/services/modules/games-module";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const AD_DURATION_SECONDS = 15;

export default function WatchAdScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    gameId?: string;
    dayId?: string;
    challengeDayGameId?: string;
    targetPath?: string;
    startDayBeforeOpen?: string;
  }>();
  const gameId = Number(params.gameId);
  const targetPath = params.targetPath;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [secondsLeft, setSecondsLeft] = useState(AD_DURATION_SECONDS);
  const [isFinished, setIsFinished] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const game = useMemo(
    () => games.find((item) => item.id === gameId),
    [gameId],
  );

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: AD_DURATION_SECONDS * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const nextSecondsLeft = Math.max(AD_DURATION_SECONDS - elapsed, 0);
      setSecondsLeft(nextSecondsLeft);

      if (nextSecondsLeft === 0) {
        clearInterval(timer);
        setIsFinished(true);
      }
    }, 250);

    return () => {
      clearInterval(timer);
      progressAnim.stopAnimation();
    };
  }, [progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const handleComplete = async () => {
    if (!targetPath || !gameId || isCompleting) return;

    try {
      setIsCompleting(true);
      if (params.startDayBeforeOpen === "1" && params.dayId) {
        await ChallengesModule.startDay(params.dayId).catch((error) => {
          console.warn("Failed to start challenge day before ad redirect:", error);
        });
      }
      await GamesModule.reclamSeen(gameId, "ad");
      router.replace({
        pathname: targetPath as any,
        params: {
          gameId: String(gameId),
          dayId: params.dayId,
          challengeDayGameId: params.challengeDayGameId,
        },
      });
    } catch (error) {
      console.error("Failed to update reclam status:", error);
      setIsCompleting(false);
      Alert.alert(
        t("tabs.games.errorTitle"),
        t("tabs.games.reclamUpdateError"),
      );
    }
  };

  useEffect(() => {
    if (isFinished) {
      handleComplete();
    }
  }, [isFinished]);

  const title = game?.title ?? t("tabs.games.watchAd");
  const subtitle = game?.subtitle ?? t("tabs.games.accessMessage");

  return (
    <SafeAreaWrapper>
      <View style={styles.screen}>
        <LinearGradient
          colors={["#060816", "#0E1327", "#171B34"]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>

          <View style={styles.headerTextWrap}>
            <Text style={styles.eyebrow}>{t("tabs.games.adScreen.badge")}</Text>
            <Text style={styles.headerTitle}>{t("tabs.games.watchAd")}</Text>
          </View>

          <View style={styles.iconButtonPlaceholder} />
        </View>

        <View style={styles.body}>
          <View style={styles.videoCard}>
            <LinearGradient
              colors={["rgba(77,150,255,0.22)", "rgba(199,125,255,0.16)"]}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.videoTopRow}>
              <View style={styles.brandPill}>
                <Text style={styles.brandPillText}>LogicBox Ads</Text>
              </View>
              <View style={styles.timePill}>
                <Ionicons name="time-outline" size={14} color="#fff" />
                <Text style={styles.timePillText}>
                  {secondsLeft}s
                </Text>
              </View>
            </View>

            <View style={styles.videoCenter}>
              {game?.icon ? (
                <Image source={game.icon} style={styles.posterIcon} contentFit="contain" />
              ) : (
                <View style={styles.posterFallback}>
                  <Ionicons name="play" size={40} color="#fff" />
                </View>
              )}

              <Text style={styles.videoTitle}>{title}</Text>
              <Text style={styles.videoSubtitle}>{subtitle}</Text>

              <View style={styles.playBadge}>
                {isCompleting ? (
                  <ActivityIndicator color="#0A0A14" />
                ) : (
                  <Ionicons name="play" size={18} color="#0A0A14" />
                )}
              </View>
            </View>

            <View style={styles.controlsRow}>
              <Ionicons name="volume-medium-outline" size={18} color="#D6DCFF" />
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
              </View>
              <Ionicons name="expand-outline" size={18} color="#D6DCFF" />
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>{t("tabs.games.adScreen.rewardTitle")}</Text>
            <Text style={styles.infoText}>{t("tabs.games.adScreen.rewardText")}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            disabled={!isFinished || isCompleting}
            onPress={handleComplete}
            style={({ pressed }) => [
              styles.ctaButton,
              (!isFinished || isCompleting) && styles.ctaButtonDisabled,
              pressed && isFinished && !isCompleting && styles.pressed,
            ]}
          >
            <LinearGradient
              colors={
                !isFinished || isCompleting
                  ? ["#5B617B", "#4A516A"]
                  : ["#FFD54F", "#FF9F43"]
              }
              style={styles.ctaGradient}
            >
              {isCompleting ? (
                <ActivityIndicator color="#0A0A14" />
              ) : (
                <Text style={styles.ctaText}>
                  {isFinished
                    ? t("tabs.games.adScreen.continue")
                    : t("tabs.games.adScreen.wait", { seconds: secondsLeft })}
                </Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#060816",
  },
  glowTop: {
    position: "absolute",
    top: -80,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(77,150,255,0.18)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -90,
    left: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(255,159,67,0.14)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  headerTextWrap: {
    alignItems: "center",
    gap: 4,
  },
  eyebrow: {
    color: "#FFD54F",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  pressed: {
    opacity: 0.84,
  },
  body: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 18,
  },
  videoCard: {
    borderRadius: 28,
    padding: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    gap: 18,
  },
  videoTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(10,10,20,0.42)",
  },
  brandPillText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  timePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(10,10,20,0.42)",
  },
  timePillText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  videoCenter: {
    minHeight: 320,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    borderRadius: 22,
    backgroundColor: "rgba(7,10,23,0.58)",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  posterIcon: {
    width: 132,
    height: 132,
  },
  posterFallback: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  videoSubtitle: {
    color: "rgba(230,235,255,0.78)",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  playBadge: {
    marginTop: 4,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFD54F",
    alignItems: "center",
    justifyContent: "center",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#FFD54F",
  },
  infoCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 8,
  },
  infoTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  infoText: {
    color: "rgba(230,235,255,0.76)",
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  ctaButton: {
    borderRadius: 18,
    overflow: "hidden",
  },
  ctaButtonDisabled: {
    opacity: 0.92,
  },
  ctaGradient: {
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  ctaText: {
    color: "#0A0A14",
    fontSize: 16,
    fontWeight: "800",
  },
});
