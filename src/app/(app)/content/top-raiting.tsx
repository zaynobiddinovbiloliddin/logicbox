import { ChallengesModule } from "@/services/modules/challenges-module";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Player = {
  id: number | string;
  rank: number;
  avatar: string;
  name: string;
  score: number;
  level: number;
  streak?: number;
};

// --- Podium ---
function Podium({ players, color }: { players: Player[]; color: string }) {
  const top3 = players.slice(0, 3);
  const order = [top3[1], top3[0], top3[2]];
  const heights = [80, 110, 60];
  const rankColors = ["#C0C0C0", "#FFD700", "#CD7F32"];
  const rankEmojis = ["🥈", "🥇", "🥉"];

  return (
    <View style={styles.podiumContainer}>
      {order.map((player, i) => {
        if (!player) return null;
        const isCenter = i === 1;
        return (
          <View
            key={player.id}
            style={[styles.podiumSlot, isCenter && styles.podiumCenter]}
          >
            {isCenter && <Text style={styles.crown}>👑</Text>}
            <View
              style={[
                styles.podiumAvatar,
                isCenter && styles.podiumAvatarLarge,
                { borderColor: rankColors[i] + "99" },
              ]}
            >
              {isCenter && (
                <View
                  style={[
                    styles.podiumAvatarGlow,
                    { backgroundColor: rankColors[i] + "22" },
                  ]}
                />
              )}
              <Text
                style={[styles.podiumAvatarEmoji, isCenter && { fontSize: 34 }]}
              >
                {player.avatar}
              </Text>
            </View>
            <Text
              style={[
                styles.podiumName,
                isCenter && { color: "#F9FAFB", fontSize: 13 },
              ]}
            >
              {player.name.split(" ")[0]}
            </Text>
            <Text style={[styles.podiumScore, { color }]}>
              {player.score.toLocaleString()}
            </Text>
            <View
              style={[
                styles.podiumBlock,
                {
                  height: heights[i],
                  backgroundColor: rankColors[i] + "22",
                  borderColor: rankColors[i] + "44",
                },
              ]}
            >
              <Text style={styles.podiumRankEmoji}>{rankEmojis[i]}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// --- Player Row ---
function PlayerRow({
  player,
  color,
  index,
  levelLabel,
}: {
  player: Player;
  color: string;
  index: number;
  levelLabel: string;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const rankColor =
    player.rank === 1
      ? "#FFD700"
      : player.rank === 2
        ? "#C0C0C0"
        : player.rank === 3
          ? "#CD7F32"
          : "#4B5563";

  return (
    <Animated.View style={{ opacity, transform: [{ translateX }] }}>
      <View style={styles.playerRow}>
        <View style={[styles.rankBadge, { backgroundColor: rankColor + "22" }]}>
          <Text style={[styles.rankText, { color: rankColor }]}>
            {player.rank <= 3
              ? ["🥇", "🥈", "🥉"][player.rank - 1]
              : `#${player.rank}`}
          </Text>
        </View>
        <View style={[styles.rowAvatar, { borderColor: color + "33" }]}>
          <Text style={styles.rowAvatarEmoji}>{player.avatar}</Text>
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowName}>{player.name}</Text>
          <View style={styles.rowMeta}>
            <Text style={styles.rowLevel}>{levelLabel} {player.level}</Text>
          </View>
        </View>
        <Text style={[styles.rowScore, { color }]}>
          {player.score.toLocaleString()}
        </Text>
      </View>
    </Animated.View>
  );
}

// --- Main Page ---
export default function TopRatingsPage() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const config = {
    label: t("content.topRating.label"),
    icon: "🏆",
    color: "#4D96FF",
    gradient: ["rgba(77,150,255,0.18)", "rgba(77,150,255,0.04)"],
  };

  useEffect(() => {
    if (id) {
      fetchLeaderboard();
    }
  }, [id]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await ChallengesModule.getChallengeLeaderboard(id as string);
      const entries: any[] = Array.isArray(data) ? data : (data as any)?.entries ?? [];
      const mapped: Player[] = entries.map((item: any, idx: number) => ({
        id: item.userId ?? item.id ?? item.user?.id ?? idx,
        rank: item.rank ?? idx + 1,
        avatar: "👤", // Default emoji
        name: item.name ?? item.user?.name ?? item.user?.fullName ?? "",
        score: item.totalScore ?? item.score ?? 0,
        level: 1, // Default
      }));
      setPlayers(mapped);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const rest = players.slice(3);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A0A14" }}>
        <ActivityIndicator size="large" color="#4D96FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color="#9CA3AF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("content.topRating.headerTitle")}</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Podium */}
          {players.length > 0 && (
            <LinearGradient
              colors={config.gradient as any}
              style={styles.podiumWrapper}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <View style={styles.podiumHeader}>
                <Text style={styles.podiumHeaderIcon}>{config.icon}</Text>
                <Text style={[styles.podiumHeaderLabel, { color: config.color }]}>
                  {config.label}
                </Text>
              </View>
              <Podium players={players} color={config.color} />
            </LinearGradient>
          )}

          {/* Rest of list */}
          <Text style={styles.sectionLabel}>{t("content.topRating.allParticipants")}</Text>
          {rest.map((player, i) => (
            <PlayerRow
              key={player.id}
              player={player}
              color={config.color}
              index={i}
              levelLabel={t("content.topRating.levelShort")}
            />
          ))}
          {players.length === 0 && (
             <Text style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: 40 }}>
               {t("content.topRating.empty")}
             </Text>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0A0A14" },
  container: { flex: 1, backgroundColor: "#0A0A14" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#F9FAFB",
    letterSpacing: -0.5,
  },

  // Scroll
  scrollContent: { paddingBottom: 40 },

  // Podium wrapper
  podiumWrapper: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  podiumHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 16,
  },
  podiumHeaderIcon: { fontSize: 16 },
  podiumHeaderLabel: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },

  // Podium
  podiumContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 8,
  },
  podiumSlot: { alignItems: "center", flex: 1 },
  podiumCenter: { marginBottom: 0 },
  crown: { fontSize: 22, marginBottom: 2 },
  podiumAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    overflow: "visible",
  },
  podiumAvatarLarge: { width: 66, height: 66, borderRadius: 33 },
  podiumAvatarGlow: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    top: -7,
    left: -7,
  },
  podiumAvatarEmoji: { fontSize: 26 },
  podiumName: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
    marginBottom: 2,
  },
  podiumScore: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  podiumBlock: {
    width: "100%",
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  podiumRankEmoji: { fontSize: 18, marginTop: 6 },

  // Section label
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    marginTop: 20,
    marginBottom: 8,
    marginHorizontal: 20,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // Player row
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    gap: 10,
  },
  rankBadge: {
    width: 36,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { fontSize: 13, fontWeight: "800" },
  rowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  rowAvatarEmoji: { fontSize: 20 },
  rowInfo: { flex: 1 },
  rowName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F9FAFB",
    marginBottom: 3,
  },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowLevel: { fontSize: 11, color: "#6B7280", fontWeight: "600" },
  rowScore: { fontSize: 14, fontWeight: "800", letterSpacing: -0.3 },
});
