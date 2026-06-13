import { GlassView } from "@/components/glass-view";
import { useRewardChestStore } from "@/store/reward-chest-store";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, usePathname } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function FloatingChestButton() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { canClaim, checkAvailability } = useRewardChestStore();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    checkAvailability();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (!canClaim) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [canClaim]);

  // MOVE CONDITIONAL RETURN HERE (After all hooks)
  const isHidden =
    pathname.includes("(auth)") ||
    pathname.includes("modals/reward-chest") ||
    !canClaim;

  if (isHidden) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.floatingChest,
        {
          bottom: insets.bottom + 90,
          transform: [{ scale: pulseAnim }],
          opacity: fadeAnim,
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={() => router.push("/(app)/modals/reward-chest")}
        disabled={!canClaim}
      >
        <GlassView style={styles.glassContainer}>
          <LinearGradient
            colors={["rgba(255,215,61,0.35)", "rgba(255,215,61,0.15)"]}
            style={StyleSheet.absoluteFill}
            borderRadius={20}
          />
          <Ionicons name="diamond" size={28} color="#FFD93D" />
          <View style={styles.chestReadyDot} />
        </GlassView>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  floatingChest: {
    position: "absolute",
    right: 20,
    zIndex: 99999,
    elevation: 15,
  },
  glassContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  chestReadyDot: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#6BCB77",
    borderWidth: 1.5,
    borderColor: "#1A1A24",
  },
});
