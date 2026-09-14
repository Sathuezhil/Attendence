import { Stack } from 'expo-router';

export default function InvoicesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Invoices' }} />
      <Stack.Screen name="new" options={{ title: 'Create Invoice' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Invoice Details' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Edit Invoice' }} />
    </Stack>
  );
}
