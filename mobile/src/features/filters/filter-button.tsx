import { Pressable, StyleSheet, Text } from 'react-native';

export function FilterButton({
  count,
  onPress,
}: {
  count: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Text style={styles.label}>{count > 0 ? `Filters (${count})` : 'Filters'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  label: { color: '#ffffff', fontWeight: '700' },
});
