import { Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SafeAreaWrapper({
  header,
  children,
  footer,
  scrollable = true,
}: {
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  scrollable?: boolean;
}) {
  const inserts = useSafeAreaInsets();
  const padding = Platform.select({
    ios: { paddingTop: inserts.top, paddingBottom: footer ? 0 : inserts.bottom },
    android: {
      paddingTop: inserts.top + 15,
      paddingBottom: footer ? 0 : inserts.bottom + 10,
    },
  });

  return (
    <View style={{ ...padding, flex: 1 }}>
      {header}
      {scrollable ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 10 }}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
      {footer && (
        <View style={{ paddingBottom: inserts.bottom + 12 }}>{footer}</View>
      )}
    </View>
  );
}
