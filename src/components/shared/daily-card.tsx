import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useCountdown } from "@/hooks/use-cool-down"; // adjust path as needed

type Props = {
  title: string;
  accentWord?: string;
  subtitle: string;
  endDate: Date;
};

export function TaskCard({ title, accentWord, subtitle, endDate }: Props) {
  const { days, hours, minutes, seconds } = useCountdown(endDate);

  const isExpired = days === 0 && hours === 0 && minutes === 0 && seconds === 0;

  const formattedTime =
    days > 0
      ? `${days}d ${String(hours).padStart(2, "0")}h`
      : `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Highlight accentWord inside title if provided
  const renderTitle = () => {
    if (!accentWord || !title.includes(accentWord)) {
      return <Text style={styles.titleMain}>{title}</Text>;
    }
    const [before, after] = title.split(accentWord);
    return (
      <Text style={styles.titleMain}>
        {before}
        <Text style={styles.titleAccent}>{accentWord}</Text>
        {after}
      </Text>
    );
  };

  return (
    <View style={[styles.titleBlock, styles.titleBorder]}>
      <View style={styles.titleTextWrap}>
        {renderTitle()}
        <Text style={styles.titleSub}>{subtitle}</Text>
      </View>

      {isExpired ? (
        <View style={styles.timerBadge}>
          <Text style={[styles.timerText, styles.timerExpired]}>Done</Text>
        </View>
      ) : (
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>{formattedTime}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  titleBlock: {
    width: "32%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    overflow: "hidden",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 10,
  },
  titleBorder: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(77,150,255,0.2)",
  },

  titleTextWrap: {
    flex: 1,
  },
  titleMain: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  titleAccent: {
    color: "#4D96FF",
  },
  titleSub: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 11,
    marginTop: 1,
  },
  timerBadge: {
    backgroundColor: "rgba(77,150,255,0.12)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(77,150,255,0.25)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 52,
    alignSelf: "center",
  },
  timerText: {
    color: "#4D96FF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    fontVariant: ["tabular-nums"],
  },
  timerExpired: {
    color: "#FF6B6B",
  },
  timerLabel: {
    color: "rgba(77,150,255,0.5)",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.4,
    marginTop: 1,
    textTransform: "uppercase",
  },
});
