import { Redirect } from 'expo-router';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { useAuth } from '@/features/auth/auth-context';
import { homeHref } from '@/features/auth/types';

export default function IndexScreen() {
  const { isReady, isAuthenticated, user } = useAuth();

  if (!isReady) {
    return (
      <View style={styles.container}>
        <Image
          accessibilityLabel="App logo"
          resizeMode="contain"
          source={require('../../assets/images/brand-logo.png')}
          style={styles.logo}
        />
        <ActivityIndicator size="large" color="#1fb6a6" />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? homeHref(user?.role) : '/login'} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    gap: 24,
  },
  logo: {
    width: 160,
    height: 160,
    borderRadius: 28,
  },
});
