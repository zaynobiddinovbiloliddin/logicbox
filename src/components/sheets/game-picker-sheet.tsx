import { games as globalGames } from "@/constants/games";
import {
  getLocalizedGameSubtitle,
  getLocalizedGameTitle,
} from "@/halpers/localization";
import { openAdScreen } from "@/halpers/open-ad-screen";
import type { RemoteGame } from "@/types/games";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ForwardedRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export type GameId = number;

export type GamePickerSheetItem = {
  game?: Partial<RemoteGame> | null;
  challengeDayGameId?: string | number;
  completed?: boolean | number;
  withReclam?: boolean;
  reclamSeen?: boolean;
  reclamSkipPrice?: number;
};

interface GamePickerSheetProps {
  ref: ForwardedRef<BottomSheetModal | null>;
  onSelect: (gameId: GameId, challengeDayGameId?: string | number) => void;
  onClose: () => void;
  games?: GamePickerSheetItem[];
  adDayId?: string | number;
  startDayBeforeAd?: boolean;
}

export default function GamePickerSheet({
  ref,
  onSelect,
  onClose,
  games = [],
  adDayId,
  startDayBeforeAd = false,
}: GamePickerSheetProps) {
  const { t, i18n } = useTranslation();
  const { top, bottom } = useSafeAreaInsets();
  const platformPadding = Platform.select({
    ios: { paddingBottom: bottom + 28 },
    android: { paddingBottom: bottom + 40 },
  });

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
        opacity={0.72}
        onPress={onClose}
      />
    ),
    [onClose],
  );

  function handleGamePress(
    gameId: number,
    challengeDayGameId: string | number | undefined,
    withReclam: boolean,
    reclamSeen: boolean,
    _reclamSkipPrice: number,
  ) {
    if (withReclam && !reclamSeen) {
      Alert.alert(
        t("tabs.games.accessTitle"),
        t("tabs.games.accessMessage"),
        [
          {
            text: t("tabs.games.watchAd"),
            onPress: () => {
              const gameMeta = globalGames.find((item) => item.id === gameId);
              if (!gameMeta) return;

              onClose();
              openAdScreen({
                gameId,
                targetPath: String(gameMeta.route),
                dayId: adDayId,
                challengeDayGameId,
                startDayBeforeOpen: startDayBeforeAd,
              });
            },
          },
          { text: t("tabs.games.cancel"), style: "cancel" },
        ],
      );
      return;
    }

    onSelect(gameId, challengeDayGameId);
  }

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing={false}
      topInset={top}
      enablePanDownToClose
      onDismiss={onClose}
      snapPoints={["95%"]}
      backdropComponent={renderBackdrop}
      backgroundStyle={s.sheetBg}
      handleIndicatorStyle={s.handle}
    >
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <LinearGradient
            colors={["rgba(77,150,255,0.15)", "rgba(199,125,255,0.1)"]}
            style={s.headerIcon}
          >
            <Text style={{ fontSize: 24 }}>🎮</Text>
          </LinearGradient>
          <View>
            <Text style={s.headerTitle}>{t("components.gamePickerSheet.title")}</Text>
            <Text style={s.headerSub}>{t("components.gamePickerSheet.subtitle")}</Text>
          </View>
        </View>

        <BottomSheetScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[s.scroolContainer, platformPadding]}
          showsVerticalScrollIndicator={false}
        >
          {(() => {
            const items: GamePickerSheetItem[] =
              games.length > 0
                ? games
                : globalGames.map((g) => ({
                    game: {
                      id: g.id,
                      title: g.title,
                      subtitle: g.subtitle,
                      type: g.tag,
                      imageUrl: "",
                    } satisfies Partial<RemoteGame>,
                  }));

            return items.map((item) => {
              const { game, completed } = item;
              if (!game?.id) return null;

              const gameId = Number(game.id);
              const isCompleted = !!completed;
              const challengeDayGameId =
                item.challengeDayGameId || game.challengeDayGameId;
              const withReclam = item.withReclam ?? game.withReclam ?? false;
              const reclamSeen = item.reclamSeen ?? game.reclamSeen ?? false;
              const reclamSkipPrice =
                item.reclamSkipPrice ?? game.reclamSkipPrice ?? 20;
              const needsReclam = withReclam && !reclamSeen;

              const gameMeta =
                globalGames.find((g) => g.id === gameId) || globalGames[0];
              const localizedTitle =
                getLocalizedGameTitle(game, i18n.language) || gameMeta.title;
              const localizedSubtitle =
                getLocalizedGameSubtitle(game, i18n.language) || gameMeta.subtitle;

              return (
                <TouchableOpacity
                  key={gameId}
                  activeOpacity={0.82}
                  onPress={() =>
                    handleGamePress(
                      gameId,
                      challengeDayGameId,
                      withReclam,
                      reclamSeen,
                      reclamSkipPrice,
                    )
                  }
                  disabled={isCompleted}
                  style={[s.card, isCompleted ? s.completedCard : null]}
                >
                <LinearGradient
                  colors={
                    isCompleted
                      ? ["rgba(34,197,94,0.12)", "rgba(34,197,94,0.05)"]
                      : [gameMeta.from + "18", gameMeta.to + "08"]
                  }
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View
                  style={[
                    s.cardBorder,
                    {
                      borderColor: isCompleted
                        ? "rgba(34,197,94,0.25)"
                        : gameMeta.from + "30",
                    },
                  ]}
                />

                <LinearGradient
                  colors={
                    isCompleted
                      ? ["rgba(34,197,94,0.4)", "rgba(34,197,94,0.2)"]
                      : [gameMeta.from + "40", gameMeta.to + "25"]
                  }
                  style={s.cardIconWrap}
                >
                  <Image
                    source={gameMeta.icon}
                    style={[s.cardIcon, isCompleted ? { opacity: 0.6 } : null]}
                    contentFit="contain"
                  />
                  {isCompleted && (
                    <View style={s.checkmarkOverlay}>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#fff"
                      />
                    </View>
                  )}
                </LinearGradient>

                <View style={s.cardBody}>
                  <View style={s.cardTitleRow}>
                    <Text
                      style={[
                        s.cardTitle,
                        isCompleted ? { color: "rgba(255,255,255,0.6)" } : null,
                      ]}
                    >
                      {localizedTitle}
                    </Text>
                    <View
                      style={[
                        s.cardTag,
                        {
                          backgroundColor: isCompleted
                            ? "rgba(34,197,94,0.15)"
                            : gameMeta.from + "22",
                          borderColor: isCompleted
                            ? "rgba(34,197,94,0.3)"
                            : gameMeta.from + "44",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.cardTagText,
                          { color: isCompleted ? "#4ade80" : gameMeta.from },
                        ]}
                      >
                        {isCompleted
                          ? t("components.gamePickerSheet.completed")
                          : gameMeta.tag}
                      </Text>
                    </View>
                    {needsReclam && (
                      <View style={s.fireBadge}>
                        <Text style={s.fireBadgeText}>+1 🔥</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.cardDesc}>
                    {isCompleted
                      ? t("components.gamePickerSheet.completedDesc")
                      : needsReclam
                        ? t("components.gamePickerSheet.reclamDesc")
                        : localizedSubtitle}
                  </Text>
                </View>

                <View
                  style={[
                    s.arrow,
                    {
                      backgroundColor: isCompleted
                        ? "rgba(34,197,94,0.15)"
                        : needsReclam
                          ? "rgba(255,107,53,0.15)"
                          : gameMeta.from + "20",
                      borderColor: isCompleted
                        ? "rgba(34,197,94,0.3)"
                        : needsReclam
                          ? "rgba(255,107,53,0.35)"
                          : gameMeta.from + "35",
                    },
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={16} color="#4ade80" />
                  ) : needsReclam ? (
                    <Text style={s.adIcon}>📺</Text>
                  ) : (
                    <Text style={[s.arrowText, { color: gameMeta.from }]}>
                      ›
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
              );
            });
          })()}
          <View style={s.hiddenView} />
        </BottomSheetScrollView>
      </View>
    </BottomSheetModal>
  );
}

const s = StyleSheet.create({
  sheetBg: {
    backgroundColor: "#0E0E1C",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  handle: {
    width: 38,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 2,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  scroolContainer: {
    gap: 12,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  headerSub: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    marginTop: 2,
  },

  // Card
  card: {
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
  },
  completedCard: {
    opacity: 0.9,
  },
  checkmarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  cardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardIcon: {
    width: 36,
    height: 36,
  },
  cardBody: {
    flex: 1,
    gap: 5,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  cardTag: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cardTagText: {
    fontSize: 10,
    fontWeight: "800",
  },
  fireBadge: {
    backgroundColor: "rgba(255,107,53,0.15)",
    borderColor: "rgba(255,107,53,0.3)",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  fireBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FF6B35",
  },
  cardDesc: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    lineHeight: 17,
  },
  arrow: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  arrowText: {
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
  },
  adIcon: {
    fontSize: 14,
  },
  hiddenView: {
    height: 200,
  },
});
