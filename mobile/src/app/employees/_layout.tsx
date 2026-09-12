import { Stack } from 'expo-router';

export default function EmployeesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Employees' }} />
      <Stack.Screen name="new" options={{ title: 'Add Employee' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Employee' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Edit Employee' }} />
    </Stack>
  );
}
