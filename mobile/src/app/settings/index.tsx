import { type Href, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { colors, radius, space, touch } from '@/theme';
import { LoadingState } from '@/ui/screen-state';

const SECTIONS = [
  { id: 'company', title: 'Company', detail: 'Name, address, contact, VAT' },
  { id: 'hours', title: 'Working hours', detail: 'Start, end, late threshold, working days' },
  { id: 'leave', title: 'Leave', detail: 'Leave types and annual limits' },
  { id: 'payroll', title: 'Payroll', detail: 'Working days per month and overtime' },
  { id: 'notifications', title: 'Notifications', detail: 'Enable or disable alert channels' },
  { id: 'documents', title: 'Documents', detail: 'Expiry warning and urgent windows' },
] as const;

export default function SettingsIndexScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();

  if (!isReady || !isAuthenticated) {
    return <LoadingState />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Boss/Admin settings apply to attendance, leave, payroll, document expiry, and notifications.
      </Text>
      {SECTIONS.map((section) => (
        <Pressable
          key={section.id}
          onPress={() => router.push(`/settings/${section.id}` as Href)}
          style={styles.card}
        >
          <Text style={styles.title}>{section.title}</Text>
          <Text style={styles.detail}>{section.detail}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space.lg,
    gap: space.md,
    backgroundColor: colors.background,
    paddingBottom: 40,
  },
  intro: {
    color: colors.mutedStrong,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    minHeight: touch.minHeight,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  detail: {
    color: colors.muted,
    fontSize: 13,
  },
});
