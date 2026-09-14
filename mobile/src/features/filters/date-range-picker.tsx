import { StyleSheet, Text, View } from 'react-native';
import { DateField } from '@/ui/date-field';

export function DateRangePicker({
  from,
  to,
  onChangeFrom,
  onChangeTo,
  fromPlaceholder = 'From',
  toPlaceholder = 'To',
  label = 'Date range',
}: {
  from: string;
  to: string;
  onChangeFrom: (value: string) => void;
  onChangeTo: (value: string) => void;
  fromPlaceholder?: string;
  toPlaceholder?: string;
  label?: string;
}) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        <DateField
          allowClear
          onChange={onChangeFrom}
          placeholder={fromPlaceholder}
          style={styles.field}
          value={from}
        />
        <DateField
          allowClear
          onChange={onChangeTo}
          placeholder={toPlaceholder}
          style={styles.field}
          value={to}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' },
  row: { flexDirection: 'row', gap: 8 },
  field: { flex: 1, minHeight: 46 },
});
