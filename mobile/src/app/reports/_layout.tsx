import { Stack } from 'expo-router';

export default function ReportsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Reports' }} />
      <Stack.Screen name="employees" options={{ title: 'Employee Report' }} />
      <Stack.Screen name="attendance" options={{ title: 'Attendance Report' }} />
      <Stack.Screen name="leave" options={{ title: 'Leave Report' }} />
      <Stack.Screen name="payroll" options={{ title: 'Payroll Report' }} />
      <Stack.Screen name="invoices" options={{ title: 'Invoice Report' }} />
      <Stack.Screen name="documents" options={{ title: 'Document Expiry Report' }} />
    </Stack>
  );
}
