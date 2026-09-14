import { asDateOnly, asNumber, asString, includesInsensitive, listCollection } from '@/lib/data';
import { calculateExpiryStatus, loadSettings, toPublicDocumentType } from '@/lib/domain';
import { loadEmployeeMap } from '@/features/employees/api';
import { SearchResponse } from './types';

export async function fetchGlobalSearch(
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<SearchResponse> {
  const query = String(params.q ?? params.query ?? '').trim();
  const limit = Number(params.limit ?? 8) || 8;
  const employees = await loadEmployeeMap();
  const settings = await loadSettings();
  const [attendance, leave, documents, payroll, invoices] = await Promise.all([
    listCollection('attendances'),
    listCollection('leaves'),
    listCollection('documents'),
    listCollection('payroll_records'),
    listCollection('invoices'),
  ]);

  const employeeHits = [...employees.values()].filter(
    (row) =>
      !query ||
      includesInsensitive(row.fullName, query) ||
      includesInsensitive(row.employeeCode, query) ||
      includesInsensitive(row.jobTitle, query),
  );
  const attendanceHits = attendance
    .map((row) => {
      const employee = employees.get(asString(row.employeeId));
      if (!employee) return null;
      const date = asDateOnly(row.date) ?? '';
      if (
        query &&
        !includesInsensitive(employee.fullName, query) &&
        !includesInsensitive(employee.employeeCode, query) &&
        !includesInsensitive(date, query)
      ) {
        return null;
      }
      return {
        id: row.id,
        date,
        status: asString(row.status),
        employeeCode: employee.employeeCode,
        fullName: employee.fullName,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
  const leaveHits = leave
    .map((row) => {
      const employee = employees.get(asString(row.employeeId));
      if (!employee) return null;
      if (
        query &&
        !includesInsensitive(employee.fullName, query) &&
        !includesInsensitive(employee.employeeCode, query)
      ) {
        return null;
      }
      return {
        id: row.id,
        leaveType: asString(row.leaveType),
        status: asString(row.status),
        startDate: asDateOnly(row.startDate) ?? '',
        endDate: asDateOnly(row.endDate) ?? '',
        employeeCode: employee.employeeCode,
        fullName: employee.fullName,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
  const documentHits = documents
    .map((row) => {
      const employee = employees.get(asString(row.employeeId));
      if (!employee) return null;
      const documentType = toPublicDocumentType(asString(row.documentType));
      if (
        query &&
        !includesInsensitive(employee.fullName, query) &&
        !includesInsensitive(documentType, query)
      ) {
        return null;
      }
      return {
        id: row.id,
        documentType,
        expiryStatus: calculateExpiryStatus(
          asDateOnly(row.expiryDate),
          settings.documents.expiryWarningDays,
        ),
        expiryDate: asDateOnly(row.expiryDate),
        employeeCode: employee.employeeCode,
        fullName: employee.fullName,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
  const payrollHits = payroll
    .map((row) => {
      const employee = employees.get(asString(row.employeeId));
      if (!employee) return null;
      if (
        query &&
        !includesInsensitive(employee.fullName, query) &&
        !includesInsensitive(employee.employeeCode, query)
      ) {
        return null;
      }
      return {
        id: row.id,
        employeeCode: employee.employeeCode,
        fullName: employee.fullName,
        month: asNumber(row.payrollMonth),
        year: asNumber(row.payrollYear),
        paymentStatus: asString(row.paymentStatus),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
  const invoiceHits = invoices
    .filter(
      (row) =>
        !query ||
        includesInsensitive(asString(row.invoiceNumber), query) ||
        includesInsensitive(asString(row.customerName), query),
    )
    .map((row) => ({
      id: row.id,
      invoiceNumber: asString(row.invoiceNumber),
      customerName: asString(row.customerName),
      status: asString(row.status),
      invoiceDate: asDateOnly(row.invoiceDate) ?? '',
      dueDate: asDateOnly(row.dueDate) ?? '',
    }));

  return {
    query,
    employees: { total: employeeHits.length, data: employeeHits.slice(0, limit).map((row) => ({
      id: row.id,
      employeeCode: row.employeeCode,
      fullName: row.fullName,
      jobTitle: row.jobTitle,
      status: row.employmentStatus,
    })) },
    attendance: { total: attendanceHits.length, data: attendanceHits.slice(0, limit) },
    leave: { total: leaveHits.length, data: leaveHits.slice(0, limit) },
    documents: { total: documentHits.length, data: documentHits.slice(0, limit) },
    payroll: { total: payrollHits.length, data: payrollHits.slice(0, limit) },
    invoices: { total: invoiceHits.length, data: invoiceHits.slice(0, limit) },
  };
}
