import { useBoostsInventory } from "@/store/boosts-inventory";
import { useTranslation } from "react-i18next";
import { useRetryBoost } from "@/hooks/use-retry-boost";
import RetryBoostButton from "@/components/shared/retry-boost-button";
import { useUserStats } from "@/store/user-stats";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
  Alert,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { ChallengesModule } from "@/services/modules/challenges-module";
import { GamesModule } from "@/services/modules/games-module";

const { width: W, height: H } = Dimensions.get("window");
const isAndroid = Platform.OS === "android";

let globalHighScore = 0;

const LANES = 4;
const LANE_W = W / LANES;
const CAR_W = 44;
const CAR_H = 72;
const OBS_W = 44;
const OBS_H = 68;

const P_HALF_W = (CAR_W - 8) / 2;
const P_HALF_H = (CAR_H - 8) / 2;
const O_HALF_W = (OBS_W - 8) / 2;
const O_HALF_H = (OBS_H - 8) / 2;

const ENEMY_COLORS = [
  "#ff2255",
  "#00cfff",
  "#ffe600",
  "#ff00cc",
  "#ff6600",
  "#9900ff",
];
const PED_COLORS = [
  { body: "#e879f9", skin: "#fcd34d" },
  { body: "#38bdf8", skin: "#fbbf24" },
  { body: "#4ade80", skin: "#fed7aa" },
  { body: "#fb923c", skin: "#fde68a" },
];

// Предрасчет разметки
const DASH_COUNT = Math.ceil((H + 110) / 55);
const ROAD_DASHES = Array.from({ length: DASH_COUNT }).map((_, i) => (
  <View
    key={`dash-${i}`}
    style={{
      width: 2,
      height: 30,
      backgroundColor: "rgba(255,255,255,0.15)",
      marginBottom: 25,
    }}
  />
));

// ===== OBJECT POOL =====
// Вместо splice (O(n) + GC) используем alive-флаг и переиспользуем слоты
const MAX_OBSTACLES = 20;
const MAX_PARTICLES = isAndroid ? 40 : 80;
const MAX_CROSSERS = 6;

interface Obstacle {
  alive: boolean;
  id: string;
  lane: number;
  x: number;
  y: number;
  color: string;
  speed: number;
  type: string;
}

interface Particle {
  alive: boolean;
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  life: number;
  maxLife: number;
}

interface Crosser {
  alive: boolean;
  id: string;
  x: number;
  y: number;
  dir: number;
  spd: number;
  col: { body: string; skin: string };
  isBike: boolean;
  phase: number;
}

function createPool<T extends { alive: boolean }>(
  size: number,
  factory: () => T,
): T[] {
  return Array.from({ length: size }, factory);
}

function poolAcquire<T extends { alive: boolean }>(pool: T[]): T | null {
  for (let i = 0; i < pool.length; i++) {
    if (!pool[i].alive) return pool[i];
  }
  return null;
}

const laneX = (l: number) => l * LANE_W + LANE_W / 2;

let _idCounter = 0;
function nextId(): string {
  return (++_idCounter).toString(36);
}

// Мемоизированные контролы
const GameControls = memo(({ moveLeft, moveRight, bottomInset }: any) => (
  <View
    style={[styles.controls, { bottom: bottomInset + 20 }]}
    pointerEvents="box-none"
  >
    <TouchableOpacity
      style={styles.ctrlBtn}
      onPressIn={moveLeft}
      activeOpacity={0.7}
    >
      <Ionicons name="caret-back" size={40} color="#00ff88" />
    </TouchableOpacity>
    <TouchableOpacity
      style={styles.ctrlBtn}
      onPressIn={moveRight}
      activeOpacity={0.7}
    >
      <Ionicons name="caret-forward" size={40} color="#00ff88" />
    </TouchableOpacity>
  </View>
));
GameControls.displayName = "GameControls";

// Мемоизированная дорога — никогда не перерисовывается
const RoadBackground = memo(({ roadOffset }: { roadOffset: number }) => {
  const laneDividers = [];
  for (let l = 1; l < LANES; l++) {
    laneDividers.push(
      <View
        key={`l-${l}`}
        style={{
          position: "absolute",
          left: l * LANE_W - 1,
          top: -55,
          transform: [{ translateY: roadOffset }],
        }}
      >
        {ROAD_DASHES}
      </View>,
    );
  }
  return (
    <View style={roadBgStyle}>
      <View style={roadEdgeLeft} />
      <View style={roadEdgeRight} />
      <View style={roadLineLeft} />
      <View style={roadLineRight} />
      {laneDividers}
    </View>
  );
});
RoadBackground.displayName = "RoadBackground";

