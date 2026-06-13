import { LANGUAGES } from "@/constants/language";
import i18n from "@/i18n";
import { Keys, storage } from "@/store/mmkv";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type LangCode = (typeof LANGUAGES)[keyof typeof LANGUAGES];

export default function ProfileLanguageScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const current = i18n.language as LangCode;
  const [selected, setSelected] = useState<LangCode>(current);

  const options = useMemo(
    () => [
      {
        code: LANGUAGES.UZ as LangCode,
        title: t("tabs.profile.languageOptions.uz"),
        subtitle: t("tabs.profile.languageOptions.uzSub"),
      },
      {
        code: LANGUAGES.UZ_CYRIL as LangCode,
        title: t("tabs.profile.languageOptions.uzCyrl"),
        subtitle: t("tabs.profile.languageOptions.uzCyrlSub"),
      },
      {
        code: LANGUAGES.RU as LangCode,
        title: t("tabs.profile.languageOptions.ru"),
        subtitle: t("tabs.profile.languageOptions.ruSub"),
      },
    ],
    [t],
  );

  const applyLanguage = async (code: LangCode) => {
    setSelected(code);
    storage.set(Keys.LANGUAGE, code);
    await i18n.changeLanguage(code);
    router.back();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>{t("tabs.profile.languageTitle")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.subtitle}>{t("tabs.profile.languageSubtitle")}</Text>

      <View style={styles.list}>
        {options.map((item) => {
          const active = selected === item.code;
          return (
            <TouchableOpacity
              key={item.code}
              style={[styles.item, active && styles.itemActive]}
              onPress={() => applyLanguage(item.code)}
              activeOpacity={0.85}
            >
              <View style={styles.itemLeft}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemSub}>{item.subtitle}</Text>
              </View>
              {active && <Ionicons name="checkmark-circle" size={22} color="#4D96FF" />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0A14",
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    marginTop: 16,
    marginBottom: 14,
  },
  list: {
    gap: 10,
  },
  item: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemActive: {
    borderColor: "rgba(77,150,255,0.8)",
    backgroundColor: "rgba(77,150,255,0.12)",
  },
  itemLeft: {
    flex: 1,
  },
  itemTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  itemSub: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    marginTop: 3,
  },
});

