import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Dimensions,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  StatusBar,
  Platform,
  Pressable,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Alert } from "react-native";
import SafeAreaWrapper from "@/components/shared/safe-area-wrapper";
import { useBoostsInventory } from "@/store/boosts-inventory";
import { useRetryBoost } from "@/hooks/use-retry-boost";
import RetryBoostButton from "@/components/shared/retry-boost-button";
import { useUserStats } from "@/store/user-stats";
import { ChallengesModule } from "@/services/modules/challenges-module";
import { GamesModule } from "@/services/modules/games-module";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = "start" | "game" | "gameover";

interface BubbleData {
  id: number;
  expr: string;
  result: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  sz: number;
  colorIdx: number;
  posX: Animated.Value;
  posY: Animated.Value;
  scale: Animated.Value;
  opacity: Animated.Value;
  isPopping: boolean;
  isWrong: boolean;
  shakeAnim: Animated.Value;
}

interface ScorePopup {
  id: number;
  text: string;
  x: number;
  y: number;
  anim: Animated.Value;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  color: string;
  sz: number;
  anim: Animated.Value;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CFG = {
  time: 80,
  roundTime: 8,
  count: 5,
  minVal: 0,
  maxVal: 28,
  speed: 0.7,
  boostTime: 12,
};

const BUBBLE_COLORS = [
  ["#b794f4", "#6b46c1", "#3b1f8a"],
  ["#fbb6ce", "#d53f8c", "#8c1a5a"],
  ["#90cdf4", "#3182ce", "#1a4a8a"],
  ["#9ae6b4", "#38a169", "#1a5c40"],
  ["#fbd38d", "#dd6b20", "#7b3a0e"],
  ["#feb2b2", "#c53030", "#7a1818"],
  ["#b2f5ea", "#0694a2", "#044e60"],
  ["#e9d8fd", "#9f7aea", "#553c9a"],
];

const BUBBLE_SHADOWS = [
  "#6b46c1",
  "#d53f8c",
  "#3182ce",
  "#38a169",
  "#dd6b20",
  "#c53030",
  "#0694a2",
  "#9f7aea",
];

const COLORS = {
  bg: "#080e1f",
  panel: "rgba(255,255,255,0.05)",
  border: "rgba(255,255,255,0.10)",
  accent: "#c8a96e",
  accent2: "#7eb8f7",
  danger: "#e05c6a",
  green: "#6edba8",
  text: "#f0ece4",
  muted: "rgba(240,236,228,0.4)",
};

const OPS: Array<"+" | "-" | "x"> = ["+", "-", "x", "+", "+", "-", "+"];
const isAndroid = Platform.OS === "android";

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _uid = 0;
const uid = () => ++_uid;

const rand = (a: number, b: number) =>
  Math.floor(Math.random() * (b - a + 1)) + a;

const genExpr = (
  min: number,
  max: number,
): { expr: string; result: number } => {
  const op = OPS[rand(0, OPS.length - 1)];
  let a = 0,
    b = 0,
    res = 0,
    tries = 0;
  do {
    tries++;
    if (op === "+") {
      a = rand(1, Math.floor(max * 0.7));
      b = rand(1, Math.floor(max * 0.7));
      res = a + b;
    } else if (op === "-") {
      a = rand(Math.abs(min), max);
      b = rand(1, a + Math.abs(min));
      res = a - b;
    } else {
      a = rand(2, 7);
      b = rand(2, 7);
      res = a * b;
    }
  } while (tries < 30 && (res < min || res > max));
  return { expr: `${a}${op === "x" ? "×" : op}${b}`, result: res };
};

const fmtTime = (ms: number) => {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000)
    .toString()
    .padStart(2, "0");
  const cs = Math.floor((ms % 1000) / 10)
    .toString()
    .padStart(2, "0");
  return m > 0 ? `${m}:${s}.${cs}` : `${s}.${cs}`;
};

// ─── Stars background ────────────────────────────────────────────────────────

const Stars: React.FC = React.memo(() => {
  const { width, height } = Dimensions.get("window");
  const stars = useRef(
    Array.from({ length: isAndroid ? 30 : 50 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.4 + 0.2,
      op: Math.random() * 0.5 + 0.05,
    })),
  ).current;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {stars.map((s, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: s.x,
            top: s.y,
            width: s.r * 2,
            height: s.r * 2,
            borderRadius: s.r,
            backgroundColor: `rgba(255,255,255,${s.op})`,
          }}
        />
      ))}
    </View>
  );
});

Stars.displayName = "Stars";

// ─── Bubble Component (Memoized) ──────────────────────────────────────────────

