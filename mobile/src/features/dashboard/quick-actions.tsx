import { type Href, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';
import { AppIcon, type AppIconName } from '@/ui/icon';

const ACTIONS: Array<{
  id: string;
  label: string;
  href: string;
  icon: AppIconName;
}> = [
  { id: 'employees', label: 'Employees', href: '/employees', icon: 'people-outline' },
  { id: 'attendance', label: 'Attendance', href: '/attendance', icon: 'calendar-outline' },
  { id: 'leave', label: 'Leave', href: '/leave', icon: 'airplane-outline' },
  { id: 'documents', label: 'Documents', href: '/documents', icon: 'document-text-outline' },
  { id: 'payroll', label: 'Payroll', href: '/payroll', icon: 'cash-outline' },
  { id: 'invoices', label: 'Invoices', href: '/invoices', icon: 'receipt-outline' },
  { id: 'reports', label: 'Reports', href: '/reports', icon: 'bar-chart-outline' },
  { id: 'settings', label: 'Settings', href: '/settings', icon: 'settings-outline' },
];

export function QuickActions() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.bar}
    >
      {ACTIONS.map((action) => (
        <Pressable
          key={action.id}
          accessibilityRole="button"
          onPress={() => router.push(action.href as Href)}
          style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}
        >
          <View style={styles.iconWrap}>
            <AppIcon name={action.icon} size={16} color={colors.white} />
          </View>
          <Text style={styles.label}>{action.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 18,
  },
  item: {
    minHeight: 40,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(31, 182, 166, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.84,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  label: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
