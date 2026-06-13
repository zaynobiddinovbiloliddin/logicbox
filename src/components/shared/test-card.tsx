import { Test } from "@/constants/test";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─────────────────────────────────────────────
// Animated Arrows › › ›
// ─────────────────────────────────────────────
function AnimatedArrows({ color }: { color: string }) {
  const arrow1 = useRef(new Animated.Value(0.1)).current;
  const arrow2 = useRef(new Animated.Value(0.1)).current;
  const arrow3 = useRef(new Animated.Value(0.1)).current;

  useEffect(() => {
    const FADE = 160;
    const HOLD = 300;
    const REST = 500;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(arrow1, {
          toValue: 1,
          duration: FADE,
          useNativeDriver: true,
        }),
        Animated.timing(arrow2, {
          toValue: 1,
          duration: FADE,
          useNativeDriver: true,
        }),
        Animated.timing(arrow3, {
          toValue: 1,
          duration: FADE,
          useNativeDriver: true,
        }),
        Animated.delay(HOLD),
        Animated.parallel([
          Animated.timing(arrow1, {
            toValue: 0.1,
            duration: FADE,
            useNativeDriver: true,
          }),
          Animated.timing(arrow2, {
            toValue: 0.1,
            duration: FADE,
            useNativeDriver: true,
          }),
          Animated.timing(arrow3, {
            toValue: 0.1,
            duration: FADE,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(REST),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [arrow1, arrow2, arrow3]);

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {([arrow1, arrow2, arrow3] as Animated.Value[]).map((anim, i) => (
        <Animated.Text
          key={i}
          style={{
            opacity: anim,
            fontSize: 20,
            fontWeight: "900",
            color,
            lineHeight: 20,
          }}
        >
          ›
        </Animated.Text>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────
// Prize Section (inside TestCard)
// ─────────────────────────────────────────────
function PrizeSection({ prizeSumma }: { prizeSumma: string }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeLoop = (anim: Animated.Value) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: false,
          }),
        ]),
      );

    makeLoop(shimmerAnim).start();
    makeLoop(glowAnim).start();

    return () => {
      shimmerAnim.stopAnimation();
      glowAnim.stopAnimation();
    };
  }, [shimmerAnim, glowAnim]);

  const shimmerColor = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["#D4AF37", "#FFF2B2", "#D4AF37"],
  });

  return (
    <View style={prizeStyles.section}>
      {/* Label + Halol badge */}
      <View style={prizeStyles.topRow}>
        <Text style={prizeStyles.label}>Chempion mukofoti</Text>
        <View style={prizeStyles.halalBadge}>
          <View style={prizeStyles.halalDot} />
          <Text style={prizeStyles.halalText}>Halol</Text>
        </View>
      </View>

      {/* Amount — shimmer animatsiya */}
      <View style={prizeStyles.amountRow}>
        <Animated.Text style={[prizeStyles.amount, { color: shimmerColor }]}>
          {prizeSumma}
        </Animated.Text>
        <Text style={prizeStyles.currency}>SO'M</Text>
      </View>

      {/* <AnimatedArrows color="rgba(255,215,0,1)" /> */}
    </View>
  );
}

const prizeStyles = StyleSheet.create({
  section: {
    // gap: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 9,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  halalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(74,222,128,0.08)",
    borderWidth: 0.5,
    borderColor: "rgba(74,222,128,0.25)",
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  halalDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#4ade80",
  },
  halalText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#4ade80",
    letterSpacing: 0.3,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  amount: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  currency: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.25)",
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  ctaText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
  },
});

