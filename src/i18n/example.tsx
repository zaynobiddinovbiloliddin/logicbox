import { LANGUAGES } from "@/constants/language";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export function Language() {
  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.language;

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{t("title")}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.flagsContainer}
      >
        <TouchableOpacity
          onPress={() => changeLanguage(LANGUAGES.UZ)}
          style={[
            styles.flag,
            currentLanguage === LANGUAGES.UZ && styles.activeFlag,
          ]}
        >
          <Text style={styles.text}>UZ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => changeLanguage(LANGUAGES.UZ_CYRIL)}
          style={[
            styles.flag,
            currentLanguage === LANGUAGES.UZ_CYRIL && styles.activeFlag,
          ]}
        >
          <Text style={styles.text}>UZ-КИР</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => changeLanguage(LANGUAGES.RU)}
          style={[
            styles.flag,
            currentLanguage === LANGUAGES.RU && styles.activeFlag,
          ]}
        >
          <Text style={styles.text}>RU</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
  },
  flagsContainer: {
    flexDirection: "row",
    paddingVertical: 10,
  },
  flag: {
    paddingHorizontal: 10,
  },
  activeFlag: {
    transform: [{ scale: 1.2 }],
  },
  inactiveFlag: {
    opacity: 0.5,
  },
  text: {
    fontSize: 22,
    lineHeight: 32,
    marginTop: -6,
  },
});
