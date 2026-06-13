import { BottomTabInset, Spacing } from "@/constants/theme";
import { WINDOW_WIDTH } from "@gorhom/bottom-sheet";
import React, { ReactNode, useEffect, useRef } from "react";
import { Animated, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface WrapperProps {
  children: ReactNode;
  inserTop?: boolean;
  header?: ReactNode;
  withoutScrool?: boolean;
  allowBounce?: boolean;
}

export default function Wrapper({
  children,
  inserTop,
  header,
  withoutScrool,
  allowBounce = true,
}: WrapperProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset,
  };

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: inserTop ? insets.top + 50 : insets.top,
    },
    ios: {
      paddingTop: insets.top,
    },
    web: {
      paddingTop: Spacing.three,
      paddingBottom: Spacing.four,
    },
  });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={[styles.screen, contentPlatformStyle]}>
      {/* Background blobs */}
      <View
        pointerEvents="none"
        style={[
          styles.blob,
          { top: -60, left: -60, backgroundColor: "#4D96FF12" },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.blob,
          {
            top: 200,
            right: -80,
            backgroundColor: "#C77DFF12",
            width: 260,
            height: 260,
          },
        ]}
      />

      {header ? header : null}

      {!withoutScrool ? (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          bounces={allowBounce}
          alwaysBounceVertical={allowBounce}
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {children}
          </Animated.View>
        </ScrollView>
      ) : (
        <View
          style={[styles.scroll, { flex: 1, paddingBottom: insets.bottom }]}
        >
          <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
            {children}
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0A0A14",
  },
  scroll: {
    paddingHorizontal: 16,
  },
  blob: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  logoText: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  notifBadge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  notifText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
  },

  // Card
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    overflow: "hidden",
  },

  // Profile
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  avatarWrap: {
    width: 90,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  spinRing: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: "hidden",
  },
  avatarInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0A0A14",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#0A0A14",
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  onlineDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#6BCB77",
    borderWidth: 2.5,
    borderColor: "#0A0A14",
  },
  nameBlock: {
    flex: 1,
  },
  name: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  phone: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  badge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Stats tiles
  statsTiles: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  tile: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
  },
  tileIcon: { fontSize: 18, marginBottom: 4 },
  tileValue: { fontSize: 16, fontWeight: "800" },
  tileLabel: { fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 },

  // XP
  xpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  xpLabel: { color: "rgba(255,255,255,0.5)", fontSize: 12 },
  xpRight: { color: "#C77DFF", fontSize: 12, fontWeight: "700" },
  xpTrack: {
    height: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 999,
    overflow: "hidden",
  },
  xpFill: {
    height: "100%",
    borderRadius: 999,
    overflow: "hidden",
  },
  xpSub: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 11,
    textAlign: "right",
    marginTop: 5,
  },

  // Achievements
  sectionTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 16,
  },
  achRow: { flexDirection: "row", gap: 10 },
  achItem: { flex: 1, alignItems: "center" },
  achIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  achLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    textAlign: "center",
  },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.4)",
  },

  // Skills
  skillRow: { marginBottom: 16 },
  skillLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  skillIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  skillLabel: { color: "#fff", fontSize: 13, fontWeight: "600", flex: 1 },
  skillRight: {
    position: "absolute",
    right: 0,
    top: 0,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  skillValue: { fontSize: 15, fontWeight: "800" },
  skillMax: { fontSize: 11, color: "rgba(255,255,255,0.3)" },
  skillBarWrap: { marginTop: 2 },

  barTrack: {
    height: 10,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 999,
    overflow: "visible",
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
    overflow: "hidden",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  barDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: -2,
    zIndex: 1,
  },

  // IQ card
  iqCard: {
    marginTop: 8,
    backgroundColor: "rgba(77,150,255,0.08)",
    borderColor: "rgba(77,150,255,0.2)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iqIconWrap: {
    width: 48,
    height: 48,
    backgroundColor: "rgba(77,150,255,0.1)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  iqSub: { color: "rgba(255,255,255,0.45)", fontSize: 12, marginBottom: 3 },
  iqValue: { fontSize: 22, fontWeight: "900", color: "#4D96FF" },
  iqMax: { fontSize: 14, color: "rgba(255,255,255,0.4)", fontWeight: "400" },
  iqBadge: {
    backgroundColor: "rgba(107,203,119,0.2)",
    borderColor: "rgba(107,203,119,0.3)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  iqBadgeText: { color: "#6BCB77", fontSize: 12, fontWeight: "700" },

  // Activity
  chart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 100,
    marginBottom: 8,
  },
  chartCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    height: "100%",
  },
  chartDay: { color: "rgba(255,255,255,0.35)", fontSize: 11 },
  actGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  actTile: {
    width: (WINDOW_WIDTH - 32 - 20 - 10) / 2,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  actTileIcon: { fontSize: 20, marginBottom: 6 },
  actTileValue: { fontSize: 18, fontWeight: "800" },
  actTileLabel: { color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 2 },
});
