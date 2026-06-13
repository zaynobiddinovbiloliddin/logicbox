import Wrapper from "@/components/shared/wrapper";
import { getAchievementTitle } from "@/halpers/localization";
import { useBoostsInventory } from "@/store/boosts-inventory";
import { useBoostsSheetStore } from "@/store/boosts-sheet";
import { useAuthStore } from "@/store/auth";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const SKILLS_CONFIG = [
  {
    key: "thinkingSpeed" as const,
    labelKey: "tabs.profile.skills.thinkingSpeed",
    icon: "⚡",
    color: "#FFD93D",
    from: "#FFD93D",
    to: "#FF6B35",
  },
  {
    key: "attention" as const,
    labelKey: "tabs.profile.skills.attention",
    icon: "👁",
    color: "#6BCB77",
    from: "#6BCB77",
    to: "#4D96FF",
  },
  {
    key: "concentration" as const,
    labelKey: "tabs.profile.skills.concentration",
    icon: "🎯",
    color: "#4D96FF",
    from: "#4D96FF",
    to: "#C77DFF",
  },
  {
    key: "logic" as const,
    labelKey: "tabs.profile.skills.logic",
    icon: "🧠",
    color: "#C77DFF",
    from: "#C77DFF",
    to: "#FF6B9D",
  },
  {
    key: "memory" as const,
    labelKey: "tabs.profile.skills.memory",
    icon: "💡",
    color: "#FF6B9D",
    from: "#FF6B9D",
    to: "#FFD93D",
  },
];

// Animated skill bar
function SkillBar({
  from,
  to,
  value,
  delay,
}: {
  from: string;
  to: string;
  value: number;
  delay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value / 100,
      duration: 1200,
      delay,
      useNativeDriver: false,
    }).start();
  }, []);

  const widthInterp = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.barTrack}>
      <Animated.View style={[styles.barFill, { width: widthInterp }]}>
        <LinearGradient
          colors={[from, to]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.barDot, { backgroundColor: to }]} />
      </Animated.View>
    </View>
  );
}

