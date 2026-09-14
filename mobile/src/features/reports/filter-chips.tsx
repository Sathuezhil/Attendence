import { Pressable, StyleSheet, Text, View } from 'react-native';
import { labelOf } from './format';

export function FilterChips<T extends string>({
  value,
  options,
  allLabel,
  onChange,
}: {
  value: T | undefined;
  options: readonly T[];
  allLabel: string;
  onChange: (value: T | undefined) => void;
}) {
  return (
    <View style={styles.chips}>
      {[undefined, ...options].map((option) => (
        <Pressable
          key={option ?? 'ALL'}
          accessibilityRole="button"
          onPress={() => onChange(option)}
          style={[styles.chip, value === option ? styles.chipActive : null]}
        >
          <Text style={[styles.chipText, value === option ? styles.chipTextActive : null]}>
            {option ? labelOf(option) : allLabel}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#e5e7eb',
  },
  chipActive: {
    backgroundColor: '#111827',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  chipTextActive: {
    color: '#ffffff',
  },
});
