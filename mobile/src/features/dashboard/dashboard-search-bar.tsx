import { type Href, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, shadow, touch } from '@/theme';
import { AppIcon } from '@/ui/icon';

export function DashboardSearchBar() {
  const [query, setQuery] = useState('');

  function openSearch() {
    const q = query.trim();
    router.push((q ? `/search?q=${encodeURIComponent(q)}` : '/search') as Href);
  }

  return (
    <View style={[styles.wrap, shadow]}>
      <AppIcon name="search" size={18} color={colors.muted} />
      <TextInput
        accessibilityLabel="Search"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setQuery}
        onSubmitEditing={openSearch}
        placeholder="Search employees, leave, invoices..."
        placeholderTextColor="#8a97a6"
        returnKeyType="search"
        style={styles.input}
        value={query}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open search"
        onPress={openSearch}
        style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
      >
        <Text style={styles.buttonText}>Search</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    minHeight: touch.minHeight,
    fontSize: 16,
    color: colors.text,
  },
  button: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});
