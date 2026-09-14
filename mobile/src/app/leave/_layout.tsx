import { Stack } from 'expo-router';

export default function LeaveLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Leave' }} />
      <Stack.Screen name="new" options={{ title: 'Add Leave' }} />
      <Stack.Screen name="[id]" options={{ title: 'Leave Details' }} />
    </Stack>
  );
}
