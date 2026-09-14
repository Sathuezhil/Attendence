import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAttendanceHistory, fetchTodayAttendance, markDayAttendance } from '@/features/attendance/api';
import {
  dayMarkFromStatus,
  dayMarks,
  formatDuration,
  formatTime,
  statusColor as attendanceColor,
  statusLabel as attendanceStatusLabel,
  todayDate,
  type DayMark,
} from '@/features/attendance/format';
import { AttendanceStatus } from '@/features/attendance/types';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { fetchDocuments } from '@/features/documents/api';
import { labelOf as documentLabel, statusColor as documentColor } from '@/features/documents/format';
import { deleteEmployee, fetchEmployee } from '@/features/employees/api';
import { confirmEmployeeDelete } from '@/features/employees/confirm';
import { initials, statusLabel } from '@/features/employees/form-utils';
import { fetchLeaves } from '@/features/leave/api';
import { labelOf as leaveLabel, statusColor as leaveColor } from '@/features/leave/format';
import { fetchPayroll } from '@/features/payroll/api';
import { money, monthLabel, statusColor as payrollColor } from '@/features/payroll/format';
import { ApiError } from '@/lib/api';
import { colors, radius, space, touch } from '@/theme';
import { EmptyState, ErrorState, LoadingState } from '@/ui/screen-state';

type ProfileTab = 'profile' | 'attendance' | 'leave' | 'documents' | 'payroll' | 'activity';

const TABS: Array<{ id: ProfileTab; label: string }> = [
  { id: 'profile', label: 'Profile' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'leave', label: 'Leave' },
  { id: 'documents', label: 'Documents' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'activity', label: 'Activity' },
];

