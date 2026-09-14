import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function FilterModal({
  visible,
  title = 'Filters',
  onClose,
  onClear,
  onApply,
  children,
}: {
  visible: boolean;
  title?: string;
  onClose: () => void;
  onClear: () => void;
  onApply: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView contentContainerStyle={styles.body} style={styles.bodyScroll}>
            {children}
          </ScrollView>
          <View style={styles.actions}>
            <Pressable onPress={onClear} style={styles.secondary}>
              <Text style={styles.secondaryText}>Clear filters</Text>
            </Pressable>
            <Pressable onPress={onApply} style={styles.primary}>
              <Text style={styles.primaryText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#f9fafb',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  bodyScroll: { maxHeight: 420 },
  body: { gap: 12, paddingBottom: 8 },
  actions: { flexDirection: 'row', gap: 8 },
  secondary: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontWeight: '700', color: '#111827' },
  primary: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontWeight: '700', color: '#ffffff' },
});
