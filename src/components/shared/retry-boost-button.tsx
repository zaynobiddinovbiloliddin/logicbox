import React from "react";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, Text, View, StyleSheet } from "react-native";

interface Props {
  hasRetry: boolean;
  retryCount: number;
  onPress: () => void;
  style?: object;
}

export default function RetryBoostButton({ hasRetry, retryCount, onPress, style }: Props) {
  const { t } = useTranslation();
  if (!hasRetry) return null;
  return (
    <TouchableOpacity style={[s.btn, style]} onPress={onPress} activeOpacity={0.8}>
      <Text style={s.text}>{t("components.retryBoostButton.label")}</Text>
      <View style={s.badge}>
        <Text style={s.badgeText}>x{retryCount}</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,154,60,0.15)",
    borderWidth: 1.5,
    borderColor: "#FF9A3C",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 10,
    gap: 8,
  },
  text: { color: "#FF9A3C", fontWeight: "700", fontSize: 15 },
  badge: {
    backgroundColor: "#FF9A3C",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: "#fff", fontWeight: "900", fontSize: 12 },
});
