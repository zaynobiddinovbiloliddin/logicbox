/**
 * Reclam Component - Экран результатов теста/задания с наградами
 *
 * 5 вариантов отображения в зависимости от процентиля:
 * 1. "top1" (≤1%) - ВСЕ награды: флаг 🚩 + бусты 🚀 + алмазы 💎 + деньги 💵 (4 карточки)
 * 2. "top4" (≤4%) - Без флага: бусты 🚀 + алмазы 💎 + деньги 💵 (3 карточки)
 * 3. "good" (≤50%) - Средний результат: алмазы 💎 + деньги 💵 (2 карточки)
 * 4. "poor" (≤80%) - Слабый результат: только алмазы 💎 (1 карточка)
 * 5. "fail" (>80%) - Очень слабо: только буст 🚀 (1 карточка)
 *
 * @example
 * <Reclam
 *   result={{
 *     score: 98,
 *     maxScore: 100,
 *     title: "Невероятно!",
 *     message: "Ты вошёл в топ 1%!",
 *     rating: 5,
 *     percentile: 1
 *   }}
 * />
 */

import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  Pressable,
  Modal,
} from "react-native";
import SafeAreaWrapper from "@/components/shared/safe-area-wrapper";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface TestResult {
  title: string;
  message: string;
  rating: number; // 1-5 звёзд
  percentile?: number; // Процентиль пользователя (например, топ 1%, топ 4%)
}

type ResultType = "top1" | "top4" | "good" | "poor" | "fail";

interface ShareModalData {
  resultType: ResultType;
  rewards: RewardItem[];
  rating: number;
  title: string;
}

interface RewardItem {
  type: "boost" | "cash" | "diamond" | "activity";
  amount: number;
  emoji: string;
  label: string;
  colors: string[];
}

interface ReclaimProps {
  result?: TestResult;
  type?: ResultType;
}

// Пример данных результата - для тестирования меняйте percentile:
// - percentile: 1  → "top1" (флаг 🚩 + 5 бустов 🚀 + 5000 алмазов 💎 + 10000 денег 💵)
// - percentile: 50 → "good" (2000 алмазов 💎 + 2000 денег 💵)
// - percentile: 70 → "poor" (1000 алмазов 💎)
// - percentile: 95 → "fail" (1 буст 🚀)
const mockResult: TestResult = {
  title: "Невероятно!",
  message: "Ты вошёл в топ 1% лучших игроков!",
  rating: 5,
  percentile: 1, // Топ 1% - для тестирования меняйте: 1, 4, 50, 70, 95
};

