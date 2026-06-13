import { MaterialIcons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React, { useCallback, useRef } from 'react';
import {
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

type AppColors = (typeof Colors)[keyof typeof Colors];

const SPRING = { damping: 20, stiffness: 200, mass: 0.6 };

const TAB_INFO: Record<
  string,
  { label: string; icon: keyof typeof MaterialIcons.glyphMap }
> = {
  index: { label: 'Home', icon: 'home' },
  exam: { label: 'Tasks', icon: 'psychology' },
  games: { label: 'Games', icon: 'sports-esports' },
  profile: { label: 'Profile', icon: 'manage-accounts' },
};

function TabItem({
  route,
  index,
  activeIndex,
  colors,
  onPress,
  onLayout,
}: {
  route: { key: string; name: string };
  index: number;
  activeIndex: number;
  colors: AppColors;
  onPress: () => void;
  onLayout: (e: LayoutChangeEvent, idx: number) => void;
}) {
  const active = activeIndex === index;
  const iconScale = useSharedValue(active ? 1.1 : 1);
  const labelOpacity = useSharedValue(active ? 1 : 0.45);

  React.useEffect(() => {
    iconScale.value = withSpring(active ? 1.15 : 1, SPRING);
    labelOpacity.value = withSpring(active ? 1 : 0.45, SPRING);
  }, [active]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
  }));

  const info = TAB_INFO[route.name];
  if (!info) return null;

  const color = active ? colors.text : colors.textSecondary;

  return (
    <TouchableOpacity
      key={route.key}
      onPress={onPress}
      activeOpacity={0.7}
      onLayout={e => onLayout(e, index)}
      style={styles.tabItem}
    >
      <Animated.View style={iconStyle}>
        <MaterialIcons name={info.icon} size={22} color={color} />
      </Animated.View>
      <Animated.Text style={[styles.tabLabel, { color }, labelStyle]}>
        {info.label}
      </Animated.Text>
    </TouchableOpacity>
  );
}

function AndroidTabBar({
  colors,
  state,
  navigation,
}: BottomTabBarProps & { colors: AppColors }) {
  const insets = useSafeAreaInsets();
  const tabLayouts = useRef<{ x: number; width: number }[]>([]);

  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);

  const handleLayout = useCallback(
    (e: LayoutChangeEvent, idx: number) => {
      const { x, width } = e.nativeEvent.layout;
      tabLayouts.current[idx] = { x, width };
      if (idx === state.index) {
        indicatorX.value = x;
        indicatorW.value = width;
      }
    },
    [state.index]
  );

  React.useEffect(() => {
    const layout = tabLayouts.current[state.index];
    if (layout) {
      indicatorX.value = withSpring(layout.x, SPRING);
      indicatorW.value = withSpring(layout.width, SPRING);
    }
  }, [state.index]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
  }));

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.pill}>
        {/* Blur layers */}
        <View style={styles.blurLayer1} pointerEvents="none" />
        <View style={styles.blurLayer2} pointerEvents="none" />

        {/* Sliding indicator */}
        <Animated.View
          style={[styles.indicator, indicatorStyle]}
          pointerEvents="none"
        />

        {state.routes.map((route, index) => (
          <TabItem
            key={route.key}
            route={route}
            index={index}
            activeIndex={state.index}
            colors={colors}
            onPress={() => navigation.navigate(route.name)}
            onLayout={handleLayout}
          />
        ))}
      </View>
    </View>
  );
}

function AndroidTabs({ colors }: { colors: AppColors }) {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={props => <AndroidTabBar {...props} colors={colors} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="exam" />
      <Tabs.Screen name="games" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

function IOSTabs({ colors }: { colors: AppColors }) {
  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house" md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="exam">
        <NativeTabs.Trigger.Label>Tests</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="brain" md="neurology" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="games">
        <NativeTabs.Trigger.Label>Games</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gamecontroller" md="sports_esports" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person" md="settings_account_box" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  pill: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 6,
    gap: 0,
    backgroundColor: 'rgba(10,10,20,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
  },
  blurLayer1: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 999,
  },
  blurLayer2: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,20,0.35)',
    borderRadius: 999,
  },
  indicator: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 3,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 999,
    minWidth: 72,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors =
    Colors[scheme === 'unspecified' ? 'light' : (scheme ?? 'light')];

  if (Platform.OS === 'android') {
    return <AndroidTabs colors={colors} />;
  }

  return <IOSTabs colors={colors} />;
}
