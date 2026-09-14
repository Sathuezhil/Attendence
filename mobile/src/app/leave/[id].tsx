import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { confirmAction } from '@/features/attendance/confirm';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { approveLeave, cancelLeave, fetchLeave, rejectLeave } from '@/features/leave/api';
import { labelOf, statusColor } from '@/features/leave/format';
import { ApiError } from '@/lib/api';

export default function LeaveDetailsScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['leave', id],
    queryFn: () => fetchLeave(id),
    enabled: Boolean(id) && isReady && isAuthenticated,
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['leave'] });
    await queryClient.invalidateQueries({ queryKey: ['attendance'] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }

  const approve = useMutation({
    mutationFn: () => approveLeave(id),
    async onSuccess() {
      setMessage('Leave approved');
      await refresh();
    },
  });

  const reject = useMutation({
    mutationFn: () => rejectLeave(id, rejectionReason.trim()),
    async onSuccess() {
      setMessage('Leave rejected');
      await refresh();
    },
  });

  const cancel = useMutation({
    mutationFn: () => cancelLeave(id),
    async onSuccess() {
      setMessage('Leave cancelled');
      await refresh();
      router.replace('/leave' as Href);
    },
  });

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
          {query.error instanceof ApiError ? query.error.message : 'Leave not found'}
        </Text>
      </View>
    );
  }

  const leave = query.data;
  const pending = leave.status === 'PENDING';
  const canCancel = leave.status === 'PENDING' || leave.status === 'APPROVED';
  const actionError = approve.error ?? reject.error ?? cancel.error;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.name}>{leave.employee.fullName}</Text>
      <Text style={styles.meta}>{leave.employee.employeeCode}</Text>
      <Text style={[styles.status, { color: statusColor(leave.status) }]}>
        {labelOf(leave.status)}
      </Text>

      <View style={styles.card}>
        <Row label="Leave type" value={labelOf(leave.leaveType)} />
        <Row label="Start date" value={leave.startDate} />
        <Row label="End date" value={leave.endDate} />
        <Row label="Total days" value={String(leave.totalDays)} />
        <Row label="Reason" value={leave.reason} />
        <Row label="Approved at" value={leave.approvedAt ? leave.approvedAt.slice(0, 10) : null} />
        <Row label="Rejection reason" value={leave.rejectionReason} />
      </View>

      {pending ? (
        <View style={styles.actions}>
          <Pressable
            disabled={approve.isPending}
            onPress={async () => {
              if (await confirmAction('Approve leave', `Approve leave for ${leave.employee.fullName}?`)) {
                approve.mutate();
              }
            }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {approve.isPending ? 'Approving…' : 'Approve'}
            </Text>
          </Pressable>
          <TextInput
            onChangeText={setRejectionReason}
            placeholder="Rejection reason"
            placeholderTextColor="#9ca3af"
            style={styles.input}
            value={rejectionReason}
          />
          <Pressable
            disabled={reject.isPending}
            onPress={async () => {
              if (rejectionReason.trim().length < 3) {
                setMessage(null);
                return;
              }
              if (await confirmAction('Reject leave', 'Reject this pending leave?')) {
                reject.mutate();
              }
            }}
            style={styles.dangerButton}
          >
            <Text style={styles.dangerText}>
              {reject.isPending ? 'Rejecting…' : 'Reject'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {canCancel ? (
        <Pressable
          disabled={cancel.isPending}
          onPress={async () => {
            if (await confirmAction('Cancel leave', 'Cancel this leave record?')) {
              cancel.mutate();
            }
          }}
          style={styles.ghostButton}
        >
          <Text style={styles.ghostText}>{cancel.isPending ? 'Cancelling…' : 'Cancel leave'}</Text>
        </Pressable>
      ) : null}

      {pending && rejectionReason.trim().length > 0 && rejectionReason.trim().length < 3 ? (
        <Text style={styles.error}>Rejection reason must be at least 3 characters</Text>
      ) : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {actionError ? (
        <Text style={styles.error}>
          {actionError instanceof ApiError ? actionError.message : 'Unable to update leave.'}
        </Text>
      ) : null}
    </ScrollView>
  );
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
    gap: 14,
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
  actions: {
    gap: 10,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    color: '#111827',
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
  ghostButton: {
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
  },
  ghostText: {
    color: '#111827',
    fontWeight: '700',
  },
  error: {
    color: '#991b1b',
  },
  success: {
    color: '#166534',
    fontWeight: '600',
  },
});
