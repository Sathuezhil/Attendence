import { Pressable, StyleSheet, Text, View } from 'react-native';

export function PaginationBar({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <View style={styles.pager}>
      <Pressable disabled={page <= 1} onPress={() => onPage(Math.max(1, page - 1))}>
        <Text style={[styles.text, page <= 1 ? styles.disabled : null]}>Previous</Text>
      </Pressable>
      <Text style={styles.label}>
        Page {page} of {totalPages}
      </Text>
      <Pressable
        disabled={page >= totalPages}
        onPress={() => onPage(Math.min(totalPages, page + 1))}
      >
        <Text style={[styles.text, page >= totalPages ? styles.disabled : null]}>Next</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pager: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  text: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  disabled: {
    color: '#9ca3af',
  },
  label: {
    color: '#6b7280',
  },
});
