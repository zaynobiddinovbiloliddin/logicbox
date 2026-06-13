import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFlatList,
} from "@gorhom/bottom-sheet";
import { ForwardedRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface TaskListSheetProps {
  ref: ForwardedRef<BottomSheet | null>;
}

const tasks = [
  {
    id: 1,
    titleKey: "components.taskListSheet.tasks.basic.title",
    descKey: "components.taskListSheet.tasks.basic.desc",
    score: 85,
    activity: 120,
  },
  {
    id: 2,
    titleKey: "components.taskListSheet.tasks.choice.title",
    descKey: "components.taskListSheet.tasks.choice.desc",
    score: 90,
    activity: 120,
  },
  {
    id: 3,
    titleKey: "components.taskListSheet.tasks.logic.title",
    descKey: "components.taskListSheet.tasks.logic.desc",
    score: 100,
    activity: 120,
  },
  {
    id: 4,
    titleKey: "components.taskListSheet.tasks.code.title",
    descKey: "components.taskListSheet.tasks.code.desc",
    score: 0,
    activity: 120,
  },
  {
    id: 5,
    titleKey: "components.taskListSheet.tasks.final.title",
    descKey: "components.taskListSheet.tasks.final.desc",
    score: 0,
    activity: 120,
  },
];

type Task = (typeof tasks)[0];

export default function TaskListSheet({ ref }: TaskListSheetProps) {
  const { t } = useTranslation();
  const { top } = useSafeAreaInsets();
  const theme = useTheme();

  const completedTasks = 3;
  const totalTasks = 5;

  function handleNavigate(id: number) {}

  const handleSheetChanges = useCallback((index: number) => {
    console.log("handleSheetChanges", index);
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    [],
  );

  const renderHeader = useCallback(
    () => (
      <>
        <ThemedText type="title" style={styles.title}>
          {t("components.taskListSheet.title")}
        </ThemedText>
        <View style={styles.progressWrapper}>
          <ThemedText type="subtitle">
            {t("components.taskListSheet.progress", {
              completed: completedTasks,
              total: totalTasks,
            })}
          </ThemedText>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(completedTasks / totalTasks) * 100}%` },
              ]}
            />
          </View>
        </View>
      </>
    ),
    [completedTasks, totalTasks],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Task; index: number }) => {
      const isCompleted = index < completedTasks;
      const isLocked = index > completedTasks;

      return (
        <ThemedView
          style={[
            styles.card,
            isCompleted && styles.completedCard,
            isLocked && styles.lockedCard,
          ]}
        >
          <View style={styles.cardHeader}>
            <ThemedText type="subtitle">{t(item.titleKey)}</ThemedText>
            {isCompleted && (
              <ThemedText style={styles.completedText}>✓</ThemedText>
            )}
            {isLocked && <ThemedText style={styles.lockedText}>🔒</ThemedText>}
          </View>

          <ThemedText type="small" style={styles.description}>
            {t(item.descKey)}
          </ThemedText>

          <View style={styles.statsRow}>
            <ThemedText style={styles.scoreText}>
              {t("components.taskListSheet.score", { score: item.score })}
            </ThemedText>
            <ThemedText style={styles.activityText}>
              {t("components.taskListSheet.activity", { activity: item.activity })}
            </ThemedText>
          </View>

          {!isLocked && (
            <Pressable
              disabled={isCompleted}
              onPress={() => handleNavigate(item.id)}
            >
              <ThemedView
                style={[styles.button, isCompleted && styles.buttonComplete]}
              >
                <ThemedText
                  style={[
                    styles.buttonText,
                    isCompleted && styles.buttonTextComplete,
                  ]}
                >
                  {isCompleted
                    ? t("components.taskListSheet.done")
                    : t("components.taskListSheet.start")}
                </ThemedText>
              </ThemedView>
            </Pressable>
          )}
        </ThemedView>
      );
    },
    [completedTasks],
  );

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={["90%"]}
      topInset={top}
      enablePanDownToClose={false}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      onChange={handleSheetChanges}
      backgroundStyle={{
        backgroundColor: theme.backgroundElement,
        borderRadius: 48,
      }}
    >
      <View style={styles.headerContainer}>{renderHeader()}</View>
      <BottomSheetFlatList
        data={tasks}
        keyExtractor={(item: (typeof tasks)[0]) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="never"
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.xii,
    paddingBottom: 40,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.four,
  },
  progressWrapper: {
    marginBottom: Spacing.four,
  },
  progressBar: {
    marginTop: Spacing.two,
    height: 10,
    backgroundColor: "#E5E5E5",
    borderRadius: 10,
    overflow: "hidden",
  },
  headerContainer: {
    paddingHorizontal: Spacing.xii,
  },
  progressFill: {
    height: 10,
    backgroundColor: "#FFD700",
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.x,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: Spacing.three,
  },
  completedCard: {
    borderColor: "#22C55E",
  },
  lockedCard: {
    opacity: 0.5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.two,
  },
  description: {
    marginBottom: Spacing.two,
  },
  button: {
    paddingVertical: Spacing.two,
    borderRadius: Spacing.x,
    alignItems: "center",
    backgroundColor: "#FFD700",
  },
  buttonComplete: {
    backgroundColor: "green",
  },
  buttonText: {
    color: "black",
    fontWeight: "600",
  },
  buttonTextComplete: {
    color: "white",
    fontWeight: "600",
  },
  completedText: {
    color: "#22C55E",
    fontWeight: "bold",
  },
  lockedText: {
    fontSize: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.two,
  },
  scoreText: {
    fontWeight: "600",
  },
  activityText: {
    fontWeight: "600",
  },
});
