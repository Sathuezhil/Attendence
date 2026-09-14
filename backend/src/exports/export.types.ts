export interface ExportFilter {
  label: string;
  value: string;
}

export interface ExportMetric {
  label: string;
  value: string;
}

export interface ExportColumn {
  key: string;
  header: string;
  width?: number;
}

export interface ExportTable {
  columns: ExportColumn[];
  rows: Array<Record<string, string>>;
  truncated: boolean;
  totalMatches: number;
  includedRows: number;
}

export interface ReportExportDocument {
  title: string;
  fileStem: string;
  generatedAt: string;
  filters: ExportFilter[];
  summary: ExportMetric[];
  table: ExportTable;
}

export interface PayslipData {
  employeeCode: string;
  fullName: string;
  jobTitle: string | null;
  payrollMonth: number;
  payrollYear: number;
  basicSalary: number;
  allowances: number;
  overtimeAmount: number;
  unpaidLeaveDays: number;
  unpaidLeaveDeduction: number;
  otherDeductions: number;
  grossSalary: number;
  netSalary: number;
  paymentStatus: string;
  paymentDate: string | null;
}
