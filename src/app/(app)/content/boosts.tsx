import SafeAreaWrapper from "@/components/shared/safe-area-wrapper";
import {
  POWERUP_TABS,
  type PowerUp,
  mapRemoteToPowerUp,
} from "@/constants/powerups";
import { useBoostsInventory } from "@/store/boosts-inventory";
import { useWalletStore } from "@/store/wallet";
import { useAuthStore } from "@/store/auth";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const CARD_W = (width - 32 - 12) / 2;

const TABS = POWERUP_TABS;

// ── Single card ──
function PowerUpCard({
  item,
  onPress,
  selected,
}: {
  item: PowerUp;
  onPress: () => void;
  selected: boolean;
}) {
  const { t } = useTranslation();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const count = useBoostsInventory((state) => state.inventory[item.slug] ?? 0);

  useEffect(() => {
    if (selected) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.03,
          useNativeDriver: true,
          tension: 200,
          friction: 8,
        }),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 8,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [selected]);

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [item.color + "33", item.color + "CC"],
  });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], width: CARD_W }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <Animated.View style={[styles.card, { borderColor }]}>
          <LinearGradient
            colors={[item.from + "20", item.to + "08"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />

          {/* Badge & Count */}
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: item.color + "22",
                  borderColor: item.color + "44",
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: item.color }]}>
                {item.badge}
              </Text>
            </View>
            <View
              style={[
                styles.countBadge,
                { backgroundColor: item.color + "15" },
              ]}
            >
              <Text style={[styles.countText, { color: item.color }]}>
                ×{count}
              </Text>
            </View>
          </View>

          {/* Emoji circle */}
          <LinearGradient
            colors={[item.from + "44", item.to + "22"]}
            style={styles.emojiCircle}
          >
            <Text style={styles.emoji}>{item.emoji}</Text>
          </LinearGradient>

          <Text style={styles.cardLabel}>{item.label}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.desc}
          </Text>

          {/* Price */}
          <View
            style={[styles.priceWrap, { backgroundColor: item.color + "18" }]}
          >
            <Text style={[styles.priceText, { color: item.color }]}>
              💰 {item.cost.toLocaleString()} {t("content.boosts.currency")}
            </Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Strategy tip ──
