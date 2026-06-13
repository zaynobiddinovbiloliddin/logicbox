import { useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";

import Wallpaper from "@/components/shared/wallpaper";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";

import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "react-i18next";

const quizBank = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  question: `Question ${i + 1}: 2 + 2 = ?`,
  correct: "B",
  options: [
    { id: "A", text: "3" },
    { id: "B", text: "4" },
    { id: "C", text: "5" },
    { id: "D", text: "6" },
  ],
}));

export default function QuizTestScreen() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const theme = useTheme();

  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const quiz = quizBank[index];

  async function selectAnswer(id: string) {
    if (answered) return;

    await Haptics.selectionAsync();

    setSelected(id);
    setAnswered(true);

    const isCorrect = id === quiz.correct;

    if (isCorrect) {
      setScore((s) => s + 1);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    setTimeout(() => {
      if (index === quizBank.length - 1) {
        setFinished(true);
      } else {
        setIndex((i) => i + 1);
        setSelected(null);
        setAnswered(false);
      }
    }, 800);
  }

  function restartTest() {
    setIndex(0);
    setScore(0);
    setSelected(null);
    setAnswered(false);
    setFinished(false);
  }

  if (finished) {
    return (
      <Wallpaper>
        <View style={styles.resultRoot}>
          <ThemedText type="title">{t("content.quiz.completed")}</ThemedText>

          <ThemedText type="title" style={styles.scoreText}>
            {t("content.quiz.score")}: {score} / {quizBank.length}
          </ThemedText>

          <TouchableOpacity style={styles.restartButton} onPress={restartTest}>
            <ThemedText style={styles.restartText}>{t("content.quiz.restart")}</ThemedText>
          </TouchableOpacity>
        </View>
      </Wallpaper>
    );
  }

  return (
    <Wallpaper>
      <View style={styles.root}>
        <ThemedText type="title">
          {t("content.quiz.title")} ({index + 1}/10)
        </ThemedText>

        <View style={styles.questionCard}>
          <ThemedText style={styles.questionText}>{quiz.question}</ThemedText>
        </View>

        <View style={styles.optionsList}>
          {quiz.options.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              activeOpacity={0.8}
              onPress={() => selectAnswer(opt.id)}
            >
              <View
                style={[
                  styles.optionCard,
                  {
                    borderColor: theme.testBorderColor,
                  },
                  answered && opt.id === quiz.correct && styles.correctCard,
                  answered &&
                    opt.id === selected &&
                    selected !== quiz.correct &&
                    styles.wrongCard,
                ]}
              >
                <ThemedText style={styles.optionLetter}>{opt.id}</ThemedText>

                <ThemedText style={styles.optionText}>{opt.text}</ThemedText>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Wallpaper>
  );
}

const styles = StyleSheet.create({
  root: {
    padding: Spacing.x,
    flex: 1,
    gap: Spacing.three,
  },

  questionCard: {
    padding: 26,
    borderRadius: 30,
    marginTop: 20,
  },

  questionText: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 30,
  },

  optionsList: {
    gap: 16,
    marginTop: 20,
  },

  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
  },

  optionLetter: {
    fontWeight: "700",
    marginRight: 20,
  },

  optionText: {
    flex: 1,
    fontSize: 16,
  },

  correctCard: {
    borderColor: "#4CAF50",
    backgroundColor: "rgba(76,175,80,0.15)",
  },

  wrongCard: {
    borderColor: "#F44336",
    backgroundColor: "rgba(244,67,54,0.15)",
  },

  resultRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    padding: Spacing.x,
  },

  scoreText: {
    fontWeight: "700",
  },

  restartButton: {
    padding: 18,
    borderRadius: 24,
    minWidth: 200,
    alignItems: "center",
  },

  restartText: {
    fontWeight: "700",
  },
});
