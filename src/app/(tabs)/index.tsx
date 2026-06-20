import CatalogCard from "@/components/shared/catalog-card";
import HomeBanner from "@/components/shared/home-banner";
import HomeHeader from "@/components/shared/home-header";
import LuckyLeaderboard from "@/components/shared/lucky-leaderboard";
import SectionHeader from "@/components/shared/section-header";
import Wrapper from "@/components/shared/wrapper";
import { games } from "@/constants/games";
import { Test } from "@/constants/test";
import { getLocalizedTitle } from "@/halpers/challenges";
import { ChallengesModule } from "@/services/modules/challenges-module";
import { SettingsModule } from "@/services/modules/settings-module";
import type { Challenge } from "@/types/challenges";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export { games };

const { width } = Dimensions.get("window");
const PADDING = 10 * 2;
const GAP = 10;
const CARD_WIDTH = (width - PADDING - GAP) / 2;
const isSmall = width < 375;

// ─────────────────────────────────────────────
// Animated Arrows — › › › ketma-ket yonib o'chadi
// ─────────────────────────────────────────────
function AnimatedArrows() {
  const arrow1 = useRef(new Animated.Value(0.1)).current;
  const arrow2 = useRef(new Animated.Value(0.1)).current;
  const arrow3 = useRef(new Animated.Value(0.1)).current;

  useEffect(() => {
    const FADE = 160;
    const HOLD = 300;
    const REST = 500;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(arrow1, {
          toValue: 1,
          duration: FADE,
          useNativeDriver: true,
        }),
        Animated.timing(arrow2, {
          toValue: 1,
          duration: FADE,
          useNativeDriver: true,
        }),
        Animated.timing(arrow3, {
          toValue: 1,
          duration: FADE,
          useNativeDriver: true,
        }),
        Animated.delay(HOLD),
        Animated.parallel([
          Animated.timing(arrow1, {
            toValue: 0.1,
            duration: FADE,
            useNativeDriver: true,
          }),
          Animated.timing(arrow2, {
            toValue: 0.1,
            duration: FADE,
            useNativeDriver: true,
          }),
          Animated.timing(arrow3, {
            toValue: 0.1,
            duration: FADE,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(REST),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [arrow1, arrow2, arrow3]);

  return (
    <View style={arrowStyles.row}>
      {([arrow1, arrow2, arrow3] as Animated.Value[]).map((anim, i) => (
        <Animated.Text key={i} style={[arrowStyles.arrow, { opacity: anim }]}>
          ›
        </Animated.Text>
      ))}
    </View>
  );
}

const arrowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  arrow: {
    fontSize: 20,
    fontWeight: "900",
    color: "rgba(255,215,0,1)",
    lineHeight: 20,
  },
});

// ─────────────────────────────────────────────
// Prize Card — Corner Frame variant
// ─────────────────────────────────────────────
function PrizeCard({ totalPrize }: { totalPrize: number }) {
  const { t } = useTranslation();
  const glowAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [glowAnim, shimmerAnim]);

  // Faqat asosiy border animatsiyasi
  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(212,175,55,0.1)", "rgba(212,175,55,0.55)"],
  });

  // Summa shimmer
  const amountColor = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["#D4AF37", "#FFF2B2", "#D4AF37"],
  });

  return (
    <Animated.View
      style={[
        styles.prizeWrapper,
        {
          shadowColor: "#FFD700",
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 20,
          shadowOpacity: 0.15,
          elevation: 10,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.navigate("/exam")}
        style={styles.prizeInner}
      >
        <LinearGradient
          colors={["#0a0a0a", "#141414"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Faqat asosiy animatsiyali border */}
        <Animated.View style={[styles.fullBorder, { borderColor }]} />

        {/* Top qator: label + Halol badge */}
        <View style={styles.prizeTop}>
          <Text style={styles.prizeLabel}>{t("tabs.home.prizePoolLabel")}</Text>
          <View style={styles.halalBadge}>
            <View style={styles.halalDot} />
            <Text style={styles.halalText}>{t("tabs.home.halal")}</Text>
          </View>
        </View>

        {/* Summa */}
        <View style={styles.prizeMain}>
          <View style={styles.amountContainer}>
            <Animated.Text style={[styles.prizeAmount, { color: amountColor }]}>
              {totalPrize.toLocaleString()}
            </Animated.Text>
            <Text style={styles.prizeCurrency}>{t("tabs.home.currency")}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.prizeFooter}>
          <Text style={styles.prizeCta}>{t("tabs.home.openTasks")}</Text>
          <AnimatedArrows />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────
// Home Screen
// ─────────────────────────────────────────────
export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [challenges, setChallenges] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    fetchChallenges();
  }, [fadeAnim, i18n.language]);

  const fetchChallenges = async () => {
    try {
      const data = await ChallengesModule.getChallenges();
      const mapped: Test[] = data.map((item: Challenge) => {
        let badge = t("tabs.home.challengeBadge.default");
        let color = "#FF6B35";
        let icon = "🧠";
        let from = "#FFD93D";
        let to = "#FF6B35";

        if (item.type === "weekly") {
          badge = t("tabs.home.challengeBadge.weekly");
          color = "#FFD93D";
          icon = "🏆";
          from = "#4D96FF";
          to = "#C77DFF";
        } else if (item.type === "monthly") {
          badge = t("tabs.home.challengeBadge.monthly");
          color = "#A78BFA";
          icon = "🚀";
          from = "#8B5CF6";
          to = "#EC4899";
        } else if (item.type === "daily") {
          badge = t("tabs.home.challengeBadge.daily");
          color = "#FFB347";
          icon = "⭐️";
          from = "#F59E0B";
          to = "#FFB347";
        }

        return {
          id: item.id,
          title: getLocalizedTitle(item, i18n.language),
          price: Number(item.price) || 0,
          badge,
          badgeColor: color,
          icon,
          from,
          to,
          tasks: [
            t("tabs.home.task.logic"),
            t("tabs.home.task.memory"),
            t("tabs.home.task.speed"),
          ],
          difficulty: t("tabs.home.difficulty.medium"),
          time: t("tabs.home.duration"),
          hasPrize: true,
          prizeSumma: item.prizePool?.toLocaleString(),
          bought: !!item.isParticipant,
          isParticipant: !!item.isParticipant,
          type: item.type,
        };
      });
      setChallenges(mapped);
    } catch (error) {
      console.error("Failed to fetch challenges in Home:", error);
    } finally {
      setLoading(false);
      setActionLoading(false);
    }
  };

  const visibleChallenges = useMemo(
    () => challenges.filter((c) => c.type !== "weekly"),
    [challenges],
  );

  const fallbackPrizePool = challenges.reduce((acc, curr) => {
    const prize = parseInt(curr.prizeSumma?.replace(/\s/g, "") || "0");
    return acc + prize;
  }, 0);

  const [displayPrizePool, setDisplayPrizePool] = useState(0);

  const fetchPrizePool = useCallback(async () => {
    try {
      const { value } = await SettingsModule.getPrizePool();
      setDisplayPrizePool(value > 0 ? value : fallbackPrizePool);
    } catch (error) {
      console.error("Failed to fetch prize pool setting:", error);
      setDisplayPrizePool(fallbackPrizePool);
    }
  }, [fallbackPrizePool]);

  useEffect(() => {
    fetchPrizePool();
    const interval = setInterval(fetchPrizePool, 30000);
    return () => clearInterval(interval);
  }, [fetchPrizePool]);

  const navigateToChallenge = (test: any) => {
    let pathname = "/modals/test-content";
    if (test.type === "daily") {
      pathname = "/(app)/content/task";
    } else if (test.type === "weekly") {
      pathname = "/(app)/content/weekly";
    } else if (test.type === "monthly") {
      pathname = "/(app)/content/monthly";
    }

    router.navigate({
      pathname,
      params: { id: test.id },
    });
  };

  const handleChallengePress = (test: any) => {
    if (!test.isParticipant) {
      Alert.alert(
        t("tabs.home.connect.title"),
        t("tabs.home.connect.message"),
        [
          {
            text: t("tabs.home.connect.confirm"),
            onPress: async () => {
              try {
                setActionLoading(true);
                await ChallengesModule.connectChallenge(test.id);
                await fetchChallenges();
                navigateToChallenge({ ...test, isParticipant: true });
              } catch (e) {
                setActionLoading(false);
                console.error("Failed to connect challenge:", e);
                Alert.alert(t("tabs.home.errorTitle"), t("tabs.home.connect.error"));
              }
            },
          },
          { text: t("tabs.home.cancel"), style: "cancel" },
        ],
      );
      return;
    }

    navigateToChallenge(test);
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0A0A14",
        }}
      >
        <ActivityIndicator size="large" color="#4D96FF" />
      </View>
    );
  }

  return (
    <Wrapper header={<HomeHeader />}>
      {actionLoading && (
        <View style={styles.actionLoader}>
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      )}
      <View style={styles.container}>
        <LuckyLeaderboard />

        <SectionHeader title={t("tabs.home.sections.games")} />

        <View style={styles.grid}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.navigate("/games")}
            style={styles.seeAllCard}
          >
            <LinearGradient
              colors={["rgba(255,107,53,0.15)", "rgba(255,217,61,0.05)"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View
              style={[
                styles.gridCardBorder,
                { borderColor: "rgba(255,107,53,0.25)" },
              ]}
            />

            <Text style={styles.seeAllTopLabel}>{t("tabs.home.gamesShort")}</Text>

            <View style={styles.seeAllContent}>
              <View style={styles.iconStack}>
                {games.slice(1, 5).map((g, i) => (
                  <View
                    key={g.id}
                    style={[
                      styles.stackIconWrap,
                      {
                        zIndex: 3 - i,
                        transform: [
                          { translateX: i * (isSmall ? -8 : -12) },
                          { scale: 1 - i * 0.1 },
                        ],
                      },
                    ]}
                  >
                    <Image
                      source={g.icon}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="contain"
                    />
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.seeAllFooter}>
              <Text style={styles.seeAllFooterText}>
                {t("tabs.home.seeAll")}
              </Text>
              <Ionicons name="chevron-forward" size={12} color="#FF6B35" />
            </View>
          </TouchableOpacity>

          <PrizeCard totalPrize={displayPrizePool} />
        </View>

        <HomeBanner />

        <SectionHeader
          title={t("tabs.home.sections.testCatalog")}
          onSeeAll={() => router.navigate("/exam")}
        />

        <View style={styles.catalogGrid}>
          {visibleChallenges.map((test) => (
            <CatalogCard
              key={test.id}
              icon={test.icon || require("@/assets/images/icons/geography.png")}
              title={test.title}
              desc={test.badge}
              badge={
                test.isParticipant
                  ? t("tabs.home.participating")
                  : `${t("tabs.home.entry")}: ${test.price} 💸`
              }
              prize={test.prizeSumma}
              color={test.from || "#FF6B35"}
              from={test.from || "#FF6B35"}
              to={test.to || "#FFD93D"}
              onPress={() => handleChallengePress(test)}
            />
          ))}
        </View>

        <View style={{ height: 50 }} />
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 15,
    paddingTop: 18,
  },

  // ── 2x2 Grid ──────────────────────────────
  grid: {
    flexDirection: "row",
    gap: GAP,
    alignItems: "stretch",
  },

  // Oddiy o'yin kartasi
  gridCard: {
    width: CARD_WIDTH,
    borderRadius: 18,
    overflow: "hidden",
    padding: 14,
    gap: 6,
    minHeight: 80,
    justifyContent: "center",
  },
  gridCardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1,
  },
  gridRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  gridTextCol: {
    flex: 1,
    gap: 2,
  },
  gridIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    overflow: "hidden",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  gridTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  gridSub: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    lineHeight: 15,
  },

  // ── See All card ──────────────────────────
  seeAllCard: {
    borderRadius: 18,
    overflow: "hidden",
    padding: isSmall ? 10 : 14,
    justifyContent: "space-between",
  },
  seeAllTopLabel: {
    fontSize: isSmall ? 8 : 9,
    fontWeight: "600",
    color: "rgba(255,107,53,1)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  seeAllContent: {
    alignItems: "center",
    gap: isSmall ? 4 : 8,
  },
  iconStack: {
    flexDirection: "row-reverse",
    height: isSmall ? 24 : 32,
    alignItems: "center",
    paddingLeft: isSmall ? 16 : 24,
  },
  stackIconWrap: {
    width: isSmall ? 24 : 32,
    height: isSmall ? 24 : 32,
    alignItems: "center",
    justifyContent: "center",
  },
  seeAllCount: {
    color: "#FF6B35",
    fontSize: isSmall ? 18 : 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  seeAllFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: isSmall ? 6 : 10,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(255,107,53,0.2)",
  },
  seeAllFooterText: {
    color: "#FF6B35",
    fontSize: isSmall ? 9 : 11,
    fontWeight: "700",
    },
    actionLoader: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.5)",
      zIndex: 9999,
      justifyContent: "center",
      alignItems: "center",
    },
    // ── Prize Card — Corner Frame ─────────────
    prizeWrapper: {
    flex: 1,
    borderRadius: 20,
  },
  prizeInner: {
    overflow: "hidden",
    borderRadius: 20,
    padding: isSmall ? 10 : 14,
    minHeight: isSmall ? 95 : 115,
    justifyContent: "space-between",
  },

  // Asosiy to'liq border (animatsiyali)
  fullBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1.8,
  },

  prizeTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  prizeLabel: {
    fontSize: 8,
    fontWeight: "600",
    color: "rgba(255,255,255,0.3)",
    textTransform: "uppercase",
    letterSpacing: 1,
    width: "70%",
  },

  // Halol badge
  halalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(74,222,128,0.08)",
    borderWidth: 0.5,
    borderColor: "rgba(74,222,128,0.25)",
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  halalDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#4ade80",
  },
  halalText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#4ade80",
    letterSpacing: 0.3,
  },

  // Summa
  prizeMain: {
    marginTop: 6,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  prizeAmount: {
    fontSize: isSmall ? 17 : 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  prizeCurrency: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(255,255,255,0.25)",
  },

  // Footer
  prizeFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  prizeCta: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
  },

  // ── Catalog ───────────────────────────────
  catalogFilters: {
    paddingHorizontal: 4,
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  filterChipActive: {
    backgroundColor: "rgba(77,150,255,0.15)",
    borderColor: "rgba(77,150,255,0.3)",
  },
  filterChipText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: "#4D96FF",
  },
  catalogGrid: {
    gap: 12,
  },
});