const Bubble = React.memo(
  ({ b, onTap }: { b: BubbleData; onTap: (b: BubbleData) => void }) => {
    const [c0, c1, c2] = BUBBLE_COLORS[b.colorIdx];
    const shadow = BUBBLE_SHADOWS[b.colorIdx];
    const shakeX = b.shakeAnim.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [-10, 0, 10],
    });

    return (
      <TouchableWithoutFeedback onPress={() => onTap(b)}>
        {/* OUTER VIEW: Handles JS-Driven Layout Positioning (prevents Native Driver conflict) */}
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: b.sz,
            height: b.sz,
            transform: [{ translateX: b.posX }, { translateY: b.posY }],
          }}
        >
          {/* INNER VIEW: Handles Native-Driven Scale, Opacity, and Shake */}
          <Animated.View
            style={[
              styles.bubble,
              {
                width: "100%",
                height: "100%",
                borderRadius: b.sz / 2,
                opacity: b.opacity,
                transform: [{ scale: b.scale }, { translateX: shakeX }],
                // Optimized Shadows
                shadowColor: shadow,
                shadowOffset: { width: 0, height: isAndroid ? 4 : 16 },
                shadowOpacity: isAndroid ? 0.4 : 0.9,
                shadowRadius: isAndroid ? 6 : 28,
                elevation: isAndroid ? 6 : 18,
              },
            ]}
          >
            <View
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: b.sz / 2, backgroundColor: c2 },
              ]}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: b.sz / 2, backgroundColor: c1, opacity: 0.85 },
              ]}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: b.sz / 2, backgroundColor: c0, opacity: 0.35 },
              ]}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                styles.bubbleRim,
                { borderRadius: b.sz / 2 },
              ]}
            />
            <View style={styles.bubbleCenter}>
              <Text
                style={[styles.bubbleText, { fontSize: b.sz < 86 ? 14 : 16 }]}
              >
                {b.expr}
              </Text>
            </View>
          </Animated.View>
        </Animated.View>
      </TouchableWithoutFeedback>
    );
  },
);

