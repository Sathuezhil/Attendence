import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.wrap}>
      <TextInput
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        style={styles.input}
        value={value}
      />
      {value ? (
        <Pressable onPress={() => onChange('')} style={styles.clear}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    color: '#111827',
  },
  clear: { paddingHorizontal: 8, paddingVertical: 10 },
  clearText: { color: '#1d4ed8', fontWeight: '700' },
});
