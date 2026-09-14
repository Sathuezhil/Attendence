import { Stack } from 'expo-router';

export default function DocumentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Documents' }} />
      <Stack.Screen name="new" options={{ title: 'Upload Document' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Document' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Edit Document' }} />
    </Stack>
  );
}
