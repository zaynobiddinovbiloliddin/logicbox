import { UsersModule } from "@/services/modules/users-module";
import { useAuthStore } from "@/store/auth";
import { useBoostsInventory } from "@/store/boosts-inventory";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";


export default function HomeHeader() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const inventory = useBoostsInventory((s) => s.inventory);
  const boosts = Object.values(inventory).reduce(
    (sum: number, n: number) => sum + n,
    0,
  );

  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [onlineUsersCount, setOnlineUsersCount] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsData, countData] = await Promise.all([
          UsersModule.getStats(),
          UsersModule.getUnreadNotificationsCount(),
        ]);
        setTotalUsers((statsData.total || 0) + 3000);
        setOnlineUsersCount((statsData.online || 0) + 98);
        setUnreadCount(countData.count);
      } catch (error) {
        console.error("Failed to fetch user stats/notifications:", error);
      }
    };
    fetchStats();
  }, []);

  const spinAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  function navigateToBoosts() {
    router.navigate("/(app)/content/boosts");
  }

  return (
    <View style={headerStyles.wrap}>
      {/* LEFT */}
      <View style={headerStyles.left}>
        <View style={headerStyles.avatarWrap}>
          <Animated.View
            style={[headerStyles.spinRing, { transform: [{ rotate: spin }] }]}
          >
            <LinearGradient
              colors={["#4D96FF", "#C77DFF", "#FFD93D", "#4D96FF"]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <View style={headerStyles.avatarInner}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={headerStyles.avatar}
            />
          </View>
          <View style={headerStyles.onlineDot} />
        </View>

        <View style={headerStyles.textBlock}>
          <Text style={headerStyles.name} numberOfLines={1}>
            {user?.name ?? t("components.homeHeader.guest")}
          </Text>
          <View style={headerStyles.statsRow}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
            >
              <Text style={{ fontSize: 10, paddingBottom: 2 }}>👥</Text>
              <Text style={headerStyles.statText}>
                {totalUsers.toLocaleString()} {t("components.homeHeader.users")}
              </Text>
            </View>
            <View style={headerStyles.onlineContainer}>
              <View
                style={{
                  width: 12,
                  height: 10,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <View style={headerStyles.onlineDotIndicator} />
              </View>
              <Text style={headerStyles.statText}>
                {onlineUsersCount.toLocaleString()} {t("components.homeHeader.online")}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* RIGHT */}
      <View style={headerStyles.right}>
        <Pressable onPress={navigateToBoosts}>
          <View style={headerStyles.boostBtn}>
            <Text style={headerStyles.boostIcon}>⚡</Text>
            {boosts > 0 && (
              <View style={headerStyles.boostBadge}>
                <Text style={headerStyles.boostBadgeText}>{boosts}</Text>
              </View>
            )}
          </View>
        </Pressable>

        <Pressable
          onPress={() => router.navigate("/content/notification")}
          style={headerStyles.notifBtn}
        >
          <Ionicons name="notifications-outline" size={18} color="#fff" />
          {unreadCount > 0 && (
            <View style={headerStyles.notifBadge}>
              <Text style={headerStyles.notifBadgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  spinRing: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
  },
  avatarInner: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: "#0A0A14",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0A0A14",
  },
  avatar: { width: 31, height: 31, borderRadius: 15.5 },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#6BCB77",
    borderWidth: 2,
    borderColor: "#0A0A14",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  statsRow: {
    flexDirection: "row",
    // alignItems: "center",
    rowGap: 0,
    columnGap: 5,

    flexWrap: "wrap",
  },
  statText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "500",
  },
  statDivider: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 10,
  },
  onlineContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  onlineDotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#6BCB77",
    shadowColor: "#6BCB77",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  boostBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,215,61,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,215,61,0.3)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  boostIcon: { fontSize: 16 },
  boostBadge: {
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
    paddingHorizontal: 4,
  },
  boostBadgeText: { color: "#0A0A14", fontSize: 9, fontWeight: "800" },
  notifBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notifBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FF6B35",
    borderWidth: 1.5,
    borderColor: "#0A0A14",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  notifBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
});
