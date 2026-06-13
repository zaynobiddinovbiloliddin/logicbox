import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { getAccessToken, useAuthStore } from "@/store/auth";

export default function Index() {
  const { isAuthenticated, isLoading, fetchMe } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      fetchMe().finally(() => setChecked(true));
    } else {
      useAuthStore.setState({ isLoading: false });
      setChecked(true);
    }
  }, []);

  if (!checked || isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0A0A14",
        }}
      >
        <ActivityIndicator size="large" color="#4D96FF" />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? "/(tabs)" : "/(auth)/login"} />;
}
