import TestCard from "@/components/shared/test-card";
import Wrapper from "@/components/shared/wrapper";
import { Test } from "@/constants/test";
import { getLocalizedTitle } from "@/halpers/challenges";
import { ChallengesModule } from "@/services/modules/challenges-module";
import type { Challenge } from "@/types/challenges";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─────────────────────────────────────────────
// Header Prize Card
// ─────────────────────────────────────────────
function HeaderPrizeCard({ onPress }: { onPress?: () => void }) {
  const { t } = useTranslation();
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeLoop = (anim: Animated.Value) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: false,
          }),
        ]),
      );

    makeLoop(shimmerAnim).start();
    makeLoop(borderAnim).start();

    return () => {
      shimmerAnim.stopAnimation();
      borderAnim.stopAnimation();
    };
  }, []);

  const shimmerColor = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["#D4AF37", "#FFF2B2", "#D4AF37"],
  });

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(212,175,55,0.15)", "rgba(212,175,55,0.6)"],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={prizeCardStyles.wrapper}
    >
      <LinearGradient
        colors={["rgba(212,175,55,0.08)", "rgba(212,175,55,0.03)"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Animated.View style={[prizeCardStyles.border, { borderColor }]} />

      <View style={prizeCardStyles.left}>
        <View style={prizeCardStyles.topRow}>
          <Text style={prizeCardStyles.label}>{t("tabs.exam.prizePoolLabel")}</Text>
        </View>

        <View style={[prizeCardStyles.amountRow]}>
          <Animated.Text
            style={[prizeCardStyles.amount, { color: shimmerColor }]}
          >
            80 000 000
          </Animated.Text>
          <Text style={prizeCardStyles.currency}>{t("tabs.exam.currency")}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const prizeCardStyles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    padding: 14,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(212,175,55,0.03)",
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 1,
  },
  left: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 9,
    fontWeight: "600",
    color: "rgba(255,255,255,1)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  amount: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  currency: {
    marginRight: -28,
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.25)",
  },
});

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────
export default function TabTwoScreen() {
  const { t, i18n } = useTranslation();
  const titleFade = useRef(new Animated.Value(0)).current;
  const [challenges, setChallenges] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Animated.timing(titleFade, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    fetchChallenges();
  }, [i18n.language]);

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
          type: item.type,
        };
      });
      setChallenges(mapped.filter((c) => c.type !== "weekly"));

    } catch (error) {
      console.error("Failed to fetch challenges:", error);
    } finally {
      setLoading(false);
    }
  };

  function handleOpenModal(item: Test) {
    if (item.bought) {
      let pathname = "/(app)/content/weekly";
      if (item.type === "monthly") {
        pathname = "/(app)/content/monthly";
      } else if (item.type === "daily") {
        pathname = "/(app)/content/task";
      }
      router.navigate({
        pathname,
        params: { id: item.id },
      });
    } else {
      router.navigate({
        pathname: '/modals/test-content',
        params: { id: item.id },
      });
    }
  }

  return (
    <>
      <Wrapper
        header={
          <View style={styles.headerWrap}>
            <Animated.View style={{ opacity: titleFade }}>
              <HeaderPrizeCard />
            </Animated.View>
          </View>
        }
      >
        <View style={styles.container}>
          {loading ? (
            <ActivityIndicator size="large" color="#4D96FF" />
          ) : (
            challenges.map((item, index) => (
              <TestCard
                key={item.id}
                item={item}
                index={index}
                hidePrice
                onPress={() => handleOpenModal(item)}
              />
            ))
          )}
          <View style={{ height: 16 }} />
        </View>
        <View style={{ height: 50 }} />
      </Wrapper>

    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0A0A14",
  },
  container: {
    flex: 1,
    rowGap: 12,
  },
  headerWrap: {
    // paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 10,
    gap: 12,
  },

  // Title block
  titleBlock: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  titleBorder: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(77,150,255,0.2)",
  },
  titleEmoji: { fontSize: 22 },
  titleTextWrap: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleMain: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  titleAccent: {},
  titleSub: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 11,
    marginTop: 1,
  },

  // Tabs
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 4,
    gap: 8,
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(77,150,255,0.3)",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    gap: 6,
    borderRadius: 10,
    zIndex: 1,
  },
  tabEmoji: {
    fontSize: 14,
  },
  tabLabel: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    color: "#fff",
  },
  tabBadge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: "center",
  },
  tabBadgeActive: {
    backgroundColor: "rgba(77,150,255,0.3)",
  },
  tabBadgeText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "800",
  },
  tabBadgeTextActive: {
    color: "#4D96FF",
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 44,
    marginBottom: 8,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  emptySub: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 32,
  },
  emptyBtn: {
    marginTop: 16,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(77,150,255,0.3)",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },

  // Card styles
  card: {
    borderRadius: 22,
    padding: 18,
    overflow: "hidden",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 1,
  },
  cardTop: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  cardIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    lineHeight: 17,
  },
  tagRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  tag: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { fontSize: 11, fontWeight: "600" },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: "rgba(255,255,255,0.4)", fontSize: 12 },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  footerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  priceTag: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  priceText: { fontSize: 13, fontWeight: "700" },
  arrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
