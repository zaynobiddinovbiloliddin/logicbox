import { UsersModule } from "@/services/modules/users-module";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";

type LuckyUser = {
  userId: number;
  name: string | null;
  wonCount: number;
};

const AVATAR_COLORS = ["#FFB347", "#4D96FF", "#6BCB77", "#C77DFF", "#FF6B6B"];

export default function LuckyLeaderboard() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<LuckyUser[]>([]);

  useFocusEffect(
    useCallback(() => {
      UsersModule.getLuckyLeaderboard()
        .then((data) => setUsers(Array.isArray(data) ? data : []))
        .catch((error) => {
          console.error("Failed to fetch lucky leaderboard:", error);
        });
    }, []),
  );

  if (users.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.icon}>🍀</Text>
        <Text style={styles.title}>{t("components.luckyLeaderboard.title")}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {users.map((user, index) => (
          <View key={user.userId} style={styles.card}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length] + "33" },
              ]}
            >
              <Text style={[styles.avatarText, { color: AVATAR_COLORS[index % AVATAR_COLORS.length] }]}>
                {(user.name ?? "?").charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {user.name ?? t("components.luckyLeaderboard.anonymous")}
            </Text>
            <Text style={styles.wonCount}>
              🏆 {user.wonCount}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  icon: {
    fontSize: 14,
  },
  title: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  row: {
    gap: 10,
  },
  card: {
    width: 84,
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "800",
  },
  name: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    maxWidth: 76,
  },
  wonCount: {
    color: "#FFD93D",
    fontSize: 10,
    fontWeight: "700",
  },
});
