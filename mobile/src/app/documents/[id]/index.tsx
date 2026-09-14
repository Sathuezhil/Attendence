import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { confirmAction } from '@/features/attendance/confirm';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { deleteDocument, fetchDocument, fetchDocumentFile } from '@/features/documents/api';
import { formatBytes, labelOf, statusColor, statusLabel } from '@/features/documents/format';
import { ApiError } from '@/lib/api';

export default function DocumentDetailsScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  const query = useQuery({
    queryKey: ['documents', id],
    queryFn: () => fetchDocument(id),
    enabled: Boolean(id) && isReady && isAuthenticated,
  });

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function loadPreview() {
      if (!query.data || !query.data.mimeType.startsWith('image/')) {
        return;
      }

      try {
        const localUri = await materializeDocumentFile(query.data.id, query.data.fileName);
        if (cancelled) {
          return;
        }
        objectUrl = localUri.startsWith('blob:') ? localUri : null;
        setPreviewUri(localUri);
      } catch (error) {
        if (!cancelled) {
          setPreviewError(error instanceof ApiError ? error.message : 'Unable to load preview.');
        }
      }
    }

    void loadPreview();
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [query.data]);

  const remove = useMutation({
    mutationFn: () => deleteDocument(id),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      router.replace('/documents' as Href);
    },
  });

  async function openFile() {
    if (!query.data) {
      return;
    }
    setOpening(true);
    setPreviewError(null);
    try {
      const localUri = await materializeDocumentFile(query.data.id, query.data.fileName);
      if (Platform.OS === 'web') {
        window.open(localUri, '_blank', 'noopener,noreferrer');
        return;
      }
      await Linking.openURL(localUri);
    } catch (error) {
      setPreviewError(error instanceof ApiError ? error.message : 'Unable to open this document.');
    } finally {
      setOpening(false);
    }
  }

  if (!isReady || !isAuthenticated || query.isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  if (query.error || !query.data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>
          {query.error instanceof ApiError ? query.error.message : 'Document not found'}
        </Text>
      </View>
    );
  }

  const document = query.data;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.name}>{labelOf(document.documentType)}</Text>
      <Text style={styles.meta}>{document.employee.fullName}</Text>
      <Text style={[styles.status, { color: statusColor(document.expiryStatus) }]}>
        {statusLabel(document.expiryStatus)}
      </Text>

      <View style={styles.card}>
        <Row label="Document number" value={document.documentNumberMasked} />
        <Row label="Issue date" value={document.issueDate} />
        <Row label="Expiry date" value={document.expiryDate} />
        <Row label="File name" value={document.fileName} />
        <Row label="File size" value={formatBytes(document.fileSize)} />
        <Row label="Notes" value={document.notes} />
      </View>

      {previewUri ? <Image source={{ uri: previewUri }} style={styles.preview} /> : null}
      {previewError ? <Text style={styles.error}>{previewError}</Text> : null}

      <Pressable disabled={opening} onPress={() => void openFile()} style={styles.button}>
        <Text style={styles.buttonText}>{opening ? 'Opening…' : 'View document'}</Text>
      </Pressable>
      <Pressable onPress={() => router.push(`/documents/${document.id}/edit` as Href)} style={styles.button}>
        <Text style={styles.buttonText}>Edit</Text>
      </Pressable>
      <Pressable
        disabled={remove.isPending}
        onPress={async () => {
          if (await confirmAction('Delete document', 'Delete this document permanently?')) {
            remove.mutate();
          }
        }}
        style={styles.dangerButton}
      >
        <Text style={styles.dangerText}>{remove.isPending ? 'Deleting…' : 'Delete'}</Text>
      </Pressable>
      {remove.error ? (
        <Text style={styles.error}>
          {remove.error instanceof ApiError ? remove.error.message : 'Unable to delete this document.'}
        </Text>
      ) : null}
    </ScrollView>
  );
}

async function materializeDocumentFile(id: string, fallbackName: string): Promise<string> {
  const file = await fetchDocumentFile(id);
  if (Platform.OS === 'web') {
    const blob = new Blob([file.bytes], { type: file.contentType });
    return URL.createObjectURL(blob);
  }

  const FileSystem = await import('expo-file-system/legacy');
  const name = (file.fileName ?? fallbackName).replaceAll(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${FileSystem.cacheDirectory}${name}`;
  const bytes = new Uint8Array(file.bytes);
  let binary = '';
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  await FileSystem.writeAsStringAsync(path, globalThis.btoa(binary), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return path;
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || 'Not provided'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
    backgroundColor: '#f4f6f8',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  meta: {
    color: '#6b7280',
  },
  status: {
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  row: {
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 15,
    color: '#111827',
  },
  preview: {
    width: '100%',
    height: 280,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
  },
  button: {
    backgroundColor: '#111827',
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  dangerButton: {
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
  },
  dangerText: {
    color: '#991b1b',
    fontWeight: '700',
  },
  error: {
    color: '#991b1b',
    textAlign: 'center',
  },
});