// ─────────────────────────────────────────────
// TestCard
// ─────────────────────────────────────────────
export default function TestCard({
  item,
  index,
  onPress,
  hidePrice,
}: {
  item: Test;
  index: number;
  onPress: () => void;
  hidePrice?: boolean;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Kirish animatsiyasi
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 120,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: index * 120,
        useNativeDriver: true,
      }),
    ]).start();

    // Prize border glow (faqat hasPrize bo'lsa)
    if (item.hasPrize) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(borderAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: false,
          }),
          Animated.timing(borderAnim, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: false,
          }),
        ]),
      ).start();
    }
  }, []);

  const animatedBorderColor = item.hasPrize
    ? borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["rgba(212,175,55,0.15)", "rgba(212,175,55,0.6)"],
      })
    : item.from + "33";

  return (
    <Animated.View
      style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[styles.card, item.hasPrize && styles.cardPrize]}
      >
        {/* Background gradient */}
        <LinearGradient
          colors={
            item.hasPrize
              ? ["rgba(212,175,55,0.08)", "rgba(212,175,55,0.03)"]
              : [item.from + "18", item.to + "10"]
          }
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Border — prize uchun animatsiyali */}
        {item.hasPrize ? (
          <Animated.View
            style={[styles.cardBorder, { borderColor: animatedBorderColor }]}
          />
        ) : (
          <View
            style={[styles.cardBorder, { borderColor: item.from + "33" }]}
          />
        )}

        {/* Badge */}
        <View style={{ position: "absolute", right: 10, top: 10 }}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: item.hasPrize
                  ? "rgba(212,175,55,0.15)"
                  : item.badgeColor + "22",
                borderColor: item.hasPrize
                  ? "rgba(212,175,55,0.4)"
                  : item.badgeColor + "44",
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: item.hasPrize ? "#D4AF37" : item.badgeColor },
              ]}
            >
              {item.hasPrize ? "🏆 Grand Prize" : item.badge}
            </Text>
          </View>
        </View>

        {/* Top row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginVertical: 7,
          }}
        >
          <View
            style={[
              styles.cardIconWrap,
              {
                backgroundColor: item.hasPrize
                  ? "rgba(212,175,55,0.15)"
                  : item.from + "22",
              },
            ]}
          >
            <Text style={{ fontSize: 26 }}>{item.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.title}</Text>
          </View>
        </View>

        {/* Tags */}
        <View style={styles.tagRow}>
          {item.tasks.map((t, i) => (
            <View
              key={i}
              style={[
                styles.tag,
                {
                  backgroundColor: item.hasPrize
                    ? "rgba(212,175,55,0.1)"
                    : item.from + "18",
                  borderColor: item.hasPrize
                    ? "rgba(212,175,55,0.25)"
                    : item.from + "33",
                },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  { color: item.hasPrize ? "#D4AF37" : item.from },
                ]}
              >
                {t}
              </Text>
            </View>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Prize Section — faqat hasPrize bo'lsa */}
        {item.hasPrize && (
          <>
            <PrizeSection prizeSumma={item.prizeSumma ?? ""} />
            <View style={styles.divider} />
          </>
        )}

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons
                name="flash-outline"
                size={13}
                color="rgba(255,255,255,0.4)"
              />
              <Text style={styles.metaText}>{item.difficulty}</Text>
            </View>
            <View style={styles.metaDot} />
            <View style={styles.metaItem}>
              <Ionicons
                name="time-outline"
                size={13}
                color="rgba(255,255,255,0.4)"
              />
              <Text style={styles.metaText}>{item.time}</Text>
            </View>
          </View>
          <View style={styles.footerRight}>
            {!hidePrice && (
              <View
                style={[
                  styles.priceTag,
                  {
                    backgroundColor: item.hasPrize
                      ? "rgba(212,175,55,0.15)"
                      : item.from + "22",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.priceText,
                    { color: item.hasPrize ? "#D4AF37" : item.from },
                  ]}
                >
                  {item.price?.toLocaleString()} so&apos;m
                </Text>
              </View>
            )}
            <View
              style={[
                styles.arrowBtn,
                {
                  backgroundColor: item.hasPrize
                    ? "rgba(212,175,55,0.15)"
                    : item.from + "22",
                  borderColor: item.hasPrize
                    ? "rgba(212,175,55,0.4)"
                    : item.from + "44",
                },
              ]}
            >
              <Ionicons
                name="chevron-forward"
                size={14}
                color={item.hasPrize ? "#D4AF37" : item.from}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 18,
    overflow: "hidden",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  cardPrize: {
    backgroundColor: "rgba(212,175,55,0.03)",
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 1,
  },
  cardIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 10, fontWeight: "700" },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  tagRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  tag: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { fontSize: 11, fontWeight: "600" },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: "rgba(255,255,255,0.4)", fontSize: 12 },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  footerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  priceTag: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  priceText: { fontSize: 13, fontWeight: "700" },
  arrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
