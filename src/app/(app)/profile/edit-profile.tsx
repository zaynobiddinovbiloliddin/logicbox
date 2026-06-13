import Wrapper from "@/components/shared/wrapper";
import { UsersModule } from "@/services/modules/users-module";
import { useAuthStore } from "@/store/auth";
import { Ionicons } from "@expo/vector-icons";
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

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState(user?.name ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user?.info?.phoneNumber ?? "");
  const [age, setAge] = useState(user?.info?.age?.toString() ?? "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await UsersModule.editProfile(user.id.toString(), {
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        age: age ? Number(age) : null,
      });
      await useAuthStore.getState().fetchMe();
      router.back();
    } catch (error: any) {
      Alert.alert(
        t("content.editProfile.errorTitle"),
        error?.response?.data?.message || t("content.editProfile.updateError")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Wrapper>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>{t("content.editProfile.title")}</Text>
          <View style={{ width: 36 }} />
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
            <Text style={styles.inputLabel}>{t("content.editProfile.nameLabel")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("content.editProfile.namePlaceholder")}
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.inputLabel}>{t("content.editProfile.phoneLabel")}</Text>
            <TextInput
              style={styles.input}
              placeholder="+998 XX XXX XX XX"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.inputLabel}>{t("content.editProfile.ageLabel")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("content.editProfile.agePlaceholder")}
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#4D96FF", "#C77DFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>{t("content.editProfile.save")}</Text>
          )}
        </TouchableOpacity>
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 20,
    paddingTop: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
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
  saveBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    overflow: "hidden",
    marginTop: 4,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
});
