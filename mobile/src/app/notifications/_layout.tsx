import { Stack } from 'expo-router';

export default function NotificationsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Notifications' }} />
    </Stack>
  );
}
