import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";

type Period = "daily" | "weekly" | "monthly";

type Player = {
  id: number;
  name: string;
  score: number;
  avatar: string;
  change: "up" | "down" | "same";
};

const MOCK_DATA: Record<Period, Player[]> = {
  daily: [
    { id: 1, name: "Артём К.", score: 4820, avatar: "🦁", change: "up" },
    { id: 2, name: "Sofia M.", score: 4310, avatar: "🐺", change: "up" },
    { id: 3, name: "Даниил Р.", score: 3990, avatar: "🦊", change: "down" },
    { id: 4, name: "Lena V.", score: 3540, avatar: "🐉", change: "same" },
    { id: 5, name: "Max T.", score: 3120, avatar: "🦅", change: "up" },
    { id: 6, name: "Ира Н.", score: 2870, avatar: "🐬", change: "down" },
    { id: 7, name: "Pavel S.", score: 2450, avatar: "🐯", change: "up" },
  ],
  weekly: [
    { id: 1, name: "Lena V.", score: 28400, avatar: "🐉", change: "up" },
    { id: 2, name: "Артём К.", score: 26100, avatar: "🦁", change: "down" },
    { id: 3, name: "Max T.", score: 24750, avatar: "🦅", change: "up" },
    { id: 4, name: "Sofia M.", score: 21300, avatar: "🐺", change: "same" },
    { id: 5, name: "Ира Н.", score: 19800, avatar: "🐬", change: "up" },
    { id: 6, name: "Даниил Р.", score: 17200, avatar: "🦊", change: "down" },
    { id: 7, name: "Pavel S.", score: 15600, avatar: "🐯", change: "down" },
  ],
  monthly: [
    { id: 1, name: "Max T.", score: 112500, avatar: "🦅", change: "up" },
    { id: 2, name: "Ира Н.", score: 98300, avatar: "🐬", change: "up" },
    { id: 3, name: "Lena V.", score: 95100, avatar: "🐉", change: "down" },
    { id: 4, name: "Артём К.", score: 89400, avatar: "🦁", change: "same" },
    { id: 5, name: "Pavel S.", score: 76200, avatar: "🐯", change: "up" },
    { id: 6, name: "Sofia M.", score: 71000, avatar: "🐺", change: "down" },
    { id: 7, name: "Даниил Р.", score: 64800, avatar: "🦊", change: "down" },
  ],
};

const TABS: { key: Period; label: string }[] = [
  { key: "daily", label: "День" },
  { key: "weekly", label: "Неделя" },
];

const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];
const MEDAL_ICONS = ["🥇", "🥈", "🥉"];

function formatScore(score: number): string {
  if (score >= 1000) return `${(score / 1000).toFixed(1)}k`;
  return score.toString();
}

function ChangeIndicator({ change }: { change: Player["change"] }) {
  if (change === "up") return <Text style={styles.changeUp}>▲</Text>;
  if (change === "down") return <Text style={styles.changeDown}>▼</Text>;
  return <Text style={styles.changeSame}>–</Text>;
}

function TopThree({ players }: { players: Player[] }) {
  const top = players.slice(0, 3);
  // Order: 2nd, 1st, 3rd for podium effect
  const podiumOrder = [top[1], top[0], top[2]];
  const podiumHeights = [60, 80, 45];
  const podiumRanks = [1, 0, 2]; // index into top[]

  return (
    <View style={styles.podiumRow}>
      {podiumOrder.map((player, i) => {
        if (!player) return null;
        const rank = podiumRanks[i];
        const isFirst = rank === 0;
        return (
          <View key={player.id} style={[styles.podiumItem, isFirst && styles.podiumItemFirst]}>
            {isFirst && (
              <Text style={styles.crownIcon}>👑</Text>
            )}
            <View style={[styles.avatarWrap, isFirst && styles.avatarWrapFirst]}>
              <Text style={[styles.avatarEmoji, isFirst && styles.avatarEmojiFirst]}>
                {player.avatar}
              </Text>
            </View>
            <Text style={[styles.podiumName, isFirst && styles.podiumNameFirst]}>
              {player.name.split(" ")[0]}
            </Text>
            <Text style={styles.podiumScore}>{formatScore(player.score)}</Text>
            <View
              style={[
                styles.podiumBase,
                { height: podiumHeights[i] },
                rank === 0 && styles.podiumBaseGold,
                rank === 1 && styles.podiumBaseSilver,
                rank === 2 && styles.podiumBaseBronze,
              ]}
            >
              <Text style={styles.podiumRankText}>{rank + 1}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function TopRatings() {
  const [period, setPeriod] = useState<Period>("daily");
  const players = MOCK_DATA[period];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏆 Рейтинг</Text>
        <View style={styles.tabRow}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, period === tab.key && styles.tabActive]}
              onPress={() => setPeriod(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, period === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Podium */}
      <TopThree players={players} />

      {/* Rest of list */}
      <View style={styles.listContainer}>
        {players.slice(3).map((player, index) => {
          const rank = index + 4;
          return (
            <View key={player.id} style={styles.listRow}>
              <Text style={styles.listRank}>{rank}</Text>
              <View style={styles.listAvatar}>
                <Text style={styles.listAvatarEmoji}>{player.avatar}</Text>
              </View>
              <Text style={styles.listName}>{player.name}</Text>
              <View style={styles.listRight}>
                <ChangeIndicator change={player.change} />
                <Text style={styles.listScore}>{formatScore(player.score)}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0D1117",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(77,150,255,0.15)",
    overflow: "hidden",
    marginVertical: 8,
  },

  // Header
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: "#4D96FF",
    shadowColor: "#4D96FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  tabText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "700",
  },

  // Podium
  podiumRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
    marginBottom: 4,
  },
  podiumItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  podiumItemFirst: {
    marginBottom: 0,
  },
  crownIcon: {
    fontSize: 22,
    marginBottom: -4,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrapFirst: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderColor: "#FFD700",
    borderWidth: 2,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarEmoji: {
    fontSize: 22,
  },
  avatarEmojiFirst: {
    fontSize: 28,
  },
  podiumName: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "600",
  },
  podiumNameFirst: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  podiumScore: {
    color: "#4D96FF",
    fontSize: 12,
    fontWeight: "700",
  },
  podiumBase: {
    width: "100%",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  podiumBaseGold: {
    backgroundColor: "rgba(255,215,0,0.18)",
    borderTopWidth: 2,
    borderColor: "rgba(255,215,0,0.5)",
  },
  podiumBaseSilver: {
    backgroundColor: "rgba(192,192,192,0.12)",
    borderTopWidth: 2,
    borderColor: "rgba(192,192,192,0.4)",
  },
  podiumBaseBronze: {
    backgroundColor: "rgba(205,127,50,0.12)",
    borderTopWidth: 2,
    borderColor: "rgba(205,127,50,0.4)",
  },
  podiumRankText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    fontWeight: "800",
  },

  // List
  listContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 6,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(77,150,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 10,
  },
  listRank: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 13,
    fontWeight: "700",
    width: 18,
    textAlign: "center",
  },
  listAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  listAvatarEmoji: {
    fontSize: 16,
  },
  listName: {
    flex: 1,
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "600",
  },
  listRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  listScore: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    minWidth: 40,
    textAlign: "right",
  },
  changeUp: {
    color: "#4ADE80",
    fontSize: 10,
    fontWeight: "700",
  },
  changeDown: {
    color: "#FF6B6B",
    fontSize: 10,
    fontWeight: "700",
  },
  changeSame: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 12,
    fontWeight: "700",
  },
});