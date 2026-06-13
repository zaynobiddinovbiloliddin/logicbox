import { View, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";

// ── Section header ──
export default function SectionHeader({
  title,
  onSeeAll,
}: {
  title: string;
  onSeeAll?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>
        {title}
      </Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={{ color: "#4D96FF", fontSize: 12, fontWeight: "700" }}>
            {t("components.sectionHeader.seeAll")}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
