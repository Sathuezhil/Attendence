import { StyleSheet, Text, View } from 'react-native';
import { DashboardSummary } from './types';

interface SummaryCard {
  key: keyof DashboardSummary | 'employees';
  label: string;
  value: number;
  icon: string;
  tint: string;
  ink: string;
  wide?: boolean;
}

export function SummaryCards({ summary }: { summary: DashboardSummary }) {
  const cards: SummaryCard[] = [
    {
      key: 'employees',
      label: 'Total Employees',
      value: summary.employees,
      icon: 'EM',
      tint: '#eef2ff',
      ink: '#312e81',
      wide: true,
    },
    {
      key: 'presentToday',
      label: 'Present Today',
      value: summary.presentToday,
      icon: 'PR',
      tint: '#dcfce7',
      ink: '#166534',
    },
    {
      key: 'absentToday',
      label: 'Absent Today',
      value: summary.absentToday,
      icon: 'AB',
      tint: '#fee2e2',
      ink: '#991b1b',
    },
    {
      key: 'lateToday',
      label: 'Late Today',
      value: summary.lateToday,
      icon: 'LT',
      tint: '#fef3c7',
      ink: '#92400e',
    },
    {
      key: 'onLeaveToday',
      label: 'On Leave Today',
      value: summary.onLeaveToday,
      icon: 'LV',
      tint: '#dbeafe',
      ink: '#1e40af',
    },
    {
      key: 'documentsExpired',
      label: 'Documents Expired',
      value: summary.documentsExpired,
      icon: 'DX',
      tint: '#fee2e2',
      ink: '#991b1b',
    },
    {
      key: 'documentsExpiringSoon',
      label: 'Documents Expiring Soon',
      value: summary.documentsExpiringSoon,
      icon: 'DS',
      tint: '#fef3c7',
      ink: '#92400e',
    },
  ];

  return (
    <View style={styles.grid}>
      {cards.map((card) => (
        <View key={card.key} style={[styles.card, card.wide ? styles.wideCard : styles.halfCard]}>
          <View style={[styles.icon, { backgroundColor: card.tint }]}>
            <Text style={[styles.iconText, { color: card.ink }]}>{card.icon}</Text>
          </View>
          <Text style={styles.label}>{card.label}</Text>
          <Text style={styles.value}>{card.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  wideCard: {
    width: '100%',
  },
  halfCard: {
    width: '47.5%',
    flexGrow: 1,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 12,
    fontWeight: '800',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
});
