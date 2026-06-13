import { Platform, StyleSheet, Text, type TextProps } from "react-native";

import { Fonts, ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ThemedTextProps = TextProps & {
  type?:
    | "default"
    | "title"
    | "small"
    | "smallBold"
    | "subtitle"
    | "link"
    | "linkPrimary"
    | "code"
    | "small-thin";
  themeColor?: ThemeColor;
};

export function ThemedText({
  style,
  type = "default",
  themeColor,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? "text"] },
        type === "default" && styles.default,
        type === "title" && styles.title,
        type === "small" && styles.small,
        type === "smallBold" && styles.smallBold,
        type === "subtitle" && styles.subtitle,
        type === "link" && styles.link,
        type === "linkPrimary" && styles.linkPrimary,
        type === "code" && styles.code,
        type === "small-thin" && styles.thin,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 15,
    lineHeight: 16,
    fontWeight: 500,
    fontFamily: Fonts.mono,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 900,
    fontFamily: Fonts.serif,
  },
  default: {
    fontSize: 14,
    fontFamily: Fonts.rounded,
    lineHeight: 16,
    fontWeight: 600,
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: 500,
    fontFamily: Fonts.mono,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: "#3c87f7",
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 13,
  },
  thin: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 10,
  },
});
