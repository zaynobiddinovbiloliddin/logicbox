import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, View, StyleSheet } from "react-native";

export default function SkillBar({
  from,
  to,
  value,
  delay,
}: {
  from: string;
  to: string;
  value: number;
  delay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value / 100,
      duration: 1200,
      delay,
      useNativeDriver: false,
    }).start();
  }, []);

  const widthInterp = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.barTrack}>
      <Animated.View style={[styles.barFill, { width: widthInterp }]}>
        <LinearGradient
          colors={[from, to]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.barDot, { backgroundColor: to }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  barTrack: {
    height: 10,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 999,
    overflow: "visible",
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
    overflow: "hidden",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  barDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: -2,
    zIndex: 1,
  },
});
