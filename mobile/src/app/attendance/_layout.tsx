import { Stack } from 'expo-router';

export default function AttendanceLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Attendance' }} />
      <Stack.Screen name="history" options={{ title: 'Attendance History' }} />
    </Stack>
  );
}
