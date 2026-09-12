import { StyleSheet, Text, View } from 'react-native';
import { DashboardActivity } from './types';

export function RecentActivityList({ activities }: { activities: DashboardActivity[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Recent Activity</Text>
      <View style={styles.card}>
        {activities.length === 0 ? (
          <Text style={styles.empty}>No recent activity</Text>
        ) : (
          activities.map((activity, index) => (
            <View
              key={activity.id}
              style={[styles.row, index < activities.length - 1 ? styles.rowBorder : null]}
            >
              <Text style={styles.type}>{activity.type}</Text>
              <Text style={styles.description}>{activity.description}</Text>
              <Text style={styles.time}>
                {new Date(activity.occurredAt).toLocaleString()}
              </Text>
            </View>
          ))
        )}
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  empty: {
    fontSize: 15,
    color: '#6b7280',
  },
  row: {
    gap: 4,
    paddingBottom: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  type: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 15,
    color: '#111827',
  },
  time: {
    fontSize: 13,
    color: '#6b7280',
  },
});
