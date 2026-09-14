import { StyleSheet, Text, View } from 'react-native';

export interface BarItem {
  label: string;
  value: number;
  color: string;
}

export function HorizontalBars({ items }: { items: BarItem[] }) {
  const visible = items.filter((item) => item.value > 0);
  const max = Math.max(...items.map((item) => item.value), 1);

  if (visible.length === 0) {
    return <Text style={styles.empty}>No values to chart</Text>;
  }

  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item.label} style={styles.row}>
          <View style={styles.meta}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.value}>{item.value}</Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.max(2, (item.value / max) * 100)}%`,
                  backgroundColor: item.color,
                  opacity: item.value === 0 ? 0.2 : 1,
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  row: {
    gap: 6,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: '#4b5563',
    fontWeight: '600',
  },
  value: {
    color: '#111827',
    fontWeight: '700',
  },
  track: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  fill: {
    height: 10,
    borderRadius: 999,
  },
  empty: {
    color: '#6b7280',
  },
});
