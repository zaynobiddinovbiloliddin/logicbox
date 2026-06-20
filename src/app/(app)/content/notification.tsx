import Wrapper from "@/components/shared/wrapper";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import BottomSheet from "@gorhom/bottom-sheet";
import NewsDetailsSheet, {
  NewsItem,
} from "@/components/sheets/news-details-sheet";
import { UsersModule } from "@/services/modules/users-module";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";

const { width } = Dimensions.get("window");

function formatTime(
  dateString: string,
  dict: {
    justNow: string;
    minuteAgo: string;
    hourAgo: string;
    dayAgo: string;
  },
) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return dict.justNow;
    if (minutes < 60) return `${minutes} ${dict.minuteAgo}`;
    if (hours < 24) return `${hours} ${dict.hourAgo}`;
    if (days < 7) return `${days} ${dict.dayAgo}`;

    return date.toLocaleDateString();
  } catch (e) {
    return "";
  }
}

// ─────────────────────────────────────────────
// News Card
// ─────────────────────────────────────────────
function NewsCard({
  item,
  onPressDetails,
}: {
  item: any;
  onPressDetails: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={newsStyles.card}>
      <LinearGradient
        colors={item.accent || ["rgba(77,150,255,0.15)", "rgba(199,125,255,0.08)"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          newsStyles.cardBorder,
          { borderColor: item.borderColor || "rgba(77,150,255,0.2)" },
        ]}
      />

      <View style={newsStyles.cardTop}>
        <View
          style={[
            newsStyles.iconWrap,
            { backgroundColor: `${item.borderColor || "rgba(77,150,255,0.2)"}33` },
          ]}
        >
          <Text style={newsStyles.iconEmoji}>{item.emoji || "📰"}</Text>
        </View>
        <View style={newsStyles.cardContent}>
          <Text style={newsStyles.cardTitle}>{item.title}</Text>
          <Text style={newsStyles.cardDesc}>{item.description}</Text>
        </View>
      </View>

      <View style={newsStyles.cardFooter}>
        <Text style={newsStyles.timeText}>
          {formatTime(item.createdAt, {
            justNow: t("content.notifications.justNow"),
            minuteAgo: t("content.notifications.minuteAgo"),
            hourAgo: t("content.notifications.hourAgo"),
            dayAgo: t("content.notifications.dayAgo"),
          })}
        </Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onPressDetails}
          style={[newsStyles.readMoreBtn, { borderColor: item.borderColor || "rgba(77,150,255,0.2)" }]}
        >
          <Text style={[newsStyles.readMoreText, { color: item.textColor || "#4D96FF" }]}>
            {t("content.notifications.details")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const newsStyles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 18,
    overflow: "hidden",
    gap: 14,
  },
  cardBorder: {
    borderRadius: 22,
    borderWidth: 1,
  },
  cardTop: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  iconEmoji: {
    fontSize: 22,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  cardDesc: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12.5,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeText: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 11,
    fontWeight: "600",
  },
  readMoreBtn: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  readMoreText: {
    fontSize: 11,
    fontWeight: "700",
  },
});

