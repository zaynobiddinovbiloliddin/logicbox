import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="profile/my-tests" />
      <Stack.Screen name="profile/edit-profile" />
      <Stack.Screen name="profile/language" />
      <Stack.Screen name="content/weekly" />
      <Stack.Screen name="content/task" />
      <Stack.Screen name="content/monthly" />
      <Stack.Screen name="content/index" />
      <Stack.Screen name="content/notification" />
      <Stack.Screen name="games/find-letter" />
      <Stack.Screen name="games/one-second" />
      <Stack.Screen name="games/geography-training" />

      <Stack.Screen
        name="content/battle"
        options={{
          headerShown: true,
          title: "Battle",
          headerTransparent: true,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="modals/test-content"
        options={{
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="modals/reward-chest"
        options={{
          presentation: "fullScreenModal",
          animation: "fade",
        }}
      />
      <Stack.Screen
        name="modals/watch-ad"
        options={{
          presentation: "fullScreenModal",
          animation: "fade",
        }}
      />
    </Stack>
  );
}
