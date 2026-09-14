import { Stack } from 'expo-router';

export default function PayrollLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Payroll' }} />
      <Stack.Screen name="new" options={{ title: 'Add Payroll' }} />
      <Stack.Screen name="[id]" options={{ title: 'Payroll Details' }} />
    </Stack>
  );
}