// ─────────────────────────────────────────────
// Notification Card
// ─────────────────────────────────────────────
function NotificationCard({
  item,
  onPress,
}: {
  item: any;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      style={[notifStyles.card, !item.isRead && notifStyles.cardUnread]}
    >
      {!item.isRead && (
        <LinearGradient
          colors={["rgba(77,150,255,0.06)", "rgba(199,125,255,0.03)"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}
      <View
        style={[
          StyleSheet.absoluteFill,
          notifStyles.cardBorder,
          !item.isRead && { borderColor: "rgba(77,150,255,0.15)" },
        ]}
      />

      <View style={notifStyles.row}>
        <View style={notifStyles.iconWrap}>
          <Text style={notifStyles.iconEmoji}>🔔</Text>
          {!item.isRead && <View style={notifStyles.unreadDot} />}
        </View>

        <View style={notifStyles.content}>
          <Text style={[notifStyles.title, !item.isRead && { color: "#fff" }]}>
            {item.title}
          </Text>
          <Text style={notifStyles.desc}>{item.description}</Text>
          <Text style={notifStyles.time}>
            {formatTime(item.createdAt, {
              justNow: t("content.notifications.justNow"),
              minuteAgo: t("content.notifications.minuteAgo"),
              hourAgo: t("content.notifications.hourAgo"),
              dayAgo: t("content.notifications.dayAgo"),
            })}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const notifStyles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  cardUnread: {
    backgroundColor: "transparent",
  },
  cardBorder: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconEmoji: {
    fontSize: 20,
  },
  unreadDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4D96FF",
    borderWidth: 2,
    borderColor: "#0A0A14",
  },
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  desc: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    lineHeight: 17,
  },
  time: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
});

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────
export default function NotificationScreen() {
  const { t } = useTranslation();
  const titleFade = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState<"news" | "notifications">("news");
  const tabIndicator = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const sheetRef = useRef<BottomSheet>(null);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const tabs = [
    { id: "news", label: t("content.notifications.tabs.news"), emoji: "📰" },
    {
      id: "notifications",
      label: t("content.notifications.tabs.my"),
      emoji: "🔔",
    },
  ] as const;

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const [notifs, countData] = await Promise.all([
        UsersModule.getNotifications(),
        UsersModule.getUnreadNotificationsCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(countData.count);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    Animated.timing(titleFade, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fetchNotifications]);

  const handleRead = async (id: number | string) => {
    try {
      await UsersModule.readNotification(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error("Failed to read notification:", e);
    }
  };

  const handleReadAll = async () => {
    try {
      await UsersModule.readAllNotifications();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error("Failed to read all notifications:", e);
    }
  };

  const handleOpenDetails = (item: NewsItem) => {
    setSelectedNews(item);
    sheetRef.current?.expand();
  };

  const handleCloseDetails = () => {
    sheetRef.current?.close();
  };

  function handleTabPress(tab: "news" | "notifications", index: number) {
    if (activeTab === tab) return;

    setActiveTab(tab);
    contentOpacity.setValue(0);

    Animated.parallel([
      Animated.spring(tabIndicator, {
        toValue: index,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }

  const tabWidth = (width - 32 - 8) / 2;

  const indicatorTranslateX = tabIndicator.interpolate({
    inputRange: [0, 1],
    outputRange: [0, tabWidth + 8],
  });

  return (
    <>
      <Wrapper
        header={
          <View style={styles.headerWrap}>
            <View style={styles.topHeader}>
              <Animated.View style={{ opacity: titleFade }}>
                <Pressable onPress={() => router.back()} style={styles.backRow}>
                  <View style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={20} color="#fff" />
                  </View>
                  <Text style={styles.backText}>{t("content.notifications.back")}</Text>
                </Pressable>
              </Animated.View>

              {activeTab === "notifications" && unreadCount > 0 && (
                <TouchableOpacity onPress={handleReadAll}>
                  <Text style={styles.readAllText}>{t("content.notifications.readAll")}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Top Tabs */}
            <Animated.View
              style={[styles.tabsContainer, { opacity: titleFade }]}
            >
              <Animated.View
                style={[
                  styles.tabIndicator,
                  {
                    width: tabWidth,
                    transform: [{ translateX: indicatorTranslateX }],
                  },
                ]}
              >
                <LinearGradient
                  colors={["rgba(77,150,255,0.18)", "rgba(199,125,255,0.18)"]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              </Animated.View>

              {tabs.map((tab, index) => {
                const isActive = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.tab, { width: tabWidth }]}
                    onPress={() =>
                      handleTabPress(tab.id as "news" | "notifications", index)
                    }
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.tabEmoji}>{tab.emoji}</Text>
                    <Text
                      style={[
                        styles.tabLabel,
                        isActive && styles.tabLabelActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                    {tab.id === "notifications" && unreadCount > 0 && (
                      <View
                        style={[
                          styles.tabBadge,
                          isActive && styles.tabBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tabBadgeText,
                            isActive && styles.tabBadgeTextActive,
                          ]}
                        >
                          {unreadCount}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </Animated.View>
          </View>
        }
      >
        <Animated.View style={[styles.container, { opacity: contentOpacity }]}>
          {loading ? (
            <ActivityIndicator
              size="large"
              color="#4D96FF"
              style={{ marginTop: 40 }}
            />
          ) : (
            <>
              {activeTab === "news" && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>📰</Text>
                      <Text style={styles.emptyTitle}>{t("content.notifications.noNews")}</Text>
                    </View>
                  )}

              {activeTab === "notifications" && (
                <>
                  {notifications.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyEmoji}>🔕</Text>
                      <Text style={styles.emptyTitle}>
                        {t("content.notifications.noNotifications")}
                      </Text>
                      <Text style={styles.emptySub}>
                        {t("content.notifications.noNotificationsDesc")}
                      </Text>
                    </View>
                  ) : (
                    notifications.map((item) => (
                      <NotificationCard
                        key={item.id}
                        item={item}
                        onPress={() => {
                          if (!item.isRead) handleRead(item.id);
                          handleOpenDetails({
                            id: item.id,
                            emoji: item.emoji || "🔔",
                            title: item.title,
                            description: item.description,
                            fullDescription: item.fullDescription || item.description,
                            time: formatTime(item.createdAt, {
                              justNow: t("content.notifications.justNow"),
                              minuteAgo: t("content.notifications.minuteAgo"),
                              hourAgo: t("content.notifications.hourAgo"),
                              dayAgo: t("content.notifications.dayAgo"),
                            }),
                            accent: item.accent || ["rgba(77,150,255,0.15)", "rgba(199,125,255,0.08)"],
                            borderColor: item.borderColor || "rgba(77,150,255,0.2)",
                            textColor: item.textColor || "#4D96FF",
                          });
                        }}
                      />
                    ))
                  )}
                </>
              )}
            </>
          )}
          <View style={{ height: 16 }} />
        </Animated.View>
        <View style={{ height: 50 }} />
      </Wrapper>
      <NewsDetailsSheet
        ref={sheetRef}
        item={selectedNews}
        onClose={handleCloseDetails}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    rowGap: 12,
  },
  headerWrap: {
    paddingBottom: 16,
    paddingHorizontal: 10,
    gap: 12,
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  readAllText: {
    color: "#4D96FF",
    fontSize: 13,
    fontWeight: "700",
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "600",
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 4,
    gap: 8,
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(77,150,255,0.3)",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingVertical: 9,
    gap: 6,
    borderRadius: 10,
    zIndex: 1,
  },
  tabEmoji: {
    fontSize: 14,
  },
  tabLabel: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    color: "#fff",
  },
  tabBadge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: "center",
  },
  tabBadgeActive: {
    backgroundColor: "rgba(77,150,255,0.3)",
  },
  tabBadgeText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "800",
  },
  tabBadgeTextActive: {
    color: "#4D96FF",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 44,
    marginBottom: 8,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  emptySub: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 32,
  },
});
