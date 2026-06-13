import { Image, ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { View, StyleSheet, Text, Pressable } from "react-native";

interface TrainCardProps {
  icon: ImageSource;
  title: string;
  from: string;
  to: string;
  onPress: () => void;
}

export default function TrainCard({
  icon,
  title,
  from,
  to,
  onPress,
}: TrainCardProps) {
  return (
    <Pressable onPress={onPress} style={trainStyles.wrapper}>
      <View style={trainStyles.iconBox}>
        <Image source={icon} style={trainStyles.icon} />
      </View>
      <Text style={trainStyles.title} numberOfLines={1}>
        {title}
      </Text>
    </Pressable>
  );
}

const trainStyles = StyleSheet.create({
  wrapper: {
    width: 56,
    alignItems: "center",
    gap: 4,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 54,
    height: 54,
  },
  title: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "600",
    textAlign: "center",
    width: "100%",
  },
});
