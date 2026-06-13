import { BottomTabInset, Spacing } from "@/constants/theme";
import { ImageBackground } from "expo-image";
import { ReactElement } from "react";
import { Platform, StyleSheet, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const lightImage = require("@/assets/images/white-wp.jpg");
const darkImage = require("@/assets/images/dark-wp.png");

interface WallpaperProps {
  children: ReactElement;
  inserTop?: boolean;
}

export default function Wallpaper({ children, inserTop }: WallpaperProps) {
  const theme = useColorScheme();
  const bgImage = theme === "dark" ? darkImage : lightImage;
  const overlayColor = theme === "dark" ? "rgba(0,0,0,0.8)" : undefined;
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: inserTop ? insets.top + 50 : insets.top,
    },
    ios: {
      paddingTop: insets.top,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
  });

  return (
    <ImageBackground style={[styles.bg, contentPlatformStyle]} source={bgImage}>
      <View style={[styles.overlay, { backgroundColor: overlayColor }]} />
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
