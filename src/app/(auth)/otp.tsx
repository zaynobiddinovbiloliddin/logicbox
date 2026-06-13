import Wrapper from "@/components/shared/wrapper";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function OtpScreen() {
  const { t } = useTranslation();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState(["", "", "", ""]);
  const inputs = useRef<TextInput[]>([]);

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 3) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const isComplete = otp.every((v) => v !== "");

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
            <Text style={styles.iconEmoji}>💬</Text>
          </View>
          <Text style={styles.title}>{t("auth.otp.title")}</Text>
          <Text style={styles.subtitle}>
            {t("auth.otp.subtitle")}{"\n"}
            <Text style={styles.subtitlePhone}>+998 {phone}</Text>
          </Text>
        </View>

        <View style={styles.otpCard}>
          <LinearGradient
            colors={["rgba(77,150,255,0.06)", "rgba(199,125,255,0.06)"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.otpCardBorder} />
          <View style={styles.otpRow}>
            {otp.map((val, index) => (
              <View
                key={index}
                style={[styles.otpBox, !!val && styles.otpBoxFilled]}
              >
                {val ? (
                  <LinearGradient
                    colors={["rgba(77,150,255,0.15)", "rgba(199,125,255,0.15)"]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                ) : null}
                <View
                  style={[
                    styles.otpBoxBorder,
                    !!val && styles.otpBoxBorderActive,
                  ]}
                />
                <TextInput
                  ref={(ref) => {
                    inputs.current[index] = ref!;
                  }}
                  style={styles.otpInput}
                  value={val}
                  onChangeText={(text) => handleChange(text.slice(-1), index)}
                  onKeyPress={({ nativeEvent }) =>
                    handleKeyPress(nativeEvent.key, index)
                  }
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  selectionColor="#4D96FF"
                />
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.nextBtn, !isComplete && styles.nextBtnDisabled]}
          onPress={() => isComplete && router.replace("/(tabs)")}
          disabled={!isComplete}
          activeOpacity={0.85}
        >
          {isComplete && (
            <LinearGradient
              colors={["#4D96FF", "#C77DFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          <Text style={styles.nextBtnText}>{t("auth.otp.verify")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resendBtn} activeOpacity={0.7}>
          <Text style={styles.resendText}>{t("auth.otp.resend")}</Text>
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
    lineHeight: 20,
  },
  subtitlePhone: {
    color: "#4D96FF",
    fontWeight: "700",
  },
  otpCard: {
    borderRadius: 18,
    padding: 24,
    overflow: "hidden",
  },
  otpCardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(77,150,255,0.2)",
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  otpBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  otpBoxFilled: {
    backgroundColor: "transparent",
  },
  otpBoxBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  otpBoxBorderActive: {
    borderColor: "rgba(77,150,255,0.5)",
  },
  otpInput: {
    width: "100%",
    height: "100%",
    fontSize: 24,
    fontWeight: "900",
    color: "#fff",
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
  resendBtn: {
    alignItems: "center",
    paddingVertical: 4,
  },
  resendText: {
    color: "rgba(77,150,255,0.8)",
    fontSize: 14,
    fontWeight: "700",
  },
});
