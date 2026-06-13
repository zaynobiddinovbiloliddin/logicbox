import { Image } from "expo-image";
import { GlassView } from "../glass-view";
import { ThemedText } from "../themed-text";
import { View, StyleSheet } from "react-native";
import { Spacing } from "@/constants/theme";
import { Member } from "@/app/(app)/content/battle";

export function MemberCard({ member }: { member: Member }) {
  return (
    <GlassView style={styles.memberCard}>
      <Image source={{ uri: member.avatar }} style={styles.avatar} />

      <ThemedText style={styles.memberName}>{member.name}</ThemedText>

      {/* SCORE */}
      <View style={styles.scoreBadge}>
        <ThemedText style={styles.scoreText}>🏆 {member.score}</ThemedText>
      </View>

      {/* INFO ROW */}
      <View style={styles.infoRow}>
        <ThemedText style={styles.infoText}>⭐ Lv.{member.level}</ThemedText>
        <ThemedText style={styles.infoText}>🎯 {member.wins} wins</ThemedText>
      </View>

      <XPBar progress={member.progress} />
    </GlassView>
  );
}

function XPBar({ progress = 0.6 }: { progress?: number }) {
  return (
    <View style={styles.xpBarBg}>
      <View style={[styles.xpBarFill, { width: `${progress * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xii,
    rowGap: Spacing.three,
  },

  memberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  cardWrapper: {
    width: "30%",
    borderRadius: 22,
    elevation: 1, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  memberCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 22, // same as wrapper
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    // NO overflow hidden here
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 999,
  },

  memberName: {
    fontSize: 14,
    fontWeight: "800",
  },

  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  scoreText: {
    fontSize: 12,
    fontWeight: "700",
  },

  infoRow: {
    flexDirection: "row",
    gap: 6,
  },

  infoText: {
    fontSize: 11,
    opacity: 0.8,
    fontWeight: "600",
  },

  xpBarBg: {
    width: "90%",
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
    marginTop: 4,
  },

  xpBarFill: {
    height: "100%",
    backgroundColor: "#00C897",
    borderRadius: 999,
  },

  primaryButton: {
    paddingVertical: Spacing.three,
    borderRadius: 18,
    alignItems: "center",
    shadowColor: "#6C5CE7",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },

  secondaryButton: {
    paddingVertical: Spacing.three,
    borderRadius: 18,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },

  secondaryText: {
    fontWeight: "700",
    fontSize: 15,
  },

  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
});
