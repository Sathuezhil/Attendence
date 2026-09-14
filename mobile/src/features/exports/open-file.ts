import { csvFromRows, openLocalFile, textToBytes } from '@/lib/open-file';
import { asDateOnly, asNumber, asString, listCollection } from '@/lib/data';
import { loadEmployeeMap, loadEmployeeRows, mapEmployee } from '@/features/employees/api';
import { fetchInvoice } from '@/features/invoices/api';
import { fetchPayrollRecord } from '@/features/payroll/api';
import { money as invoiceMoney } from '@/features/invoices/format';
import { money as payrollMoney, monthLabel } from '@/features/payroll/format';

function parsePath(path: string): { pathname: string; params: URLSearchParams } {
  const [pathname, query = ''] = path.split('?');
  return { pathname, params: new URLSearchParams(query) };
}

export async function downloadAndOpenExport(path: string): Promise<void> {
  const { pathname, params } = parsePath(path);
  const payrollMatch = pathname.match(/^\/payroll\/([^/]+)\/payslip$/);
  if (payrollMatch) {
    const record = await fetchPayrollRecord(payrollMatch[1]);
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Payslip</title></head><body>
      <h1>Payslip</h1>
      <p>${record.employee.fullName} (${record.employee.employeeCode})</p>
      <p>${monthLabel(record.payrollMonth)} ${record.payrollYear}</p>
      <p>Basic: ${payrollMoney(record.basicSalary)}</p>
      <p>Allowances: ${payrollMoney(record.allowances)}</p>
      <p>Overtime: ${payrollMoney(record.overtimeAmount)}</p>
      <p>Deductions: ${payrollMoney(record.deductions + record.otherDeductions + record.unpaidLeaveDeduction)}</p>
      <p>Net: ${payrollMoney(record.netSalary)}</p>
    </body></html>`;
    await openLocalFile({
      bytes: textToBytes(html),
      contentType: 'text/html',
      fileName: `payslip-${record.employee.employeeCode}.html`,
    });
    return;
  }

  const invoiceMatch = pathname.match(/^\/invoices\/([^/]+)\/pdf$/);
  if (invoiceMatch) {
    const invoice = await fetchInvoice(invoiceMatch[1]);
    const items = invoice.items
      .map(
        (item) =>
          `<tr><td>${item.description}</td><td>${item.quantity}</td><td>${invoiceMoney(item.unitPrice)}</td><td>${invoiceMoney(item.lineTotal)}</td></tr>`,
      )
      .join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${invoice.invoiceNumber}</title></head><body>
      <h1>${invoice.invoiceNumber}</h1>
      <p>${invoice.company?.name ?? ''}</p>
      <p>Bill to: ${invoice.customerName}</p>
      <p>Date: ${invoice.invoiceDate} · Due: ${invoice.dueDate}</p>
      <table border="1" cellpadding="6"><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
      <tbody>${items}</tbody></table>
      <p>Total: ${invoiceMoney(invoice.totalAmount)}</p>
    </body></html>`;
    await openLocalFile({
      bytes: textToBytes(html),
      contentType: 'text/html',
      fileName: `${invoice.invoiceNumber}.html`,
    });
    return;
  }

  const kind = pathname.split('/')[2] ?? 'export';
  const csv = await buildReportCsv(kind, params);
  await openLocalFile({
    bytes: textToBytes(csv),
    contentType: 'text/csv',
    fileName: `${kind}-report.csv`,
  });
}

async function buildReportCsv(kind: string, params: URLSearchParams): Promise<string> {
  const employees = await loadEmployeeMap();
  if (kind === 'employees') {
    const rows = (await loadEmployeeRows()).map(mapEmployee);
    return csvFromRows(
      ['Code', 'Name', 'Job title', 'Status', 'Joining date'],
      rows.map((row) => [row.employeeCode, row.fullName, row.jobTitle, row.employmentStatus, row.joiningDate]),
    );
  }
  if (kind === 'attendance') {
    const rows = await listCollection('attendances');
    return csvFromRows(
      ['Date', 'Employee', 'Status', 'Check in', 'Check out'],
      rows.map((row) => {
        const employee = employees.get(asString(row.employeeId));
        return [
          asDateOnly(row.date),
          employee?.fullName ?? '',
          asString(row.status),
          asString(row.checkIn),
          asString(row.checkOut),
        ];
      }),
    );
  }
  if (kind === 'leave') {
    const rows = await listCollection('leaves');
    return csvFromRows(
      ['Employee', 'Type', 'Status', 'Start', 'End', 'Days'],
      rows.map((row) => {
        const employee = employees.get(asString(row.employeeId));
        return [
          employee?.fullName ?? '',
          asString(row.leaveType),
          asString(row.status),
          asDateOnly(row.startDate),
          asDateOnly(row.endDate),
          asNumber(row.totalDays),
        ];
      }),
    );
  }
  if (kind === 'payroll') {
    const rows = await listCollection('payroll_records');
    return csvFromRows(
      ['Employee', 'Month', 'Year', 'Net', 'Status'],
      rows.map((row) => {
        const employee = employees.get(asString(row.employeeId));
        return [
          employee?.fullName ?? '',
          asNumber(row.payrollMonth),
          asNumber(row.payrollYear),
          asNumber(row.netSalary),
          asString(row.paymentStatus),
        ];
      }),
    );
  }
  if (kind === 'invoices') {
    const rows = await listCollection('invoices');
    return csvFromRows(
      ['Number', 'Customer', 'Date', 'Due', 'Total', 'Status'],
      rows.map((row) => [
        asString(row.invoiceNumber),
        asString(row.customerName),
        asDateOnly(row.invoiceDate),
        asDateOnly(row.dueDate),
        asNumber(row.totalAmount),
        asString(row.status),
      ]),
    );
  }
  const rows = await listCollection('documents');
  return csvFromRows(
    ['Employee', 'Type', 'Expiry', 'File'],
    rows.map((row) => {
      const employee = employees.get(asString(row.employeeId));
      return [
        employee?.fullName ?? '',
        asString(row.documentType),
        asDateOnly(row.expiryDate),
        asString(row.fileName),
      ];
    }),
  );
}
