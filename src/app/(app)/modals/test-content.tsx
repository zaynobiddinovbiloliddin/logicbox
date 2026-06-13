import SafeAreaWrapper from "@/components/shared/safe-area-wrapper";
import GamePickerSheet, {
  type GameId,
} from "@/components/sheets/game-picker-sheet";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { games } from "@/constants/games";
import { Spacing } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { ChallengesModule } from "@/services/modules/challenges-module";
import {
  getLocalizedDescription,
  getCurrentChallengeDay,
  getLocalizedTitle,
  shouldStartChallengeDay,
} from "@/halpers/challenges";
import type { Challenge } from "@/types/challenges";

export default function TestContent() {
  const { t, i18n } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const buyScaleAnim = useRef(new Animated.Value(1)).current;
  const gamePickerRef = useRef<BottomSheet>(null);
  const { id } = useLocalSearchParams();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchChallengeDetail = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await ChallengesModule.getChallengeDetail(id as string);
      setChallenge(data);
    } catch (error) {
      console.error("Failed to fetch challenge detail:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchChallengeDetail();
    }, [fetchChallengeDetail])
  );

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(buyScaleAnim, {
          toValue: 1.04,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(buyScaleAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [buyScaleAnim]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  function buyTest() {
    if (challenge?.isParticipant) {
      gamePickerRef.current?.expand();
      return;
    }
    handleConnect();
  }

  const currentDay = getCurrentChallengeDay(challenge?.days);
  const localizedTitle = getLocalizedTitle(challenge, i18n.language);
  const localizedDescription = getLocalizedDescription(challenge, i18n.language);

  async function handleGameSelect(gameId: GameId, challengeDayGameId?: string | number) {
    gamePickerRef.current?.close();

    if (!currentDay) return;

    try {
      if (shouldStartChallengeDay(currentDay)) {
        await ChallengesModule.startDay(currentDay.id);
      }

      const game = games.find((g) => g.id === Number(gameId));
      if (game) {
        router.navigate({
          pathname: game.route as any,
          params: { 
            dayId: String(currentDay.id),
            challengeDayGameId: challengeDayGameId ? String(challengeDayGameId) : undefined
          },
        });
      }
    } catch (error) {
      console.error("Failed to start day:", error);
    }
  }

  const navigateToChallenge = () => {
    if (!challenge) return;
    let pathname = "/(app)/content/weekly";
    if (challenge.type === "monthly") {
      pathname = "/(app)/content/monthly";
    } else if (challenge.type === "daily") {
      pathname = "/(app)/content/task";
    }

    router.replace({
      pathname: pathname as any,
      params: { id: challenge.id },
    });
  };

  async function handleConnect() {
    if (!challenge) return;

    try {
      await ChallengesModule.connectChallenge(challenge.id);
      await fetchChallengeDetail();
      gamePickerRef.current?.expand();
    } catch (error: any) {
      const serverMessage =
        error.response?.data?.message || error.response?.data?.error;
      if (
        error.response?.status === 409 ||
        (error.response?.status === 400 && serverMessage?.includes("joined"))
      ) {
        await fetchChallengeDetail();
        gamePickerRef.current?.expand();
      } else {
        Alert.alert(
          t("content.testContent.errorTitle"),
          serverMessage || t("content.testContent.connectError")
        );
      }
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4D96FF" />
      </View>
    );
  }

  return (
    <>
      <SafeAreaWrapper
        header={
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* Background blobs */}
            <View
              style={[
                styles.blob,
                { top: -60, left: -60, backgroundColor: "#4D96FF0A" },
              ]}
            />
            <View
              style={[
                styles.blob,
                {
                  bottom: 100,
                  right: -80,
                  backgroundColor: "#C77DFF0A",
                  width: 260,
                  height: 260,
                },
              ]}
            />

            {/* ── Header / Back button ── */}
            <View style={styles.header}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.backBtn,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <LinearGradient
                  colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.04)"]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View style={styles.backBtnBorder} />
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color="rgba(255,255,255,0.8)"
                />
              </Pressable>
            </View>
          </Animated.View>
        }
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            gap: Spacing.four,
            paddingHorizontal: Spacing.xii,
            paddingTop: Spacing.vi,
          }}
        >
          {/* ── Banner ── */}
          <View style={styles.bannerWrap}>
            <LinearGradient
              colors={["#4D96FF", "#C77DFF"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.bannerOverlay} />
            <View style={styles.bannerBadge}>
              <ThemedText style={styles.bannerBadgeText}>
                {t("content.testContent.popular")}
              </ThemedText>
            </View>
            <Text style={styles.bannerEmoji}>🧠</Text>
            <ThemedText style={styles.bannerTitle} type="title">
              {localizedTitle}
            </ThemedText>
            <View style={styles.bannerSubWrap}>
              {localizedDescription ? (
                <ThemedText style={styles.bannerSub} type="small">
                  {localizedDescription}
                </ThemedText>
              ) : null}
              <ThemedText style={styles.bannerSub} type="small">
                {t("content.testContent.period")}: {new Date(challenge.startsAt).toLocaleDateString()} - {new Date(challenge.endsAt).toLocaleDateString()}
              </ThemedText>
            </View>
          </View>

          {/* ── Description ── */}
          <ThemedView style={styles.section} type="backgroundElement">
            <LinearGradient
              colors={["#4D96FF0A", "#C77DFF05"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.sectionBorder} />
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <ThemedText style={styles.sectionTitle}>{t("content.testContent.descriptionTitle")}</ThemedText>
            </View>
            <ThemedText style={styles.description} type="small">
              {t("content.testContent.descriptionBody")}
            </ThemedText>
          </ThemedView>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <Animated.View style={{ transform: [{ scale: buyScaleAnim }] }}>
              <Pressable
                onPress={buyTest}
                style={({ pressed }) => [pressed && { opacity: 0.85 }]}
              >
                <LinearGradient
                  colors={["#D4AF37", "#F5D97A"]}
                  style={styles.button}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.darkButton}>
                    {challenge.isParticipant
                      ? t("content.testContent.openChallenge")
                      : t("content.testContent.connect")}
                  </Text>
                  <Ionicons
                    name={challenge.isParticipant ? "play" : "flash"}
                    size={18}
                    color="#000"
                  />
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>
      </SafeAreaWrapper>

      <GamePickerSheet
        ref={gamePickerRef}
        adDayId={currentDay?.id}
        startDayBeforeAd={shouldStartChallengeDay(currentDay)}
        games={currentDay?.games?.map((dg: any) => ({
          ...dg,
          game: dg.game,
          completed: dg.completed,
          challengeDayGameId: dg.challengeDayGameId
        }))}
        onSelect={handleGameSelect}
        onClose={() => gamePickerRef.current?.close()}
      />
    </>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  bannerSubWrap: {
    rowGap: Spacing.one,
  },
  goldText: {
    color: "#fdd54f",
    fontFamily: "Inter-Bold",
    fontWeight: "700",
  },
  // Header
  header: {
    paddingHorizontal: Spacing.xii,
    // paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    alignItems: "flex-start",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnBorder: {
    ...StyleSheet.absoluteFill,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  // Banner
  bannerWrap: {
    borderRadius: 24,
    padding: Spacing.xii,
    overflow: "hidden",
    alignItems: "center",
    gap: Spacing.two,
    minHeight: 180,
    justifyContent: "center",
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  bannerBadge: {
    position: "absolute",
    top: Spacing.three,
    right: Spacing.three,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  bannerBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  bannerEmoji: { fontSize: 40 },
  bannerTitle: { color: "#fff", textAlign: "center", fontSize: 22 },
  bannerSub: { color: "rgba(255,255,255,0.7)", textAlign: "center" },

  // Section
  section: {
    borderRadius: 20,
    padding: Spacing.four,
    overflow: "hidden",
    gap: Spacing.three,
  },
  sectionBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(77,150,255,0.12)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4D96FF",
  },
  sectionTitle: { fontSize: 15 },
  description: {
    textAlign: "justify",
    opacity: 0.65,
    lineHeight: 20,
  },

  // Footer
  footer: {
    paddingHorizontal: Spacing.xii,
    paddingBottom: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  footerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  priceLabel: { opacity: 0.4, marginBottom: Spacing.one },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.one,
  },
  priceGem: { fontSize: 18 },
  priceValue: { fontSize: 28, color: "#FFD93D" },
  priceCurrency: { opacity: 0.5 },
  ratingWrap: { alignItems: "flex-end", gap: 2 },
  ratingStars: { fontSize: 12 },
  ratingNum: { opacity: 0.4, fontSize: 11 },
  disclaimer: {
    opacity: 0.35,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 16,
  },
  button: {
    borderRadius: Spacing.x,
    paddingVertical: Spacing.three,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
  },
  darkButton: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
  },

  // Promo BottomSheet
  promoSheetBg: {
    backgroundColor: "#0E0E1C",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(212,175,55,0.2)",
  },
  promoHandle: {
    width: 38,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 2,
  },
  promoScroll: {
    padding: Spacing.xii,
    gap: Spacing.four,
  },
  promoTitle: {
    color: "#F5D97A",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 26,
  },
  promoSubtitle: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  promoBlock: {
    borderRadius: 18,
    padding: Spacing.four,
    overflow: "hidden",
    gap: Spacing.three,
  },
  promoBlockBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(77,150,255,0.15)",
  },
  promoBlockTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  promoItem: {
    flexDirection: "row",
    gap: Spacing.three,
    alignItems: "flex-start",
  },
  promoItemIcon: {
    fontSize: 20,
    marginTop: 1,
  },
  promoItemBody: {
    flex: 1,
    gap: 3,
  },
  promoItemTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  promoItemDesc: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    lineHeight: 18,
  },
  promoCta: {
    borderRadius: Spacing.x,
    paddingVertical: Spacing.three,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  promoCtaText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  promoCtaSub: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 11,
    textAlign: "center",
    paddingBottom: Spacing.four,
  },
});
