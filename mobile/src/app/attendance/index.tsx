import { type Href, router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { confirmAction } from '@/features/attendance/confirm';
import { checkInEmployee, checkOutAttendance, fetchTodayAttendance } from '@/features/attendance/api';
import {
  attendanceStatuses,
  formatDuration,
  formatTime,
  shiftDate,
  statusColor,
  statusLabel,
  todayDate,
} from '@/features/attendance/format';
import { AttendanceDayRow, AttendanceStatus } from '@/features/attendance/types';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { ApiError } from '@/lib/api';

export default function AttendanceScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayDate());
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AttendanceStatus | undefined>();
  const [department, setDepartment] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['attendance', 'today', { date, search, status, department }],
    queryFn: () =>
      fetchTodayAttendance({
        date,
        search: search.trim() || undefined,
        status,
        department: department.trim() || undefined,
        limit: 100,
      }),
    enabled: isReady && isAuthenticated,
  });

  const checkIn = useMutation({
    mutationFn: (employeeId: string) => checkInEmployee(employeeId),
    async onSuccess() {
      setMessage('Checked in');
      await invalidateAttendance(queryClient);
    },
  });

  const checkOut = useMutation({
    mutationFn: (attendanceId: string) => checkOutAttendance(attendanceId),
    async onSuccess() {
      setMessage('Checked out');
      await invalidateAttendance(queryClient);
    },
  });

  const statusFilters = useMemo(() => [undefined, ...attendanceStatuses], []);
  const busy = checkIn.isPending || checkOut.isPending;

  async function onCheckIn(row: AttendanceDayRow) {
    const confirmed = await confirmAction(
      'Check in',
      `Check in ${row.employee.fullName} for ${date}?`,
    );
    if (confirmed) {
      checkIn.mutate(row.employeeId);
    }
  }

  async function onCheckOut(row: AttendanceDayRow) {
    if (!row.attendanceId) {
      return;
    }

    const confirmed = await confirmAction(
      'Check out',
      `Check out ${row.employee.fullName}?`,
    );
    if (confirmed) {
      checkOut.mutate(row.attendanceId);
    }
  }

  if (!isReady || !isAuthenticated) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  const summary = query.data?.summary;

  return (
    <View style={styles.screen}>
      <FlatList
        data={query.data?.data ?? []}
        keyExtractor={(item) => item.employeeId}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.dateRow}>
              <Pressable onPress={() => setDate((value) => shiftDate(value, -1))} style={styles.dateButton}>
                <Text style={styles.dateButtonText}>Prev</Text>
              </Pressable>
              <TextInput
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
                style={styles.dateInput}
                value={date}
              />
              <Pressable onPress={() => setDate((value) => shiftDate(value, 1))} style={styles.dateButton}>
                <Text style={styles.dateButtonText}>Next</Text>
              </Pressable>
            </View>

            {summary ? (
              <View style={styles.summaryGrid}>
                <SummaryChip label="Total" value={summary.totalEmployees} />
                <SummaryChip label="Present" value={summary.present} />
                <SummaryChip label="Absent" value={summary.absent} />
                <SummaryChip label="Late" value={summary.late} />
                <SummaryChip label="Half-day" value={summary.halfDay} />
              </View>
            ) : null}

            <TextInput
              onChangeText={setSearch}
              placeholder="Search employees"
              placeholderTextColor="#9ca3af"
              style={styles.search}
              value={search}
            />
            <TextInput
              onChangeText={setDepartment}
              placeholder="Filter by department"
              placeholderTextColor="#9ca3af"
              style={styles.search}
              value={department}
            />
            <View style={styles.chips}>
              {statusFilters.map((option) => {
                const selected = status === option;
                return (
                  <Pressable
                    key={option ?? 'ALL'}
                    onPress={() => setStatus(option)}
                    style={[styles.chip, selected ? styles.chipActive : null]}
                  >
                    <Text style={[styles.chipText, selected ? styles.chipTextActive : null]}>
                      {option ? statusLabel(option) : 'All'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => router.push('/attendance/history' as Href)}
              style={styles.historyButton}
            >
              <Text style={styles.historyText}>View history</Text>
            </Pressable>

            {message ? <Text style={styles.success}>{message}</Text> : null}
            {checkIn.error || checkOut.error ? (
              <Text style={styles.error}>
                {(checkIn.error ?? checkOut.error) instanceof ApiError
                  ? ((checkIn.error ?? checkOut.error) as ApiError).message
                  : 'Unable to update attendance.'}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          query.isPending ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#111827" />
            </View>
          ) : query.error ? (
            <Text style={styles.error}>
              {query.error instanceof ApiError ? query.error.message : 'Unable to load attendance.'}
            </Text>
          ) : (
            <Text style={styles.empty}>No employees match these filters</Text>
          )
        }
        renderItem={({ item }) => (
          <AttendanceRow
            row={item}
            busy={busy}
            onCheckIn={() => void onCheckIn(item)}
            onCheckOut={() => void onCheckOut(item)}
          />
        )}
      />
    </View>
  );
}

function SummaryChip({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryChip}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function AttendanceRow({
  row,
  busy,
  onCheckIn,
  onCheckOut,
}: {
  row: AttendanceDayRow;
  busy: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
}) {
  const canCheckIn = !row.attendanceId;
  const canCheckOut = Boolean(row.attendanceId && row.checkIn && !row.checkOut);

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardBody}>
          <Text style={styles.name}>{row.employee.fullName}</Text>
          <Text style={styles.meta}>{row.employee.employeeCode}</Text>
        </View>
        <Text style={[styles.status, { color: statusColor(row.status) }]}>
          {statusLabel(row.status)}
        </Text>
      </View>
      <Text style={styles.times}>
        In {formatTime(row.checkIn)} · Out {formatTime(row.checkOut)} · {formatDuration(row.workingMinutes)}
      </Text>
      <View style={styles.actions}>
        <Pressable
          disabled={!canCheckIn || busy}
          onPress={onCheckIn}
          style={[styles.action, !canCheckIn || busy ? styles.actionDisabled : null]}
        >
          <Text style={styles.actionText}>Check In</Text>
        </Pressable>
        <Pressable
          disabled={!canCheckOut || busy}
          onPress={onCheckOut}
          style={[styles.action, !canCheckOut || busy ? styles.actionDisabled : null]}
        >
          <Text style={styles.actionText}>Check Out</Text>
        </Pressable>
      </View>
    </View>
  );
}

async function invalidateAttendance(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: ['attendance'] });
  await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  list: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },
  header: {
    gap: 10,
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dateButton: {
    backgroundColor: '#111827',
    borderRadius: 10,
    minHeight: 42,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  dateButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  dateInput: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    color: '#111827',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryChip: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: '30%',
    flexGrow: 1,
  },
  summaryLabel: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryValue: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '700',
  },
  search: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    color: '#111827',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#e5e7eb',
  },
  chipActive: {
    backgroundColor: '#111827',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  historyButton: {
    alignSelf: 'flex-start',
  },
  historyText: {
    color: '#1e40af',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  meta: {
    color: '#6b7280',
    fontSize: 13,
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
  },
  times: {
    color: '#4b5563',
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  action: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDisabled: {
    opacity: 0.4,
  },
  actionText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  centered: {
    padding: 24,
    alignItems: 'center',
  },
  empty: {
    textAlign: 'center',
    color: '#6b7280',
    padding: 24,
  },
  error: {
    color: '#991b1b',
  },
  success: {
    color: '#166534',
    fontWeight: '600',
  },
});