export default function TabTwoScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const openBoosts = useBoostsSheetStore((s) => s.open);
  const inventory = useBoostsInventory((s) => s.inventory);
  const totalBoosts = Object.values(inventory).reduce(
    (sum: number, n: number) => sum + n,
    0,
  );
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const getAchievementStyle = (title: string, index: number) => {
    const lowerTitle = title.toLowerCase();
    if (
      lowerTitle.includes("призёр") ||
      lowerTitle.includes("призер") ||
      lowerTitle.includes("prizyor")
    )
      return { icon: "🏅", color: "#FF6B35" };
    if (lowerTitle.includes("удачливый") || lowerTitle.includes("udachliviy"))
      return { icon: "🍀", color: "#6BCB77" };
    if (lowerTitle.includes("спонсор") || lowerTitle.includes("sponsor"))
      return { icon: "💰", color: "#4D96FF" };
    if (lowerTitle.includes("чемпион") || lowerTitle.includes("champion"))
      return { icon: "🏆", color: "#FFD93D" };

    const defaultStyles = [
      { icon: "🏆", color: "#FFD93D" },
      { icon: "🏅", color: "#FF6B35" },
      { icon: "🍀", color: "#6BCB77" },
      { icon: "💰", color: "#4D96FF" },
    ];
    return defaultStyles[index % defaultStyles.length];
  };

  const userAchivments = user?.achievements?.map((ites, index) => {
    const localizedAchievementTitle = getAchievementTitle(
      ites.achievement,
      i18n.language,
    );
    const style = getAchievementStyle(localizedAchievementTitle, index);
    return {
      icon: style.icon,
      label: localizedAchievementTitle,
      color: style.color,
      achivmentCount: ites.count,
    };
  });

  const handleLogout = () => {
    Alert.alert(t("tabs.profile.logoutTitle"), t("tabs.profile.logoutMessage"), [
      { text: t("tabs.profile.no"), style: "cancel" },
      {
        text: t("tabs.profile.yesLogout"),
        style: "destructive",
        onPress: () => {
          logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <Wrapper
      header={
        <>
          <View style={styles.profileHeader}>
            {/* Avatar */}
            <View style={styles.avatarWrap}>
              <Image
                source={{ uri: "https://i.pravatar.cc/150" }}
                style={styles.avatar}
              />
              <LinearGradient
                colors={["#4D96FF", "#C77DFF"]}
                style={styles.avatarRing}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <TouchableOpacity
                onPress={() => router.navigate("/(app)/profile/edit-profile")}
                style={styles.editBtn}
                activeOpacity={0.75}
              >
                <Ionicons name="pencil" size={12} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Name block */}
            <View style={styles.nameBlock}>
              <Text style={styles.name}>{user?.name ?? t("tabs.profile.guest")}</Text>
              <Text style={styles.phone}>
                {user?.info?.phoneNumber ?? user?.username ?? ""}
              </Text>

              {/* Boosts */}
              <View style={styles.resourceRow}>
                <View style={{ position: "relative" }}>
                  <TouchableOpacity
                    onPress={openBoosts}
                    activeOpacity={0.75}
                    style={styles.resourceChip}
                  >
                    <LinearGradient
                      colors={[
                        "rgba(199,125,255,0.12)",
                        "rgba(77,150,255,0.08)",
                      ]}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                    <View
                      style={[
                        styles.resourceChipBorder,
                        { borderColor: "rgba(199,125,255,0.25)" },
                      ]}
                    />
                    <View style={styles.boostIconWrap}>
                      <LinearGradient
                        colors={["#FFD93D33", "#FF950022"]}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                      <View style={styles.boostIconBorder} />
                      <Text style={styles.boostEmoji}>⚡</Text>
                    </View>
                    <Text style={styles.resourceChipLabel}>
                      {t("tabs.profile.boosts")}
                    </Text>
                  </TouchableOpacity>
                  {totalBoosts > 0 && (
                    <View style={styles.boostCountBadge}>
                      <Text style={styles.boostCountBadgeText}>
                        {totalBoosts}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
          <View style={styles.statsRow}>
            {[
              {
                label: t("tabs.profile.stats.score"),
                value: user?.info?.score?.toLocaleString() ?? "0",
                icon: "⭐",
                color: "#4D96FF",
              },
              {
                label: t("tabs.profile.stats.activity"),
                value: `+${user?.info?.activity ?? 0}`,
                icon: "🔥",
                color: "#FF6B35",
              },
              {
                label: t("tabs.profile.stats.wins"),
                value: `${user?.info?.wonCount ?? 0}`,
                icon: "🎁",
                color: "#FFD93D",
              },
            ].map((s, i, arr) => (
              <React.Fragment key={s.label}>
                <View style={styles.statItem}>
                  <Text style={styles.statIcon}>{s.icon}</Text>
                  <Text style={[styles.statValue, { color: s.color }]}>
                    {s.value}
                  </Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
                {i < arr.length - 1 && <View style={styles.statDivider} />}
              </React.Fragment>
            ))}
          </View>
        </>
      }
    >
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t("tabs.profile.achievements")}</Text>
        <View style={styles.achRow}>
          {userAchivments?.map((a, i) => (
            <View key={i} style={styles.achItem}>
              <View
                style={[
                  styles.achIcon,
                  {
                    backgroundColor: a.color + "22",
                    borderColor: a.color + "44",
                  },
                ]}
              >
                <Text style={{ fontSize: 22 }}>{a.icon}</Text>
              </View>
              <Text style={styles.achLabel}>
                {a.label + " " + a.achivmentCount}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t("tabs.profile.skillsProfile")}</Text>
        {SKILLS_CONFIG.map((s, i) => {
          const value = user?.skills?.[s.key] ?? 0;
          return (
            <View key={s.key} style={styles.skillRow}>
              <View style={styles.skillLeft}>
                <View
                  style={[
                    styles.skillIconWrap,
                    { backgroundColor: s.color + "22" },
                  ]}
                >
                  <Text style={{ fontSize: 16 }}>{s.icon}</Text>
                </View>
                <Text style={styles.skillLabel}>{t(s.labelKey)}</Text>
              </View>
              <View style={styles.skillRight}>
                <Text style={[styles.skillValue, { color: s.color }]}>
                  {value}
                </Text>
                <Text style={styles.skillMax}>/100</Text>
              </View>
              <View style={styles.skillBarWrap}>
                <SkillBar
                  from={s.from}
                  to={s.to}
                  value={value}
                  delay={i * 100}
                />
              </View>
            </View>
          );
        })}

        {/* Overall IQ */}
        <View style={styles.iqCard}>
          <View style={styles.iqIconWrap}>
            <Text style={{ fontSize: 26 }}>🌟</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.iqSub}>{t("tabs.profile.iqTotal")}</Text>
            <Text style={styles.iqValue}>{user?.skills?.iq ?? 0}</Text>
          </View>
          <View style={styles.iqBadge}>
            <Text style={styles.iqBadgeText}>
              ↑ +{user?.skills?.iqDifference ?? 0}
            </Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={styles.languageBtn}
        onPress={() => router.navigate("/(app)/profile/language")}
        activeOpacity={0.85}
      >
        <View style={styles.languageBtnLeft}>
          <Text style={styles.languageBtnIcon}>🌐</Text>
          <Text style={styles.languageBtnText}>{t("tabs.profile.language")}</Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color="rgba(255,255,255,0.5)"
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.logoutBtn, { marginBottom: insets.bottom + 20 }]}
        onPress={handleLogout}
        activeOpacity={0.85}
      >
        <Text style={styles.logoutBtnText}>{t("tabs.profile.logout")}</Text>
      </TouchableOpacity>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  xpMiniTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 2,
    width: 100,
    overflow: "hidden",
  },
  xpMiniFill: {
    height: "100%",
  },
  screen: {
    flex: 1,
    backgroundColor: "#0A0A14",
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 40,
  },
  blob: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  logoText: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  notifBadge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  notifText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
  },

  // Card
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    overflow: "hidden",
  },

  // Stats row
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderRadius: 14,
    marginHorizontal: 10,
    marginBottom: 16,
    paddingVertical: 10,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statIcon: { fontSize: 14 },
  statValue: { fontSize: 15, fontWeight: "800" },
  statLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.35)",
    fontWeight: "600",
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  // XP
  xpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  xpLabel: { color: "rgba(255,255,255,0.5)", fontSize: 12 },
  xpRight: { color: "#C77DFF", fontSize: 12, fontWeight: "700" },
  xpTrack: {
    height: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 999,
    overflow: "hidden",
  },
  xpFill: {
    height: "100%",
    borderRadius: 999,
    overflow: "hidden",
  },
  xpSub: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 11,
    textAlign: "right",
    marginTop: 5,
  },

  // Achievements
  sectionTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 16,
  },
  achRow: { flexDirection: "row", gap: 10 },
  achItem: { flex: 1, alignItems: "center" },
  achIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  achLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    textAlign: "center",
  },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.4)",
  },

  // Skills
  skillRow: { marginBottom: 16 },
  skillLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  skillIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  skillLabel: { color: "#fff", fontSize: 13, fontWeight: "600", flex: 1 },
  skillRight: {
    position: "absolute",
    right: 0,
    top: 0,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  skillValue: { fontSize: 15, fontWeight: "800" },
  skillMax: { fontSize: 11, color: "rgba(255,255,255,0.3)" },
  skillBarWrap: { marginTop: 2 },
  barTrack: {
    height: 10,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 999,
    overflow: "visible",
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
    overflow: "hidden",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  barDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: -2,
    zIndex: 1,
  },

  // IQ card
  iqCard: {
    marginTop: 8,
    backgroundColor: "rgba(77,150,255,0.08)",
    borderColor: "rgba(77,150,255,0.2)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iqIconWrap: {
    width: 48,
    height: 48,
    backgroundColor: "rgba(77,150,255,0.1)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  iqSub: { color: "rgba(255,255,255,0.45)", fontSize: 12, marginBottom: 3 },
  iqValue: { fontSize: 22, fontWeight: "900", color: "#4D96FF" },
  iqMax: { fontSize: 14, color: "rgba(255,255,255,0.4)", fontWeight: "400" },
  iqBadge: {
    backgroundColor: "rgba(107,203,119,0.2)",
    borderColor: "rgba(107,203,119,0.3)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  iqBadgeText: { color: "#6BCB77", fontSize: 12, fontWeight: "700" },

  // Week navigation
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  weekNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  weekNavBtnDisabled: {
    opacity: 0.35,
  },
  weekNavArrow: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "300",
    lineHeight: 26,
    marginTop: -2,
  },
  weekNavArrowDisabled: {
    color: "rgba(255,255,255,0.3)",
  },
  weekNavCenter: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  weekNavLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  weekDots: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
  },
  weekDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  weekDotActive: {
    width: 18,
    borderRadius: 3,
  },

  // Activity
  chart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 100,
    marginBottom: 8,
  },
  chartCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    height: "100%",
  },
  chartDay: { color: "rgba(255,255,255,0.35)", fontSize: 11 },
  actGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  actTile: {
    width: (width - 32 - 20 - 10) / 2,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  actTileIcon: { fontSize: 20, marginBottom: 6 },
  actTileValue: { fontSize: 18, fontWeight: "800" },
  actTileLabel: { color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 2 },

  // Weekly redirect blocks
  weeklySection: {
    marginTop: 16,
  },
  weeklySectionTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 12,
  },
  weeklyCardPrimary: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(77,150,255,0.25)",
    padding: 16,
    marginBottom: 10,
    overflow: "hidden",
  },
  weeklyCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  weeklyCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(77,150,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  weeklyCardTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 3,
  },
  weeklyCardSub: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
  },
  weeklyCardChevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  weeklyCardChevron: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "300",
    lineHeight: 24,
    marginTop: -1,
  },
  weeklyProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  weeklyProgressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    overflow: "hidden",
  },
  weeklyProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  weeklyProgressLabel: {
    color: "#C77DFF",
    fontSize: 11,
    fontWeight: "700",
    width: 30,
    textAlign: "right",
  },
  weeklySmallRow: {
    flexDirection: "row",
    gap: 10,
  },
  weeklySmallCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 14,
    overflow: "hidden",
    gap: 2,
  },
  weeklySmallIcon: { fontSize: 20, marginBottom: 6 },
  weeklySmallValue: { fontSize: 22, fontWeight: "900", color: "#fff" },
  weeklySmallLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    marginTop: 2,
  },
  weeklySmallArrow: { fontSize: 16, fontWeight: "700", marginTop: 8 },

  // Profile header
  profileHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatarWrap: {
    position: "relative",
    width: 68,
    height: 68,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 20,
    position: "absolute",
    top: 3,
    left: 3,
  },
  avatarRing: {
    width: 68,
    height: 68,
    borderRadius: 22,
    position: "absolute",
    opacity: 0.6,
    zIndex: -1,
  },
  nameBlock: {
    flex: 1,
    gap: 6,
  },
  name: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  phone: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    marginTop: -2,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  badge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  resourceRow: {
    flexDirection: "row",
    gap: 8,
  },
  resourceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: "hidden",
  },
  resourceChipBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(77,150,255,0.25)",
  },
  resourceChipIcon: { fontSize: 13 },
  resourceChipValue: {
    color: "#4D96FF",
    fontSize: 13,
    fontWeight: "800",
  },
  resourceChipLabel: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 11,
    fontWeight: "600",
  },

  boostIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  boostIconBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,217,61,0.3)",
  },
  boostEmoji: {
    fontSize: 10,
  },
  boostCountBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FFD93D",
    borderWidth: 1.5,
    borderColor: "#0A0A14",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  boostCountBadgeText: { color: "#0A0A14", fontSize: 9, fontWeight: "800" },

  languageBtn: {
    marginTop: 8,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  languageBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  languageBtnIcon: {
    fontSize: 18,
  },
  languageBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  logoutBtn: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "rgba(255,59,48,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,59,48,0.25)",
  },
  logoutBtnText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "800",
  },
  editBtn: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: "#4D96FF",
    borderWidth: 2.5,
    borderColor: "#0A0A14",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});
