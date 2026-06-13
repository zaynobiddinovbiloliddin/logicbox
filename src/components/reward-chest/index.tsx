/**
 * RewardChest — iOS picker-wheel · premium game style
 */

import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  RARITY_CONFIG,
  REWARDS,
  type RewardConfig,
  type RolledReward,
} from "@/constants/reward-chest";
import { BoostsModule } from "@/services/modules/boosts-module";
import { useRewardChestStore } from "@/store/reward-chest-store";

// ─── Layout ──────────────────────────────────────────────────────────────────
const { width: SW } = Dimensions.get("window");
const DRUM_W = SW - 48;

const ITEM_H = 62;
const VISIBLE = 5;
const DRUM_H = ITEM_H * VISIBLE;
const CENTER_Y = ((VISIBLE - 1) / 2) * ITEM_H;

const PRE_SPIN = 22;
const TARGET_IDX = PRE_SPIN;
const POST_SPIN = 4;
const MAX_SCROLL = TARGET_IDX * ITEM_H;
const INITIAL_SCROLL = Math.floor(VISIBLE / 2) * ITEM_H;

// ─── Particles ───────────────────────────────────────────────────────────────
const P_COUNT = 16;
const PARTICLE_DEFS = Array.from({ length: P_COUNT }, (_, i) => {
  const angle = (i / P_COUNT) * 2 * Math.PI;
  const dist = 60 + (i % 3) * 26;
  return {
    tx: Math.cos(angle) * dist,
    ty: Math.sin(angle) * dist - 10,
    size: 4 + (i % 4) * 2.5,
    delay: (i % 4) * 35,
  };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function buildWheelItems(
  target: RewardConfig,
  pool: RewardConfig[],
): RewardConfig[] {
  const arr: RewardConfig[] = [];
  const rewardsPool = pool.length > 0 ? pool : REWARDS;
  for (let i = 0; i < PRE_SPIN; i++)
    arr.push(rewardsPool[Math.floor(Math.random() * rewardsPool.length)]);
  arr.push(target);
  for (let i = 0; i < POST_SPIN; i++)
    arr.push(rewardsPool[Math.floor(Math.random() * rewardsPool.length)]);
  return arr;
}

interface ItemAnim {
  translateY: Animated.AnimatedSubtraction;
  rotateX: Animated.AnimatedInterpolation<string>;
  scale: Animated.AnimatedInterpolation<number>;
  opacity: Animated.AnimatedInterpolation<number>;
}

function buildItemAnim(scroll: Animated.Value, i: number): ItemAnim {
  const baseY = i * ITEM_H + CENTER_Y;
  const c = i * ITEM_H;
  return {
    translateY: Animated.subtract(new Animated.Value(baseY), scroll),
    rotateX: scroll.interpolate({
      inputRange: [
        c - 3 * ITEM_H,
        c - 2 * ITEM_H,
        c - ITEM_H,
        c,
        c + ITEM_H,
        c + 2 * ITEM_H,
        c + 3 * ITEM_H,
      ],
      outputRange: [
        "-72deg",
        "-52deg",
        "-28deg",
        "0deg",
        "28deg",
        "52deg",
        "72deg",
      ],
      extrapolate: "clamp",
    }),
    scale: scroll.interpolate({
      inputRange: [c - 2 * ITEM_H, c - ITEM_H, c, c + ITEM_H, c + 2 * ITEM_H],
      outputRange: [0.6, 0.8, 1, 0.8, 0.6],
      extrapolate: "clamp",
    }),
    opacity: scroll.interpolate({
      inputRange: [
        c - 2.5 * ITEM_H,
        c - ITEM_H,
        c,
        c + ITEM_H,
        c + 2.5 * ITEM_H,
      ],
      outputRange: [0, 0.5, 1, 0.5, 0],
      extrapolate: "clamp",
    }),
  };
}

// ─── Row item (pure, no hooks) ───────────────────────────────────────────────
function WheelRow({ item }: { item: RewardConfig }) {
  if (!item) return null;
  const r = RARITY_CONFIG[item.rarity] ?? RARITY_CONFIG.common;
  return (
    <>
      <View style={[s.rowIconWrap, { backgroundColor: `${item.color ?? '#fff'}18` }]}>
        <Text style={s.rowEmoji}>{item.icon ?? '🎁'}</Text>
      </View>
      <View style={s.rowTextCol}>
        <Text style={s.rowLabel} numberOfLines={1}>
          {item.label ?? ''}
        </Text>
        <Text style={[s.rowRarity, { color: r.color }]}>{r.label}</Text>
      </View>
    </>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
type Phase = "intro" | "spinning" | "landing" | "complete";

export default function RewardChest({ onClaim }: { onClaim: () => void }) {
  const { recordClaim } = useRewardChestStore();
  const { bottom } = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["70%"], []);

  const [availableRewards, setAvailableRewards] = useState<RewardConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rolled, setRolled] = useState<RolledReward | null>(null);
  const rolledRef = useRef<RolledReward | null>(null);
  const [items, setItems] = useState<RewardConfig[]>([]);

  const scrollOffset = useRef(new Animated.Value(INITIAL_SCROLL)).current;

  useEffect(() => {
    BoostsModule.getSpinItems()
      .then((raw) => {
        const rawList: any[] = Array.isArray(raw) ? raw : raw?.items ?? raw?.data ?? [];
        const mapped: RewardConfig[] = rawList.map((item: any) => {
          const local = REWARDS.find((r) => r.id === item.id || r.id === item.boostId);
          return {
            id: item.id ?? item.boostId ?? String(Math.random()),
            label: item.label ?? item.name ?? item.title ?? local?.label ?? '?',
            icon: item.icon ?? item.emoji ?? item.imageUrl ?? local?.icon ?? '🎁',
            color: item.color ?? local?.color ?? '#B0B0C4',
            rarity: item.rarity ?? local?.rarity ?? 'common',
            minAmount: item.minAmount ?? item.min ?? local?.minAmount ?? 1,
            maxAmount: item.maxAmount ?? item.max ?? local?.maxAmount ?? 1,
            weight: item.weight ?? local?.weight ?? 10,
            cost: item.cost ?? item.price ?? local?.cost,
          };
        });
        const rewards = mapped.length > 0 ? mapped : REWARDS;
        setAvailableRewards(rewards);
        const dummyTarget = rewards[Math.floor(Math.random() * rewards.length)];
        setItems(buildWheelItems(dummyTarget, rewards));
      })
      .catch((err) => {
        console.error("Failed to fetch spin items:", err);
        setAvailableRewards(REWARDS);
        setItems(buildWheelItems(REWARDS[0], REWARDS));
      })
      .finally(() => setIsLoading(false));
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.7}
      />
    ),
    [],
  );

  const itemAnims = useMemo<ItemAnim[]>(
    () => items.map((_, i) => buildItemAnim(scrollOffset, i)),
    [items],
  );

  const [phase, setPhase] = useState<Phase>("intro");
  const [statusText, setStatusText] = useState(
    "Нажмите ВРАЩАТЬ, чтобы открыть",
  );

  // Anim values
  const centerGlow = useRef(new Animated.Value(0)).current;
  const glowLoop = useRef<Animated.CompositeAnimation | null>(null);
  const rewardOpacity = useRef(new Animated.Value(0)).current;
  const rewardScale = useRef(new Animated.Value(0.7)).current;
  const rewardTranslateY = useRef(new Animated.Value(24)).current;
  const claimOpacity = useRef(new Animated.Value(0)).current;
  const statusOpacity = useRef(new Animated.Value(1)).current;
  const statusTY = useRef(new Animated.Value(0)).current;
  const spinPulse = useRef(new Animated.Value(1)).current;

  const particles = useRef(
    PARTICLE_DEFS.map((d) => ({
      ...d,
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    })),
  ).current;

  // Idle pulse on spin button
  useEffect(() => {
    if (phase !== "intro") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(spinPulse, {
          toValue: 1.04,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(spinPulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, spinPulse]);

  // ── flashStatus ──────────────────────────────────────────────
  const flashStatus = useCallback(
    (text: string) => {
      Animated.timing(statusOpacity, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start(() => {
        setStatusText(text);
        statusTY.setValue(6);
        Animated.parallel([
          Animated.timing(statusOpacity, {
            toValue: 1,
            duration: 160,
            useNativeDriver: true,
          }),
          Animated.spring(statusTY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 14,
            stiffness: 200,
          }),
        ]).start();
      });
    },
    [statusOpacity, statusTY],
  );

  // ── onLand ───────────────────────────────────────────────────
  const onLand = useCallback(() => {
    const current = rolledRef.current;
    if (!current) return;
    setRolled(current);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    flashStatus(`Вы получили ${current.reward?.label ?? 'награду'}!`);

    glowLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(centerGlow, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(centerGlow, {
          toValue: 0.25,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    glowLoop.current.start();

    particles.forEach((p) => {
      setTimeout(() => {
        Animated.parallel([
          Animated.sequence([
            Animated.timing(p.opacity, {
              toValue: 1,
              duration: 60,
              useNativeDriver: true,
            }),
            Animated.delay(350),
            Animated.timing(p.opacity, {
              toValue: 0,
              duration: 220,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(p.translateX, {
            toValue: p.tx,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(p.translateY, {
            toValue: p.ty,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.spring(p.scale, {
              toValue: 1,
              useNativeDriver: true,
              damping: 8,
              stiffness: 220,
            }),
            Animated.delay(350),
            Animated.timing(p.scale, {
              toValue: 0,
              duration: 220,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      }, p.delay);
    });

    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Animated.parallel([
        Animated.spring(rewardScale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 10,
          stiffness: 140,
        }),
        Animated.timing(rewardOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(rewardTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 12,
          stiffness: 140,
        }),
      ]).start();
    }, 200);

    setTimeout(() => {
      Animated.timing(claimOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setPhase("complete");
    }, 750);
  }, [
    centerGlow,
    particles,
    rewardOpacity,
    rewardScale,
    rewardTranslateY,
    claimOpacity,
    flashStatus,
  ]);

  // ── startSpin ────────────────────────────────────────────────
  const startSpin = useCallback(async () => {
    if (phase !== "intro") return;
    if (availableRewards.length === 0) {
      flashStatus("Нет доступных наград");
      return;
    }

    setPhase("spinning");
    flashStatus("Крутим…");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await BoostsModule.spinWheel();
      rolledRef.current = result;
      setRolled(result);
      const rewardTarget = result?.reward ?? availableRewards[0];
      if (rewardTarget) {
        setItems(buildWheelItems(rewardTarget, availableRewards));
      }

      const travel = MAX_SCROLL - INITIAL_SCROLL;
      Animated.sequence([
        Animated.timing(scrollOffset, {
          toValue: INITIAL_SCROLL + travel * 0.8,
          duration: 3000,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scrollOffset, {
          toValue: MAX_SCROLL,
          duration: 2700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => onLand());
    } catch (error) {
      console.error("Spin failed:", error);
      setPhase("intro");
      flashStatus("Ошибка сети");
    }
  }, [
    phase,
    availableRewards,
    scrollOffset,
    onLand,
    flashStatus,
  ]);

  // ── claim ────────────────────────────────────────────────────
  const handleClaim = useCallback(() => {
    glowLoop.current?.stop();
    recordClaim();
    onClaim();
  }, [recordClaim, onClaim]);

  // ── derived ──────────────────────────────────────────────────
  const rarity = rolled?.reward?.rarity
    ? (RARITY_CONFIG[rolled.reward.rarity] ?? RARITY_CONFIG.common)
    : RARITY_CONFIG.common;
  const pColors = [rarity.particleColor, "#FFD93D", "#FFF", rarity.color];

  if (isLoading) {
    return (
      <View style={s.root}>
        <LinearGradient
          colors={["#08081A", "#0F0F2A", "#08081A"]}
          style={StyleSheet.absoluteFillObject}
        />
        <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
          <View style={s.header}>
            <Text style={{ fontSize: 38 }}>💰</Text>
            <Text style={s.title}>Сундук наград</Text>
            <Text style={s.subtitle}>Загрузка...</Text>
          </View>
          <View style={s.center}>
            <View style={s.drumOuter}>
              <View
                style={[
                  s.drum,
                  {
                    width: DRUM_W - 4,
                    height: DRUM_H - 4,
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                <Text style={{ color: "rgba(255,255,255,0.4)" }}>
                  Загрузка наград...
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* BG gradient */}
      <LinearGradient
        colors={["#08081A", "#0F0F2A", "#08081A"]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative blobs */}
      <View
        style={[
          s.blob,
          { top: "15%", left: -60, backgroundColor: "rgba(199,125,255,0.06)" },
        ]}
      />
      <View
        style={[
          s.blob,
          {
            bottom: "10%",
            right: -70,
            backgroundColor: "rgba(77,150,255,0.06)",
            width: 320,
            height: 320,
          },
        ]}
      />
      {/* Radial glow behind drum */}
      <View style={s.drumGlow} />

      <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
        {/* ── Header ──────────────────────────────────────── */}
        <View style={s.header}>
          <Text style={{ fontSize: 38 }}>💰</Text>
          <Text style={s.title}>Сундук наград</Text>
          <Animated.Text
            style={[
              s.subtitle,
              { opacity: statusOpacity, transform: [{ translateY: statusTY }] },
            ]}
          >
            {statusText}
          </Animated.Text>
        </View>

        {/* ── Drum section (fills center) ─────────────────── */}
        <View style={s.center}>
          {/* Drum frame */}
          <View style={s.drumOuter}>
            <LinearGradient
              colors={[
                "rgba(255,215,61,0.12)",
                "rgba(255,215,61,0.04)",
                "rgba(255,215,61,0.12)",
              ]}
              style={s.drumBorder}
            />
            <View style={[s.drum, { width: DRUM_W - 4, height: DRUM_H - 4 }]}>
              {/* Rows */}
              {items.map((item, i) => {
                const a = itemAnims[i];
                return (
                  <Animated.View
                    key={i}
                    style={[
                      s.row,
                      {
                        width: DRUM_W - 4,
                        opacity: a.opacity,
                        transform: [
                          { perspective: 900 },
                          { translateY: a.translateY },
                          { rotateX: a.rotateX },
                          { scale: a.scale },
                        ],
                      },
                    ]}
                  >
                    <WheelRow item={item} />
                  </Animated.View>
                );
              })}

              {/* ── Selection highlight ──────────────────── */}
              <View
                style={[s.selZone, { top: CENTER_Y, height: ITEM_H }]}
                pointerEvents="none"
              >
                {/* Rarity glow fill */}
                <Animated.View
                  style={[
                    StyleSheet.absoluteFillObject,
                    s.selGlow,
                    { backgroundColor: rarity.glowColor, opacity: centerGlow },
                  ]}
                />
                {/* Static highlight */}
                <LinearGradient
                  colors={[
                    "rgba(255,215,61,0.08)",
                    "rgba(255,215,61,0.03)",
                    "rgba(255,215,61,0.08)",
                  ]}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
                />

                {/* Particles */}
                <View style={s.pOrigin}>
                  {particles.map((p, i) => (
                    <Animated.View
                      key={i}
                      style={{
                        position: "absolute",
                        width: p.size,
                        height: p.size,
                        borderRadius: p.size / 2,
                        backgroundColor: pColors[i % pColors.length],
                        opacity: p.opacity,
                        transform: [
                          { translateX: p.translateX },
                          { translateY: p.translateY },
                          { scale: p.scale },
                        ],
                      }}
                    />
                  ))}
                </View>
              </View>

              {/* Edge fades */}
              <LinearGradient
                colors={["#111128", "rgba(17,17,40,0.92)", "transparent"]}
                style={[s.edgeFade, { top: 0 }]}
                pointerEvents="none"
              />
              <LinearGradient
                colors={["transparent", "rgba(17,17,40,0.92)", "#111128"]}
                style={[s.edgeFade, { bottom: 0 }]}
                pointerEvents="none"
              />
            </View>
          </View>

          {/* ── Spin button ───────────────────────────────── */}
          {phase === "intro" && (
            <Animated.View style={{ transform: [{ scale: spinPulse }] }}>
              <Pressable
                onPress={startSpin}
                style={({ pressed }) => [
                  s.spinBtn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <LinearGradient
                  colors={["#FFD93D", "#FFA726"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.spinGrad}
                >
                  <Text style={s.spinText}>ВРАЩАТЬ</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          )}
        </View>

        {/* ── Reward card ─────────────────────────────────── */}
        <Animated.View
          style={[
            s.rewardCard,
            {
              backgroundColor: rarity.bgColor,
              borderColor: rarity.borderColor,
              opacity: rewardOpacity,
              transform: [
                { scale: rewardScale },
                { translateY: rewardTranslateY },
              ],
            },
          ]}
        >
          {rolled && rolled.reward && (
            <>
              <View
                style={[s.rarityBadge, { borderColor: rarity.borderColor }]}
              >
                <Text style={[s.rarityText, { color: rarity.color }]}>
                  ✦ {rarity.label.toUpperCase()} ✦
                </Text>
              </View>
              <View style={s.rewardRow}>
                <View
                  style={[
                    s.rewardIconBg,
                    { backgroundColor: `${rolled.reward.color}20` },
                  ]}
                >
                  <Text style={s.rewardEmoji}>{rolled.reward.icon}</Text>
                </View>
                <View>
                  <Text style={[s.rewardAmount, { color: rolled.reward.color }]}>
                    +{rolled.amount.toLocaleString()}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Text style={s.rewardName}>{rolled.reward.label}</Text>
                    {rolled.reward.cost && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 2,
                          backgroundColor: "rgba(0,0,0,0.3)",
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: "#FFD93D",
                            fontSize: 10,
                            fontWeight: "800",
                          }}
                        >
                          {rolled.reward.cost}
                        </Text>
                        <Text>💰</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </>
          )}
        </Animated.View>

        {/* ── Claim button ────────────────────────────────── */}
        <Animated.View
          style={[s.claimWrap, { opacity: claimOpacity }]}
          pointerEvents={phase === "complete" ? "auto" : "none"}
        >
          <Pressable
            onPress={handleClaim}
            style={({ pressed }) => [s.claimBtn, pressed && { opacity: 0.85 }]}
          >
            <LinearGradient
              colors={["#FFD93D", "#FFA726"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.claimGrad}
            >
              <Text style={s.claimText}>ЗАБРАТЬ</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Floating Gifts Button */}
        <TouchableOpacity
          style={[s.giftsBtn, { bottom: bottom + 20 }]}
          onPress={() => sheetRef.current?.snapToIndex(0)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0.12)", "rgba(255,255,255,0.05)"]}
            style={StyleSheet.absoluteFill}
          />
          <Ionicons name="gift" size={26} color="#FFD93D" />
          <View style={s.giftsBtnBadge} />
        </TouchableOpacity>
      </SafeAreaView>

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={s.sheetBackground}
        handleIndicatorStyle={s.handle}
      >
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>Возможные награды</Text>
        </View>

        <BottomSheetScrollView
          contentContainerStyle={[
            s.modalScroll,
            { paddingBottom: bottom + 20 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {availableRewards.map((r, idx) => {
            if (!r) return null;
            const config = RARITY_CONFIG[r.rarity] ?? RARITY_CONFIG.common;
            const color = r.color ?? '#fff';
            return (
              <View key={r.id ?? idx} style={s.giftRow}>
                <View
                  style={[s.giftIconWrap, { backgroundColor: `${color}15` }]}
                >
                  <Text style={s.giftEmoji}>{r.icon ?? '🎁'}</Text>
                </View>
                <View style={s.giftInfo}>
                  <Text style={s.giftName}>{r.label ?? ''}</Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Text style={[s.giftRarity, { color: config.color }]}>
                      {config.label}
                    </Text>
                    {r.cost && (
                      <>
                        <Text style={{ color: "rgba(255,255,255,0.2)" }}>
                          •
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 2,
                          }}
                        >
                          <Text
                            style={{
                              color: "#FFD93D",
                              fontSize: 11,
                              fontWeight: "700",
                            }}
                          >
                            {r.cost}
                          </Text>
                          <Text style={{ fontSize: 10 }}>💰</Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
                <View style={s.giftAmount}>
                  <Text style={[s.giftRange, { color }]}>
                    {(r.minAmount ?? 0) === (r.maxAmount ?? 0)
                      ? `×${r.minAmount ?? 0}`
                      : `${r.minAmount ?? 0}-${r.maxAmount ?? 0}`}
                  </Text>
                </View>
              </View>
            );
          })}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#08081A" },
  safe: { flex: 1 },

  blob: { position: "absolute", width: 280, height: 280, borderRadius: 140 },

  // Radial glow behind drum
  drumGlow: {
    position: "absolute",
    top: "25%",
    alignSelf: "center",
    width: SW * 0.8,
    height: SW * 0.8,
    borderRadius: SW * 0.4,
    backgroundColor: "rgba(255,215,61,0.04)",
  },

  // ── Header ──────────────────────────────────────────────────
  header: { alignItems: "center", paddingTop: 8, paddingBottom: 2 },
  giftsBtn: {
    position: "absolute",
    right: 24,
    zIndex: 100,
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  giftsBtnBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFD93D",
    borderWidth: 1.5,
    borderColor: "#111128",
  },
  headerEmoji: { fontSize: 38, lineHeight: 48 },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  subtitle: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
    letterSpacing: 0.2,
  },

  // ── Center (drum + spin) ────────────────────────────────────
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 22 },

  // Drum frame (golden border wrapper)
  drumOuter: {
    width: DRUM_W,
    height: DRUM_H,
    borderRadius: 22,
    padding: 2,
    overflow: "hidden",
  },
  drumBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
  },
  drum: {
    borderRadius: 20,
    overflow: "hidden",
    alignSelf: "center",
  },

  // ── Row ─────────────────────────────────────────────────────
  row: {
    position: "absolute",
    top: 0,
    left: 0,
    height: ITEM_H,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    gap: 14,
  },
  rowIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  rowEmoji: { fontSize: 22, lineHeight: 28 },
  rowTextCol: { flex: 1, gap: 1 },
  rowLabel: { color: "#fff", fontSize: 15, fontWeight: "700" },
  rowRarity: { fontSize: 11, fontWeight: "600", opacity: 0.7 },

  // ── Selection zone ──────────────────────────────────────────
  selZone: {
    position: "absolute",
    left: 0,
    right: 0,
    overflow: "visible",
    zIndex: 3,
  },
  selGlow: { borderRadius: 14 },
  selLineTop: {
    height: 1.5,
    backgroundColor: "rgba(255,215,61,0.35)",
    shadowColor: "#FFD93D",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  selLineBot: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: "rgba(255,215,61,0.35)",
    shadowColor: "#FFD93D",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  pOrigin: {
    position: "absolute",
    alignSelf: "center",
    top: ITEM_H / 2,
    left: "50%",
    overflow: "visible",
  },

  // ── Edge fades ──────────────────────────────────────────────
  edgeFade: {
    position: "absolute",
    left: 0,
    right: 0,
    height: ITEM_H * 1.8,
    zIndex: 2,
  },

  // ── Spin button ─────────────────────────────────────────────
  spinBtn: { width: DRUM_W, borderRadius: 18, overflow: "hidden" },
  spinGrad: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  spinText: {
    color: "#1A0E00",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2,
  },

  // ── Reward card ─────────────────────────────────────────────
  rewardCard: {
    marginHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 10,
  },
  rarityBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 3,
  },
  rarityText: { fontSize: 10, fontWeight: "800", letterSpacing: 2 },
  rewardRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  rewardIconBg: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  rewardEmoji: { fontSize: 30, lineHeight: 38 },
  rewardAmount: { fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
  rewardName: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
  },

  // ── Claim button ────────────────────────────────────────────
  claimWrap: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 8 },
  claimBtn: { borderRadius: 18, overflow: "hidden" },
  claimGrad: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  claimText: {
    color: "#1A0E00",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  // ── Bottom Sheet ────────────────────────────────────────────
  sheetBackground: {
    backgroundColor: "#111128",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  handle: {
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 40,
  },
  modalHeader: {
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  modalScroll: {
    padding: 16,
  },
  giftRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  giftIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  giftEmoji: { fontSize: 24, lineHeight: 30 },
  giftInfo: { flex: 1, marginLeft: 14, gap: 2 },
  giftName: { color: "#fff", fontSize: 16, fontWeight: "700" },
  giftRarity: { fontSize: 12, fontWeight: "600", opacity: 0.8 },
  giftAmount: {
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  giftRange: { fontSize: 14, fontWeight: "800" },
});
