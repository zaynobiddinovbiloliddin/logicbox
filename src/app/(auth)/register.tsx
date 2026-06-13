import Wrapper from "@/components/shared/wrapper";
import { AuthModule } from "@/services/modules/auth-module";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function RegisterScreen() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const isReady =
    name.trim().length >= 2 &&
    username.trim().length >= 3 &&
    password.length >= 4;

  const handleRegister = async () => {
    if (!isReady || loading) return;
    setLoading(true);
    try {
      await AuthModule.authRegister({
        name: name.trim(),
        username: username.trim(),
        password,
      });
      router.replace("/(auth)/login");
    } catch (error: any) {
      Alert.alert(
        t("auth.common.errorTitle"),
        error?.response?.data?.message || t("auth.register.error")
      );
    } finally {
      setLoading(false);
    }
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
            <Text style={styles.iconEmoji}>🚀</Text>
          </View>
          <Text style={styles.title}>{t("auth.register.title")}</Text>
          <Text style={styles.subtitle}>{t("auth.register.subtitle")}</Text>
        </View>

        <View style={styles.inputCard}>
          <LinearGradient
            colors={["rgba(77,150,255,0.06)", "rgba(199,125,255,0.06)"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.inputCardBorder} />

          <View style={styles.fieldWrap}>
            <Text style={styles.inputLabel}>{t("auth.common.nameLabel")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("auth.common.namePlaceholder")}
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.inputLabel}>{t("auth.common.usernameLabel")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("auth.common.usernamePlaceholder")}
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.inputLabel}>{t("auth.common.passwordLabel")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("auth.common.passwordPlaceholder")}
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.nextBtn, !isReady && styles.nextBtnDisabled]}
          onPress={handleRegister}
          disabled={!isReady || loading}
          activeOpacity={0.85}
        >
          {isReady && !loading && (
            <LinearGradient
              colors={["#4D96FF", "#C77DFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextBtnText}>{t("auth.register.cta")}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text style={styles.linkText}>
            {t("auth.register.haveAccount")}{" "}
            <Text style={styles.linkAccent}>{t("auth.register.signIn")}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    gap: 20,
    paddingTop: 40,
  },
  heroWrap: {
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 4,
  },
  iconEmoji: { fontSize: 34 },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
  },
  inputCard: {
    borderRadius: 18,
    padding: 18,
    overflow: "hidden",
    gap: 16,
  },
  inputCardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(77,150,255,0.2)",
  },
  fieldWrap: {
    gap: 8,
  },
  inputLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  nextBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    marginTop: 4,
  },
  nextBtnDisabled: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  linkBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  linkText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
  },
  linkAccent: {
    color: "#4D96FF",
    fontWeight: "700",
  },
});
