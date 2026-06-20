import {
  formatChallengeDayLabel,
  getLocalizedDescription,
  getLocalizedTitle,
} from "@/halpers/challenges";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChallengesModule } from "@/services/modules/challenges-module";
import type { Challenge, ChallengeDay, ChallengeProgress } from "@/types/challenges";
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
const BANNER_PADDING = 16;
const BANNER_GAP = 12;
const SIDE_PREVIEW = 32;
const BANNER_WIDTH = SCREEN_WIDTH - BANNER_PADDING * 2 - SIDE_PREVIEW * 2;
const AUTO_SCROLL_DELAY = 5000;

type BannerData = {
  id: number | string;
  icon: string;
  title: string;
  subtitle: string;
  colors: [string, string, ...string[]];
  buttonText: string;
  challengeId?: number | string;
  challengeType?: string;
  isParticipant?: boolean;
};

function getDefaultBanners(t: (key: string) => string): BannerData[] {
  const colorSets: [string, string][] = [
    ["#4D96FF", "#C77DFF"],
    ["#FFD93D", "#FF6B35"],
    ["#6BCB77", "#4ECDC4"],
  ];
  return [0, 1, 2].map((i) => ({
    id: i + 1,
    icon: t(`components.homeBanner.defaults.${i}.icon`),
    title: t(`components.homeBanner.defaults.${i}.title`),
    subtitle: t(`components.homeBanner.defaults.${i}.subtitle`),
    colors: colorSets[i],
    buttonText: t(`components.homeBanner.defaults.${i}.buttonText`),
  }));
}

function xForIndex(index: number) {
  return index * (BANNER_WIDTH + BANNER_GAP);
}

function getChallengeTheme(
  type: string | undefined,
  t: (key: string) => string,
): Pick<BannerData, "icon" | "colors" | "buttonText"> {
  if (type === "weekly") {
    return {
      icon: "📅",
      colors: ["#4D96FF", "#6BCB77"],
      buttonText: t("components.homeBanner.weekly"),
    };
  }

  if (type === "monthly") {
    return {
      icon: "🔥",
      colors: ["#FF6B35", "#FFD93D"],
      buttonText: t("components.homeBanner.monthly"),
    };
  }

  if (type === "daily") {
    return {
      icon: "⚡",
      colors: ["#6BCB77", "#4ECDC4"],
      buttonText: t("components.homeBanner.daily"),
    };
  }

  return {
    icon: "🏆",
    colors: ["#4D96FF", "#C77DFF"],
    buttonText: t("components.homeBanner.open"),
  };
}

function getChallengeRoute(banner: BannerData) {
  if (!banner.challengeId) return null;

  let pathname = "/modals/test-content";

  if (banner.isParticipant) {
    if (banner.challengeType === "weekly") {
      pathname = "/(app)/content/weekly";
    } else if (banner.challengeType === "monthly") {
      pathname = "/(app)/content/monthly";
    } else if (banner.challengeType === "daily") {
      pathname = "/(app)/content/task";
    }
  }

  return {
    pathname: pathname as any,
    params: { id: String(banner.challengeId) },
  };
}

function buildChallengeSubtitle(
  progress: ChallengeProgress | null,
  days: ChallengeDay[],
  t: ReturnType<typeof useTranslation>["t"],
) {
  const nextDay =
    days.find((day) => day.status === "in_progress") ??
    days.find((day) => day.canStart) ??
    days[0];

  const topLine = `${t("content.task.progress")}: ${progress?.completedDays ?? 0}/${progress?.totalDays ?? 0}`;
  const scoreLine = `${t("content.task.totalScore")}: ${progress?.totalScore ?? 0}`;

  if (!nextDay) {
    return `${topLine}\n${scoreLine}`;
  }

  const taskLabel =
    typeof nextDay.taskNumber === "number"
      ? t("components.challengeDayCard.label.task", {
          task: nextDay.taskNumber,
        })
      : getLocalizedTitle(nextDay) || formatChallengeDayLabel(nextDay);

  return `${topLine} • ${scoreLine}\n${formatChallengeDayLabel(nextDay)} • ${taskLabel}`;
}

