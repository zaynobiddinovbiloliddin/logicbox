import Wallpaper from "@/components/shared/wallpaper";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MemberCard } from "@/components/shared/member-card";
import { useTranslation } from "react-i18next";

export type Member = {
  name: string;
  avatar: string;
  score: number;
  level: number;
  wins: number;
  progress: number;
};

export const members: Member[] = [
  {
    name: "Ali",
    avatar: "https://i.pravatar.cc/200?img=1",
    score: 1240,
    level: 7,
    wins: 12,
    progress: 0.7,
  },
  {
    name: "Sara",
    avatar: "https://i.pravatar.cc/200?img=2",
    score: 980,
    level: 5,
    wins: 8,
    progress: 0.5,
  },
  {
    name: "Omar",
    avatar: "https://i.pravatar.cc/200?img=3",
    score: 640,
    level: 3,
    wins: 4,
    progress: 0.3,
  },
];

export default function Battle() {
  const { t } = useTranslation();

  return (
    <Wallpaper inserTop>
      <View style={styles.container}>
        <ThemedText type="title">{t("content.battle.members")}</ThemedText>

        {/* MEMBERS */}
        <View style={styles.memberRow}>
          {members.map((m) => (
            <MemberCard key={m.name} member={m} />
          ))}
        </View>

        {/* TASKS */}
        <ThemedText type="title">{t("content.battle.tasks")}</ThemedText>

        <Pressable
          onPress={() => router.navigate("/exam")}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <LinearGradient
            colors={["#6C5CE7", "#00C6FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButton}
          >
            <ThemedText style={styles.buttonText}>{t("content.battle.start")}</ThemedText>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={() => router.navigate("/")}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText style={styles.secondaryText}>
            {t("content.battle.viewAll")}
          </ThemedText>
        </Pressable>
      </View>
    </Wallpaper>
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
