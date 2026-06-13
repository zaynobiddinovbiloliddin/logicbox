import { GlassView as ExpoGlassView } from "expo-glass-effect";
import { type ViewProps, StyleSheet } from "react-native";

export type ThemedViewProps = ViewProps;

export function GlassView({ style, ...otherProps }: ThemedViewProps) {
  return (
    <ExpoGlassView
      intensity={40}
      tint="dark"
      style={[styles.container, style]}
      {...otherProps}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
});
