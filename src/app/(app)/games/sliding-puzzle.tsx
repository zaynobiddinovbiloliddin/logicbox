import SafeAreaWrapper from "@/components/shared/safe-area-wrapper";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useBoostsInventory } from "@/store/boosts-inventory";
import { useRetryBoost } from "@/hooks/use-retry-boost";
import RetryBoostButton from "@/components/shared/retry-boost-button";
import { useUserStats } from "@/store/user-stats";
import { ChallengesModule } from "@/services/modules/challenges-module";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { GamesModule } from "@/services/modules/games-module";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLS = 3;
const ROWS = 4;
const TOTAL_TILES = COLS * ROWS;

const COLORS = {
  bg: "#0f0f0f",
  surface: "#1a1a1a",
  border: "#2a2a2a",
  accent: "#e8c87a",
  accent2: "#c4a35a",
  text: "#f0ebe0",
  muted: "#666",
  tileBg: "#1e1e1e",
  tileTop: "#282828",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getNeighbors = (idx: number): number[] => {
  const neighbors: number[] = [];
  const r = Math.floor(idx / COLS);
  const c = idx % COLS;
  if (r > 0) neighbors.push(idx - COLS);
  if (r < ROWS - 1) neighbors.push(idx + COLS);
  if (c > 0) neighbors.push(idx - 1);
  if (c < COLS - 1) neighbors.push(idx + 1);
  return neighbors;
};

const formatTime = (s: number): string => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
};

const calcScore = (secs: number, mv: number): number => {
  return Math.max(100, 10000 - mv * 10 - secs * 5);
};

// ─── Grid Background ──────────────────────────────────────────────────────────

const GridBackground: React.FC = () => {
  return (
    <>
      <View style={styles.gridTexture} pointerEvents="none" />
      <View style={styles.cornerOrnaments} pointerEvents="none" />
    </>
  );
};

// ─── Confetti ─────────────────────────────────────────────────────────────────

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  rotation: number;
  isCircle: boolean;
}

const Confetti: React.FC<{ show: boolean }> = ({ show }) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (!show) {
      setPieces([]);
      return;
    }

    const colors = ["#e8c87a", "#f0ebe0", "#c4a35a", "#fff8e7", "#d4af7a"];
    const newPieces: ConfettiPiece[] = [];

    for (let i = 0; i < 25; i++) {
      newPieces.push({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 800,
        duration: 1500 + Math.random() * 2000,
        rotation: Math.random() * 360,
        isCircle: Math.random() > 0.5,
      });
    }

    setPieces(newPieces);

    const timer = setTimeout(() => setPieces([]), 4000);
    return () => clearTimeout(timer);
  }, [show]);

  if (pieces.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {pieces.map((p) => (
        <ConfettiPieceView key={p.id} piece={p} />
      ))}
    </View>
  );
};

const ConfettiPieceView: React.FC<{ piece: ConfettiPiece }> = ({ piece }) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const { height } = Dimensions.get("window");

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(animValue, {
        toValue: 1,
        duration: piece.duration,
        useNativeDriver: true,
      }).start();
    }, piece.delay);

    return () => clearTimeout(timer);
  }, []);

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, height],
  });

  const rotate = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "720deg"],
  });

  const opacity = animValue.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          left: `${piece.x}%`,
          backgroundColor: piece.color,
          borderRadius: piece.isCircle ? 4 : 1,
          transform: [
            { translateY },
            { rotate },
            { rotateZ: `${piece.rotation}deg` },
          ],
          opacity,
        },
      ]}
    />
  );
};

// ─── Tile Component ───────────────────────────────────────────────────────────

interface TileProps {
  value: number;
  idx: number;
  isEmpty: boolean;
  isMovable: boolean;
  isInPlace: boolean;
  onPress: () => void;
  size: number;
}

