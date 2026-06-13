import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

export default function TimerRing({
  percent,
  color,
  size = 56,
}: {
  percent: number;
  color: string;
  size?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: percent,
      duration: 1200,
      delay: 300,
      useNativeDriver: false,
    }).start();
  }, []);
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color + "22",
          borderWidth: 3,
          borderColor: color + "44",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: size - 14,
            height: size - 14,
            borderRadius: (size - 14) / 2,
            backgroundColor: color + "22",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Animated.Text style={{ color, fontSize: 11, fontWeight: "800" }}>
            {percent}%
          </Animated.Text>
        </View>
      </View>
    </View>
  );
}
