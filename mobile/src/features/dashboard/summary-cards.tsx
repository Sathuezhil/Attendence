import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow } from '@/theme';
import { AppIcon, type AppIconName } from '@/ui/icon';
import { DashboardSummary } from './types';

interface SummaryCard {
  key: string;
  label: string;
  value: number;
  icon: AppIconName;
  tint: string;
  ink: string;
  wide?: boolean;
  detail?: string;
}

export function SummaryCards({ summary }: { summary: DashboardSummary }) {
  const cards: SummaryCard[] = [
    {
      key: 'employees',
      label: 'Total Employees',
      value: summary.employees,
      icon: 'people',
      tint: '#e0f7f4',
      ink: '#0f766e',
      wide: true,
    },
    {
      key: 'presentToday',
      label: 'Active Today',
      value: summary.presentToday + summary.lateToday,
      icon: 'checkmark-circle',
      tint: '#dcfce7',
      ink: '#15803d',
    },
    {
      key: 'onLeaveToday',
      label: 'Leave Today',
      value: summary.absentToday + summary.onLeaveToday,
      icon: 'airplane',
      tint: '#e0f2fe',
      ink: '#0369a1',
    },
    {
      key: 'documentsExpired',
      label: 'Documents Expired',
      value: summary.documentsExpired,
      icon: 'alert-circle',
      tint: '#fee2e2',
      ink: '#be123c',
    },
    {
      key: 'documentsExpiringSoon',
      label: 'Documents Expiring Soon',
      value: summary.documentsExpiringSoon,
      icon: 'time',
      tint: '#ffedd5',
      ink: '#c2410c',
    },
    {
      key: 'pendingLeave',
      label: 'Pending Leave',
      value: summary.pendingLeave,
      icon: 'hourglass',
      tint: '#ede9fe',
      ink: '#6d28d9',
    },
    {
      key: 'outstandingInvoices',
      label: 'Outstanding Invoices',
      value: summary.outstandingInvoices,
      icon: 'receipt',
      tint: '#fef3c7',
      ink: '#b45309',
      detail: summary.outstandingInvoiceAmount.toFixed(2),
    },
  ];

  return (
    <View style={styles.grid}>
      {cards.map((card) => (
        <View
          key={card.key}
          style={[styles.card, shadow, card.wide ? styles.wideCard : styles.halfCard]}
        >
          <View style={[styles.icon, { backgroundColor: card.tint }]}>
            <AppIcon name={card.icon} size={18} color={card.ink} />
          </View>
          <Text style={styles.label}>{card.label}</Text>
          <Text style={styles.value}>{card.value}</Text>
          {card.detail ? <Text style={styles.detail}>{card.detail}</Text> : null}
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
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wideCard: {
    width: '100%',
  },
  halfCard: {
    width: '47.5%',
    flexGrow: 1,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  detail: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
});
