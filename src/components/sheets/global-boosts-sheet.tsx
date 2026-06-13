import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useBoostsSheetStore } from "@/store/boosts-sheet";
import { useBoostsInventory } from "@/store/boosts-inventory";
import { useWalletStore } from "@/store/wallet";
import { useAuthStore } from "@/store/auth";
import {
  POWERUP_TABS,
  type PowerUp,
  mapRemoteToPowerUp,
} from "@/constants/powerups";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

export function GlobalBoostsSheet() {
  const { t } = useTranslation();
  const { isOpen, close } = useBoostsSheetStore();
  const { balance: walletBalance, withdrawBalance } = useWalletStore();
  const { user, withdrawBalance: withdrawAuthBalance } = useAuthStore();
  const balance = user?.info?.balance ?? walletBalance;

  const { inventory, remoteBoosts, buyBoostApi, fetchInventory, isLoading } =
    useBoostsInventory();
  const sheetRef = useRef<BottomSheet>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedItem, setSelectedItem] = useState<PowerUp | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isBuying, setIsBuying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      sheetRef.current?.expand();
      fetchInventory();
    } else {
      sheetRef.current?.close();
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    close();
    setSelectedItem(null);
    setQuantity(1);
    setIsBuying(false);
  }, [close]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
        onPress={handleClose}
      />
    ),
    [handleClose],
  );

  const powerUps = useMemo(
    () => remoteBoosts.map(mapRemoteToPowerUp),
    [remoteBoosts],
  );

  const filtered =
    activeTab === "all"
      ? powerUps
      : powerUps.filter((p) => p.category === activeTab);

  const rows: PowerUp[][] = [];
  for (let i = 0; i < filtered.length; i += 2) {
    rows.push(filtered.slice(i, i + 2));
  }
  const { top } = useSafeAreaInsets();

  const totalCost = selectedItem ? selectedItem.cost * quantity : 0;
  const canAfford = balance >= totalCost;

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={["85%"]}
      enablePanDownToClose
      onClose={handleClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={s.sheetBg}
      topInset={top}
      handleIndicatorStyle={s.handle}
    >
      {selectedItem ? (
        // ── Detail view ──
        <BottomSheetView style={s.detail}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => setSelectedItem(null)}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color="rgba(255,255,255,0.6)"
            />
            <Text style={s.backText}>{t("content.boosts.back")}</Text>
          </TouchableOpacity>

          <LinearGradient
            colors={[selectedItem.from + "33", selectedItem.to + "11"]}
            style={s.detailIcon}
          >
            <Text style={{ fontSize: 64 }}>{selectedItem.emoji}</Text>
          </LinearGradient>

          <Text style={s.detailTitle}>{selectedItem.label}</Text>
          <Text style={s.detailDesc}>{selectedItem.desc}</Text>

          {/* Quantity Selector */}
          <View style={s.qtyContainer}>
            <TouchableOpacity
              style={s.qtyBtn}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Ionicons name="remove" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={s.qtyValue}>
              <Text style={s.qtyText}>{quantity}</Text>
            </View>
            <TouchableOpacity
              style={s.qtyBtn}
              onPress={() => setQuantity(Math.min(99, quantity + 1))}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View
            style={[
              s.priceChip,
              { backgroundColor: canAfford ? selectedItem.color + "18" : "#FF6B6B18" },
            ]}
          >
            <Text style={[s.priceChipText, { color: canAfford ? selectedItem.color : "#FF6B6B" }]}>
              {canAfford 
                ? t("content.boosts.totalCost", { value: totalCost.toLocaleString() })
                : t("content.boosts.notEnoughBalance")}
            </Text>
          </View>

          <View style={s.ownedRow}>
            <Text style={s.ownedLabel}>{t("components.globalBoostsSheet.inStock")}</Text>
            <Text style={[s.ownedCount, { color: selectedItem.color }]}>
              {t("components.globalBoostsSheet.stockCount", { count: inventory[selectedItem.slug] ?? 0 })}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={canAfford && !isBuying ? 0.85 : 1}
            style={{ width: "100%", marginTop: 16 }}
            onPress={async () => {
              if (!canAfford || isBuying) return;
              
              setIsBuying(true);
              const success = await buyBoostApi(selectedItem.id, quantity);
              setIsBuying(false);

              if (success) {
                withdrawBalance(totalCost);
                withdrawAuthBalance(totalCost);
                Alert.alert(
                  t("content.boosts.boughtTitle"),
                  t("content.boosts.boughtMessage", { quantity }),
                  [{ text: t("components.globalBoostsSheet.ok"), onPress: () => setSelectedItem(null) }],
                );
              } else {
                Alert.alert(
                  t("content.boosts.errorTitle"),
                  t("content.boosts.buyError"),
                );
              }
            }}
          >
            <LinearGradient
              colors={
                canAfford
                  ? [selectedItem.from, selectedItem.to]
                  : ["#2a2a3a", "#2a2a3a"]
              }
              style={s.applyBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isBuying ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text
                    style={[
                      s.applyBtnText,
                      !canAfford && {
                        color: "rgba(255,255,255,0.3)",
                      },
                    ]}
                  >
                    {canAfford
                      ? t("content.boosts.buyNow", {
                          countSuffix:
                            quantity > 1
                              ? t("components.globalBoostsSheet.qtySuffix", {
                                  count: quantity,
                                })
                              : t("components.globalBoostsSheet.boostSuffix"),
                        })
                      : t("content.boosts.notEnoughBalance")}
                  </Text>
                  {canAfford && (
                    <Ionicons name="cart" size={18} color="#fff" />
                  )}
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </BottomSheetView>
      ) : (
        // ── List view ──
        <>
          <View style={s.header}>
            <View style={s.headerLeft}>
              <LinearGradient
                colors={["#FFD93D33", "#FF9F4322"]}
                style={s.headerIcon}
              >
                <Text style={{ fontSize: 20 }}>⚡</Text>
              </LinearGradient>
              <View>
                <Text style={s.headerTitle}>{t("content.boosts.headerTitle")}</Text>
                <Text style={s.headerSub}>
                  {t("content.boosts.headerSub")}
                </Text>
              </View>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.tabs}
          >
            {POWERUP_TABS.map((t) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => setActiveTab(t.id)}
                style={[s.tab, activeTab === t.id && s.tabActive]}
              >
                <Text
                  style={[s.tabText, activeTab === t.id && s.tabTextActive]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <BottomSheetScrollView
            contentContainerStyle={s.grid}
            showsVerticalScrollIndicator={false}
          >
            {rows.map((row, ri) => (
              <View key={ri} style={s.row}>
                {row.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={s.card}
                    activeOpacity={0.85}
                    onPress={() => setSelectedItem(item)}
                  >
                    <LinearGradient
                      colors={[item.from + "20", item.to + "08"]}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                    <View style={s.cardHeader}>
                      <View
                        style={[
                          s.badge,
                          {
                            backgroundColor: item.color + "22",
                            borderColor: item.color + "44",
                          },
                        ]}
                      >
                        <Text style={[s.badgeText, { color: item.color }]}>
                          {item.badge}
                        </Text>
                      </View>
                      <View
                        style={[
                          s.countBadge,
                          { backgroundColor: item.color + "15" },
                        ]}
                      >
                        <Text style={[s.countText, { color: item.color }]}>
                          ×{inventory[item.slug] ?? 0}
                        </Text>
                      </View>
                    </View>
                    <LinearGradient
                      colors={[item.from + "44", item.to + "22"]}
                      style={s.emojiCircle}
                    >
                      <Text style={{ fontSize: 26 }}>{item.emoji}</Text>
                    </LinearGradient>
                    <Text style={s.cardLabel}>{item.label}</Text>
                    <Text style={s.cardDesc} numberOfLines={2}>
                      {item.desc}
                    </Text>
                    <View
                      style={[
                        s.cardPrice,
                        { backgroundColor: item.color + "18" },
                      ]}
                    >
                      <Text style={[s.cardPriceText, { color: item.color }]}>
                        💰 {item.cost.toLocaleString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {row.length === 1 && <View style={{ flex: 1 }} />}
              </View>
            ))}
            <View style={{ height: 40 }} />
          </BottomSheetScrollView>
        </>
      )}
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  sheetBg: { backgroundColor: "#1A1A24" },
  handle: { backgroundColor: "rgba(255,255,255,0.2)" },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  headerSub: { color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 2 },
  gemsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,215,61,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,215,61,0.25)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  gemsNum: { color: "#FFD93D", fontSize: 13, fontWeight: "800" },

  // Tabs
  tabs: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  tab: {
    paddingHorizontal: 16,
    height: 25,
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  tabActive: {
    backgroundColor: "rgba(77,150,255,0.2)",
    borderColor: "rgba(77,150,255,0.5)",
  },
  tabText: { color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: "#4D96FF" },

  // Grid
  grid: { paddingHorizontal: 16, gap: 12 },
  row: { flexDirection: "row", gap: 12 },

  // Card
  card: {
    flex: 1,
    borderRadius: 20,
    padding: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
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
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
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
  cardPrice: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  cardPriceText: { fontSize: 11, fontWeight: "800" },

  // Detail view
  detail: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
    alignItems: "center",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginBottom: 16,
  },
  backText: { color: "rgba(255,255,255,0.6)", fontSize: 14 },
  detailIcon: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  detailTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  detailDesc: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  priceChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  priceChipText: { fontSize: 14, fontWeight: "800" },
  ownedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  ownedLabel: { color: "rgba(255,255,255,0.4)", fontSize: 13 },
  ownedCount: { fontSize: 15, fontWeight: "800" },
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
  applyBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  applyBtnText: { color: "#fff", fontSize: 16, fontWeight: "900" },
});
