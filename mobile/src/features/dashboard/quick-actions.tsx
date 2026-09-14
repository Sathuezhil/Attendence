import { type Href, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const ACTIONS = [
  { id: 'employees', label: 'Employees', href: '/employees' },
  { id: 'attendance', label: 'Attendance', href: '/attendance' },
  { id: 'leave', label: 'Leave', href: '/leave' },
  { id: 'documents', label: 'Documents', href: '/documents' },
  { id: 'payroll', label: 'Payroll', href: '/payroll' },
  { id: 'invoices', label: 'Invoices', href: '/invoices' },
  { id: 'reports', label: 'Reports' },
] as const;

export function QuickActions() {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Quick Actions</Text>
      <View style={styles.grid}>
        {ACTIONS.map((action) => {
          const enabled = 'href' in action;
          return (
            <Pressable
              key={action.id}
              accessibilityRole="button"
              accessibilityState={{ disabled: !enabled }}
              disabled={!enabled}
              onPress={() => {
                if (enabled) {
                  router.push(action.href as Href);
                }
              }}
              style={styles.card}
            >
              <Text style={styles.label}>{action.label}</Text>
              {enabled ? null : <Text style={styles.badge}>Coming Soon</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '31%',
    flexGrow: 1,
    minWidth: 96,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  badge: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '600',
    color: '#92400e',
    backgroundColor: '#fef3c7',
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