function StrategyTip() {
  const { t } = useTranslation();
  return (
    <View style={styles.tipWrap}>
      <LinearGradient
        colors={["#4D96FF18", "#C77DFF0A"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[styles.tipBorder]} />
      <Text style={styles.tipTitle}>{t("content.boosts.tipTitle")}</Text>
      <View style={styles.tipRow}>
        <View style={[styles.tipBullet, { backgroundColor: "#6BCB7722" }]}>
          <Text style={[styles.tipLabel, { color: "#6BCB77" }]}>
            {t("content.boosts.tipBlock1Title")}
          </Text>
          <Text style={styles.tipVal}>
            {t("content.boosts.tipBlock1Desc")}
          </Text>
        </View>
        <View style={[styles.tipBullet, { backgroundColor: "#C77DFF22" }]}>
          <Text style={[styles.tipLabel, { color: "#C77DFF" }]}>
            {t("content.boosts.tipBlock2Title")}
          </Text>
          <Text style={styles.tipVal}>
            {t("content.boosts.tipBlock2Desc")}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Main Screen ──
export default function PowerUpsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isBuying, setIsBuying] = useState(false);
  const { buyBoostApi, remoteBoosts, fetchInventory, isLoading } = useBoostsInventory();
  const { balance: walletBalance, withdrawBalance } = useWalletStore();
  const { user, withdrawBalance: withdrawAuthBalance } = useAuthStore();
  const balance = user?.info?.balance ?? walletBalance;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    fetchInventory();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleCardPress = (id: number) => {
    setSelectedId(id);
    setQuantity(1);
    sheetRef.current?.expand();
  };

  const handleBuy = async () => {
    if (!selectedItem || balance < selectedItem.cost * quantity || isBuying) return;

    setIsBuying(true);
    const success = await buyBoostApi(selectedId!, quantity);
    setIsBuying(false);

    if (success) {
      withdrawBalance(selectedItem.cost * quantity);
      withdrawAuthBalance(selectedItem.cost * quantity);
      Alert.alert(
        t("content.boosts.boughtTitle"),
        t("content.boosts.boughtMessage", { quantity }),
      );
    } else {
      Alert.alert(t("content.boosts.errorTitle"), t("content.boosts.buyError"));
    }

    sheetRef.current?.close();
  };
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    [],
  );

  const powerUps = useMemo(
    () => remoteBoosts.map(mapRemoteToPowerUp),
    [remoteBoosts],
  );

  const filtered =
    activeTab === "all"
      ? powerUps
      : powerUps.filter((p) => p.category === activeTab);

  // Pair cards into rows
  const rows = [];
  for (let i = 0; i < filtered.length; i += 2) {
    rows.push(filtered.slice(i, i + 2));
  }

  const selectedItem = powerUps.find((p) => p.id === selectedId);
  const totalCost = selectedItem ? selectedItem.cost * quantity : 0;
  const canAfford = balance >= totalCost;

  return (
    <View style={styles.screen}>
      {/* Background blobs */}
      <View
        style={[
          styles.blob,
          { top: -80, left: -60, backgroundColor: "#4D96FF0A" },
        ]}
      />
      <View
        style={[
          styles.blob,
          {
            top: 300,
            right: -80,
            backgroundColor: "#C77DFF0A",
            width: 280,
            height: 280,
          },
        ]}
      />

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <SafeAreaWrapper
          header={
            <View>
              {/* Back button */}
              <Pressable onPress={() => router.back()} style={styles.backRow}>
                <View style={styles.backBtn}>
                  <Ionicons name="chevron-back" size={20} color="#fff" />
                </View>
                <Text style={styles.backText}>{t("content.boosts.back")}</Text>
              </Pressable>

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <LinearGradient
                    colors={["#FFD93D33", "#FF9F4322"]}
                    style={styles.headerIconWrap}
                  >
                    <Text style={{ fontSize: 22 }}>⚡</Text>
                  </LinearGradient>
                  <View style={{ width: "60%" }}>
                    <Text style={styles.headerTitle}>{t("content.boosts.headerTitle")}</Text>
                    <Text numberOfLines={2} style={styles.headerSub}>
                      {t("content.boosts.headerSub")}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabs}
              >
                {TABS.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => {
                      setActiveTab(t.id);
                      setSelectedId(null);
                      sheetRef.current?.close();
                    }}
                    style={[styles.tab, activeTab === t.id && styles.tabActive]}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        activeTab === t.id && styles.tabTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          }
        >
          {/* Cards grid */}
          <View style={styles.scroll}>
            {isLoading && remoteBoosts.length === 0 && (
              <View style={styles.loaderWrap}>
                <ActivityIndicator size="large" color="#4D96FF" />
              </View>
            )}
            {rows.map((row, ri) => (
              <View key={ri} style={styles.row}>
                {row.map((item) => (
                  <PowerUpCard
                    key={item.id}
                    item={item}
                    selected={selectedId === item.id}
                    onPress={() => handleCardPress(item.id)}
                  />
                ))}
                {/* Fill empty slot */}
                {row.length === 1 && <View style={{ width: CARD_W }} />}
              </View>
            ))}

            <StrategyTip />
            <View style={{ height: 40 }} />
          </View>
        </SafeAreaWrapper>
      </Animated.View>

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={["54%"]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: "#1A1A24" }}
        handleIndicatorStyle={{ backgroundColor: "rgba(255,255,255,0.2)" }}
      >
        <BottomSheetView
          style={[styles.sheetContent, { paddingBottom: insets.bottom + 32 }]}
        >
          {selectedItem && (
            <>
              <LinearGradient
                colors={[selectedItem.from + "33", selectedItem.to + "11"]}
                style={styles.sheetIconWrap}
              >
                <Text style={{ fontSize: 64 }}>{selectedItem.emoji}</Text>
              </LinearGradient>
              <Text style={styles.sheetTitle}>{selectedItem.label}</Text>
              <Text style={styles.sheetDesc}>{selectedItem.desc}</Text>

              {/* Quantity Selector */}
              <View style={styles.qtyContainer}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Ionicons name="remove" size={20} color="#fff" />
                </TouchableOpacity>
                <View style={styles.qtyValue}>
                  <Text style={styles.qtyText}>{quantity}</Text>
                </View>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setQuantity(Math.min(99, quantity + 1))}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.sheetPriceWrap,
                  {
                    backgroundColor: canAfford
                      ? selectedItem.color + "18"
                      : "#FF6B6B18",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sheetPriceText,
                    { color: canAfford ? selectedItem.color : "#FF6B6B" },
                  ]}
                >
                  {canAfford
                    ? t("content.boosts.totalCost", {
                        value: totalCost.toLocaleString(),
                      })
                    : t("content.boosts.notEnoughBalanceWithAmount", {
                        value: balance.toLocaleString(),
                      })}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={canAfford && !isBuying ? 0.85 : 1}
                style={{ width: "100%", marginTop: 24 }}
                onPress={handleBuy}
                disabled={isBuying}
              >
                <LinearGradient
                  colors={
                    canAfford
                      ? [selectedItem.from, selectedItem.to]
                      : ["#2a2a3a", "#2a2a3a"]
                  }
                  style={styles.sheetBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isBuying ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Text
                        style={[
                          styles.sheetBtnText,
                          !canAfford && { color: "rgba(255,255,255,0.3)" },
                        ]}
                      >
                        {canAfford
                          ? t("content.boosts.buyNow", {
                              countSuffix: quantity > 1 ? ` (${quantity})` : "",
                            })
                          : t("content.boosts.notEnoughBalance")}
                      </Text>
                      {canAfford && <Ionicons name="cart" size={18} color="#fff" />}
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0A0A14" },
  blob: { position: "absolute", width: 300, height: 300, borderRadius: 150 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    width: "70%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "900" },
  headerSub: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 11,
    marginTop: 2,
  },
  gemsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(107,203,119,0.12)",
    borderWidth: 1,
    borderColor: "rgba(107,203,119,0.25)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  gemsNum: { color: "#6BCB77", fontSize: 14, fontWeight: "800" },

  // Tabs
  tabs: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  tabActive: {
    backgroundColor: "rgba(77,150,255,0.2)",
    borderColor: "rgba(77,150,255,0.5)",
  },
  tabText: { color: "rgba(255,255,255,0.45)", fontSize: 13, fontWeight: "700" },
  tabTextActive: { color: "#4D96FF" },

  // Scroll
  scroll: { paddingHorizontal: 16, gap: 12 },
  row: { flexDirection: "row", gap: 12 },
  loaderWrap: { paddingVertical: 60, alignItems: "center" },

  // Card
  card: {
    borderRadius: 20,
    padding: 14,
    overflow: "hidden",
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  badge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 9, fontWeight: "800" },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countText: {
    fontSize: 10,
    fontWeight: "900",
  },
  emojiCircle: {
    width: 56,
    height: 56,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 26 },
  cardLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  cardDesc: {
    color: "rgba(255,255,255,0.38)",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
  priceWrap: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  priceText: { fontSize: 12, fontWeight: "800" },
  useBtn: {
    borderRadius: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  useBtnText: { color: "#fff", fontSize: 12, fontWeight: "900" },

  // Strategy tip
  tipWrap: {
    borderRadius: 20,
    padding: 16,
    overflow: "hidden",
    gap: 12,
    marginTop: 4,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  tipBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(77,150,255,0.2)",
  },
  tipTitle: { color: "#fff", fontSize: 14, fontWeight: "800" },
  tipRow: { gap: 8 },
  tipBullet: { borderRadius: 12, padding: 10, gap: 3 },
  tipLabel: { fontSize: 11, fontWeight: "800" },
  tipVal: { color: "rgba(255,255,255,0.5)", fontSize: 12 },

  // Bottom Sheet
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    alignItems: "center",
  },
  sheetIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  sheetDesc: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sheetPriceWrap: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sheetPriceText: {
    fontSize: 14,
    fontWeight: "800",
  },
  qtyContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
    marginTop: 8,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyValue: {
    minWidth: 40,
    alignItems: "center",
  },
  qtyText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  sheetBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  sheetBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "600",
  },
});