// ─────────────────────────────────────────────
// BannerItem
// ─────────────────────────────────────────────
function BannerItem({
  banner,
  isActive,
}: {
  banner: BannerData;
  isActive: boolean;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const focusAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isActive) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ]),
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      anim.setValue(0);
    }
    return () => loopRef.current?.stop();
  }, [isActive, anim]);

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: isActive ? 1 : 0,
      duration: 260,
      useNativeDriver: false,
    }).start();
  }, [focusAnim, isActive]);

  const shadowOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.75],
  });
  const shadowRadius = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 24],
  });
  const scaleX = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.1],
  });
  const scaleY = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.15],
  });
  const cardOpacity = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  return (
    <Animated.View
      style={[
        bannerStyles.outerWrap,
        {
          width: BANNER_WIDTH,
          shadowColor: banner.colors[0],
          shadowOpacity,
          shadowRadius,
          shadowOffset: { width: 0, height: 6 },
          opacity: cardOpacity,
          transform: [{ scaleX }, { scaleY }],
        },
      ]}
    >
      <Pressable
        onPress={() => {
          const target = getChallengeRoute(banner);
          if (target) {
            router.navigate(target);
          }
        }}
        style={bannerStyles.wrap}
      >
        <LinearGradient
          colors={banner.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={bannerStyles.textWrap}>
          <Text style={bannerStyles.title} numberOfLines={2}>
            {banner.icon} {banner.title}
          </Text>
          <Text style={bannerStyles.sub} numberOfLines={2}>
            {banner.subtitle}
          </Text>
        </View>
        <View style={bannerStyles.btn}>
          <Text style={bannerStyles.btnText}>{banner.buttonText}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────
// HomeBanner
// ─────────────────────────────────────────────
export default function HomeBanner() {
  const { t, i18n } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const [banners, setBanners] = useState<BannerData[]>(() => getDefaultBanners(t));
  const isScrollingRef = useRef(false);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasLoop = banners.length > 1;
  const realFirst = hasLoop ? 1 : 0;
  const realLast = hasLoop ? banners.length : 0;
  const clonedBanners = useMemo(
    () => (hasLoop ? [banners[banners.length - 1], ...banners, banners[0]] : banners),
    [banners, hasLoop]
  );
  const [activeIndex, setActiveIndex] = useState(realFirst);

  const fetchBannerChallenges = useCallback(async () => {
    try {
      const challengeList = await ChallengesModule.getChallenges();
      const topChallenges = challengeList.slice(0, 3);

      if (!topChallenges.length) {
        setBanners(getDefaultBanners(t));
        return;
      }

      const nextBanners = await Promise.all(
        topChallenges.map(async (challenge: Challenge) => {
          let progress: ChallengeProgress | null = null;
          let days: ChallengeDay[] = [];

          if (challenge.isParticipant) {
            try {
              const [p, d] = await Promise.all([
                ChallengesModule.getChallengeProgress(challenge.id),
                ChallengesModule.getChallengeDays(challenge.id),
              ]);
              progress = p;
              days = d;
            } catch (e) {
              console.warn(
                `Failed to fetch details for challenge ${challenge.id}:`,
                e
              );
            }
          }

          const theme = getChallengeTheme(challenge.type, t);

          return {
            id: challenge.id,
            icon: theme.icon,
            title: getLocalizedTitle(challenge, i18n.language),
            subtitle: challenge.isParticipant
              ? buildChallengeSubtitle(progress, days, t)
              : getLocalizedDescription(challenge, i18n.language),
            colors: theme.colors,
            buttonText: challenge.isParticipant
              ? t("components.homeBanner.open")
              : theme.buttonText,
            challengeId: challenge.id,
            challengeType: challenge.type,
            isParticipant: Boolean(challenge.isParticipant),
          } satisfies BannerData;
        })
      );

      setBanners(nextBanners);
    } catch (error) {
      console.error("Failed to fetch home banner challenges:", error);
      setBanners(getDefaultBanners(t));
    }
  }, [i18n.language, t]);

  useFocusEffect(
    useCallback(() => {
      fetchBannerChallenges();
    }, [fetchBannerChallenges])
  );

  useEffect(() => {
    setActiveIndex(realFirst);
  }, [realFirst, banners.length]);

  // Boshlang'ich pozitsiya — birinchi real card
  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({
        x: xForIndex(realFirst),
        animated: false,
      });
    }, 50);
    return () => clearTimeout(t);
  }, [realFirst, banners.length]);

  // Auto scroll
  const stopAutoScroll = useCallback(() => {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  }, []);

  const startAutoScroll = useCallback(() => {
    stopAutoScroll();
    if (!hasLoop) return;

    autoTimerRef.current = setInterval(() => {
      if (!isScrollingRef.current) {
        goToIndex(activeIndex + 1);
      }
    }, AUTO_SCROLL_DELAY);
  }, [activeIndex, hasLoop, stopAutoScroll]);

  // activeIndex o'zgarganda auto scroll ni qayta ishga tushir
  useEffect(() => {
    startAutoScroll();
    return stopAutoScroll;
  }, [startAutoScroll, stopAutoScroll]);

  function goToIndex(index: number) {
    scrollRef.current?.scrollTo({ x: xForIndex(index), animated: true });
    // setActiveIndex momentumScrollEnd da o'rnatiladi
  }

  function handleMomentumScrollEnd(offsetX: number) {
    if (!hasLoop) {
      setActiveIndex(0);
      isScrollingRef.current = false;
      return;
    }

    let index = Math.round(offsetX / (BANNER_WIDTH + BANNER_GAP));

    if (index <= 0) {
      // Clone of last — jump to real last
      index = realLast;
      scrollRef.current?.scrollTo({ x: xForIndex(index), animated: false });
    } else if (index >= clonedBanners.length - 1) {
      // Clone of first — jump to real first
      index = realFirst;
      scrollRef.current?.scrollTo({ x: xForIndex(index), animated: false });
    }

    setActiveIndex(index);
    isScrollingRef.current = false;
  }

  return (
    <View style={bannerStyles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        snapToInterval={BANNER_WIDTH + BANNER_GAP}
        decelerationRate="fast"
        style={{ overflow: "visible" }}
        contentContainerStyle={bannerStyles.scrollContent}
        onScrollBeginDrag={() => {
          isScrollingRef.current = true;
          stopAutoScroll();
        }}
        onMomentumScrollEnd={(e) =>
          handleMomentumScrollEnd(e.nativeEvent.contentOffset.x)
        }
      >
        {clonedBanners.map((banner, index) => (
          <BannerItem
            key={`${banner.id}-${index}`}
            banner={banner}
            isActive={activeIndex === index}
          />
        ))}
      </ScrollView>

      {/* Dot pagination */}
      {/* <View style={bannerStyles.pagination}>
        {BANNERS.map((_, i) => (
          <View
            key={i}
            style={[bannerStyles.dot, i === dotIndex && bannerStyles.activeDot]}
          />
        ))}
      </View> */}
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    marginHorizontal: -16,
    overflow: "visible",
  },
  scrollContent: {
    paddingHorizontal: BANNER_PADDING + SIDE_PREVIEW,
    gap: BANNER_GAP,
    paddingTop: 8,
    paddingBottom: 4,
  },
  outerWrap: {
    borderRadius: 16,
    elevation: 12,
  },
  wrap: {
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  textWrap: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 2,
  },
  sub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    lineHeight: 15,
  },
  btn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexShrink: 0,
  },
  btnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  activeDot: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
});