Bubble.displayName = "Bubble";

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BrainStorm() {
  const { t } = useTranslation();
  const { width: SW, height: SH } = Dimensions.get("window");
  const insets = useSafeAreaInsets();
  const { dayId, gameId, challengeDayGameId } = useLocalSearchParams();

  // Layout
  const HUD_H = 90;
  const PROG_H = 12;
  const SAFE_TOP = insets.top;
  const AREA_Y = SAFE_TOP + HUD_H + PROG_H + 4;
  const AREA_H = SH - AREA_Y - insets.bottom;
  const AREA_W = SW;

  // ── State ──
  const [screen, setScreen] = useState<Screen>("start");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(CFG.time);
  const [target, setTarget] = useState(0);
  const [bubbles, setBubbles] = useState<BubbleData[]>([]);
  const [popups, setPopups] = useState<ScorePopup[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [comboText, setComboText] = useState("");
  const [showCombo, setShowCombo] = useState(false);
  const { useBoost: consumeBoost } = useBoostsInventory();
  const { retryCount, hasRetry, activateRetry, getFinalScore } = useRetryBoost();
  const boostCount = useBoostsInventory(
    (state) => state.inventory["brain_time_boost"] ?? 0,
  );
  const { addXP, addIQScore } = useUserStats();

  // ── Stats ──
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const correctRef = useRef(0);
  const wrongRef = useRef(0);
  const totalMsRef = useRef(0);
  const totalStartRef = useRef(0);
  const timeLeftRef = useRef(CFG.time);
  const targetRef = useRef(0);
  const bubblesRef = useRef<BubbleData[]>([]);
  const runningRef = useRef(false);

  // ── Intervals / Refs ──
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moveRef = useRef<number | null>(null);
  const roundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundEndTimeRef = useRef(0);
  const boostUsedRef = useRef(false);
  const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Anims ──
  const comboScale = useRef(new Animated.Value(0)).current;
  const comboOpacity = useRef(new Animated.Value(0)).current;
  const progAnim = useRef(new Animated.Value(1)).current;
  const targetScale = useRef(new Animated.Value(1)).current;
  const roundAnim = useRef(new Animated.Value(100)).current;

  // ─── Cleanup ─────────────────────────────────────────────────────────────────

  const clearAllTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (moveRef.current) cancelAnimationFrame(moveRef.current);
    if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
    if (totalTimerRef.current) clearInterval(totalTimerRef.current);
  }, []);

  // ─── Game Loop (Physics) ──────────────────────────────────────────────────────

  const startMove = useCallback(() => {
    if (moveRef.current) cancelAnimationFrame(moveRef.current);

    let lastTime = Date.now();
    let frameCount = 0;

    const tick = () => {
      if (!runningRef.current) return;
      frameCount++;
      // Throttle to 30fps on Android to reduce JS→Native bridge pressure
      if (isAndroid && frameCount % 2 !== 0) {
        moveRef.current = requestAnimationFrame(tick);
        return;
      }
      const now = Date.now();
      const dt = now - lastTime;
      lastTime = now;

      // timeScale normalizes velocity so dips in FPS don't slow down the game
      const timeScale = dt / 16.66;
      const bs = bubblesRef.current;

      if (bs.length > 0) {
        bs.forEach((b) => {
          if (b.isPopping) return;
          b.x += b.vx * timeScale;
          b.y += b.vy * timeScale;
          const r = b.sz / 2;

          if (b.x - r < 0) {
            b.x = r;
            b.vx = Math.abs(b.vx);
          }
          if (b.x + r > AREA_W) {
            b.x = AREA_W - r;
            b.vx = -Math.abs(b.vx);
          }
          if (b.y - r < 0) {
            b.y = r;
            b.vy = Math.abs(b.vy);
          }
          if (b.y + r > AREA_H) {
            b.y = AREA_H - r;
            b.vy = -Math.abs(b.vy);
          }
        });

        // Collision
        for (let i = 0; i < bs.length; i++) {
          for (let j = i + 1; j < bs.length; j++) {
            const a = bs[i],
              b = bs[j];
            if (a.isPopping || b.isPopping) continue;
            const md = (a.sz + b.sz) / 2;
            const dx = b.x - a.x,
              dy = b.y - a.y;
            const d = Math.sqrt(dx * dx + dy * dy);

            if (d < md && d > 0) {
              const ov = md - d,
                nx = dx / d,
                ny = dy / d;
              a.x -= (nx * ov) / 2;
              a.y -= (ny * ov) / 2;
              b.x += (nx * ov) / 2;
              b.y += (ny * ov) / 2;

              const dv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
              if (dv > 0) {
                a.vx -= dv * nx;
                a.vy -= dv * ny;
                b.vx += dv * nx;
                b.vy += dv * ny;
              }
            }
          }
        }

        bs.forEach((b) => {
          if (!b.isPopping) {
            b.posX.setValue(b.x - b.sz / 2);
            b.posY.setValue(b.y - b.sz / 2);
          }
        });
      }

      moveRef.current = requestAnimationFrame(tick);
    };

    moveRef.current = requestAnimationFrame(tick);
  }, [AREA_W, AREA_H]);

  // ─── Popups & Particles ────────────────────────────────────────────────────────

  const spawnPopup = (text: string, x: number, y: number) => {
    const id = uid();
    const anim = new Animated.Value(0);
    setPopups((p) => [...p, { id, text, x, y, anim }]);
    Animated.timing(anim, {
      toValue: 1,
      duration: 750,
      useNativeDriver: true,
    }).start(() => setPopups((p) => p.filter((pp) => pp.id !== id)));
  };

  const spawnParticles = (cx: number, cy: number) => {
    const newPs: Particle[] = [];
    const count = isAndroid ? 6 : 10;
    for (let i = 0; i < count; i++) {
      const id = uid();
      const ang = (i / count) * Math.PI * 2;
      const dist = rand(45, 90);
      const sz = rand(3, 8);
      const hue = rand(30, 320);
      const anim = new Animated.Value(0);
      newPs.push({
        id,
        x: cx,
        y: cy,
        tx: Math.cos(ang) * dist,
        ty: Math.sin(ang) * dist,
        color: `hsl(${hue}, 90%, 65%)`,
        sz,
        anim,
      });
      Animated.timing(anim, {
        toValue: 1,
        duration: rand(380, 650),
        useNativeDriver: true,
      }).start(() => setParticles((p) => p.filter((pp) => pp.id !== id)));
    }
    setParticles((p) => [...p, ...newPs]);
  };

  const showComboAnim = (count: number) => {
    setComboText(
      count >= 5
        ? t("games.barainTraing.game.comboBig", { count })
        : t("games.barainTraing.game.comboSmall", { count }),
    );
    setShowCombo(true);
    comboScale.setValue(0.6);
    comboOpacity.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.spring(comboScale, {
          toValue: 1.1,
          useNativeDriver: true,
          tension: 200,
          friction: 8,
        }),
        Animated.timing(comboOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(comboScale, {
          toValue: 0.95,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(comboOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => setShowCombo(false));
  };

  // ─── New Round ────────────────────────────────────────────────────────────────

  const newRound = useCallback(
    (currentTimeLeft?: number) => {
      if (!runningRef.current) return;
      if (roundTimerRef.current) clearTimeout(roundTimerRef.current);

      const ok = genExpr(CFG.minVal, CFG.maxVal);
      targetRef.current = ok.result;
      setTarget(ok.result);

      Animated.sequence([
        Animated.timing(targetScale, {
          toValue: 1.35,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(targetScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 300,
          friction: 8,
        }),
      ]).start();

      const elapsed = CFG.time - (currentTimeLeft ?? timeLeftRef.current);
      const count = elapsed >= 63 ? 7 : elapsed >= 50 ? 6 : CFG.count;

      const list = [ok];
      const used = new Set([ok.result]);
      let att = 0;
      while (list.length < count && att < 300) {
        att++;
        const e = genExpr(CFG.minVal, CFG.maxVal);
        if (!used.has(e.result)) {
          used.add(e.result);
          list.push(e);
        }
      }

      for (let i = list.length - 1; i > 0; i--) {
        const j = rand(0, i);
        [list[i], list[j]] = [list[j], list[i]];
      }

      const placed: Array<{ x: number; y: number; r: number }> = [];
      const newBubbles: BubbleData[] = [];

      list.forEach((e, idx) => {
        const sz = rand(78, 92);
        const r = sz / 2;
        const pad = 10;
        let x = 0,
          y = 0,
          tries = 0;

        do {
          x = rand(r + pad, AREA_W - r - pad);
          y = rand(r + pad, AREA_H - r - pad);
          tries++;
        } while (
          tries < 150 &&
          placed.some((p) => Math.hypot(x - p.x, y - p.y) < r + p.r + pad)
        );
        placed.push({ x, y, r });

        const ang = Math.random() * Math.PI * 2;
        const spd = (0.4 + Math.random() * 0.65) * CFG.speed;

        newBubbles.push({
          id: uid(),
          expr: e.expr,
          result: e.result,
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          sz,
          colorIdx: rand(0, 7),
          posX: new Animated.Value(x - r),
          posY: new Animated.Value(y - r),
          scale: new Animated.Value(0),
          opacity: new Animated.Value(0),
          shakeAnim: new Animated.Value(0),
          isPopping: false,
          isWrong: false,
        });

        setTimeout(() => {
          Animated.parallel([
            Animated.spring(newBubbles[idx].scale, {
              toValue: 1,
              tension: 200,
              friction: 7,
              useNativeDriver: true, // Hardware accelerated!
            }),
            Animated.timing(newBubbles[idx].opacity, {
              toValue: 1,
              duration: 250,
              useNativeDriver: true, // Hardware accelerated!
            }),
          ]).start();
        }, idx * 65);
      });

      bubblesRef.current = newBubbles;
      setBubbles([...newBubbles]);

      roundAnim.setValue(100);
      Animated.timing(roundAnim, {
        toValue: 0,
        duration: CFG.roundTime * 1000,
        easing: Easing.linear,
        useNativeDriver: false, // Animating width, cannot use Native Driver
      }).start();

      roundEndTimeRef.current = Date.now() + CFG.roundTime * 1000;
      roundTimerRef.current = setTimeout(() => {
        if (!runningRef.current) return;
        comboRef.current = 0;
        scoreRef.current = Math.max(0, scoreRef.current - 3);
        setScore(scoreRef.current);
        newRound();
      }, CFG.roundTime * 1000);
    },
    [AREA_W, AREA_H, roundAnim, targetScale],
  );

  // ─── Boost: +5s to round ─────────────────────────────────────────────────────
  const handleBoostRound = useCallback(() => {
    if (
      boostUsedRef.current ||
      boostCount <= 0 ||
      screen !== "game" ||
      timeLeftRef.current <= 0
    )
      return;

    if (!consumeBoost("brain_time_boost")) return;

    boostUsedRef.current = true;
    timeLeftRef.current = timeLeftRef.current + 5;
    setTimeLeft(timeLeftRef.current);
  }, [boostCount, consumeBoost]);
  // ─── Tap ─────────────────────────────────────────────────────────────────────

  const tap = useCallback(
    (b: BubbleData) => {
      if (!runningRef.current || b.isPopping || b.isWrong) return;

      if (b.result === targetRef.current) {
        b.isPopping = true;
        correctRef.current++;
        comboRef.current++;
        if (comboRef.current > maxComboRef.current)
          maxComboRef.current = comboRef.current;

        const pts =
          10 + (comboRef.current > 1 ? (comboRef.current - 1) * 5 : 0);
        scoreRef.current += pts;
        setScore(scoreRef.current);

        spawnParticles(b.x, b.y);
        spawnPopup(`+${pts}`, b.x - 20, b.y - b.sz / 2 - 10);

        if (comboRef.current >= 3) showComboAnim(comboRef.current);

        Animated.parallel([
          Animated.timing(b.scale, {
            toValue: 2,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(b.opacity, {
            toValue: 0,
            duration: 320,
            useNativeDriver: true,
          }),
        ]).start(() => {
          bubblesRef.current = bubblesRef.current.filter((x) => x.id !== b.id);
          setBubbles([...bubblesRef.current]);
          if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
          newRound();
        });
      } else {
        b.isWrong = true;
        wrongRef.current++;
        comboRef.current = 0;
        scoreRef.current = Math.max(0, scoreRef.current - 5);
        setScore(scoreRef.current);

        Animated.sequence([
          Animated.timing(b.shakeAnim, {
            toValue: 1,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(b.shakeAnim, {
            toValue: -1,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(b.shakeAnim, {
            toValue: 0.6,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(b.shakeAnim, {
            toValue: -0.6,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(b.shakeAnim, {
            toValue: 0,
            duration: 50,
            useNativeDriver: true,
          }),
        ]).start(() => {
          b.isWrong = false;
        });
      }
    },
    [newRound],
  );

  // ─── Game State ─────────────────────────────────────────────────────────────

  const startGame = useCallback(() => {
    clearAllTimers();
    _uid = 0;
    runningRef.current = true;
    scoreRef.current = 0;
    comboRef.current = 0;
    maxComboRef.current = 0;
    correctRef.current = 0;
    wrongRef.current = 0;
    totalMsRef.current = 0;
    timeLeftRef.current = CFG.time;
    boostUsedRef.current = false;
    bubblesRef.current = [];

    setScore(0);
    setTimeLeft(CFG.time);
    setParticles([]);
    setPopups([]);
    setScreen("game");

    progAnim.setValue(1);

    totalStartRef.current = Date.now();
    totalTimerRef.current = setInterval(() => {
      if (!runningRef.current) return;
      totalMsRef.current = Date.now() - totalStartRef.current;
    }, 10);

    timerRef.current = setInterval(() => {
      if (!runningRef.current) return;
      timeLeftRef.current--;
      setTimeLeft(timeLeftRef.current); // 1 state update per second is fine
      Animated.timing(progAnim, {
        toValue: timeLeftRef.current / CFG.time,
        duration: 950,
        useNativeDriver: false,
      }).start();
      if (timeLeftRef.current <= 0) endGame();
    }, 1000);

    startMove();
    setTimeout(() => newRound(CFG.time), 80);
  }, [clearAllTimers, newRound, progAnim, startMove]);

  const endGame = useCallback(async () => {
    runningRef.current = false;
    clearAllTimers();
    setBubbles([]);
    bubblesRef.current = [];
    const total = correctRef.current + wrongRef.current;
    const finalAcc =
      total > 0 ? Math.round((correctRef.current / total) * 100) : 0;
    const finalScore = getFinalScore(scoreRef.current);
    const xpGain = Math.round(finalScore / 10) + (finalAcc > 80 ? 25 : 0);
    addXP(xpGain);
    addIQScore(finalAcc);

    // Call API
    (async () => {
      try {
        if (challengeDayGameId) {
          const res = await ChallengesModule.completeDayGame(
            challengeDayGameId as string,
            finalScore,
          );
          if (res?.dayCompleted) {
            Alert.alert(t("games.common.congratsTitle"), t("games.common.allDayGamesDone"));
          }
        } else {
          const res = await GamesModule.completeGame((gameId as string) || "1");
          if (res?.dayCompleted) {
            Alert.alert(t("games.common.challengeTitle"), t("games.common.dayFinished"));
          }
        }
      } catch (error) {
        console.error("Failed to complete game:", error);
      }

      if (dayId && !challengeDayGameId) {
        try {
          await ChallengesModule.submitDayScore(dayId as string, finalScore);
        } catch (error) {
          console.error("Failed to submit challenge day score:", error);
        }
      }
    })();

    setScreen("gameover");
  }, [clearAllTimers, addXP, addIQScore, dayId, gameId, challengeDayGameId]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  // ─── Screens ──────────────────────────────────────────────────────────────────

  const renderStart = () => (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Кнопка "Назад" */}
      <TouchableOpacity
        style={[styles.startBackBtn, { top: insets.top + 12 }]}
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back" size={22} color={COLORS.accent} />
        <Text style={{ color: COLORS.accent, fontSize: 12, fontWeight: "700", marginLeft: 4 }}>
          {t("common.back")}
        </Text>
      </TouchableOpacity>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.startScrollContent,
          { paddingTop: insets.top + 64, paddingBottom: 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Заголовок */}
        <Text style={styles.startHeroEmoji}>🧠</Text>
        <Text style={styles.startMainTitle}>Brain{"\n"}Math</Text>
        <Text style={styles.startMainSubtitle}>
          {t("games.barainTraing.start.subtitle")}
        </Text>

        {/* Карточка с правилами */}
        <View style={styles.startDescCard}>
          <Text style={styles.startDescCardTitle}>
            {t("games.barainTraing.start.aboutTitle")}
          </Text>
          <Text style={styles.startDescText}>
            {t("games.barainTraing.start.aboutDesc")}
          </Text>

          <View style={styles.startDescDivider} />

          {/* Секция механики */}
          <Text style={styles.startDescSectionTitle}>
            {t("games.barainTraing.start.mechanicsTitle")}
          </Text>
          {(
            [
              [
                COLORS.accent,
                t("games.barainTraing.start.mechanics.searchTitle"),
                t("games.barainTraing.start.mechanics.searchDesc"),
              ],
              [
                COLORS.danger,
                t("games.barainTraing.start.mechanics.errorTitle"),
                t("games.barainTraing.start.mechanics.errorDesc"),
              ],
            ] as [string, string, string][]
          ).map(([color, name, desc], i) => (
            <View key={i} style={styles.startMechanicRow}>
              <View
                style={[styles.startMechanicDot, { backgroundColor: color }]}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.startMechanicName, { color }]}>
                  {name}
                </Text>
                <Text style={styles.startMechanicDesc}>{desc}</Text>
              </View>
            </View>
          ))}

          <View style={styles.startDescDivider} />

          {/* Секция очков */}
          <Text style={styles.startDescSectionTitle}>
            {t("games.barainTraing.start.scoringTitle")}
          </Text>
          <View style={styles.startScoreRuleRow}>
            <View style={styles.startScoreRuleBadge}>
              <Text style={[styles.startScoreRulePts, { color: COLORS.green }]}>
                +10
              </Text>
            </View>
            <Text style={styles.startScoreRuleText}>
              {t("games.barainTraing.start.scoring.correct")}
            </Text>
          </View>
          <View style={styles.startScoreRuleRow}>
            <View style={styles.startScoreRuleBadge}>
              <Text
                style={[styles.startScoreRulePts, { color: COLORS.accent2 }]}
              >
                х🔥
              </Text>
            </View>
            <Text style={styles.startScoreRuleText}>
              {t("games.barainTraing.start.scoring.combo")}
            </Text>
          </View>
          <View style={styles.startScoreRuleRow}>
            <View style={styles.startScoreRuleBadge}>
              <Text
                style={[styles.startScoreRulePts, { color: COLORS.danger }]}
              >
                -5
              </Text>
            </View>
            <Text style={styles.startScoreRuleText}>
              {t("games.barainTraing.start.scoring.penalty")}
            </Text>
          </View>
        </View>

        {/* Плашки с операциями */}
        <View style={styles.startFeatureRow}>
          {[
            { emoji: "➕", label: t("games.barainTraing.start.ops.add") },
            { emoji: "➖", label: t("games.barainTraing.start.ops.sub") },
            { emoji: "✖️", label: t("games.barainTraing.start.ops.mul") },
          ].map((op, i) => (
            <View key={i} style={styles.startFeatureBox}>
              <Text style={styles.startFeatureEmoji}>{op.emoji}</Text>
              <Text style={styles.startFeatureLabel}>{op.label}</Text>
            </View>
          ))}
        </View>

      </ScrollView>

      <View style={[styles.startFooter, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.startPlayBtn} onPress={startGame}>
          <Text style={styles.startPlayBtnText}>
            {t("games.barainTraing.start.startBtn")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderGameover = () => (
    <SafeAreaWrapper>
      <View style={styles.gameover}>
        <Text style={[styles.screenTitle, { fontSize: 42 }]}>
          {t("games.barainTraing.result.title")}
        </Text>
        <View style={styles.divider} />
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View style={styles.statIconWrap}>
              <Ionicons name="trophy-outline" size={16} color={COLORS.green} />
            </View>
            <Text style={[styles.statNum, { color: COLORS.green }]}>
              {correctRef.current}
            </Text>
            <Text style={styles.statLabel}>
              {t("games.barainTraing.result.best")}
            </Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.statIconWrap}>
              <Ionicons name="person-outline" size={16} color={COLORS.danger} />
            </View>
            <Text style={[styles.statNum, { color: COLORS.danger }]}>
              {wrongRef.current}
            </Text>
            <Text style={styles.statLabel}>
              {t("games.barainTraing.result.yourRecord")}
            </Text>
          </View>
        </View>
        <Text style={styles.finalScore}>{scoreRef.current}</Text>
        <Text style={styles.finalLabel}>
          {t("games.barainTraing.result.points")}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View style={styles.statIconWrap}>
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color={COLORS.green}
              />
            </View>
            <Text style={[styles.statNum, { color: COLORS.green }]}>
              {correctRef.current}
            </Text>
            <Text style={styles.statLabel}>
              {t("games.barainTraing.result.correct")}
            </Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.statIconWrap}>
              <Ionicons
                name="close-circle-outline"
                size={16}
                color={COLORS.danger}
              />
            </View>
            <Text style={[styles.statNum, { color: COLORS.danger }]}>
              {wrongRef.current}
            </Text>
            <Text style={styles.statLabel}>
              {t("games.barainTraing.result.errors")}
            </Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.statIconWrap}>
              <Ionicons name="flash-outline" size={16} color={COLORS.accent} />
            </View>
            <Text style={[styles.statNum, { color: COLORS.accent }]}>
              {maxComboRef.current}
            </Text>
            <Text style={styles.statLabel}>
              {t("games.barainTraing.result.combo")}
            </Text>
          </View>
        </View>
        <View style={styles.timeBox}>
          <Text style={styles.timeBoxLabel}>
            {t("games.barainTraing.result.totalTime")}
          </Text>
          <Text style={styles.timeBoxVal}>{fmtTime(totalMsRef.current)}</Text>
        </View>
        <RetryBoostButton
          hasRetry={hasRetry}
          retryCount={retryCount}
          onPress={() => activateRetry(scoreRef.current, startGame)}
          style={{ width: "100%", marginBottom: 8 }}
        />
        <TouchableWithoutFeedback onPress={startGame}>
          <View style={styles.btn}>
            <Text style={styles.btnText}>
              {t("games.barainTraing.result.tryAgain")}
            </Text>
          </View>
        </TouchableWithoutFeedback>
        <TouchableWithoutFeedback onPress={() => setScreen("start")}>
          <View style={[styles.btn, styles.btnGhost]}>
            <Text style={[styles.btnText, { color: COLORS.muted }]}>
              {t("games.barainTraing.result.menu")}
            </Text>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </SafeAreaWrapper>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <Stars />

      {screen === "game" && (
        <SafeAreaView
          style={[styles.safeArea, { paddingBottom: insets.bottom }]}
        >
          <View style={styles.hud}>
            <View style={styles.hudPill}>
              <Text style={styles.hudLabel}>
                {t("games.barainTraing.game.score")}
              </Text>
              <Text style={[styles.hudValue, { color: COLORS.accent }]}>
                {score}
              </Text>
            </View>

            <View style={[styles.hudPill, styles.hudCenter]}>
              <Text style={styles.hudLabel}>
                {t("games.barainTraing.game.find")}
              </Text>
              <Animated.Text
                style={[
                  styles.targetNum,
                  { transform: [{ scale: targetScale }] },
                ]}
              >
                {target}
              </Animated.Text>
              <View style={styles.roundBarWrap}>
                <Animated.View
                  style={[
                    styles.roundBar,
                    {
                      width: roundAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ["0%", "100%"],
                      }) as any,
                    },
                  ]}
                />
              </View>
            </View>

            <Pressable
              disabled={boostCount <= 0}
              onPress={handleBoostRound}
              style={styles.hudPill}
            >
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name="time-outline"
                  size={28}
                  color={
                    boostCount <= 0 ? "rgba(255,255,255,0.2)" : COLORS.accent
                  }
                />
              </View>
              {boostCount > 0 && (
                <View style={styles.boostBadge}>
                  <Text style={styles.boostBadgeText}>{boostCount}</Text>
                </View>
              )}
            </Pressable>
          </View>

          <View style={styles.progressWrap}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>
        </SafeAreaView>
      )}

      {screen === "game" && (
        <View
          style={[
            styles.gameArea,
            {
              top: AREA_Y,
              width: AREA_W,
              height: AREA_H,
            },
          ]}
        >
          {bubbles.map((b) => (
            <Bubble key={b.id} b={b} onTap={tap} />
          ))}

          {popups.map((p) => (
            <Animated.Text
              key={p.id}
              style={[
                styles.scorePopup,
                {
                  left: p.x,
                  top: p.y,
                  opacity: p.anim.interpolate({
                    inputRange: [0, 0.3, 1],
                    outputRange: [1, 1, 0],
                  }),
                  transform: [
                    {
                      translateY: p.anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -65],
                      }),
                    },
                    {
                      scale: p.anim.interpolate({
                        inputRange: [0, 0.3, 1],
                        outputRange: [1, 1.2, 1.2],
                      }),
                    },
                  ],
                },
              ]}
            >
              {p.text}
            </Animated.Text>
          ))}

          {particles.map((p) => (
            <Animated.View
              key={p.id}
              style={[
                styles.particle,
                {
                  left: p.x - p.sz / 2,
                  top: p.y - p.sz / 2,
                  width: p.sz,
                  height: p.sz,
                  borderRadius: p.sz / 2,
                  backgroundColor: p.color,
                  opacity: p.anim.interpolate({
                    inputRange: [0, 0.8, 1],
                    outputRange: [1, 0.6, 0],
                  }),
                  transform: [
                    {
                      translateX: p.anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, p.tx],
                      }),
                    },
                    {
                      translateY: p.anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, p.ty],
                      }),
                    },
                    {
                      scale: p.anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
      )}

      {showCombo && screen === "game" && (
        <Animated.Text
          style={[
            styles.comboText,
            { opacity: comboOpacity, transform: [{ scale: comboScale }] },
          ]}
        >
          {comboText}
        </Animated.Text>
      )}

      {screen === "start" && renderStart()}
      {screen === "gameover" && renderGameover()}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  safeArea: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
  hud: {
    flexDirection: "row",
    paddingHorizontal: 14,
    gap: 10,
    alignItems: "stretch",
  },
  hudPill: {
    flex: 1,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  hudCenter: {
    flex: 1.6,
    borderColor: "rgba(200,169,110,0.3)",
    backgroundColor: "rgba(200,169,110,0.07)",
  },
  hudLabel: {
    fontSize: 9,
    letterSpacing: 2.5,
    color: COLORS.muted,
    fontWeight: "600",
    marginBottom: 1,
  },
  hudValue: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.text,
    lineHeight: 28,
  },
  targetNum: {
    fontSize: 46,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: -2,
    lineHeight: 50,
  },
  roundBarWrap: {
    width: "100%",
    height: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2,
    marginTop: 5,
    overflow: "hidden",
  },
  roundBar: { height: "100%", backgroundColor: COLORS.danger, borderRadius: 2 },
  progressWrap: {
    marginHorizontal: 14,
    marginTop: 8,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 1,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: COLORS.accent,
    borderRadius: 1,
  },
  gameArea: { position: "absolute", left: 0, overflow: "hidden" },
  bubble: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleRim: {
    margin: 4,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.48)",
  },
  bubbleCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleText: {
    color: "#fff",
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    letterSpacing: 0,
  },
  scorePopup: {
    position: "absolute",
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.accent,
    textShadowColor: "rgba(200,169,110,0.7)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
    zIndex: 30,
  },
  particle: { position: "absolute", zIndex: 20 },
  comboText: {
    position: "absolute",
    alignSelf: "center",
    top: "45%",
    fontSize: 46,
    fontWeight: "700",
    color: COLORS.accent,
    letterSpacing: 1,
    textShadowColor: "rgba(200,169,110,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    zIndex: 50,
    pointerEvents: "none",
  } as any,
  screen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: COLORS.bg,
  },

  // Starts/End Screen rules
  startBackBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    paddingHorizontal: 10,
    height: 42,
    paddingRight: 2,
    borderRadius: 12,
    backgroundColor: COLORS.panel,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: `${COLORS.accent}33`,
    flexDirection: "row",
  },
  startScrollContent: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  startHeroEmoji: { fontSize: 56, marginBottom: 12 },
  startFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: COLORS.bg,
  },
  startMainTitle: {
    fontSize: 48,
    fontWeight: "900",
    color: COLORS.accent,
    letterSpacing: 2,
    marginBottom: 6,
    textAlign: "center",
  },
  startMainSubtitle: {
    fontSize: 15,
    color: COLORS.muted,
    marginBottom: 28,
    letterSpacing: 1,
    textAlign: "center",
  },
  startDescCard: {
    width: "100%",
    backgroundColor: COLORS.panel,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: `${COLORS.accent}22`,
    marginBottom: 20,
  },
  startDescCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 10,
  },
  startDescText: {
    fontSize: 13,
    color: "rgba(240,236,228,0.55)",
    lineHeight: 20,
  },
  startDescDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginVertical: 16,
  },
  startDescSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  startMechanicRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  startMechanicDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  startMechanicName: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  startMechanicDesc: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    lineHeight: 17,
  },
  startScoreRuleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  startScoreRuleBadge: {
    width: 42,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  startScoreRulePts: {
    fontSize: 13,
    fontWeight: "800",
  },
  startScoreRuleText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    flex: 1,
    lineHeight: 17,
  },
  startFeatureRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
    width: "100%",
  },
  startFeatureBox: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: COLORS.panel,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: `${COLORS.muted}44`,
    gap: 4,
  },
  startFeatureEmoji: {
    fontSize: 22,
  },
  startFeatureLabel: {
    fontSize: 9,
    color: COLORS.muted,
    fontWeight: "600",
    textAlign: "center",
  },
  startPlayBtn: {
    width: "100%",
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  startPlayBtnText: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.bg,
    letterSpacing: 2,
  },
  btn: {
    backgroundColor: COLORS.accent,
    borderRadius: 50,
    paddingVertical: 15,
    paddingHorizontal: 44,
    marginVertical: 5,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  btnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    color: COLORS.bg,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
    textAlign: "center",
  },
  finalScore: {
    fontSize: 88,
    fontWeight: "700",
    color: COLORS.accent,
    lineHeight: 90,
    marginBottom: 4,
    textAlign: "center",
  },
  finalLabel: {
    fontSize: 10,
    letterSpacing: 3,
    color: COLORS.muted,
    fontWeight: "600",
    marginBottom: 28,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
    justifyContent: "center",
  },
  statBox: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flex: 1,
    minWidth: 110,
    alignItems: "center",
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statNum: { fontSize: 26, fontWeight: "900", lineHeight: 28 },
  statLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: COLORS.muted,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
  timeBox: {
    backgroundColor: "rgba(200,169,110,0.08)",
    borderWidth: 1,
    borderColor: "rgba(200,169,110,0.25)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginBottom: 24,
    alignItems: "center",
  },
  timeBoxLabel: {
    fontSize: 9,
    letterSpacing: 3,
    color: COLORS.muted,
    fontWeight: "600",
    marginBottom: 4,
  },
  timeBoxVal: {
    fontSize: 42,
    fontWeight: "700",
    color: COLORS.accent,
    lineHeight: 44,
    letterSpacing: 1,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.accent,
    marginBottom: 12,
    textAlign: "center",
  },
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 24 },
  gameover: {
    paddingTop: 50,
    paddingHorizontal: 24,
  },
  boostIcon: { fontSize: 36 },
  boostBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 26,
    height: 26,
    borderRadius: 16,
    backgroundColor: "#FFD93D",
    borderWidth: 1.5,
    borderColor: "#0A0A14",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  boostBadgeText: { color: "#0A0A14", fontSize: 9, fontWeight: "800" },
});
