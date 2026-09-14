import { type Href, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { colors, radius, space, touch } from '@/theme';
import { LoadingState } from '@/ui/screen-state';

export default function SecurityScreen() {
  const { isReady, isAuthenticated, user } = useRequireAuth();

  if (!isReady || !isAuthenticated || !user) {
    return <LoadingState />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Account security</Text>
        <Text style={styles.body}>
          Signed in as {user.email}. Changing your password signs out every other session.
        </Text>
      </View>
      <Pressable
        onPress={() => router.push('/profile/password' as Href)}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Change password</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space.lg,
    gap: space.lg,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  body: {
    color: colors.mutedStrong,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: touch.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.white,
    fontWeight: '700',
  },
});
