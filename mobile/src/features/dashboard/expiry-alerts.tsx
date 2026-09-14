import { type Href, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ExpiryAlert, ExpiryAlertsResponse } from '@/features/notifications/types';
import { colors, radius, shadow } from '@/theme';

export function ExpiryAlerts({ alerts }: { alerts: ExpiryAlertsResponse }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Expiry Alerts</Text>
      <Bucket
        title={`Expired documents`}
        items={alerts.expired}
        empty="No expired documents"
        tint="#fee2e2"
        ink="#991b1b"
      />
      <Bucket
        title={`Expiring within ${alerts.urgentDays} days`}
        items={alerts.expiringUrgent}
        empty="None in the urgent window"
        tint="#fef3c7"
        ink="#92400e"
      />
      <Bucket
        title={`Expiring within ${alerts.warningDays} days`}
        items={alerts.expiringSoon}
        empty="None in the warning window"
        tint="#dbeafe"
        ink="#1e40af"
      />
    </View>
  );
}

function Bucket({
  title,
  items,
  empty,
  tint,
  ink,
}: {
  title: string;
  items: ExpiryAlert[];
  empty: string;
  tint: string;
  ink: string;
}) {
  return (
    <View style={[styles.card, shadow]}>
      <View style={[styles.badge, { backgroundColor: tint }]}>
        <Text style={[styles.badgeText, { color: ink }]}>
          {title} · {items.length}
        </Text>
      </View>
      {items.length === 0 ? (
        <Text style={styles.empty}>{empty}</Text>
      ) : (
        items.map((item) => (
          <Pressable
            key={item.documentId}
            onPress={() => router.push(`/documents/${item.documentId}` as Href)}
            style={styles.row}
          >
            <Text style={styles.name}>{item.employeeName}</Text>
            <Text style={styles.meta}>
              {item.documentType.replaceAll('_', ' ')} · {item.expiryDate}
            </Text>
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    gap: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  row: {
    gap: 2,
    paddingVertical: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    color: '#6b7280',
    fontSize: 13,
  },
  empty: {
    color: '#6b7280',
    fontSize: 13,
  },
});