const Tile: React.FC<TileProps> = ({
  value,
  isEmpty,
  isMovable,
  isInPlace,
  onPress,
  size,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
    }).start();
  };

  if (isEmpty) {
    return (
      <View
        style={[styles.tile, styles.tileEmpty, { width: size, height: size }]}
      />
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!isMovable}
      >
        <LinearGradient
          colors={
            isInPlace
              ? ["#2a2518", "#1e1a10"]
              : isMovable
                ? ["#303030", "#252525"]
                : [COLORS.tileTop, COLORS.tileBg]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.tile,
            isInPlace && styles.tileInPlace,
            isMovable && styles.tileMovable,
            { width: size, height: size },
          ]}
        >
          {isMovable && <View style={styles.tileGlow} />}
          <Text
            style={[
              styles.tileNum,
              isInPlace && styles.tileNumInPlace,
              { fontSize: Math.max(size * 0.35, 20) },
            ]}
          >
            {value}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SlidingPuzzle() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { dayId, gameId, challengeDayGameId } = useLocalSearchParams();
  const [screen, setScreen] = useState<"start" | "game">("start");
  const [tiles, setTiles] = useState<number[]>([]);
  const [emptyIdx, setEmptyIdx] = useState(TOTAL_TILES - 1);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [globalBest, setGlobalBest] = useState<number>(12500);
  const [winStats, setWinStats] = useState({ time: 0, moves: 0, score: 0 });
  const [isNewRecord, setIsNewRecord] = useState(false);
  const { useBoost: consumeBoost } = useBoostsInventory();
  const freezeCount = useBoostsInventory((state) => state.inventory["sliding_freeze"] ?? 0);
  const { retryCount, hasRetry, activateRetry, getFinalScore } = useRetryBoost();
  const { addXP, addIQScore } = useUserStats();
  const [boostUsed, setBoostUsed] = useState(false);
  const [freezeLeft, setFreezeLeft] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { width, height } = Dimensions.get("window");
  const isSmall = height < 700;
  const tileGap = isSmall ? 6 : 8;
  const boardPad = 28; // 14px each side
  // Width constraint
  const tileSizeFromWidth =
    (width - 20 - boardPad - tileGap * (COLS - 1)) / COLS;
  // Height constraint: subtract header ~70, stats ~58, actions ~62, gaps ~(3*gap), safe area
  const fixedUI =
    70 + 58 + 62 + 3 * (isSmall ? 12 : 20) + insets.top + insets.bottom;
  const tileSizeFromHeight =
    (height - fixedUI - boardPad - tileGap * (ROWS - 1)) / ROWS;
  const tileSize = Math.floor(Math.min(tileSizeFromWidth, tileSizeFromHeight));
  const boardWidth = boardPad + COLS * tileSize + tileGap * (COLS - 1);

  // ── Create solved state ──
  const createSolved = useCallback(() => {
    const arr = Array.from({ length: TOTAL_TILES }, (_, i) =>
      i === TOTAL_TILES - 1 ? 0 : i + 1,
    );
    return arr;
  }, []);

  // ── Scramble ──
  const scramble = useCallback(() => {
    let arr = createSolved();
    let empty = TOTAL_TILES - 1;
    let lastEmpty = -1;

    for (let i = 0; i < 150; i++) {
      const neighbors = getNeighbors(empty).filter((n) => n !== lastEmpty);
      const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
      lastEmpty = empty;
      [arr[pick], arr[empty]] = [arr[empty], arr[pick]];
      empty = pick;
    }

    setTiles(arr);
    setEmptyIdx(empty);
  }, [createSolved]);

  // ── New game ──
  const newGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setMoves(0);
    setSeconds(0);
    setRunning(false);
    setShowWin(false);
    setBoostUsed(false);
    setFreezeLeft(0);
    scramble();
  }, [scramble]);

  const navigateToMain = useCallback(() => {
    router.push("/games");
    setMoves(0);
    setSeconds(0);
    setShowWin(false);
    setRunning(false);
  }, []);

  // ── Check win ──
  const checkWin = useCallback((arr: number[]) => {
    return arr.every((v, i) => (i === TOTAL_TILES - 1 ? v === 0 : v === i + 1));
  }, []);

  // ── Freeze boost: 10 free moves ──
  const handleFreezeBoost = useCallback(() => {
    if (boostUsed || freezeCount <= 0 || !running || showWin)
      return;
    
    const success = consumeBoost("sliding_freeze");
    if (!success) return;

    setBoostUsed(true);
    setFreezeLeft(12);
  }, [boostUsed, running, showWin, freezeCount, consumeBoost]);

  // ── Handle tile click ──
  const handleTileClick = useCallback(
    (idx: number) => {
      const neighbors = getNeighbors(emptyIdx);
      if (!neighbors.includes(idx)) return;

      if (!running) {
        setRunning(true);
      }

      const newTiles = [...tiles];
      [newTiles[idx], newTiles[emptyIdx]] = [newTiles[emptyIdx], newTiles[idx]];
      setTiles(newTiles);
      setEmptyIdx(idx);

      let newMoves = moves;
      if (freezeLeft > 0) {
        setFreezeLeft((prev) => prev - 1);
      } else {
        newMoves = moves + 1;
        setMoves(newMoves);
      }

      if (checkWin(newTiles)) {
        setTimeout(async () => {
          const score = calcScore(seconds, newMoves);
          const submitScore = getFinalScore(score);
          const isNew = !bestScore || score > bestScore;

          if (isNew) {
            setBestScore(score);
          }

          const xpGain = Math.round(score / 10) + 25;
          addXP(xpGain);
          addIQScore(100);

          (async () => {
            try {
              if (challengeDayGameId) {
                const res = await ChallengesModule.completeDayGame(
                  challengeDayGameId as string,
                  submitScore
                );
                if (res?.dayCompleted) {
                  Alert.alert(t("games.common.congratsTitle"), t("games.common.allDayGamesDone"));
                }
              } else {
                const response = await GamesModule.completeGame(
                  (gameId as string) || "16"
                );
                if (response.dayCompleted) {
                  Alert.alert(t("games.common.challengeTitle"), t("games.common.dayFinished"));
                }
                if (dayId) {
                  await ChallengesModule.submitDayScore(dayId as string, submitScore);
                }
              }
            } catch (error) {
              console.error("Failed to complete game/submit score:", error);
            }
          })();

          setWinStats({ time: seconds, moves: newMoves, score });
          setIsNewRecord(isNew);
          setShowWin(true);
          setRunning(false);

          if (timerRef.current) clearInterval(timerRef.current);
        }, 300);
      }
    },
    [
      tiles,
      emptyIdx,
      running,
      seconds,
      moves,
      freezeLeft,
      checkWin,
      bestScore,
      addXP,
      addIQScore,
      dayId,
      gameId,
    ],
  );

  // ── Timer ──
  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running]);

  // ── Initialize ──
  useEffect(() => {
    newGame();
  }, []);

  // ── Start game from start screen ──
  const startGame = () => {
    newGame();
    setScreen("game");
  };

  // ── Render ──
  const isMovable = (idx: number) => getNeighbors(emptyIdx).includes(idx);
  const isInPlace = (idx: number, val: number) => val === idx + 1;

  // ── Start Screen ──
  if (screen === "start") {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: COLORS.bg }]}>
        <StatusBar barStyle="light-content" />
        {/* Back button */}
        <TouchableOpacity
          style={[sp_styles.backBtn, { top: insets.top + 12 }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" color={COLORS.accent} size={20} />
        </TouchableOpacity>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            sp_styles.scrollContent,
            { paddingTop: insets.top },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero emoji */}
          <Text style={sp_styles.heroEmoji}>🧩</Text>

          {/* Title */}
          <Text style={sp_styles.startTitle}>
            {t("games.slidingPuzzle.start.title")}
          </Text>

          {/* Subtitle */}
          <Text style={sp_styles.startSubtitle}>
            {t("games.slidingPuzzle.start.subtitle")}
          </Text>

          {/* Main description card */}
          <View style={sp_styles.infoCard}>
            {/* How to play */}
            <Text style={sp_styles.infoCardHeading}>
              {t("games.slidingPuzzle.start.howTitle")}
            </Text>
            <Text style={sp_styles.infoCardDesc}>
              {t("games.slidingPuzzle.start.howDesc")}
            </Text>

            {/* Divider */}
            <View style={sp_styles.divider} />

            {/* Controls section */}
            <Text style={sp_styles.mechanicsTitle}>
              {t("games.slidingPuzzle.start.controlsTitle")}
            </Text>
            <View style={{ gap: 8, marginTop: 8 }}>
              <View style={sp_styles.mechRow}>
                <View
                  style={[sp_styles.dot, { backgroundColor: COLORS.accent }]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={sp_styles.mechRowTitle}>
                    {t("games.slidingPuzzle.start.controls.tapTitle")}
                  </Text>
                  <Text style={sp_styles.mechRowDesc}>
                    {t("games.slidingPuzzle.start.controls.tapDesc")}
                  </Text>
                </View>
              </View>
              <View style={sp_styles.mechRow}>
                <View style={[sp_styles.dot, { backgroundColor: "#888" }]} />
                <View style={{ flex: 1 }}>
                  <Text style={sp_styles.mechRowTitle}>
                    {t("games.slidingPuzzle.start.controls.goalTitle")}
                  </Text>
                  <Text style={sp_styles.mechRowDesc}>
                    {t("games.slidingPuzzle.start.controls.goalDesc")}
                  </Text>
                </View>
              </View>
              <View style={sp_styles.mechRow}>
                <View style={[sp_styles.dot, { backgroundColor: "#38bdf8" }]} />
                <View style={{ flex: 1 }}>
                  <Text style={sp_styles.mechRowTitle}>
                    {t("games.slidingPuzzle.start.controls.winTitle")}
                  </Text>
                  <Text style={sp_styles.mechRowDesc}>
                    {t("games.slidingPuzzle.start.controls.winDesc")}
                  </Text>
                </View>
              </View>
            </View>

            {/* Divider */}
            <View style={sp_styles.divider} />

            {/* Scoring */}
            <Text style={sp_styles.mechanicsTitle}>
              {t("games.slidingPuzzle.start.statsTitle")}
            </Text>
            <View style={{ gap: 8, marginTop: 8 }}>
              <View style={sp_styles.scoreRow}>
                <View
                  style={[
                    sp_styles.scoreBadge,
                    {
                      backgroundColor: "rgba(232,200,122,0.2)",
                      borderColor: "rgba(232,200,122,0.5)",
                    },
                  ]}
                >
                  <Text
                    style={[sp_styles.scoreBadgeText, { color: COLORS.accent }]}
                  >
                    ⏱️
                  </Text>
                </View>
                <Text style={sp_styles.scoreRowDesc}>
                  {t("games.slidingPuzzle.start.stats.time")}
                </Text>
              </View>
              <View style={sp_styles.scoreRow}>
                <View
                  style={[
                    sp_styles.scoreBadge,
                    {
                      backgroundColor: "rgba(240,235,224,0.1)",
                      borderColor: "rgba(240,235,224,0.3)",
                    },
                  ]}
                >
                  <Text
                    style={[sp_styles.scoreBadgeText, { color: COLORS.text }]}
                  >
                    🔢
                  </Text>
                </View>
                <Text style={sp_styles.scoreRowDesc}>
                  {t("games.slidingPuzzle.start.stats.moves")}
                </Text>
              </View>
              <View style={sp_styles.scoreRow}>
                <View
                  style={[
                    sp_styles.scoreBadge,
                    {
                      backgroundColor: "rgba(56,189,248,0.15)",
                      borderColor: "rgba(56,189,248,0.4)",
                    },
                  ]}
                >
                  <Text
                    style={[sp_styles.scoreBadgeText, { color: "#38bdf8" }]}
                  >
                    🏆
                  </Text>
                </View>
                <Text style={sp_styles.scoreRowDesc}>
                  {t("games.slidingPuzzle.start.stats.bestSession")}
                </Text>
              </View>
            </View>
          </View>

          {/* Features row */}
          <View style={sp_styles.featuresRow}>
            {[
              { emoji: "🧩", label: t("games.slidingPuzzle.start.features.grid") },
              { emoji: "⏱️", label: t("games.slidingPuzzle.start.features.timer") },
              { emoji: "🔢", label: t("games.slidingPuzzle.start.features.moves") },
              { emoji: "🏆", label: t("games.slidingPuzzle.start.features.record") },
            ].map((f) => (
              <View key={f.label} style={sp_styles.featureBox}>
                <Text style={sp_styles.featureEmoji}>{f.emoji}</Text>
                <Text style={sp_styles.featureLabel}>{f.label}</Text>
              </View>
            ))}
          </View>

          {/* Start button */}
          <TouchableOpacity
            style={sp_styles.startBtn}
            onPress={startGame}
            activeOpacity={0.85}
          >
            <Text style={sp_styles.startBtnText}>
              {t("games.slidingPuzzle.start.startBtn")}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <GridBackground />

      <SafeAreaWrapper>
        <View style={[styles.wrap, isSmall && { gap: 5 }]}>
          {/* Header */}
          <View style={[styles.header, isSmall && { paddingTop: 4 }]}>
            <Text
              style={[
                styles.gameTitle,
                isSmall && { fontSize: 24, lineHeight: 28 },
              ]}
            >
              {t("games.slidingPuzzle.game.titlePrefix")}
              <Text style={styles.gameTitleAccent}>
                {t("games.slidingPuzzle.game.titleAccent")}
              </Text>
              {t("games.slidingPuzzle.game.titleSuffix")}
            </Text>
            <Text
              style={[
                styles.gameSub,
                isSmall && { fontSize: 9, letterSpacing: 2, marginTop: 2 },
              ]}
            >
              3 × 4 · SLIDING PUZZLE
            </Text>
          </View>

          {/* Stats */}
          <View style={[styles.stats, isSmall && { gap: 6 }]}>
            <View style={[styles.statBox, isSmall && { paddingVertical: 8 }]}>
              <Text style={[styles.statLabel, isSmall && { fontSize: 8 }]}>
                {t("games.slidingPuzzle.game.time")}
              </Text>
              <Text
                style={[
                  styles.statValue,
                  styles.statValueAccent,
                  isSmall && { fontSize: 16, marginTop: 2 },
                ]}
              >
                {formatTime(seconds)}
              </Text>
            </View>
            <View style={[styles.statBox, isSmall && { paddingVertical: 8 }]}>
              <Text style={[styles.statLabel, isSmall && { fontSize: 8 }]}>
                {t("games.slidingPuzzle.game.moves")}
              </Text>
              <Text
                style={[
                  styles.statValue,
                  isSmall && { fontSize: 16, marginTop: 2 },
                ]}
              >
                {moves}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.statBox,
                styles.boostStatBox,
                isSmall && { paddingVertical: 8 },
                boostUsed && freezeLeft <= 0 && styles.boostStatBoxUsed,
                freezeLeft > 0 && styles.boostStatBoxActive,
              ]}
              onPress={handleFreezeBoost}
              disabled={boostUsed || freezeCount <= 0 || showWin}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.statLabel,
                  isSmall && { fontSize: 8 },
                  freezeLeft > 0 && { color: "#88d8ff" },
                ]}
              >
                {freezeLeft > 0
                  ? t("games.slidingPuzzle.game.freezeLeft", { count: freezeLeft })
                  : t("games.slidingPuzzle.game.freeze")}
              </Text>
              <Text
                style={[
                  styles.boostStatEmoji,
                  isSmall && { fontSize: 16, marginTop: 2 },
                ]}
              >
                {freezeLeft > 0 ? "❄️" : boostUsed ? "✓" : "❄️"}
              </Text>
              {!boostUsed && freezeCount > 0 && (
                <View style={styles.boostBadge}>
                  <Text style={styles.boostBadgeText}>
                    {freezeCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Board */}
          <View style={[styles.boardWrap, { width: boardWidth }]}>
            <View style={[styles.board, { gap: tileGap }]}>
              {Array.from({ length: ROWS }).map((_, row) => (
                <View key={row} style={[styles.boardRow, { gap: tileGap }]}>
                  {Array.from({ length: COLS }).map((_, col) => {
                    const idx = row * COLS + col;
                    const val = tiles[idx];
                    return (
                      <Tile
                        key={idx}
                        value={val}
                        idx={idx}
                        isEmpty={val === 0}
                        isMovable={isMovable(idx) && val !== 0}
                        isInPlace={isInPlace(idx, val)}
                        onPress={() => handleTileClick(idx)}
                        size={tileSize}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          {/* Actions */}
          <View style={[styles.actions, isSmall && { marginTop: 4 }]}>
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost]}
              onPress={newGame}
              activeOpacity={0.8}
            >
              <Text style={styles.btnGhostText}>
                {t("games.slidingPuzzle.game.new")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaWrapper>

      {/* Win Overlay */}
      <Modal visible={showWin} transparent animationType="fade">
        <SafeAreaView style={styles.winOverlay}>
          <View style={styles.winOverlay}>
            <Confetti show={showWin} />
            <Text style={styles.winTrophy}>🏆</Text>
            <Text style={styles.winTitle}>
              {t("games.slidingPuzzle.result.solved")}
            </Text>
            <View style={styles.winDivider} />

            <View style={styles.statsRowComparison}>
              <View style={styles.statBoxComparison}>
                <View style={styles.statIconWrap}>
                  <Ionicons
                    name="globe-outline"
                    size={16}
                    color={COLORS.accent}
                  />
                </View>
                <Text
                  style={[styles.statNumComparison, { color: COLORS.accent }]}
                >
                  {globalBest.toLocaleString("ru")}
                </Text>
                <Text style={styles.statLabelComparison}>
                  {t("games.slidingPuzzle.result.best")}
                </Text>
              </View>
              <View style={styles.statBoxComparison}>
                <View style={styles.statIconWrap}>
                  <Ionicons
                    name="trophy-outline"
                    size={16}
                    color={COLORS.accent2}
                  />
                </View>
                <Text
                  style={[styles.statNumComparison, { color: COLORS.accent2 }]}
                >
                  {bestScore
                    ? bestScore.toLocaleString("ru")
                    : winStats.score.toLocaleString("ru")}
                </Text>
                <Text style={styles.statLabelComparison}>
                  {t("games.slidingPuzzle.result.myBest")}
                </Text>
              </View>
              <View style={styles.statBoxComparison}>
                <View style={styles.statIconWrap}>
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={COLORS.danger || "#ef4444"}
                  />
                </View>
                <Text
                  style={[
                    styles.statNumComparison,
                    { color: COLORS.danger || "#ef4444" },
                  ]}
                >
                  {winStats.score.toLocaleString("ru")}
                </Text>
                <Text style={styles.statLabelComparison}>
                  {t("games.slidingPuzzle.result.current")}
                </Text>
              </View>
            </View>

            <View style={styles.winStats}>
              <View style={styles.winStatItem}>
                <Text style={styles.winStatVal}>
                  {formatTime(winStats.time)}
                </Text>
                <Text style={styles.winStatLbl}>
                  {t("games.slidingPuzzle.result.time")}
                </Text>
              </View>
              <View style={styles.winStatItem}>
                <Text style={styles.winStatVal}>{winStats.moves}</Text>
                <Text style={styles.winStatLbl}>
                  {t("games.slidingPuzzle.result.moves")}
                </Text>
              </View>
            </View>
            <Text style={styles.winBest}>
              {isNewRecord
                ? t("games.slidingPuzzle.result.newRecord")
                : bestScore
                  ? t("games.slidingPuzzle.result.recordValue", { score: bestScore.toLocaleString("ru") })
                  : ""}
            </Text>
            <TouchableOpacity
              style={[
                styles.btnPrimary,
                {
                  width: 200,
                  marginTop: 10,
                  paddingVertical: 16,
                  paddingHorizontal: 12,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
              onPress={newGame}
              activeOpacity={0.8}
            >
              <Text style={styles.btnPrimaryText}>
                {t("games.slidingPuzzle.result.tryAgain")}
              </Text>
            </TouchableOpacity>
            <RetryBoostButton
              hasRetry={hasRetry}
              retryCount={retryCount}
              onPress={() => activateRetry(winStats?.score ?? 0, newGame)}
              style={{ width: 200, marginTop: 10 }}
            />
            <TouchableOpacity
              style={[
                styles.btnPrimary,
                {
                  width: 200,
                  marginTop: 10,
                  paddingVertical: 16,
                  paddingHorizontal: 12,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
              onPress={navigateToMain}
              activeOpacity={0.8}
            >
              <Text style={styles.btnPrimaryText}>
                {t("games.slidingPuzzle.result.home")}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ─── Start Screen Styles ──────────────────────────────────────────────────────
const sp_styles = StyleSheet.create({
  backBtn: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 12,
    paddingRight: 2,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: "rgba(232,200,122,0.3)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  scrollContent: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  heroEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  startTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: COLORS.accent,
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 8,
  },
  startSubtitle: {
    fontSize: 15,
    color: COLORS.muted,
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 22,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(232,200,122,0.22)",
    marginBottom: 20,
    width: "100%",
  },
  infoCardHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
  },
  infoCardDesc: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginVertical: 16,
  },
  mechanicsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  mechRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  mechRowTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  mechRowDesc: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 1,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  scoreBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 40,
    alignItems: "center",
  },
  scoreBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  scoreRowDesc: {
    fontSize: 13,
    color: COLORS.muted,
    flex: 1,
  },
  featuresRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginBottom: 28,
  },
  featureBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(232,200,122,0.18)",
    paddingVertical: 12,
    alignItems: "center",
    gap: 6,
  },
  featureEmoji: {
    fontSize: 22,
  },
  featureLabel: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: "700",
    textAlign: "center",
  },
  startBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
    shadowColor: COLORS.accent2,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  startBtnText: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.bg,
    letterSpacing: 2,
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  safe: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  gridTexture: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.015,
  },
  cornerOrnaments: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.06,
  },
  backBtn: {
    position: "absolute",
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  backBtnText: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.accent,
  },
  wrap: {
    width: "100%",
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 12,
  },
  header: {
    paddingTop: 10,
    width: "100%",
  },
  gameTitle: {
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 2,
    color: COLORS.text,
    lineHeight: 40,
  },
  gameTitleAccent: {
    color: COLORS.accent,
  },
  gameSub: {
    fontSize: 11,
    letterSpacing: 5,
    color: COLORS.muted,
    textTransform: "uppercase",
    marginTop: 6,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  stats: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 9,
    letterSpacing: 3,
    color: COLORS.muted,
    textTransform: "uppercase",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  statValue: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 24,
    fontWeight: "500",
    color: COLORS.text,
    marginTop: 4,
    lineHeight: 24,
  },
  statValueAccent: {
    color: COLORS.accent,
  },
  boardWrap: {
    position: "relative",
  },
  board: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 14,
    width: "100%",
    gap: 8,
  },
  boardRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  tile: {
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  tileEmpty: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#222",
    borderStyle: "dashed",
    shadowOpacity: 0,
    elevation: 0,
  },
  tileMovable: {
    borderColor: "#3a3a3a",
  },
  tileInPlace: {
    borderColor: "rgba(232,200,122,0.3)",
    shadowColor: COLORS.accent,
    shadowOpacity: 0.3,
  },
  tileGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    backgroundColor: "rgba(232,200,122,0.08)",
  },
  tileNum: {
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontWeight: "700",
    color: "#ffffff",
    zIndex: 10,
  },
  tileNumInPlace: {
    color: COLORS.accent,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: {
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  btnPrimaryText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: COLORS.bg,
  },
  btnGhost: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnGhostText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: COLORS.muted,
  },
  winOverlay: {
    flex: 1,
    backgroundColor: "rgba(10,10,10,0.95)",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 24,
  },
  winTrophy: {
    fontSize: 64,
  },
  winTitle: {
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 52,
    fontWeight: "900",
    color: COLORS.accent,
    textAlign: "center",
    letterSpacing: 2,
    lineHeight: 55,
  },
  winDivider: {
    width: 60,
    height: 1,
    backgroundColor: COLORS.accent,
    opacity: 0.5,
    marginBottom: 20,
  },
  statsRowComparison: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    justifyContent: "center",
    width: "100%",
  },
  statBoxComparison: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1.5,
    borderColor: "rgba(232,200,122,0.18)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  statNumComparison: { fontSize: 20, fontWeight: "900", lineHeight: 24 },
  statLabelComparison: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: COLORS.muted,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
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
  winStats: {
    flexDirection: "row",
    gap: 30,
  },
  winStatItem: {
    alignItems: "center",
  },
  winStatVal: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 28,
    fontWeight: "500",
    color: COLORS.text,
  },
  winStatLbl: {
    fontSize: 10,
    letterSpacing: 3,
    color: COLORS.muted,
    textTransform: "uppercase",
    marginTop: 4,
  },
  winBest: {
    fontSize: 12,
    color: COLORS.accent,
    letterSpacing: 2,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  confettiPiece: {
    position: "absolute",
    width: 8,
    height: 8,
    zIndex: 300,
  },
  boostBadge: {
    position: "absolute",
    top: -7,
    right: -7,
    backgroundColor: "#a8dadc",
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  boostBadgeText: {
    color: COLORS.bg,
    fontSize: 10,
    fontWeight: "900",
  },
  boostStatBox: {
    borderColor: "rgba(168,218,220,0.35)",
    backgroundColor: "rgba(168,218,220,0.08)",
  },
  boostStatBoxUsed: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    opacity: 0.4,
  },
  boostStatBoxActive: {
    borderColor: "#88d8ff",
    backgroundColor: "rgba(136,216,255,0.12)",
  },
  boostStatEmoji: {
    fontSize: 22,
    marginTop: 4,
  },
});
