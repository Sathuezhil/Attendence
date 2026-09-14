import { Pressable, StyleSheet, Text, View } from 'react-native';

export function StatusFilter<T extends string>({
  options,
  value,
  onChange,
  allLabel = 'All',
  labelOf = (option: T) => option.replaceAll('_', ' '),
}: {
  options: readonly T[];
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  allLabel?: string;
  labelOf?: (option: T) => string;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onChange(undefined)}
        style={[styles.chip, !value ? styles.active : null]}
      >
        <Text style={[styles.text, !value ? styles.activeText : null]}>{allLabel}</Text>
      </Pressable>
      {options.map((option) => {
        const selected = value === option;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[styles.chip, selected ? styles.active : null]}
          >
            <Text style={[styles.text, selected ? styles.activeText : null]}>{labelOf(option)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#e5e7eb',
  },
  active: { backgroundColor: '#111827' },
  text: { color: '#111827', fontWeight: '600', fontSize: 12 },
  activeText: { color: '#ffffff' },
});
