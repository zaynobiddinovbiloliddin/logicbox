import Wrapper from "@/components/shared/wrapper";
import { LANGUAGES } from "@/constants/language";
import i18n from "@/i18n";
import { Keys, storage } from "@/store/mmkv";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const LANGUAGE_OPTIONS = [
  { code: LANGUAGES.UZ, label: "O'zbek", emoji: "🇺🇿" },
  { code: LANGUAGES.UZ_CYRIL, label: "Ўзбекча", emoji: "🇺🇿" },
  { code: LANGUAGES.RU, label: "Русский", emoji: "🇷🇺" },
];

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(LANGUAGES.UZ);

  const handleNext = () => {
    storage.set(Keys.LANGUAGE, selected);
    i18n.changeLanguage(selected);
    router.replace("/(auth)/login");
  };

  return (
    <Wrapper>
      <View style={styles.container}>
        <View style={styles.heroWrap}>
          <View style={styles.iconWrap}>
            <LinearGradient
              colors={["#4D96FF", "#C77DFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.iconEmoji}>🧠</Text>
          </View>
          <Text style={styles.title}>
            {t("auth.welcome.title")}{" "}
            <Text style={styles.titleAccent}>{t("auth.welcome.titleAccent")}</Text>
          </Text>
          <Text style={styles.subtitle}>{t("auth.welcome.subtitle")}</Text>
        </View>

        <View style={styles.langList}>
          {LANGUAGE_OPTIONS.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={styles.langBtn}
              onPress={() => setSelected(lang.code)}
              activeOpacity={0.8}
            >
              {selected === lang.code && (
                <LinearGradient
                  colors={["rgba(77,150,255,0.18)", "rgba(199,125,255,0.18)"]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              )}
              <View
                style={[
                  styles.langBtnBorder,
                  selected === lang.code && styles.langBtnBorderActive,
                ]}
              />
              <Text style={styles.langEmoji}>{lang.emoji}</Text>
              <Text
                style={[
                  styles.langText,
                  selected === lang.code && styles.langTextActive,
                ]}
              >
                {lang.label}
              </Text>
              {selected === lang.code && (
                <View style={styles.checkWrap}>
                  <LinearGradient
                    colors={["#4D96FF", "#C77DFF"]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <Text style={styles.checkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.nextBtn}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#4D96FF", "#C77DFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.nextBtnText}>{t("auth.welcome.next")}</Text>
        </TouchableOpacity>
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    gap: 24,
    paddingTop: 40,
  },
  heroWrap: {
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 8,
  },
  iconEmoji: { fontSize: 40 },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },
  titleAccent: { color: "#4D96FF" },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
  },
  langList: { gap: 12 },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    overflow: "hidden",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  langBtnBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  langBtnBorderActive: {
    borderColor: "rgba(77,150,255,0.4)",
  },
  langEmoji: { fontSize: 24 },
  langText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "rgba(255,255,255,0.5)",
  },
  langTextActive: { color: "#fff" },
  checkWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  checkText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  nextBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    overflow: "hidden",
    marginTop: 8,
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
});
