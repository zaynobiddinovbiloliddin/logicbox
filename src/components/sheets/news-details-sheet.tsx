import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ForwardedRef, useCallback, forwardRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export interface NewsItem {
  id: string;
  emoji: string;
  title: string;
  description: string;
  fullDescription?: string;
  image?: any;
  time: string;
  accent: string[];
  borderColor: string;
  textColor: string;
}

interface NewsDetailsSheetProps {
  item: NewsItem | null;
  onClose: () => void;
}

const NewsDetailsSheet = forwardRef<BottomSheet, NewsDetailsSheetProps>(
  ({ item, onClose }, ref) => {
    const { top, bottom } = useSafeAreaInsets();
    const platformPadding = Platform.select({
      ios: {
        paddingBottom: bottom + 28,
      },
      android: {
        paddingBottom: bottom + 118,
      },
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

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        enableDynamicSizing
        topInset={top}
        enablePanDownToClose
        onClose={onClose}
        snapPoints={["90%"]}
        backdropComponent={renderBackdrop}
        backgroundStyle={s.sheetBg}
        handleIndicatorStyle={s.handle}
      >
        <SafeAreaView edges={["bottom"]}>
          <BottomSheetView style={[s.container, platformPadding]}>
            {item && (
              <>
                <View style={s.header}>
                  <View
                    style={[
                      s.iconWrap,
                      { backgroundColor: `${item.borderColor}33` },
                    ]}
                  >
                    <Text style={s.iconEmoji}>{item.emoji}</Text>
                  </View>
                  <View style={s.headerTextWrap}>
                    <Text style={s.title}>{item.title}</Text>
                    <Text style={s.timeText}>{item.time}</Text>
                  </View>
                </View>

                <BottomSheetScrollView
                  contentContainerStyle={s.scrollContainer}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  {item.image && (
                    <View style={s.imageContainer}>
                      <LinearGradient
                        colors={item.accent as [string, string]}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                      <View
                        style={[
                          StyleSheet.absoluteFill,
                          s.cardBorder,
                          { borderColor: item.borderColor },
                        ]}
                      />
                      <Image
                        source={item.image}
                        style={s.heroImage}
                        contentFit="contain"
                      />
                    </View>
                  )}

                  <View style={s.contentCard}>
                    <LinearGradient
                      colors={["rgba(255,255,255,0.03)", "rgba(255,255,255,0.01)"]}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                    <View
                      style={[
                        StyleSheet.absoluteFill,
                        s.cardBorder,
                        { borderColor: "rgba(255,255,255,0.08)" },
                      ]}
                    />
                    <Text style={s.sectionTitle}>Batafsil ma&apos;lumot</Text>
                    <Text style={s.description}>
                      {item.fullDescription || item.description}
                    </Text>

                    <View
                      style={[
                        s.tagWrap,
                        {
                          backgroundColor: `${item.borderColor}20`,
                          borderColor: item.borderColor,
                        },
                      ]}
                    >
                      <Text style={[s.tagText, { color: item.textColor }]}>
                        Yangilik
                      </Text>
                    </View>
                  </View>
                </BottomSheetScrollView>
              </>
            )}
          </BottomSheetView>
        </SafeAreaView>
      </BottomSheet>
    );
  },
);

export default NewsDetailsSheet;

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
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 20,
    flex: 1,
  },
  scrollContainer: {
    gap: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 8,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconEmoji: {
    fontSize: 28,
  },
  headerTextWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  timeText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    fontWeight: "600",
  },
  imageContainer: {
    width: "100%",
    height: 200,
    borderRadius: 24,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  contentCard: {
    borderRadius: 24,
    padding: 24,
    overflow: "hidden",
    gap: 16,
  },
  cardBorder: {
    borderRadius: 24,
    borderWidth: 1,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  description: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 15,
    lineHeight: 24,
  },
  tagWrap: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
