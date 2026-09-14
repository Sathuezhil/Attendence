import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, touch } from '@/theme';

export function useSafeBottomOffset(extra = 16): number {
  const insets = useSafeAreaInsets();
  return extra + insets.bottom;
}

export function FabButton({
  label,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const bottom = useSafeBottomOffset(16);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={[styles.fab, { bottom }]}
    >
      <Text style={styles.fabText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#111827',
    borderRadius: 14,
    minHeight: touch.minHeight,
    paddingHorizontal: 16,
    justifyContent: 'center',
    zIndex: 20,
  },
  fabText: {
    color: colors.white,
    fontWeight: '700',
  },
});
