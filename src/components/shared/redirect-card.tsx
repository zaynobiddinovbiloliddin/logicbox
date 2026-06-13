import { Pressable, StyleSheet, View } from "react-native";
import { ThemedView } from "../themed-view";
import { Image, ImageSource } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Spacing } from "@/constants/theme";
import { ThemedText } from "../themed-text";
import { Href, router } from "expo-router";
import { useTheme } from "@/hooks/use-theme";

interface RedirectCardProps {
  title: string;
  source: ImageSource;
  link: Href;
}

export default function RedirectCard({
  title,
  source,
  link,
}: RedirectCardProps) {
  const theme = useTheme();

  function navigateToLink() {
    router.push(link);
  }
  return (
    <Pressable onPress={navigateToLink}>
      <ThemedView type="backgroundElement" style={styles.contentRoutes}>
        <View style={styles.contentRoutesRow}>
          <Image
            style={styles.icon}
            source={source || require("@/assets/images/icons/gift.png")}
          />
          <ThemedText type="default">{title || "title"}</ThemedText>
        </View>
        <Ionicons size={16} color={theme.icon} name="chevron-forward" />
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contentRoutes: {
    alignSelf: "stretch",
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.x,
    borderRadius: Spacing.xx,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contentRoutesRow: {
    flexDirection: "row",
    gap: Spacing.two,
    alignItems: "center",
  },
  icon: {
    width: 24,
    height: 24,
  },
});
