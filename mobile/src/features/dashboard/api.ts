import { asDateOnly, asIso, asNumber, asString, listCollection } from '@/lib/data';
import { calendarDate, calculateExpiryStatus, loadSettings, roundMoney } from '@/lib/domain';
import { loadEmployeeRows, mapEmployee } from '@/features/employees/api';
import { DashboardSummary, RecentActivityResponse } from './types';

const OPEN_INVOICE_STATUSES = new Set(['SENT', 'PARTIALLY_PAID', 'OVERDUE']);

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const settings = await loadSettings();
  const today = calendarDate(settings.workingHours.timezone);
  const employees = (await loadEmployeeRows()).map(mapEmployee);
  const active = employees.filter((row) => row.employmentStatus === 'ACTIVE');
  const [attendance, leaves, documents, invoices] = await Promise.all([
    listCollection('attendances'),
    listCollection('leaves'),
    listCollection('documents'),
    listCollection('invoices'),
  ]);

  const todayRows = attendance.filter((row) => asDateOnly(row.date) === today);
  let present = 0;
  let halfDay = 0;
  let holiday = 0;
  for (const row of todayRows) {
    const status = asString(row.status);
    if (status === 'HALF_DAY') halfDay += 1;
    else if (status === 'HOLIDAY') holiday += 1;
    else if (status === 'PRESENT' || status === 'LATE') present += 1;
  }
  const onLeaveToday = Math.max(0, active.length - present - halfDay - holiday);
  let expired = 0;
  let expiringSoon = 0;
  for (const row of documents) {
    const status = calculateExpiryStatus(
      asDateOnly(row.expiryDate),
      settings.documents.expiryWarningDays,
    );
    if (status === 'EXPIRED') expired += 1;
    if (status === 'EXPIRING_SOON') expiringSoon += 1;
  }
  const outstanding = invoices.filter((row) => OPEN_INVOICE_STATUSES.has(asString(row.status)));

  return {
    employees: employees.length,
    activeEmployees: active.length,
    onLeaveToday,
    presentToday: present,
    absentToday: 0,
    lateToday: 0,
    documentsExpired: expired,
    documentsExpiringSoon: expiringSoon,
    pendingLeave: leaves.filter((row) => asString(row.status) === 'PENDING').length,
    outstandingInvoices: outstanding.length,
    outstandingInvoiceAmount: roundMoney(
      outstanding.reduce((sum, row) => sum + asNumber(row.totalAmount), 0),
    ),
  };
}

export async function fetchRecentActivity(): Promise<RecentActivityResponse> {
  const rows = (await listCollection('audit_logs'))
    .sort((a, b) => asIso(b.createdAt).localeCompare(asIso(a.createdAt)))
    .slice(0, 15);

  return {
    activities: rows.map((row) => {
      const action = asString(row.action).replaceAll(/[_-]+/g, ' ').trim();
      const entity = asString(row.entityType).replaceAll(/[_-]+/g, ' ').trim();
      return {
        id: row.id,
        type: asString(row.action),
        description: [action, entity].filter(Boolean).join(' · ') || 'Activity recorded',
        occurredAt: asIso(row.createdAt),
      };
    }),
  };
}
