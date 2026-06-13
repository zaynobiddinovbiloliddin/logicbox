import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  GEOGRAPHY_QUESTIONS,
  GeographyQuestion,
} from "../../../constants/geography-questions";

// ── Mock data: first 50 questions (future: fetched from backend) ──────────────
const TRAINING_QUESTIONS: GeographyQuestion[] = GEOGRAPHY_QUESTIONS.slice(
  0,
  50,
);

const C = {
  bg: "#050a14",
  card: "#0d1826",
  blue: "#00c8ff",
  gold: "#ffd700",
  green: "#00e676",
  text: "#e8f4ff",
  muted: "#7090b0",
  border: "rgba(0,200,255,0.12)",
};

const DIFF_COLOR: Record<string, string> = {
  easy: "#00e676",
  medium: "#ffd700",
  hard: "#ff4466",
};



// ── Question Card ─────────────────────────────────────────────────────────────
function QuestionCard({
  item,
  index,
  diffLabel,
}: {
  item: GeographyQuestion;
  index: number;
  diffLabel: Record<string, string>;
}) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);

  return (
    <Pressable
      onPress={() => setRevealed((v) => !v)}
      style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}
    >
      <LinearGradient
        colors={["rgba(0,200,255,0.05)", "rgba(0,200,255,0.01)"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={s.cardBorder} />

      {/* Top row: number + flag + difficulty */}
      <View style={s.cardTop}>
        <Text style={s.cardNum}>#{index + 1}</Text>
        <Text style={s.cardFlag}>{item.flag}</Text>
        <View
          style={[
            s.diffBadge,
            { borderColor: DIFF_COLOR[item.difficulty] + "55" },
          ]}
        >
          <View
            style={[
              s.diffDot,
              { backgroundColor: DIFF_COLOR[item.difficulty] },
            ]}
          />
          <Text style={[s.diffText, { color: DIFF_COLOR[item.difficulty] }]}>
            {diffLabel[item.difficulty]}
          </Text>
        </View>
      </View>

      {/* Question */}
      <Text style={s.question}>{item.q}</Text>

      {/* Answer reveal */}
      {revealed ? (
        <View style={s.answerBox}>
          <LinearGradient
            colors={["rgba(0,230,118,0.12)", "rgba(0,230,118,0.04)"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          <Ionicons name="checkmark-circle" size={16} color={C.green} />
          <Text style={s.answerText}>{item.answers[item.correct]}</Text>
        </View>
      ) : (
        <View style={s.tapHint}>
          <Ionicons name="eye-outline" size={14} color={C.muted} />
          <Text style={s.tapHintText}>{t("games.geographyTraining.tapToReveal")}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function GeographyTraining() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [activeCat, setActiveCat] = useState("all");

  const DIFF_LABEL: Record<string, string> = useMemo(() => ({
    easy: t("games.geographyTraining.diff.easy"),
    medium: t("games.geographyTraining.diff.medium"),
    hard: t("games.geographyTraining.diff.hard"),
  }), [t]);

  const CATEGORIES = useMemo(() => [
    { id: "all", label: t("games.geographyTraining.categories.all"), emoji: "🌐" },
    { id: "capitals", label: t("games.geographyTraining.categories.capitals"), emoji: "🏛️" },
    { id: "flags", label: t("games.geographyTraining.categories.flags"), emoji: "🚩" },
    { id: "continents", label: t("games.geographyTraining.categories.continents"), emoji: "🗺️" },
    { id: "oceans", label: t("games.geographyTraining.categories.oceans"), emoji: "🌊" },
    { id: "countries", label: t("games.geographyTraining.categories.countries"), emoji: "🌍" },
    { id: "mountains", label: t("games.geographyTraining.categories.mountains"), emoji: "⛰️" },
    { id: "rivers", label: t("games.geographyTraining.categories.rivers"), emoji: "🏞️" },
    { id: "geography", label: t("games.geographyTraining.categories.geography"), emoji: "🧭" },
    { id: "food", label: t("games.geographyTraining.categories.food"), emoji: "🍜" },
    { id: "customs", label: t("games.geographyTraining.categories.customs"), emoji: "🎎" },
  ], [t]);

  const filtered = useMemo(() => {
    if (activeCat === "all") return TRAINING_QUESTIONS;
    return TRAINING_QUESTIONS.filter((q) => q.cat === activeCat);
  }, [activeCat]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: TRAINING_QUESTIONS.length };
    for (const q of TRAINING_QUESTIONS) {
      map[q.cat] = (map[q.cat] ?? 0) + 1;
    }
    return map;
  }, []);

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.03)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.backBtnBorder} />
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </Pressable>

        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>{t("games.geographyTraining.title")}</Text>
          <Text style={s.headerSub}>
            {t("games.geographyTraining.subtitle", {
              count: TRAINING_QUESTIONS.length,
            })}
          </Text>
        </View>

        <View style={{ width: 38 }} />
      </View>

      {/* ── Stats row ── */}
      <View style={s.statsRow}>
        {[
          { label: t("games.geographyTraining.stats.total"), value: TRAINING_QUESTIONS.length, color: C.blue },
          {
            label: t("games.geographyTraining.stats.easy"),
            value: TRAINING_QUESTIONS.filter((q) => q.difficulty === "easy")
              .length,
            color: C.green,
          },
          {
            label: t("games.geographyTraining.stats.medium"),
            value: TRAINING_QUESTIONS.filter((q) => q.difficulty === "medium")
              .length,
            color: C.gold,
          },
          {
            label: t("games.geographyTraining.stats.hard"),
            value: TRAINING_QUESTIONS.filter((q) => q.difficulty === "hard")
              .length,
            color: "#ff4466",
          },
        ].map((stat) => (
          <View key={stat.label} style={s.statItem}>
            <Text style={[s.statValue, { color: stat.color }]}>
              {stat.value}
            </Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Category tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.catList}
        style={s.catScroll}
      >
        {CATEGORIES.filter((c) => (counts[c.id] ?? 0) > 0).map((cat) => {
          const active = activeCat === cat.id;
          return (
            <Pressable
              key={cat.id}
              onPress={() => setActiveCat(cat.id)}
              style={({ pressed }) => [
                s.catTab,
                active && s.catTabActive,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={s.catEmoji}>{cat.emoji}</Text>
              <Text style={[s.catLabel, active && s.catLabelActive]}>
                {cat.label}
              </Text>
              {counts[cat.id] !== undefined && (
                <View style={[s.catCount, active && s.catCountActive]}>
                  <Text
                    style={[s.catCountText, active && s.catCountTextActive]}
                  >
                    {counts[cat.id]}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Questions list ── */}
      <ScrollView
        style={s.list}
        contentContainerStyle={[
          s.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🔍</Text>
            <Text style={s.emptyText}>{t("games.geographyTraining.empty")}</Text>
          </View>
        ) : (
          filtered.map((item, idx) => (
            <QuestionCard key={item.id} item={item} index={idx} diffLabel={DIFF_LABEL} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnBorder: {
    ...StyleSheet.absoluteFill,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  headerTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerSub: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "500",
  },

  // Stats row
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,200,255,0.1)",
    paddingVertical: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  statLabel: {
    color: C.muted,
    fontSize: 10,
    fontWeight: "600",
  },

  // Category tabs
  catScroll: {
    flexGrow: 0,
    marginBottom: 14,
  },
  catList: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  catTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  catTabActive: {
    backgroundColor: "rgba(0,200,255,0.12)",
    borderColor: "rgba(0,200,255,0.4)",
  },
  catEmoji: {
    fontSize: 13,
  },
  catLabel: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  catLabelActive: {
    color: C.blue,
  },
  catCount: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 10,
    paddingHorizontal: 5,
    minWidth: 18,
    alignItems: "center",
  },
  catCountActive: {
    backgroundColor: "rgba(0,200,255,0.2)",
  },
  catCountText: {
    color: C.muted,
    fontSize: 10,
    fontWeight: "700",
  },
  catCountTextActive: {
    color: C.blue,
  },

  // List
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 10,
  },

  // Card
  card: {
    borderRadius: 18,
    padding: 14,
    overflow: "hidden",
    gap: 10,
    backgroundColor: "rgba(13,24,38,0.9)",
  },
  cardBorder: {
    ...StyleSheet.absoluteFill,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,200,255,0.12)",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardNum: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "700",
    minWidth: 28,
  },
  cardFlag: {
    fontSize: 22,
  },
  diffBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: "auto",
  },
  diffDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  diffText: {
    fontSize: 10,
    fontWeight: "700",
  },
  question: {
    color: C.text,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  answerBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,230,118,0.2)",
  },
  answerText: {
    color: C.green,
    fontSize: 14,
    fontWeight: "700",
  },
  tapHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    opacity: 0.5,
  },
  tapHintText: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "500",
  },

  // Empty
  empty: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 44,
  },
  emptyText: {
    color: C.muted,
    fontSize: 15,
    fontWeight: "600",
  },
});
