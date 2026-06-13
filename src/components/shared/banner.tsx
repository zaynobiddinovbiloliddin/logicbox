import { ImageBackground } from "expo-image";
import { StyleSheet } from "react-native";
import { Spacing } from "@/constants/theme";

export default function Banner() {
  return (
    <ImageBackground
      style={styles.topInfoCarusel}
      source={require("@/assets/images/flags.jpg")}
    />
  );
}

const styles = StyleSheet.create({
  topInfoCarusel: {
    borderRadius: 8,
    overflow: "hidden",
    height: 100,
    marginHorizontal: Spacing.xx,
  },
});