export default function EmployeeDetailsScreen() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ProfileTab>('profile');
  const enabled = Boolean(id) && isReady && isAuthenticated;

  const query = useQuery({
    queryKey: ['employees', id],
    queryFn: () => fetchEmployee(id),
    enabled,
  });
  const attendanceQuery = useQuery({
    queryKey: ['attendance', 'employee', id],
    queryFn: () => fetchAttendanceHistory({ employeeId: id, limit: 50 }),
    enabled,
  });
  const todayQuery = useQuery({
    queryKey: ['attendance', 'today', 'employee', id],
    queryFn: () => fetchTodayAttendance({ employeeId: id, limit: 1 }),
    enabled,
  });
  const leaveQuery = useQuery({
    queryKey: ['leave', 'employee', id],
    queryFn: () => fetchLeaves({ employeeId: id, limit: 50 }),
    enabled,
  });
  const documentsQuery = useQuery({
    queryKey: ['documents', 'employee', id],
    queryFn: () => fetchDocuments({ employeeId: id, limit: 50 }),
    enabled,
  });
  const payrollQuery = useQuery({
    queryKey: ['payroll', 'employee', id],
    queryFn: () => fetchPayroll({ employeeId: id, limit: 50 }),
    enabled,
  });

  const removeEmployee = useMutation({
    mutationFn: () => deleteEmployee(id),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      router.replace('/employees' as Href);
    },
  });

  const markDay = useMutation({
    mutationFn: (status: AttendanceStatus) => markDayAttendance(id, status),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ['attendance'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const attendance = attendanceQuery.data?.data ?? [];
  const leaves = leaveQuery.data?.data ?? [];
  const documents = documentsQuery.data?.data ?? [];
  const payroll = payrollQuery.data?.data ?? [];
  const activityItems = useActivityItems(attendance, leaves, documents, payroll);

  async function confirmDelete() {
    const confirmed = await confirmEmployeeDelete(query.data?.employeeCode ?? 'this employee');
    if (confirmed) {
      removeEmployee.mutate();
    }
  }

  if (!isReady || !isAuthenticated || query.isPending) {
    return <LoadingState message="Loading employee…" />;
  }

  if (query.error || !query.data) {
    return (
      <ErrorState
        message={query.error instanceof ApiError ? query.error.message : 'Employee not found'}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const employee = query.data;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          {employee.profileImageUrl ? (
            <Image source={{ uri: employee.profileImageUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(employee.fullName)}</Text>
            </View>
          )}
          <Text style={styles.name} numberOfLines={2}>
            {employee.fullName}
          </Text>
          <Text style={styles.meta}>{employee.employeeCode}</Text>
          <Text style={styles.status}>{statusLabel(employee.employmentStatus)}</Text>
          <View style={styles.heroActions}>
            <Pressable
              onPress={() => router.push(`/employees/${employee.id}/edit` as Href)}
              style={[styles.button, styles.heroAction]}
            >
              <Text style={styles.buttonText}>Edit</Text>
            </Pressable>
            <Pressable
              disabled={removeEmployee.isPending}
              onPress={() => void confirmDelete()}
              style={[styles.dangerButton, styles.heroAction]}
            >
              <Text style={styles.dangerText}>
                {removeEmployee.isPending ? 'Deleting…' : 'Delete'}
              </Text>
            </Pressable>
          </View>
          {removeEmployee.error ? (
            <Text style={styles.error}>
              {removeEmployee.error instanceof ApiError
                ? removeEmployee.error.message
                : 'Unable to delete this employee.'}
            </Text>
          ) : null}
        </View>

        <DayStatusCard
          canMark={employee.employmentStatus === 'ACTIVE'}
          current={dayMarkFromStatus(todayQuery.data?.data[0]?.status)}
          date={todayQuery.data?.summary.date ?? todayDate()}
          error={todayQuery.error}
          markError={markDay.error}
          pending={todayQuery.isPending || markDay.isPending}
          onChange={(mark, next) => {
            if (!next || markDay.isPending) {
              return;
            }
            markDay.mutate(mark.status);
          }}
          onRetry={() => void todayQuery.refetch()}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setTab(item.id)}
              style={[styles.tab, tab === item.id ? styles.tabActive : null]}
            >
              <Text style={[styles.tabText, tab === item.id ? styles.tabTextActive : null]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {tab === 'profile' ? (
          <ProfileTabContent employee={employee} />
        ) : null}

        {tab === 'attendance' ? (
          <AttendanceTab
            loading={attendanceQuery.isPending}
            error={attendanceQuery.error}
            records={attendance}
            onRetry={() => void attendanceQuery.refetch()}
            onOpenHistory={() =>
              router.push(`/attendance/history?employeeId=${employee.id}` as Href)
            }
          />
        ) : null}

        {tab === 'leave' ? (
          <LeaveTab
            loading={leaveQuery.isPending}
            error={leaveQuery.error}
            records={leaves}
            onRetry={() => void leaveQuery.refetch()}
            onOpen={() => router.push(`/leave?employeeId=${employee.id}` as Href)}
          />
        ) : null}

        {tab === 'documents' ? (
          <DocumentsTab
            loading={documentsQuery.isPending}
            error={documentsQuery.error}
            records={documents}
            onRetry={() => void documentsQuery.refetch()}
            onOpen={() => router.push(`/documents?employeeId=${employee.id}` as Href)}
          />
        ) : null}

        {tab === 'payroll' ? (
          <PayrollTab
            loading={payrollQuery.isPending}
            error={payrollQuery.error}
            records={payroll}
            onRetry={() => void payrollQuery.refetch()}
            onOpen={() => router.push(`/payroll?employeeId=${employee.id}` as Href)}
          />
        ) : null}

        {tab === 'activity' ? (
          <ActivityTab
            loading={
              attendanceQuery.isPending ||
              leaveQuery.isPending ||
              documentsQuery.isPending ||
              payrollQuery.isPending
            }
            items={activityItems}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

function DayStatusCard({
  canMark,
  current,
  date,
  error,
  markError,
  pending,
  onChange,
  onRetry,
}: {
  canMark: boolean;
  current: DayMark | null;
  date: string;
  error: unknown;
  markError: unknown;
  pending: boolean;
  onChange: (mark: (typeof dayMarks)[number], next: boolean) => void;
  onRetry: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.section}>Today</Text>
      <Text style={styles.listMeta}>{date}</Text>
      {error ? (
        <Pressable onPress={onRetry}>
          <Text style={styles.error}>
            {error instanceof ApiError ? error.message : 'Unable to load today status.'} Tap to retry.
          </Text>
        </Pressable>
      ) : (
        dayMarks.map((mark) => (
          <View key={mark.id} style={styles.toggle}>
            <Text style={styles.toggleLabel}>{mark.label}</Text>
            <Switch
              disabled={!canMark || pending}
              onValueChange={(next) => onChange(mark, next)}
              value={current === mark.id}
            />
          </View>
        ))
      )}
      {!canMark ? (
        <Text style={styles.listMeta}>Inactive employees cannot be marked for today.</Text>
      ) : null}
      {markError ? (
        <Text style={styles.error}>
          {markError instanceof ApiError ? markError.message : 'Unable to update today status.'}
        </Text>
      ) : null}
    </View>
  );
}

function ProfileTabContent({
  employee,
}: {
  employee: Awaited<ReturnType<typeof fetchEmployee>>;
}) {
  return (
    <View style={styles.stack}>
      <Section title="Personal information">
        <Row label="Date of birth" value={employee.dateOfBirth} />
        <Row label="Gender" value={employee.gender ? statusLabel(employee.gender) : null} />
        <Row label="Nationality" value={employee.nationality} />
      </Section>
      <Section title="Contact information">
        <Row label="Email" value={employee.email} />
        <Row label="Phone" value={employee.phone} />
        <Row label="Alternate phone" value={employee.alternatePhone} />
      </Section>
      <Section title="Employment information">
        <Row label="Job title" value={employee.jobTitle} />
        <Row label="Joining date" value={employee.joiningDate} />
        <Row
          label="Basic salary"
          value={employee.basicSalary === null ? null : String(employee.basicSalary)}
        />
      </Section>
    </View>
  );
}

function AttendanceTab({
  loading,
  error,
  records,
  onRetry,
  onOpenHistory,
}: {
  loading: boolean;
  error: unknown;
  records: Awaited<ReturnType<typeof fetchAttendanceHistory>>['data'];
  onRetry: () => void;
  onOpenHistory: () => void;
}) {
  if (loading) {
    return <LoadingState message="Loading attendance…" />;
  }
  if (error) {
    return (
      <ErrorState
        message={error instanceof ApiError ? error.message : 'Unable to load attendance.'}
        onRetry={onRetry}
      />
    );
  }

  const present = records.filter((row) =>
    ['PRESENT', 'LATE', 'HALF_DAY'].includes(row.status),
  ).length;
  const leave = records.filter((row) =>
    ['ABSENT', 'ON_LEAVE'].includes(row.status),
  ).length;
  const minutes = records.reduce((sum, row) => sum + (row.workingMinutes ?? 0), 0);

  return (
    <View style={styles.stack}>
      <Section title="Attendance summary">
        <SummaryGrid
          items={[
            { label: 'Records', value: String(records.length) },
            { label: 'Active', value: String(present) },
            { label: 'Leave', value: String(leave) },
            { label: 'Hours', value: formatDuration(minutes) },
          ]}
        />
      </Section>
      <Section title="Recent attendance">
        {records.length === 0 ? (
          <EmptyState message="No attendance records yet" />
        ) : (
          records.slice(0, 12).map((row) => (
            <View key={row.id} style={styles.listRow}>
              <View style={styles.listCopy}>
                <Text style={styles.listTitle}>{row.attendanceDate}</Text>
                <Text style={styles.listMeta}>
                  {formatTime(row.checkIn)} – {formatTime(row.checkOut)}
                </Text>
              </View>
              <Text style={[styles.badge, { color: attendanceColor(row.status) }]}>
                {attendanceStatusLabel(row.status)}
              </Text>
            </View>
          ))
        )}
      </Section>
      <Pressable onPress={onOpenHistory} style={styles.button}>
        <Text style={styles.buttonText}>View attendance history</Text>
      </Pressable>
    </View>
  );
}

function LeaveTab({
  loading,
  error,
  records,
  onRetry,
  onOpen,
}: {
  loading: boolean;
  error: unknown;
  records: Awaited<ReturnType<typeof fetchLeaves>>['data'];
  onRetry: () => void;
  onOpen: () => void;
}) {
  if (loading) {
    return <LoadingState message="Loading leave…" />;
  }
  if (error) {
    return (
      <ErrorState
        message={error instanceof ApiError ? error.message : 'Unable to load leave.'}
        onRetry={onRetry}
      />
    );
  }

  const approved = records.filter((row) => row.status === 'APPROVED');
  const pending = records.filter((row) => row.status === 'PENDING').length;
  const rejected = records.filter((row) => row.status === 'REJECTED').length;
  const days = approved.reduce((sum, row) => sum + row.totalDays, 0);

  return (
    <View style={styles.stack}>
      <Section title="Leave summary">
        <SummaryGrid
          items={[
            { label: 'Requests', value: String(records.length) },
            { label: 'Pending', value: String(pending) },
            { label: 'Rejected', value: String(rejected) },
            { label: 'Approved days', value: String(days) },
          ]}
        />
      </Section>
      <Section title="Leave history">
        {records.length === 0 ? (
          <EmptyState message="No leave requests yet" />
        ) : (
          records.slice(0, 12).map((row) => (
            <Pressable
              key={row.id}
              onPress={() => router.push(`/leave/${row.id}` as Href)}
              style={styles.listRow}
            >
              <View style={styles.listCopy}>
                <Text style={styles.listTitle}>{leaveLabel(row.leaveType)}</Text>
                <Text style={styles.listMeta}>
                  {row.startDate} → {row.endDate} · {row.totalDays}d
                </Text>
              </View>
              <Text style={[styles.badge, { color: leaveColor(row.status) }]}>
                {leaveLabel(row.status)}
              </Text>
            </Pressable>
          ))
        )}
      </Section>
      <Pressable onPress={onOpen} style={styles.button}>
        <Text style={styles.buttonText}>View leave history</Text>
      </Pressable>
    </View>
  );
}

function DocumentsTab({
  loading,
  error,
  records,
  onRetry,
  onOpen,
}: {
  loading: boolean;
  error: unknown;
  records: Awaited<ReturnType<typeof fetchDocuments>>['data'];
  onRetry: () => void;
  onOpen: () => void;
}) {
  if (loading) {
    return <LoadingState message="Loading documents…" />;
  }
  if (error) {
    return (
      <ErrorState
        message={error instanceof ApiError ? error.message : 'Unable to load documents.'}
        onRetry={onRetry}
      />
    );
  }

  return (
    <View style={styles.stack}>
      <Section title="Documents">
        <SummaryGrid
          items={[
            { label: 'Total', value: String(records.length) },
            {
              label: 'Expired',
              value: String(records.filter((row) => row.expiryStatus === 'EXPIRED').length),
            },
            {
              label: 'Expiring',
              value: String(records.filter((row) => row.expiryStatus === 'EXPIRING_SOON').length),
            },
          ]}
        />
      </Section>
      <Section title="Files">
        {records.length === 0 ? (
          <EmptyState message="No documents uploaded yet" />
        ) : (
          records.slice(0, 12).map((row) => (
            <Pressable
              key={row.id}
              onPress={() => router.push(`/documents/${row.id}` as Href)}
              style={styles.listRow}
            >
              <View style={styles.listCopy}>
                <Text style={styles.listTitle}>{documentLabel(row.documentType)}</Text>
                <Text style={styles.listMeta} numberOfLines={1}>
                  {row.fileName}
                  {row.expiryDate ? ` · ${row.expiryDate}` : ''}
                </Text>
              </View>
              <Text style={[styles.badge, { color: documentColor(row.expiryStatus) }]}>
                {documentLabel(row.expiryStatus)}
              </Text>
            </Pressable>
          ))
        )}
      </Section>
      <Pressable onPress={onOpen} style={styles.button}>
        <Text style={styles.buttonText}>View documents</Text>
      </Pressable>
    </View>
  );
}

function PayrollTab({
  loading,
  error,
  records,
  onRetry,
  onOpen,
}: {
  loading: boolean;
  error: unknown;
  records: Awaited<ReturnType<typeof fetchPayroll>>['data'];
  onRetry: () => void;
  onOpen: () => void;
}) {
  if (loading) {
    return <LoadingState message="Loading payroll…" />;
  }
  if (error) {
    return (
      <ErrorState
        message={error instanceof ApiError ? error.message : 'Unable to load payroll.'}
        onRetry={onRetry}
      />
    );
  }

  const latest = records[0];

  return (
    <View style={styles.stack}>
      <Section title="Payroll summary">
        <SummaryGrid
          items={[
            { label: 'Payslips', value: String(records.length) },
            { label: 'Latest net', value: latest ? money(latest.netSalary) : '—' },
            {
              label: 'Paid',
              value: String(records.filter((row) => row.paymentStatus === 'PAID').length),
            },
          ]}
        />
      </Section>
      <Section title="Payroll history">
        {records.length === 0 ? (
          <EmptyState message="No payroll records yet" />
        ) : (
          records.slice(0, 12).map((row) => (
            <Pressable
              key={row.id}
              onPress={() => router.push(`/payroll/${row.id}` as Href)}
              style={styles.listRow}
            >
              <View style={styles.listCopy}>
                <Text style={styles.listTitle}>
                  {monthLabel(row.payrollMonth)} {row.payrollYear}
                </Text>
                <Text style={styles.listMeta}>{money(row.netSalary)}</Text>
              </View>
              <Text style={[styles.badge, { color: payrollColor(row.paymentStatus) }]}>
                {row.paymentStatus}
              </Text>
            </Pressable>
          ))
        )}
      </Section>
      <Pressable onPress={onOpen} style={styles.button}>
        <Text style={styles.buttonText}>View payroll</Text>
      </Pressable>
    </View>
  );
}

function useActivityItems(
  attendance: Awaited<ReturnType<typeof fetchAttendanceHistory>>['data'],
  leaves: Awaited<ReturnType<typeof fetchLeaves>>['data'],
  documents: Awaited<ReturnType<typeof fetchDocuments>>['data'],
  payroll: Awaited<ReturnType<typeof fetchPayroll>>['data'],
) {
  return useMemo(() => {
    const items: Array<{ id: string; title: string; detail: string; at: string }> = [];
    for (const row of attendance) {
      items.push({
        id: `att-${row.id}`,
        title: `Attendance ${attendanceStatusLabel(row.status).toLowerCase()}`,
        detail: row.attendanceDate,
        at: row.updatedAt || row.createdAt,
      });
    }
    for (const row of leaves) {
      items.push({
        id: `leave-${row.id}`,
        title: `${leaveLabel(row.leaveType)} leave ${leaveLabel(row.status).toLowerCase()}`,
        detail: `${row.startDate} → ${row.endDate}`,
        at: row.updatedAt || row.createdAt,
      });
    }
    for (const row of documents) {
      items.push({
        id: `doc-${row.id}`,
        title: `${documentLabel(row.documentType)} uploaded`,
        detail: row.fileName,
        at: row.updatedAt || row.createdAt,
      });
    }
    for (const row of payroll) {
      items.push({
        id: `pay-${row.id}`,
        title: `Payroll ${monthLabel(row.payrollMonth)} ${row.payrollYear}`,
        detail: `${money(row.netSalary)} · ${row.paymentStatus}`,
        at: row.updatedAt || row.createdAt,
      });
    }
    return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 20);
  }, [attendance, documents, leaves, payroll]);
}

function ActivityTab({
  loading,
  items,
}: {
  loading: boolean;
  items: Array<{ id: string; title: string; detail: string; at: string }>;
}) {
  if (loading) {
    return <LoadingState message="Loading activity…" />;
  }

  return (
    <Section title="Recent activity">
      {items.length === 0 ? (
        <EmptyState message="No recent employee activity" />
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.listRow}>
            <View style={styles.listCopy}>
              <Text style={styles.listTitle}>{item.title}</Text>
              <Text style={styles.listMeta} numberOfLines={2}>
                {item.detail}
              </Text>
            </View>
            <Text style={styles.time}>{formatWhen(item.at)}</Text>
          </View>
        ))
      )}
    </Section>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.section}>{title}</Text>
      {children}
    </View>
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

function SummaryGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <View style={styles.summaryGrid}>
      {items.map((item) => (
        <View key={item.label} style={styles.summaryCard}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.summaryValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: space.lg,
    paddingBottom: 40,
    gap: space.lg,
  },
  stack: {
    gap: space.lg,
  },
  hero: {
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '700',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  meta: {
    color: colors.muted,
  },
  status: {
    fontWeight: '700',
    color: colors.info,
  },
  heroActions: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.sm,
    width: '100%',
  },
  heroAction: {
    flex: 1,
  },
  tabs: {
    gap: space.sm,
    paddingBottom: space.xs,
  },
  tab: {
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  tabTextActive: {
    color: colors.white,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: 10,
  },
  section: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  row: {
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 15,
    color: colors.text,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  summaryCard: {
    minWidth: '30%',
    flexGrow: 1,
    gap: 2,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  listCopy: {
    flex: 1,
    gap: 2,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  listMeta: {
    color: colors.muted,
    fontSize: 13,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touch.minHeight,
    gap: space.md,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  time: {
    color: colors.muted,
    fontSize: 12,
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
  dangerButton: {
    borderRadius: radius.md,
    minHeight: touch.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerBg,
  },
  dangerText: {
    color: colors.danger,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    textAlign: 'center',
  },
});