export default function Reclam({ result = mockResult, type }: ReclaimProps) {
  const { t } = useTranslation();
  const [showShareModal, setShowShareModal] = useState(false);
  const [claimedRewards, setClaimedRewards] = useState<Set<number>>(new Set());
  const [selectedRewardIndex, setSelectedRewardIndex] = useState<number | null>(
    null,
  );

  const handleSelectReward = (index: number) => {
    if (!claimedRewards.has(index)) {
      setSelectedRewardIndex(index);
    }
  };

  const handleClaimReward = () => {
    if (selectedRewardIndex !== null) {
      setClaimedRewards((prev) => new Set(prev).add(selectedRewardIndex));
      setSelectedRewardIndex(null);

      // Открываем модалку шаринга сразу после claim
      setTimeout(() => {
        setShowShareModal(true);
      }, 500);
    }
  };

  // Определяем тип результата на основе процентиля
  const getResultType = (): ResultType => {
    if (type) return type;

    const percentile = result.percentile || 50;

    if (percentile <= 1) return "top1"; // Топ 1%
    if (percentile <= 4) return "top4"; // Топ 4%
    if (percentile <= 50) return "good"; // Топ 50%
    if (percentile <= 80) return "poor"; // До 80%
    return "fail"; // Остальные
  };

  const resultType = getResultType();

  // Получаем список наград в зависимости от типа
  const getRewards = (): RewardItem[] => {
    switch (resultType) {
      case "top1": // Топ 1% - ВСЕ награды
        return [
          {
            type: "activity",
            amount: 1,
            emoji: "🔥",
            label: t("content.reclam.labels.exclusiveFlag"),
            colors: ["#FFD93D", "#FF6B9D"],
          },
          {
            type: "boost",
            amount: 5,
            emoji: "🚀",
            label: t("content.reclam.labels.powerBoosts"),
            colors: ["#FF6B9D", "#C77DFF"],
          },
          {
            type: "diamond",
            amount: 5000,
            emoji: "💎",
            label: t("content.reclam.labels.diamonds"),
            colors: ["#4D96FF", "#C77DFF"],
          },
          {
            type: "cash",
            amount: 10000,
            emoji: "💵",
            label: t("content.reclam.labels.cash"),
            colors: ["#6BCB77", "#3AAFA9"],
          },
        ];

      case "top4": // Топ 4% - без флага
        return [
          {
            type: "boost",
            amount: 3,
            emoji: "🚀",
            label: t("content.reclam.labels.powerBoosts"),
            colors: ["#FF6B9D", "#C77DFF"],
          },
          {
            type: "diamond",
            amount: 3000,
            emoji: "💎",
            label: t("content.reclam.labels.diamonds"),
            colors: ["#4D96FF", "#C77DFF"],
          },
          {
            type: "cash",
            amount: 5000,
            emoji: "💵",
            label: t("content.reclam.labels.cash"),
            colors: ["#6BCB77", "#3AAFA9"],
          },
        ];

      case "good": // Топ 50% - деньги + алмазы
        return [
          {
            type: "diamond",
            amount: 2000,
            emoji: "💎",
            label: t("content.reclam.labels.diamonds"),
            colors: ["#4D96FF", "#C77DFF"],
          },
          {
            type: "cash",
            amount: 2000,
            emoji: "💵",
            label: t("content.reclam.labels.cash"),
            colors: ["#6BCB77", "#3AAFA9"],
          },
        ];

      case "poor": // До 80% - только алмазы
        return [
          {
            type: "diamond",
            amount: 1000,
            emoji: "💎",
            label: t("content.reclam.labels.diamonds"),
            colors: ["#4D96FF", "#C77DFF"],
          },
        ];

      case "fail": // Остальные - только буст
        return [
          {
            type: "boost",
            amount: 1,
            emoji: "🚀",
            label: t("content.reclam.labels.powerBoost"),
            colors: ["#FF6B9D", "#C77DFF"],
          },
        ];
    }
  };

  const rewards = getRewards();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;

  const confettiAnims = useRef(
    Array.from({ length: 20 }, () => ({
      translateY: new Animated.Value(-100),
      translateX: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.5 + Math.random() * 0.5),
    })),
  ).current;

  const starRatingAnims = useRef(
    Array.from({ length: 5 }, () => ({
      scale: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(0),
    })),
  ).current;

  const prizeAnims = useRef(
    Array.from({ length: 4 }, () => ({
      scale: new Animated.Value(0),
      translateY: new Animated.Value(20),
      opacity: new Animated.Value(0),
    })),
  ).current;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Анимация появления
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideUpAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Конфетти
    confettiAnims.forEach((anim, index) => {
      const randomDelay = Math.random() * 500;
      const randomX = (Math.random() - 0.5) * SCREEN_WIDTH;
      const randomRotation = Math.random() * 1080;

      setTimeout(() => {
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 3000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateX, {
            toValue: randomX,
            duration: 3000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
          Animated.timing(anim.rotate, {
            toValue: randomRotation,
            duration: 3000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(anim.opacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.delay(2000),
            Animated.timing(anim.opacity, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      }, randomDelay);
    });

    // Анимация звёзд рейтинга
    starRatingAnims.forEach((anim, index) => {
      if (index < result.rating) {
        setTimeout(
          () => {
            Animated.parallel([
              Animated.spring(anim.scale, {
                toValue: 1,
                tension: 80,
                friction: 6,
                useNativeDriver: true,
              }),
              Animated.timing(anim.opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.sequence([
                Animated.timing(anim.rotate, {
                  toValue: 1,
                  duration: 400,
                  useNativeDriver: true,
                }),
                Animated.spring(anim.rotate, {
                  toValue: 0,
                  tension: 50,
                  friction: 3,
                  useNativeDriver: true,
                }),
              ]),
            ]).start();
          },
          800 + index * 150,
        );
      }
    });

    // Анимация призов
    prizeAnims.forEach((anim, index) => {
      setTimeout(
        () => {
          Animated.parallel([
            Animated.spring(anim.scale, {
              toValue: 1,
              tension: 60,
              friction: 7,
              useNativeDriver: true,
            }),
            Animated.spring(anim.translateY, {
              toValue: 0,
              tension: 60,
              friction: 7,
              useNativeDriver: true,
            }),
            Animated.timing(anim.opacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
          ]).start();
        },
        1500 + index * 200,
      );
    });

    // Пульсация
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.035,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Свечение
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, []);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.9],
  });

  const getGradientColors = () => {
    const percentile = result.percentile || 50;
    if (percentile <= 1) return ["#FFD93D", "#FF6B9D"]; // Топ 1%
    if (percentile <= 4) return ["#6BCB77", "#3AAFA9"]; // Топ 4%
    if (percentile <= 50) return ["#4D96FF", "#C77DFF"]; // Топ 50%
    return ["#FF6B9D", "#C77DFF"];
  };

  const getRatingText = () => {
    if (result.rating >= 5) return t("content.reclam.rating.perfect");
    if (result.rating >= 4) return t("content.reclam.rating.excellent");
    if (result.rating >= 3) return t("content.reclam.rating.good");
    if (result.rating >= 2) return t("content.reclam.rating.notBad");
    return t("content.reclam.rating.tryAgain");
  };

  // Получаем описания наград
  const getRewardDescription = (
    reward: RewardItem,
  ): { title: string; description: string } => {
    switch (reward.type) {
      case "activity":
        return {
          title: t("content.reclam.rewardInfo.activityTitle"),
          description: t("content.reclam.rewardInfo.activityDesc"),
        };
      case "boost":
        return {
          title:
            reward.amount > 1
              ? t("content.reclam.rewardInfo.boostPackTitle")
              : t("content.reclam.rewardInfo.freeBoostTitle"),
          description:
            reward.amount > 1
              ? t("content.reclam.rewardInfo.boostPackDesc")
              : t("content.reclam.rewardInfo.freeBoostDesc"),
        };
      case "diamond":
        return {
          title: t("content.reclam.rewardInfo.diamondTitle"),
          description: t("content.reclam.rewardInfo.diamondDesc"),
        };
      case "cash":
        return {
          title: t("content.reclam.rewardInfo.cashTitle"),
          description: t("content.reclam.rewardInfo.cashDesc"),
        };
    }
  };

  // Утилита для конвертации hex в rgb
  const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : "255, 255, 255";
  };

  // Рендер наград динамически (radio button style)
  const renderRewards = () => {
    return rewards.map((reward, index) => {
      const { title, description } = getRewardDescription(reward);
      const isSelected = selectedRewardIndex === index;
      const isClaimed = claimedRewards.has(index);

      return (
        <Pressable
          key={`reward-${index}`}
          onPress={() => handleSelectReward(index)}
          disabled={isClaimed}
        >
          <Animated.View
            style={[
              styles.rewardCard,
              isSelected && styles.rewardCardSelected,
              isClaimed && styles.rewardCardClaimed,
              {
                opacity: prizeAnims[index]?.opacity || 1,
                transform: [
                  { scale: prizeAnims[index]?.scale || 1 },
                  { translateY: prizeAnims[index]?.translateY || 0 },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={[
                `rgba(${hexToRgb(reward.colors[0])}, ${isSelected ? "0.25" : "0.12"})`,
                `rgba(${hexToRgb(reward.colors[1])}, ${isSelected ? "0.15" : "0.08"})`,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.rewardGradient}
            >
              {/* Radio button */}
              <View style={styles.radioButton}>
                <View
                  style={[
                    styles.radioButtonOuter,
                    isSelected && styles.radioButtonOuterSelected,
                    isClaimed && styles.radioButtonOuterClaimed,
                  ]}
                >
                  {isSelected && !isClaimed && (
                    <View style={styles.radioButtonInner} />
                  )}
                  {isClaimed && <Text style={styles.radioButtonCheck}>✓</Text>}
                </View>
              </View>

              <View style={styles.rewardIcon}>
                <LinearGradient
                  colors={reward.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.rewardIconGradient}
                >
                  <Text style={styles.rewardIconEmoji}>{reward.emoji}</Text>
                </LinearGradient>
              </View>

              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>{title}</Text>
                <Text style={styles.rewardDescription}>{description}</Text>
                <View style={styles.rewardAmount}>
                  <Text style={styles.rewardAmountValue}>
                    {reward.amount}
                    {reward.type === "boost" || reward.type === "activity"
                      ? "x"
                      : ""}
                  </Text>
                  <Text style={styles.rewardAmountLabel}>{reward.label}</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        </Pressable>
      );
    });
  };

  return (
    <SafeAreaWrapper scrollable={false}>
    <View style={styles.container}>
      {/* Фон с градиентом */}
      <LinearGradient
        colors={["#0A0A14", "#1a1a2e", "#0A0A14"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Декоративные блобы */}
      <View
        style={[
          styles.blob,
          { top: -100, left: -100, backgroundColor: "#4D96FF15" },
        ]}
      />
      <View
        style={[
          styles.blob,
          {
            top: 150,
            right: -120,
            backgroundColor: "#C77DFF15",
            width: 350,
            height: 350,
          },
        ]}
      />
      <View
        style={[
          styles.blob,
          {
            bottom: -80,
            left: -60,
            backgroundColor: "#6BCB7715",
            width: 280,
            height: 280,
          },
        ]}
      />

      {/* Конфетти */}
      {confettiAnims.map((anim, index) => (
        <Animated.View
          key={`confetti-${index}`}
          style={[
            styles.confetti,
            {
              left: SCREEN_WIDTH / 2,
              backgroundColor:
                index % 5 === 0
                  ? "#FFD93D"
                  : index % 5 === 1
                    ? "#6BCB77"
                    : index % 5 === 2
                      ? "#4D96FF"
                      : index % 5 === 3
                        ? "#C77DFF"
                        : "#FF6B9D",
              width: index % 3 === 0 ? 8 : 6,
              height: index % 3 === 0 ? 8 : 10,
              borderRadius: index % 2 === 0 ? 1 : 4,
              transform: [
                { translateX: anim.translateX },
                { translateY: anim.translateY },
                { scale: anim.scale },
                {
                  rotate: anim.rotate.interpolate({
                    inputRange: [0, 360],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
              opacity: anim.opacity,
            },
          ]}
        />
      ))}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Главная карточка */}
        <Animated.View
          style={[
            styles.mainCard,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Результат в центре */}
          <Animated.View
            style={[styles.scoreSection, { transform: [{ scale: pulseAnim }] }]}
          >
            <View style={styles.scoreCircle}>
              <Animated.View
                style={[
                  styles.scoreGlow,
                  {
                    shadowOpacity: glowOpacity,
                  },
                ]}
              >
                <LinearGradient
                  colors={getGradientColors()}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.scoreGradient}
                >
                  <Text style={styles.scoreNumber}>⭐</Text>
                </LinearGradient>
              </Animated.View>
            </View>
            {result.percentile && (
              <View style={styles.percentileBadge}>
                <Text style={styles.percentileText}>
                  {t("content.reclam.topPrefix")} {result.percentile}%
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Рейтинг звёздами */}
          <Animated.View
            style={[
              styles.ratingSection,
              { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] },
            ]}
          >
            <Text style={styles.ratingLabel}>{getRatingText()}</Text>
            <View style={styles.starsRow}>
              {starRatingAnims.map((anim, index) => (
                <Animated.Text
                  key={`star-${index}`}
                  style={[
                    styles.star,
                    {
                      opacity: anim.opacity,
                      transform: [
                        { scale: anim.scale },
                        {
                          rotate: anim.rotate.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0deg", "360deg"],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  {index < result.rating ? "⭐" : "☆"}
                </Animated.Text>
              ))}
            </View>
          </Animated.View>

          {/* Сообщение */}
          <Animated.View style={[styles.messageSection, { opacity: fadeAnim }]}>
            <Text style={styles.resultTitle}>{result.title}</Text>
            <Text style={styles.resultMessage}>{result.message}</Text>
          </Animated.View>
        </Animated.View>

        {/* Карточка наград */}
        <Animated.View
          style={[
            styles.prizesCard,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.prizesTitle}>{t("content.reclam.prizesTitle")}</Text>
          {renderRewards()}

          {/* Центральная кнопка Claim */}
          <Animated.View
            style={[
              styles.claimButtonSection,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <Pressable
              style={[
                styles.centralClaimButton,
                !selectedRewardIndex && styles.centralClaimButtonDisabled,
              ]}
              onPress={handleClaimReward}
              disabled={selectedRewardIndex === null}
            >
              <LinearGradient
                colors={
                  selectedRewardIndex !== null
                    ? getGradientColors()
                    : ["#444", "#222"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.centralClaimButtonGradient}
              >
                <Text style={styles.centralClaimButtonText}>
                  {selectedRewardIndex !== null
                    ? t("content.reclam.claimReward")
                    : t("content.reclam.chooseReward")}
                </Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </ScrollView>

      {/* Share Modal */}
      <Modal
        visible={showShareModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.shareModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowShareModal(false)}
          />
          <Animated.View style={styles.shareModalContent}>
            <LinearGradient
              colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.03)"]}
              style={styles.shareModalGradient}
            >
              {/* Close button */}
              <Pressable
                style={styles.shareCloseButton}
                onPress={() => setShowShareModal(false)}
              >
                <Text style={styles.shareCloseText}>✕</Text>
              </Pressable>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.shareScrollContent}
              >
                {/* Share content based on result type */}
                <View style={styles.shareHeader}>
                  <Text style={styles.shareTitle}>{t("content.reclam.shareTitle")}</Text>
                  <Text style={styles.shareSubtitle}>
                    {resultType === "top1" && t("content.reclam.shareSubtitle.top1")}
                    {resultType === "top4" &&
                      t("content.reclam.shareSubtitle.top4")}
                    {resultType === "good" && t("content.reclam.shareSubtitle.good")}
                    {resultType === "poor" && t("content.reclam.shareSubtitle.poor")}
                    {resultType === "fail" && t("content.reclam.shareSubtitle.fail")}
                  </Text>
                </View>

                {/* Achievement card - визуализация результата */}
                <View style={styles.shareAchievementCard}>
                  <LinearGradient
                    colors={getGradientColors()}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.shareAchievementGradient}
                  >
                    <Text style={styles.shareAchievementEmoji}>
                      {resultType === "top1"
                        ? "🏆"
                        : resultType === "top4"
                          ? "🥇"
                          : resultType === "good"
                            ? "⭐"
                            : resultType === "poor"
                              ? "💪"
                              : "🚀"}
                    </Text>
                    <Text style={styles.shareAchievementTitle}>
                      {result.title}
                    </Text>
                    {result.percentile && result.percentile <= 4 && (
                      <View style={styles.sharePercentileBadge}>
                        <Text style={styles.sharePercentileText}>
                          {t("content.reclam.topPrefix")} {result.percentile}%
                        </Text>
                      </View>
                    )}
                    <View style={styles.shareStarsRow}>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Text key={index} style={styles.shareStarIcon}>
                          {index < result.rating ? "⭐" : "☆"}
                        </Text>
                      ))}
                    </View>
                  </LinearGradient>
                </View>

                {/* Rewards summary */}
                <View style={styles.shareRewardsSummary}>
                  <Text style={styles.shareRewardsSummaryTitle}>
                    {t("content.reclam.receivedRewards")}
                  </Text>
                  <View style={styles.shareRewardsGrid}>
                    {rewards.map((reward, index) => (
                      <View key={index} style={styles.shareRewardItem}>
                        <Text style={styles.shareRewardEmoji}>
                          {reward.emoji}
                        </Text>
                        <Text style={styles.shareRewardAmount}>
                          {reward.amount}
                          {reward.type === "boost" || reward.type === "activity"
                            ? "x"
                            : ""}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Share buttons */}
                <View style={styles.shareButtonsSection}>
                  <Pressable style={styles.shareButton}>
                    <LinearGradient
                      colors={["#25D366", "#128C7E"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.shareButtonGradient}
                    >
                      <Text style={styles.shareButtonEmoji}>💬</Text>
                      <Text style={styles.shareButtonText}>
                        {t("content.reclam.shareApps.whatsapp")}
                      </Text>
                    </LinearGradient>
                  </Pressable>

                  <Pressable style={styles.shareButton}>
                    <LinearGradient
                      colors={["#0088cc", "#0066aa"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.shareButtonGradient}
                    >
                      <Text style={styles.shareButtonEmoji}>✈️</Text>
                      <Text style={styles.shareButtonText}>
                        {t("content.reclam.shareApps.telegram")}
                      </Text>
                    </LinearGradient>
                  </Pressable>

                  <Pressable style={styles.shareButton}>
                    <LinearGradient
                      colors={["#1DA1F2", "#0d8bd9"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.shareButtonGradient}
                    >
                      <Text style={styles.shareButtonEmoji}>🐦</Text>
                      <Text style={styles.shareButtonText}>
                        {t("content.reclam.shareApps.twitter")}
                      </Text>
                    </LinearGradient>
                  </Pressable>

                  <Pressable style={styles.shareButton}>
                    <LinearGradient
                      colors={["#4267B2", "#365899"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.shareButtonGradient}
                    >
                      <Text style={styles.shareButtonEmoji}>📘</Text>
                      <Text style={styles.shareButtonText}>
                        {t("content.reclam.shareApps.facebook")}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </View>

                {/* Copy link button */}
                <Pressable style={styles.shareCopyButton}>
                  <Text style={styles.shareCopyButtonText}>
                    {t("content.reclam.copyLink")}
                  </Text>
                </Pressable>
              </ScrollView>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A14",
  },

  blob: {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: 200,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Конфетти
  confetti: {
    position: "absolute",
    zIndex: 100,
  },

  // Главная карточка
  mainCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderRadius: 32,
    padding: 24,
    marginTop: 20,
    overflow: "hidden",
  },

  // Секция результата
  scoreSection: {
    alignItems: "center",
    marginBottom: 24,
  },

  scoreCircle: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  scoreGlow: {
    width: 160,
    height: 160,
    borderRadius: 80,
    shadowColor: "#4D96FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },

  scoreGradient: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  scoreNumber: {
    color: "#fff",
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: -2,
  },

  scoreMax: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 20,
  },

  percentageLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "600",
  },

  percentileBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },

  percentileText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // Рейтинг
  ratingSection: {
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },

  ratingLabel: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 12,
    letterSpacing: 0.3,
  },

  starsRow: {
    flexDirection: "row",
    gap: 8,
  },

  star: {
    fontSize: 36,
  },

  // Сообщение
  messageSection: {
    alignItems: "center",
  },

  resultTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 8,
    letterSpacing: -0.5,
  },

  resultMessage: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  // Карточка наград
  prizesCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
    marginTop: 16,
  },

  prizesTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 16,
    textAlign: "center",
  },

  // Reward Cards
  rewardCard: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  rewardCardSelected: {
    shadowColor: "#4D96FF",
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },

  rewardCardClaimed: {
    opacity: 0.5,
  },

  rewardGradient: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
  },

  // Radio Button
  radioButton: {
    marginRight: 4,
  },

  radioButtonOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },

  radioButtonOuterSelected: {
    borderColor: "#4D96FF",
    borderWidth: 2,
  },

  radioButtonOuterClaimed: {
    borderColor: "#6BCB77",
    backgroundColor: "#6BCB77",
  },

  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4D96FF",
  },

  radioButtonCheck: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },

  rewardIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  rewardIconGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  rewardIconEmoji: {
    fontSize: 32,
  },

  rewardContent: {
    flex: 1,
  },

  rewardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
    letterSpacing: 0.2,
  },

  rewardDescription: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginBottom: 6,
    lineHeight: 16,
  },

  rewardAmount: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },

  rewardAmountValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },

  rewardAmountLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
  },

  // Central Claim Button
  claimButtonSection: {
    marginTop: 20,
    paddingHorizontal: 0,
  },

  centralClaimButton: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#4D96FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },

  centralClaimButtonDisabled: {
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  centralClaimButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  centralClaimButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  // Share Modal
  shareModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  shareModalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },

  shareModalGradient: {
    backgroundColor: "rgba(10,10,20,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },

  shareScrollContent: {
    padding: 24,
    paddingTop: 56,
  },

  shareCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  shareCloseText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  shareHeader: {
    alignItems: "center",
    marginBottom: 20,
  },

  shareTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 8,
    letterSpacing: -0.5,
  },

  shareSubtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    textAlign: "center",
  },

  shareAchievementCard: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  shareAchievementGradient: {
    padding: 24,
    alignItems: "center",
  },

  shareAchievementEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },

  shareAchievementTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
    letterSpacing: -0.3,
  },

  sharePercentileBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },

  sharePercentileText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },

  shareStarsRow: {
    flexDirection: "row",
    gap: 6,
  },

  shareStarIcon: {
    fontSize: 24,
  },

  shareRewardsSummary: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },

  shareRewardsSummaryTitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },

  shareRewardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },

  shareRewardItem: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 12,
    minWidth: 70,
    alignItems: "center",
  },

  shareRewardEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },

  shareRewardAmount: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },

  shareButtonsSection: {
    gap: 10,
    marginBottom: 12,
  },

  shareButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  shareButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
  },

  shareButtonEmoji: {
    fontSize: 20,
  },

  shareButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  shareCopyButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },

  shareCopyButtonText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "700",
  },
});
