import { type Href, router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRequireAuth } from '@/features/auth/use-require-auth';

const CATEGORIES = [
  { id: 'employees', title: 'Employees', detail: 'Headcount and status' },
  { id: 'attendance', title: 'Attendance', detail: 'Presence, hours and lateness' },
  { id: 'leave', title: 'Leave', detail: 'Requests and days by type' },
  { id: 'payroll', title: 'Payroll', detail: 'Gross, net and payment status' },
  { id: 'invoices', title: 'Invoices', detail: 'Billed, paid and outstanding' },
  { id: 'documents', title: 'Documents', detail: 'Valid, expiring and expired' },
] as const;

export default function ReportsHomeScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();

  if (!isReady || !isAuthenticated) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {CATEGORIES.map((category) => (
        <Pressable
          key={category.id}
          accessibilityRole="button"
          onPress={() => router.push(`/reports/${category.id}` as Href)}
          style={styles.card}
        >
          <Text style={styles.title}>{category.title}</Text>
          <Text style={styles.detail}>{category.detail}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f4f6f8',
    padding: 16,
    gap: 10,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  detail: {
    color: '#6b7280',
  },
});