export default function RacingGame() {
  const { t } = useTranslation();
  const featureItems = React.useMemo(() => [
    { emoji: "❤️", label: t("games.racing.start.featureLives") },
    { emoji: "⚡", label: t("games.racing.start.featureTurbo") },
    { emoji: "🏎️", label: t("games.racing.start.featureDrift") },
    { emoji: "🏆", label: t("games.racing.start.featureRecords") },
  ], [t]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dayId, gameId, challengeDayGameId } = useLocalSearchParams();

  // Пулы объектов
  const obstaclePool = useRef<Obstacle[]>(
    createPool(MAX_OBSTACLES, () => ({
      alive: false,
      id: "",
      lane: 0,
      x: 0,
      y: 0,
      color: "#ff0000",
      speed: 0,
      type: "car",
    })),
  ).current;

  const particlePool = useRef<Particle[]>(
    createPool(MAX_PARTICLES, () => ({
      alive: false,
      id: "",
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      r: 0,
      color: "#fff",
      life: 0,
      maxLife: 1,
    })),
  ).current;

  const crosserPool = useRef<Crosser[]>(
    createPool(MAX_CROSSERS, () => ({
      alive: false,
      id: "",
      x: 0,
      y: 0,
      dir: 1,
      spd: 1,
      col: { body: "#fff", skin: "#fff" },
      isBike: false,
      phase: 0,
    })),
  ).current;

  const state = useRef({
    running: false,
    score: 0,
    hiScore: 0,
    lives: 3,
    speed: 4,
    frameCount: 0,
    roadOffset: 0,
    lastTime: 0,
    player: {
      lane: 1,
      x: laneX(1),
      targetX: laneX(1),
      y: H - 240,
    },
    invincible: 0,
    shakeFrames: 0,
    shakeX: 0,
    shakeY: 0,
    rafFrame: 0,
    spawnInterval: 60,
    spawnTimer: 0,
    crossTimer: 0,
    crossTurn: 0,
    crossDir: 1,
    exhaustCounter: 0,
  });

  const [, setRenderTick] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [livesDisplay, setLivesDisplay] = useState(3);

  // ── Boost: Shield ──────────────────────────────────────────────────────────
  const { useBoost: consumeBoost } = useBoostsInventory();
  const { addXP, addIQScore } = useUserStats();
  const shieldCount = useBoostsInventory((state) => state.inventory["racing_shield"] ?? 0);
  const { retryCount, hasRetry, activateRetry, getFinalScore } = useRetryBoost();
  const shieldRef = useRef(false);
  const [shieldActive, setShieldActive] = useState(false);
  const [shieldUsedThisGame, setShieldUsedThisGame] = useState(0);

  const updateRef = useRef<() => void>(() => {});

  // Используем один стабильный RAF loop
  useEffect(() => {
    state.current.hiScore = globalHighScore;
    let req: number;
    let active = true;
    const loop = () => {
      if (!active) return;
      if (state.current.running) {
        updateRef.current();
        state.current.rafFrame++;
        const _throttle = isAndroid ? 3 : 2;
        if (state.current.rafFrame % _throttle === 0) {
          setRenderTick((t) => (t + 1) & 0x7fffffff);
        }
      }
      req = requestAnimationFrame(loop);
    };
    req = requestAnimationFrame(loop);
    return () => {
      active = false;
      cancelAnimationFrame(req);
    };
  }, []);

  function resetPools() {
    for (let i = 0; i < obstaclePool.length; i++) obstaclePool[i].alive = false;
    for (let i = 0; i < particlePool.length; i++) particlePool[i].alive = false;
    for (let i = 0; i < crosserPool.length; i++) crosserPool[i].alive = false;
  }

  function startGame() {
    const s = state.current;
    s.running = true;
    s.score = 0;
    s.hiScore = globalHighScore;
    s.lives = 3;
    s.speed = 4;
    s.frameCount = 0;
    s.roadOffset = 0;
    s.lastTime = 0;
    s.player = { lane: 1, x: laneX(1), targetX: laneX(1), y: H - 240 };
    s.invincible = 0;
    s.shakeFrames = 0;
    s.spawnInterval = 60;
    s.spawnTimer = 0;
    s.crossTimer = 0;
    s.exhaustCounter = 0;
    s.rafFrame = 0;
    s.shakeX = 0;
    s.shakeY = 0;
    resetPools();
    shieldRef.current = false;
    setShieldActive(false);
    setShieldUsedThisGame(0);
    setLivesDisplay(3);
    setGameOver(false);
    setGameStarted(true);
  }

  async function endGame() {
    state.current.running = false;
    Vibration.vibrate([200, 80, 200, 80, 400]);
    if (state.current.score > globalHighScore) {
      globalHighScore = state.current.score;
      state.current.hiScore = globalHighScore;
    }
    const finalScore = getFinalScore(Math.floor(state.current.score));
    const xpGain = Math.round(finalScore / 10);
    addXP(xpGain);
    addIQScore(50);

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
          const response = await GamesModule.completeGame(
            (gameId as string) || 12,
          );
          if (response.dayCompleted) {
            Alert.alert(t("games.common.challengeTitle"), t("games.common.dayFinished"));
          }
        }

        if (dayId && !challengeDayGameId) {
          await ChallengesModule.submitDayScore(dayId as string, finalScore);
        }
      } catch (error) {
        console.error("Failed to complete game or submit score:", error);
      }
    })();

    setGameOver(true);
  }

  function spawnObstacle() {
    const st = state.current;
    const slot = poolAcquire(obstaclePool);
    if (!slot) return;
    const lane = Math.floor(Math.random() * LANES);
    slot.alive = true;
    slot.id = nextId();
    slot.lane = lane;
    slot.x = laneX(lane);
    slot.y = -OBS_H - 20;
    slot.color = ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)];
    slot.speed = st.speed * (0.8 + Math.random() * 0.6);
    slot.type = Math.random() < 0.3 ? "truck" : "car";
  }

  function spawnExhaust() {
    const st = state.current;
    const px = st.player.x;
    const py = st.player.y + CAR_H / 2 + 4;
    const exhaustCount = isAndroid ? 1 : 2;
    for (let i = 0; i < exhaustCount; i++) {
      const slot = poolAcquire(particlePool);
      if (!slot) return;
      slot.alive = true;
      slot.id = nextId();
      slot.x = px + (i === 0 ? -10 : 10);
      slot.y = py;
      slot.vx = (Math.random() - 0.5) * 0.8;
      slot.vy = 1.5 + Math.random() * 2.5;
      slot.r = 3 + Math.random() * 3;
      slot.color = `hsl(${180 + Math.random() * 60},80%,60%)`;
      slot.life = 14 + Math.random() * 10;
      slot.maxLife = 24;
    }
  }

  function spawnExplosion(x: number, y: number) {
    const colors = ["#ff2255", "#ffe600", "#ff6600", "#fff"];
    const explodeCount = isAndroid ? 8 : 15;
    for (let i = 0; i < explodeCount; i++) {
      const slot = poolAcquire(particlePool);
      if (!slot) break;
      const a = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * 5;
      slot.alive = true;
      slot.id = nextId();
      slot.x = x;
      slot.y = y;
      slot.vx = Math.cos(a) * s;
      slot.vy = Math.sin(a) * s - 2;
      slot.r = 2 + Math.random() * 4;
      slot.color = colors[i % 4];
      slot.life = 25 + Math.random() * 15;
      slot.maxLife = 40;
    }
  }

  function spawnCrossers() {
    const st = state.current;
    const slot = poolAcquire(crosserPool);
    if (!slot) return;
    const isBike = st.crossTurn % 2 === 1;
    st.crossTurn++;
    const dir = st.crossDir;
    st.crossDir = -st.crossDir;
    slot.alive = true;
    slot.id = nextId();
    slot.x = dir === 1 ? -30 : W + 30;
    slot.y = 120 + Math.random() * (H - 450);
    slot.dir = dir;
    slot.spd = isBike ? 2.2 : 1.2;
    slot.col = isBike
      ? { body: "#ffe600", skin: "#fcd34d" }
      : PED_COLORS[Math.floor(Math.random() * PED_COLORS.length)];
    slot.isBike = isBike;
    slot.phase = 0;
  }

  function countAlive<T extends { alive: boolean }>(pool: T[]): number {
    let c = 0;
    for (let i = 0; i < pool.length; i++) if (pool[i].alive) c++;
    return c;
  }

  function update() {
    const st = state.current;
    if (!st.running) return;

    const now = Date.now();
    if (st.lastTime === 0) {
      st.lastTime = now;
      return;
    }
    let dt = (now - st.lastTime) / 1000;
    // Кламп дельты — предотвращаем скачки после фоновых пауз
    if (dt > 0.05) dt = 0.016;
    st.lastTime = now;
    const ts = dt * 60; // timeScale

    st.frameCount += ts;
    st.roadOffset = (st.roadOffset + st.speed * ts) % 55;
    st.score += st.speed * 0.4 * ts;

    if (st.frameCount >= 300 && st.speed < 15) {
      st.speed += 0.3;
      st.spawnInterval = Math.max(25, 60 - Math.floor(st.speed * 2.5));
      st.frameCount = 0;
    }

    // Плавное перемещение игрока (lerp)
    const lerpFactor = 1 - Math.pow(0.75, ts); // frame-rate independent lerp
    st.player.x += (st.player.targetX - st.player.x) * lerpFactor;

    // Exhaust — спавним реже через счётчик вместо frameCount % 6
    st.exhaustCounter += ts;
    if (st.exhaustCounter >= 6) {
      spawnExhaust();
      st.exhaustCounter -= 6;
    }

    // Crossers
    const aliveCrossers = countAlive(crosserPool);
    if (aliveCrossers === 0) {
      st.crossTimer += ts;
      if (st.crossTimer >= 280) {
        spawnCrossers();
        st.crossTimer = 0;
      }
    }

    for (let i = 0; i < crosserPool.length; i++) {
      const c = crosserPool[i];
      if (!c.alive) continue;
      c.x += c.dir * c.spd * ts;
      c.phase += (c.isBike ? 0.22 : 0.16) * ts;

      if ((c.dir === 1 && c.x > W + 60) || (c.dir === -1 && c.x < -60)) {
        c.alive = false;
        continue;
      }

      if (st.invincible <= 0) {
        const hw = c.isBike ? 20 : 10;
        const hh = c.isBike ? 22 : 20;
        if (
          Math.abs(c.x - st.player.x) < (CAR_W + hw) / 2 &&
          Math.abs(c.y - st.player.y) < (CAR_H + hh) / 2
        ) {
          spawnExplosion(c.x, c.y);
          Vibration.vibrate(100);
          if (shieldRef.current) {
            shieldRef.current = false;
            setShieldActive(false);
          } else {
            st.lives--;
            setLivesDisplay(st.lives);
            if (st.lives <= 0) return endGame();
          }
          st.invincible = 120;
          st.shakeFrames = 20;
          c.alive = false;
        }
      }
    }

    // Obstacles
    st.spawnTimer += ts;
    if (st.spawnTimer >= st.spawnInterval) {
      spawnObstacle();
      st.spawnTimer = 0;
    }

    for (let i = 0; i < obstaclePool.length; i++) {
      const o = obstaclePool[i];
      if (!o.alive) continue;
      o.y += o.speed * ts;

      if (o.y > H + 120) {
        o.alive = false;
      } else if (st.invincible <= 0) {
        // inline collision check
        if (
          Math.abs(st.player.x - o.x) < P_HALF_W + O_HALF_W &&
          Math.abs(st.player.y - o.y) < P_HALF_H + O_HALF_H
        ) {
          spawnExplosion(st.player.x, st.player.y);
          Vibration.vibrate(100);
          if (shieldRef.current) {
            shieldRef.current = false;
            setShieldActive(false);
          } else {
            st.lives -= 1;
            setLivesDisplay(st.lives);
            if (st.lives <= 0) return endGame();
          }
          st.invincible = 120;
          st.shakeFrames = 20;
          o.alive = false;
        }
      }
    }

    // Particles
    for (let i = 0; i < particlePool.length; i++) {
      const p = particlePool[i];
      if (!p.alive) continue;
      p.x += p.vx * ts;
      p.y += p.vy * ts;
      p.vy += 0.1 * ts;
      p.life -= ts;
      if (p.life <= 0) p.alive = false;
    }

    if (st.invincible > 0) st.invincible -= ts;
    if (st.shakeFrames > 0) {
      st.shakeFrames -= ts;
      st.shakeX = (Math.random() - 0.5) * 10;
      st.shakeY = (Math.random() - 0.5) * 10;
    } else {
      st.shakeX = 0;
      st.shakeY = 0;
    }
  }

  updateRef.current = update;

  const moveLeft = useCallback(() => {
    const st = state.current;
    if (st.player.lane > 0) {
      st.player.lane--;
      st.player.targetX = laneX(st.player.lane);
      if (!isAndroid) Vibration.vibrate(15);
    }
  }, []);

  const moveRight = useCallback(() => {
    const st = state.current;
    if (st.player.lane < LANES - 1) {
      st.player.lane++;
      st.player.targetX = laneX(st.player.lane);
      if (!isAndroid) Vibration.vibrate(15);
    }
  }, []);

  const useShieldBoost = useCallback(() => {
    if (shieldUsedThisGame >= 2 || shieldCount <= 0 || shieldRef.current)
      return;
    
    if (!consumeBoost("racing_shield")) return;

    shieldRef.current = true;
    setShieldActive(true);
    setShieldUsedThisGame((n) => n + 1);
  }, [shieldUsedThisGame, shieldCount, consumeBoost]);

  // === RENDER ===

  const renderPlayer = () => {
    const st = state.current;
    if (
      !gameStarted ||
      (st.invincible > 0 && Math.floor(st.invincible / 6) % 2 !== 0)
    )
      return null;
    return (
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: CAR_W,
          height: CAR_H,
          backgroundColor: "#00ff88",
          borderRadius: 6,
          elevation: 10,
          transform: [
            { translateX: st.player.x - CAR_W / 2 },
            { translateY: st.player.y - CAR_H / 2 },
          ],
        }}
      >
        <View style={hlLeft} />
        <View style={hlRight} />
        <View style={styles.carWindshield} />
        <View style={styles.carTrunk} />
        <View style={carLightTL} />
        <View style={carLightTR} />
        <View style={carBrakeBL} />
        <View style={carBrakeBR} />
      </View>
    );
  };

  const renderObstacles = () => {
    const nodes = [];
    for (let i = 0; i < obstaclePool.length; i++) {
      const obs = obstaclePool[i];
      if (!obs.alive) continue;
      const h = obs.type === "truck" ? OBS_H * 1.3 : OBS_H;
      nodes.push(
        <View
          key={obs.id}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: OBS_W,
            height: h,
            backgroundColor: obs.color,
            borderRadius: 6,
            transform: [
              { translateX: obs.x - OBS_W / 2 },
              { translateY: obs.y - h / 2 },
            ],
          }}
        >
          <View style={enemyLightLeft} />
          <View style={enemyLightRight} />
          <View style={styles.enemyWindshield} />
          <View style={styles.enemyTrunk} />
        </View>,
      );
    }
    return nodes;
  };

  const renderCrossers = () => {
    const nodes = [];
    for (let i = 0; i < crosserPool.length; i++) {
      const c = crosserPool[i];
      if (!c.alive) continue;
      const isFlipped = c.dir === -1;
      const legOffset = Math.sin(c.phase) * 4;
      nodes.push(
        <View
          key={c.id}
          style={[
            styles.crosserContainer,
            {
              top: 0,
              left: 0,
              width: c.isBike ? 32 : 16,
              transform: [
                { translateX: c.x - (c.isBike ? 16 : 8) },
                { translateY: c.y - 12 },
                { scaleX: isFlipped ? -1 : 1 },
              ],
            },
          ]}
        >
          {c.isBike ? (
            <>
              <View style={styles.bikeShadow} />
              <View style={bikeWheelLeft} />
              <View style={bikeWheelRight} />
              <View style={styles.bikeFrameHorizontal} />
              <View style={styles.bikeFrameVertical} />
              <View style={styles.bikeHandlebar} />
              <View
                style={[styles.bikeBody, { backgroundColor: c.col.body }]}
              />
              <View
                style={[styles.bikeHead, { backgroundColor: c.col.skin }]}
              />
              <View
                style={[styles.bikeHelmet, { backgroundColor: c.col.body }]}
              />
            </>
          ) : (
            <>
              <View style={styles.pedShadow} />
              <View
                style={[
                  styles.pedLeg,
                  { left: 4, transform: [{ translateX: legOffset }] },
                ]}
              />
              <View
                style={[
                  styles.pedLeg,
                  { left: 8, transform: [{ translateX: -legOffset }] },
                ]}
              />
              <View style={[styles.pedBody, { backgroundColor: c.col.body }]} />
              <View style={[styles.pedHead, { backgroundColor: c.col.skin }]} />
            </>
          )}
        </View>,
      );
    }
    return nodes;
  };

  const renderParticles = () => {
    const nodes = [];
    for (let i = 0; i < particlePool.length; i++) {
      const p = particlePool[i];
      if (!p.alive) continue;
      nodes.push(
        <View
          key={p.id}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: p.r * 2,
            height: p.r * 2,
            borderRadius: p.r,
            backgroundColor: p.color,
            opacity: Math.max(0, p.life / p.maxLife),
            transform: [{ translateX: p.x - p.r }, { translateY: p.y - p.r }],
          }}
        />,
      );
    }
    return nodes;
  };

  const st = state.current;
  const shakeX = st.shakeX;
  const shakeY = st.shakeY;

  return (
    <View style={styles.container}>
      <SafeAreaView
        style={[
          styles.gameArea,
          { transform: [{ translateX: shakeX }, { translateY: shakeY }] },
        ]}
      >
        <RoadBackground roadOffset={st.roadOffset} />
        {renderCrossers()}
        {renderObstacles()}
        {renderPlayer()}
        {renderParticles()}
      </SafeAreaView>

      {gameStarted && (
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <View style={styles.hud}>
            <View style={styles.hudItem}>
              <Text style={styles.hudLabel}>{t("games.racing.hud.score")}</Text>
              <Text style={styles.hudVal}>{Math.floor(st.score)}</Text>
            </View>
            <View style={hudCenter}>
              <Text style={styles.hudLabel}>{t("games.racing.hud.record")}</Text>
              <Text style={styles.hudVal}>{Math.floor(st.hiScore)}</Text>
            </View>
            <View style={hudRight}>
              <Text style={styles.hudLabel}>{t("games.racing.hud.lives")}</Text>
              <View style={styles.livesContainer}>
                {heartsArr.map((i) => (
                  <Ionicons
                    key={i}
                    name="heart"
                    size={16}
                    color={i > livesDisplay ? "#333" : "#ff2255"}
                  />
                ))}
              </View>
            </View>
          </View>
        </View>
      )}

      <SafeAreaView
        style={[StyleSheet.absoluteFill, { paddingBottom: 20 }]}
        pointerEvents="box-none"
      >
        {!gameStarted && !gameOver && (
          <View style={[styles.start_root, StyleSheet.absoluteFill]}>
            <StatusBar barStyle="light-content" />
            <TouchableOpacity
              style={[styles.start_backBtn, { top: insets.top + 12 }]}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={20} color="#00ff88" />
              <Text style={{ color: "#00ff88", fontSize: 12, fontWeight: "700", marginLeft: 4 }}>
                {t("common.back")}
              </Text>
            </TouchableOpacity>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={[
                styles.start_scrollContent,
                {
                  paddingTop: insets.top + 64,
                  paddingBottom: 16,
                },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.start_heroEmoji}>🏎️</Text>
              <Text style={styles.start_title}>TURBO DRIFT</Text>
              <Text style={styles.start_subtitle}>
                {t("games.racing.start.subtitle")}
              </Text>

              <View style={styles.start_descCard}>
                <Text style={styles.start_descTitle}>{t("games.racing.start.howToPlayTitle")}</Text>
                <Text style={styles.start_descText}>
                  {t("games.racing.start.howToPlayDesc")}
                </Text>
                <View style={styles.start_divider} />
                <Text style={styles.start_sectionTitle}>
                  {t("games.racing.start.featuresTitle")}
                </Text>

                <View style={styles.start_mechRow}>
                  <View style={mechDotGreen} />
                  <View style={flex1}>
                    <Text style={styles.start_mechName}>
                      {t("games.racing.start.speedUpTitle")}
                    </Text>
                    <Text style={styles.start_mechDesc}>
                      {t("games.racing.start.speedUpDesc")}
                    </Text>
                  </View>
                </View>

                <View style={styles.start_mechRow}>
                  <View style={mechDotRed} />
                  <View style={flex1}>
                    <Text style={styles.start_mechName}>{t("games.racing.start.obstaclesTitle")}</Text>
                    <Text style={styles.start_mechDesc}>
                      {t("games.racing.start.obstaclesDesc")}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.start_featureRow}>
                {featureItems.map((f) => (
                  <View key={f.label} style={styles.start_featureBox}>
                    <Text style={styles.start_featureEmoji}>{f.emoji}</Text>
                    <Text style={styles.start_featureLabel}>{f.label}</Text>
                  </View>
                ))}
              </View>

            </ScrollView>

            <View
              style={[
                styles.start_footer,
                { paddingBottom: insets.bottom + 16 },
              ]}
            >
              <TouchableOpacity
                style={styles.start_playBtn}
                onPress={startGame}
                activeOpacity={0.85}
              >
                <Text style={styles.start_playBtnText}>{t("games.racing.start.playBtn")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {gameOver && (
          <View style={styles.overlay}>
            <Text style={[styles.overlayTitle, { color: "#ff2255" }]}>
              {t("games.racing.gameOver.title")}
            </Text>

            <View style={styles.statsRowComparison}>
              <View style={styles.statBoxComparison}>
                <View style={styles.statIconWrap}>
                  <Ionicons name="trophy-outline" size={16} color="#00ff88" />
                </View>
                <Text style={[styles.statNumComparison, { color: "#00ff88" }]}>
                  {Math.floor(state.current.hiScore)}
                </Text>
                <Text style={styles.statLabelComparison}>{t("games.racing.gameOver.best")}</Text>
              </View>
              <View style={styles.statBoxComparison}>
                <View style={styles.statIconWrap}>
                  <Ionicons name="person-outline" size={16} color="#ff2255" />
                </View>
                <Text style={[styles.statNumComparison, { color: "#ff2255" }]}>
                  {Math.floor(st.score)}
                </Text>
                <Text style={styles.statLabelComparison}>{t("games.racing.gameOver.yourRecord")}</Text>
              </View>
            </View>

            <RetryBoostButton
              hasRetry={hasRetry}
              retryCount={retryCount}
              onPress={() => activateRetry(Math.floor(st.score), startGame)}
              style={{ width: "100%", marginBottom: 12 }}
            />
            <TouchableOpacity style={gameOverBtn} onPress={startGame}>
              {" "}
              <Text style={gameOverBtnText}>{t("games.racing.gameOver.tryAgain")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={backBtn} onPress={() => router.back()}>
              <Text style={backBtnText}>{t("games.racing.gameOver.backToGames")}</Text>
            </TouchableOpacity>
          </View>
        )}

        {gameStarted && !gameOver && (
          <>
            <GameControls
              moveLeft={moveLeft}
              moveRight={moveRight}
              bottomInset={insets.bottom}
            />
            <TouchableOpacity
              style={[
                styles.shieldBtn,
                shieldActive && styles.shieldBtnActive,
                (shieldUsedThisGame >= 2 || shieldCount <= 0) &&
                  styles.shieldBtnDisabled,
                { bottom: insets.bottom + 115 },
              ]}
              onPress={useShieldBoost}
              disabled={
                shieldUsedThisGame >= 2 ||
                shieldCount <= 0 ||
                shieldActive
              }
            >
              <Text style={styles.shieldBtnEmoji}>🛡️</Text>
              {shieldCount > 0 && (
                <View style={styles.shieldBadge}>
                  <Text style={styles.shieldBadgeText}>
                    {shieldCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

// === PRE-COMPUTED INLINE STYLES (avoid object creation per frame) ===
const heartsArr = [1, 2, 3];
const flex1 = { flex: 1 } as const;
const hudCenter = {
  justifyContent: "center" as const,
  alignItems: "center" as const,
};
const hudRight = {
  justifyContent: "center" as const,
  alignItems: "flex-end" as const,
};
const mechDotGreen = {
  width: 10,
  height: 10,
  borderRadius: 5,
  marginTop: 6,
  backgroundColor: "#00ff88",
} as const;
const mechDotRed = {
  width: 10,
  height: 10,
  borderRadius: 5,
  marginTop: 6,
  backgroundColor: "#ff2255",
} as const;

const hlLeft = {
  position: "absolute" as const,
  top: -120,
  left: 4 - 40,
  width: 0,
  height: 0,
  borderTopWidth: 120,
  borderStyle: "solid" as const,
  borderLeftWidth: 40,
  borderRightWidth: 10,
  borderLeftColor: "transparent",
  borderRightColor: "transparent",
  borderTopColor: "rgba(255,255,200,0.08)",
};
const hlRight = {
  position: "absolute" as const,
  top: -120,
  left: 40 - 10,
  width: 0,
  height: 0,
  borderTopWidth: 120,
  borderStyle: "solid" as const,
  borderLeftWidth: 10,
  borderRightWidth: 40,
  borderLeftColor: "transparent",
  borderRightColor: "transparent",
  borderTopColor: "rgba(255,255,200,0.08)",
};
const carLightTL = {
  position: "absolute" as const,
  top: 4,
  left: 4,
  width: 10,
  height: 6,
  backgroundColor: "#ffffcc",
  borderRadius: 2,
};
const carLightTR = {
  position: "absolute" as const,
  top: 4,
  right: 4,
  width: 10,
  height: 6,
  backgroundColor: "#ffffcc",
  borderRadius: 2,
};
const carBrakeBL = {
  position: "absolute" as const,
  bottom: 4,
  left: 4,
  width: 10,
  height: 6,
  backgroundColor: "#ff2255",
  borderRadius: 2,
};
const carBrakeBR = {
  position: "absolute" as const,
  bottom: 4,
  right: 4,
  width: 10,
  height: 6,
  backgroundColor: "#ff2255",
  borderRadius: 2,
};

const enemyLightLeft = {
  position: "absolute" as const,
  bottom: -100,
  left: 4 - 40,
  width: 0,
  height: 0,
  borderBottomWidth: 100,
  borderStyle: "solid" as const,
  borderLeftWidth: 40,
  borderRightWidth: 10,
  borderLeftColor: "transparent",
  borderRightColor: "transparent",
  borderBottomColor: "rgba(255,255,150,0.05)",
};
const enemyLightRight = {
  position: "absolute" as const,
  bottom: -100,
  left: 40 - 10,
  width: 0,
  height: 0,
  borderBottomWidth: 100,
  borderStyle: "solid" as const,
  borderLeftWidth: 10,
  borderRightWidth: 40,
  borderLeftColor: "transparent",
  borderRightColor: "transparent",
  borderBottomColor: "rgba(255,255,150,0.05)",
};

const bikeWheelLeft = {
  position: "absolute" as const,
  top: 8,
  left: 0,
  width: 14,
  height: 14,
  borderRadius: 7,
  borderWidth: 2.5,
  borderColor: "#ffe600",
};
const bikeWheelRight = {
  position: "absolute" as const,
  top: 8,
  right: 0,
  width: 14,
  height: 14,
  borderRadius: 7,
  borderWidth: 2.5,
  borderColor: "#ffe600",
};

const gameOverBtn = {
  paddingVertical: 14,
  paddingHorizontal: 32,
  borderWidth: 3,
  borderRadius: 8,
  borderColor: "#ff2255",
  backgroundColor: "rgba(0,255,136,0.1)",
};
const gameOverBtnText = {
  fontSize: 20,
  fontWeight: "bold" as const,
  letterSpacing: 2,
  color: "#ff2255",
};
const backBtn = {
  paddingVertical: 14,
  paddingHorizontal: 32,
  borderWidth: 3,
  borderRadius: 8,
  borderColor: "#7090b0",
  backgroundColor: "rgba(0,255,136,0.1)",
  marginTop: 12,
};
const backBtnText = {
  fontSize: 20,
  fontWeight: "bold" as const,
  letterSpacing: 2,
  color: "#7090b0",
};

// Базовые стили вынесены отдельно для доступа до StyleSheet.create
const styles_raw = {
  roadEdge: {
    position: "absolute" as const,
    top: 0,
    bottom: 0,
    width: 8,
    backgroundColor: "#1e2d1e",
  },
  roadLine: {
    position: "absolute" as const,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: "rgba(255,220,0,0.5)",
  },
};

// Предвычисленные стили (не создаём объекты каждый кадр)
const roadBgStyle = { flex: 1, backgroundColor: "#111820" } as const;
const roadEdgeLeft = StyleSheet.flatten([styles_raw.roadEdge, { left: 0 }]);
const roadEdgeRight = StyleSheet.flatten([styles_raw.roadEdge, { right: 0 }]);
const roadLineLeft = StyleSheet.flatten([styles_raw.roadLine, { left: 8 }]);
const roadLineRight = StyleSheet.flatten([styles_raw.roadLine, { right: 8 }]);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050a14" },
  header: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.8)",
    borderBottomWidth: 2,
    borderBottomColor: "#00ff88",
    zIndex: 10,
  },
  hud: { flex: 1, flexDirection: "row", justifyContent: "space-between" },
  hudItem: { justifyContent: "center" },
  hudLabel: { color: "#556677", fontSize: 10, fontWeight: "bold" },
  hudVal: { color: "#ffe600", fontSize: 16, fontWeight: "bold" },
  livesContainer: { flexDirection: "row", gap: 4 },
  gameArea: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    backgroundColor: "#0d1520",
  },
  roadEdge: styles_raw.roadEdge,
  roadLine: styles_raw.roadLine,
  headlight: {
    position: "absolute",
    top: -120,
    width: 0,
    height: 0,
    borderTopWidth: 120,
    borderStyle: "solid",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "rgba(255,255,200,0.08)",
  },
  carWindshield: {
    position: "absolute",
    top: 8,
    left: 6,
    right: 6,
    height: 18,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 4,
  },
  carTrunk: {
    position: "absolute",
    bottom: 8,
    left: 6,
    right: 6,
    height: 14,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 4,
  },
  carLight: {
    position: "absolute",
    width: 10,
    height: 6,
    backgroundColor: "#ffffcc",
    borderRadius: 2,
  },
  carBrakeLight: {
    position: "absolute",
    width: 10,
    height: 6,
    backgroundColor: "#ff2255",
    borderRadius: 2,
  },
  enemyLight: {
    position: "absolute",
    bottom: -100,
    width: 0,
    height: 0,
    borderBottomWidth: 100,
    borderStyle: "solid",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "rgba(255,255,150,0.05)",
  },
  enemyWindshield: {
    position: "absolute",
    bottom: 8,
    left: 6,
    right: 6,
    height: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 4,
  },
  enemyTrunk: {
    position: "absolute",
    top: 8,
    left: 6,
    right: 6,
    height: 12,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 4,
  },
  crosserContainer: {
    position: "absolute",
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  bikeShadow: {
    position: "absolute",
    bottom: -2,
    width: 28,
    height: 6,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 14,
    transform: [{ scaleY: 0.5 }],
  },
  bikeWheel: {
    position: "absolute",
    top: 8,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: "#ffe600",
  },
  bikeFrameHorizontal: {
    position: "absolute",
    left: 7,
    top: 14,
    width: 18,
    height: 2,
    backgroundColor: "#ffe600",
    transform: [{ rotate: "-15deg" }],
  },
  bikeFrameVertical: {
    position: "absolute",
    left: 7,
    top: 8,
    width: 2,
    height: 10,
    backgroundColor: "#ffe600",
  },
  bikeHandlebar: {
    position: "absolute",
    right: 6,
    top: 7,
    width: 6,
    height: 2,
    backgroundColor: "#94a3b8",
  },
  bikeBody: {
    position: "absolute",
    left: 7,
    top: 2,
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  bikeHead: {
    position: "absolute",
    left: 14,
    top: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  bikeHelmet: {
    position: "absolute",
    left: 13,
    top: -5,
    width: 12,
    height: 6,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  pedShadow: {
    position: "absolute",
    bottom: -2,
    width: 12,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 6,
    transform: [{ scaleY: 0.5 }],
  },
  pedLeg: {
    position: "absolute",
    top: 12,
    width: 4,
    height: 10,
    backgroundColor: "#1e3a5f",
    borderRadius: 2,
  },
  pedBody: {
    position: "absolute",
    left: 3,
    top: 2,
    width: 10,
    height: 12,
    borderRadius: 3,
  },
  pedHead: {
    position: "absolute",
    left: 2,
    top: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,10,20,0.92)",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    zIndex: 50,
  },
  overlayTitle: {
    fontSize: 48,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 56,
    marginBottom: 10,
  },
  statsRowComparison: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 30,
  },
  statBoxComparison: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  statNumComparison: { fontSize: 26, fontWeight: "900", lineHeight: 28 },
  statLabelComparison: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: "rgba(255,255,255,0.5)",
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
  overlayScore: { fontSize: 20, color: "#ffe600", fontWeight: "bold" },
  startBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderWidth: 3,
    borderRadius: 8,
    backgroundColor: "rgba(0,255,136,0.1)",
  },
  startBtnText: { fontSize: 20, fontWeight: "bold", letterSpacing: 2 },
  controls: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    gap: 16,
  },
  start_root: { backgroundColor: "#050a14" },
  start_footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "#050a14",
  },
  start_backBtn: {
    position: "absolute",
    left: 16,
    paddingHorizontal: 10,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    flexDirection: "row",
  },
  start_scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: "center",
  },
  start_heroEmoji: { fontSize: 64, marginBottom: 12 },
  start_title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#00ff88",
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: "center",
  },
  start_subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  start_descCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
  },
  start_descTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 8,
  },
  start_descText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 22,
  },
  start_divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 20,
  },
  start_sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
  },
  start_mechRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  start_mechDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  start_mechName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  start_mechDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 18,
  },
  start_featureRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    marginBottom: 32,
  },
  start_featureBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    gap: 6,
  },
  start_featureEmoji: { fontSize: 20 },
  start_featureLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
    textAlign: "center",
  },
  start_playBtn: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 20,
    backgroundColor: "#00ff88",
    alignItems: "center",
  },
  start_playBtnText: {
    color: "#050a14",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },
  ctrlBtn: {
    flex: 1,
    height: 80,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 2,
    borderColor: "rgba(0,255,136,0.5)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  shieldBtn: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(56,189,248,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(56,189,248,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  shieldBtnActive: {
    backgroundColor: "rgba(56,189,248,0.35)",
    borderColor: "#38bdf8",
  },
  shieldBtnDisabled: {
    opacity: 0.35,
  },
  shieldBtnEmoji: {
    fontSize: 24,
  },
  shieldBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#38bdf8",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  shieldBadgeText: {
    color: "#000",
    fontSize: 9,
    fontWeight: "800",
  },
});
