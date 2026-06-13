import React from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import Wallpaper from "@/components/shared/wallpaper";
import TestCard from "@/components/shared/test-card";
import Header from "@/components/shared/home-header";
import { useTranslation } from "react-i18next";

export default function TabTwoScreen() {
  const { t } = useTranslation();

  function handleOpenModal() {
    Alert.alert(
      t("content.myTests.instructionTitle"),
      t("content.myTests.instructionMessage"),
      [
        {
          text: t("content.myTests.training"),
          onPress: () => {
            console.log("trenee");
          },
        },
        {
          text: t("content.myTests.start"),
          onPress: () => {
            console.log("start");
          },
          style: "default",
        },
        {
          text: t("content.myTests.close"),
          onPress: () => {
            console.log("trenee");
          },
        },
      ],
    );
  }

  return (
    <Wallpaper>
      <View style={styles.container}>
        <View style={styles.header}>
          <Header />
          <ThemedText style={{ textAlign: "center" }} type="title">
            {t("content.myTests.title")}
          </ThemedText>
        </View>
        <ScrollView
          style={[styles.scrollView]}
          contentContainerStyle={styles.contentContainer}
        >
          <TestCard
            title={t("content.myTests.dailyTitle")}
            subtitle={t("content.myTests.dailySubtitle")}
            source={require("@/assets/images/icons/goals.png")}
            price={2000}
            onPress={handleOpenModal}
          />
          <TestCard
            title={t("content.myTests.dailyTitle")}
            subtitle={t("content.myTests.dailySubtitle")}
            source={require("@/assets/images/icons/goals.png")}
            price={2000}
            onPress={handleOpenModal}
          />
          <TestCard
            title={t("content.myTests.dailyTitle")}
            subtitle={t("content.myTests.dailySubtitle")}
            source={require("@/assets/images/icons/goals.png")}
            price={2000}
            onPress={handleOpenModal}
          />
          <TestCard
            title={t("content.myTests.dailyTitle")}
            subtitle={t("content.myTests.dailySubtitle")}
            source={require("@/assets/images/icons/goals.png")}
            price={2000}
            onPress={handleOpenModal}
          />
        </ScrollView>
      </View>
    </Wallpaper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xii,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    justifyContent: "center",
    rowGap: Spacing.three,
  },
  stepContainer: {
    gap: Spacing.two,
    alignSelf: "stretch",
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.x,
    borderRadius: Spacing.xx,
  },
  titleContainer: {
    gap: Spacing.three,
    alignItems: "center",
    paddingHorizontal: Spacing.four,
  },
  centerText: {
    textAlign: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  linkButton: {
    flexDirection: "row",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    justifyContent: "center",
    gap: Spacing.one,
    alignItems: "center",
  },
  sectionsWrapper: {
    gap: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  collapsibleContent: {
    alignItems: "center",
  },
  imageTutorial: {
    width: "100%",
    aspectRatio: 296 / 171,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
  imageReact: {
    width: 100,
    height: 100,
    alignSelf: "center",
  },
  header: {
    paddingBottom: Spacing.xii,
  },
});
