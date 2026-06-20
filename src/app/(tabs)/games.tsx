import Wrapper from "@/components/shared/wrapper";
import {
  getLocalizedGameSubtitle,
  getLocalizedGameTitle,
} from "@/halpers/localization";
import { openAdScreen } from "@/halpers/open-ad-screen";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { games as localGames, type Game } from "@/constants/games";
import { GamesModule } from "@/services/modules/games-module";
import { useTranslation } from "react-i18next";
import type { RemoteGame } from "@/types/games";

const CARD_GAP = 10;

export default function GamesScreen() {
  const { t, i18n } = useTranslation();
  const titleFade = useRef(new Animated.Value(0)).current;
  const [remoteGames, setRemoteGames] = useState<RemoteGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const adSheetRef = useRef<BottomSheet>(null);
  const [pendingGame, setPendingGame] = useState<Game | null>(null);

  const fetchGames = useCallback(async () => {
    try {
      const data = await GamesModule.getGames();
      setRemoteGames(Array.isArray(data) ? data : data.games || []);
    } catch (e) {
      console.error("Failed to fetch games:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    Animated.timing(titleFade, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchGames();
    }, [fetchGames]),
  );

  const handleGamePress = (game: Game) => {
    if (game.withReclam && !game.reclamSeen) {
      setPendingGame(game);
      adSheetRef.current?.expand();
    } else {
      router.navigate({
        pathname: game.route as any,
        params: { gameId: String(game.id) },
      });
    }
  };

  const handleWatchAd = () => {
    adSheetRef.current?.close();
    if (!pendingGame) return;
    openAdScreen({
      gameId: pendingGame.id,
      targetPath: String(pendingGame.route),
    });
  };

  const renderAdSheetBackdrop = useCallback(
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

  const mappedGames = useMemo(() => {
    if (remoteGames.length === 0 && !isLoading) {
      return localGames.map((g) => ({
        ...g,
        tag: t(`tabs.games.tags.${g.tagKey}`, { defaultValue: g.tag }),
      }));
    }
    if (isLoading) return [];

    return remoteGames
      .filter((rg) => rg.isVisible !== false)
      .map((rg) => {
        const local = localGames.find((lg) => lg.id === rg.id);

        return {
          id: rg.id,
          title: getLocalizedGameTitle(rg, i18n.language) || local?.title || "",
          subtitle: getLocalizedGameSubtitle(rg, i18n.language) || local?.subtitle || "",
          icon: local?.icon,
          from: local?.from || "#4D96FF",
          to: local?.to || "#C77DFF",
          route: local?.route || "/games/barain-traing",
          tag: local?.tagKey
            ? t(`tabs.games.tags.${local.tagKey}`, { defaultValue: local.tag })
            : t(`tabs.games.tags.${String(rg.type || "").toLowerCase()}`, {
                defaultValue: String(rg.type || ""),
              }),
          withReclam: rg.withReclam,
          reclamSeen: rg.reclamSeen,
        } as Game;
      });
  }, [remoteGames, isLoading, i18n.language, t]);

  const rows: Game[][] = [];
  for (let i = 0; i < mappedGames.length; i += 2) {
    rows.push(mappedGames.slice(i, i + 2));
  }

  return (
    <Wrapper>
      <View style={styles.grid}>
        {isLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#FF6B35" />
          </View>
        ) : (
          rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((game) => (
                <TouchableOpacity
                  key={game.id}
                  activeOpacity={0.8}
                  onPress={() => handleGamePress(game)}
                  style={styles.card}
                >
                  <LinearGradient
                    colors={[`${game.from}20`, `${game.to}12`]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <View
                    style={[
                      styles.cardBorder,
                      { borderColor: `${game.from}30` },
                    ]}
                  />

                  {/* Background icon */}
                  <View style={styles.bgIconWrap}>
                    <Image
                      source={game.icon}
                      style={styles.bgIcon}
                      contentFit="contain"
                    />
                  </View>

                  {/* Content */}
                  <View style={styles.cardContent}>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {game.title}
                      </Text>
                      <Text style={styles.cardSub} numberOfLines={1}>
                        {game.subtitle}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 6,
                        alignItems: "center",
                      }}
                    >
                      <View
                        style={[
                          styles.cardTag,
                          { borderColor: `${game.from}40` },
                        ]}
                      >
                        <Text
                          style={[styles.cardTagText, { color: game.from }]}
                        >
                          {game.tag}
                        </Text>
                      </View>
                      {game.withReclam && !game.reclamSeen && (
                        <View style={styles.fireBadge}>
                          <Text style={styles.fireBadgeText}>+1 🔥</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              {row.length === 1 && <View style={styles.card} />}
            </View>
          ))
        )}
      </View>
      <View style={{ height: 90 }} />
      <BottomSheet
        ref={adSheetRef}
        index={-1}
        snapPoints={["35%"]}
        enablePanDownToClose
        backdropComponent={renderAdSheetBackdrop}
        backgroundStyle={styles.adSheetBg}
        handleIndicatorStyle={styles.adSheetHandle}
      >
        <BottomSheetView style={styles.adSheetContent}>
          <Text style={styles.adSheetTitle}>{t("tabs.games.accessTitle")}</Text>
          <Text style={styles.adSheetMessage}>{t("tabs.games.accessMessage")}</Text>
          <TouchableOpacity
            style={styles.adSheetPrimaryBtn}
            onPress={handleWatchAd}
            activeOpacity={0.85}
          >
            <Text style={styles.adSheetPrimaryBtnText}>{t("tabs.games.watchAd")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.adSheetCancelBtn}
            onPress={() => adSheetRef.current?.close()}
            activeOpacity={0.7}
          >
            <Text style={styles.adSheetCancelBtnText}>{t("tabs.games.cancel")}</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  adSheetBg: {
    backgroundColor: "#13131F",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  adSheetHandle: {
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 40,
  },
  adSheetContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 12,
  },
  adSheetTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  adSheetMessage: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  adSheetPrimaryBtn: {
    backgroundColor: "#FF6B35",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  adSheetPrimaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  adSheetCancelBtn: {
    paddingVertical: 14,
    alignItems: "center",
  },
  adSheetCancelBtnText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 14,
    fontWeight: "700",
  },
  loaderWrap: {
    paddingVertical: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  headerWrap: {
    paddingBottom: 12,
    paddingHorizontal: 10,
    gap: 12,
  },
  statsBanner: {
    borderRadius: 16,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statsBannerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.2)",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statEmoji: { fontSize: 18 },
  statValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  statLabel: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 10,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.07)",
  },

  // Grid
  grid: {
    gap: CARD_GAP,
  },
  row: {
    flexDirection: "row",
    gap: CARD_GAP,
  },

  // Card
  card: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
    height: 100,
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1,
    zIndex: 2,
  },

  // Background icon — o'ng tomonda katta, yarim shaffof
  bgIconWrap: {
    position: "absolute",
    right: -10,
    top: -10,
    bottom: -10,
    width: 110,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.4,
  },
  bgIcon: {
    width: 90,
    height: 90,
  },

  // Content — chap tomonda text
  cardContent: {
    flex: 1,
    justifyContent: "space-between",
    padding: 12,
    zIndex: 3,
  },
  cardInfo: {
    gap: 2,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  cardSub: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    lineHeight: 15,
  },
  cardTag: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cardTagText: {
    fontSize: 9,
    fontWeight: "700",
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
});
