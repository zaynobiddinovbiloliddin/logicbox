import "@/i18n";

import { FloatingChestButton } from "@/components/reward-chest/floating-chest-button";
import { GlobalBoostsSheet } from "@/components/sheets/global-boosts-sheet";
import { useAuthStore } from "@/store/auth";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <View style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false }} />
            {isAuthenticated && <FloatingChestButton />}
          </View>
          <GlobalBoostsSheet />
        </ThemeProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
