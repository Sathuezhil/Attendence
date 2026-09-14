import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, touch } from '@/theme';

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.text} />
      <Text style={styles.muted}>{message}</Text>
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.muted}>{message}</Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.centered}>
      <Text style={styles.error}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.retry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    padding: space.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
  },
  muted: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    textAlign: 'center',
    fontSize: 14,
  },
  retry: {
    minHeight: touch.minHeight,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: colors.white,
    fontWeight: '700',
  },
});
