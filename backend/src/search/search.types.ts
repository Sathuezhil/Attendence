export interface SearchHitEmployee {
  id: string;
  employeeCode: string;
  fullName: string;
  jobTitle: string | null;
  status: string;
}

export interface SearchHitAttendance {
  id: string;
  date: string;
  status: string;
  employeeCode: string;
  fullName: string;
}

export interface SearchHitLeave {
  id: string;
  leaveType: string;
  status: string;
  startDate: string;
  endDate: string;
  employeeCode: string;
  fullName: string;
}

export interface SearchHitDocument {
  id: string;
  documentType: string;
  expiryStatus: string;
  expiryDate: string | null;
  employeeCode: string;
  fullName: string;
}

export interface SearchHitPayroll {
  id: string;
  employeeCode: string;
  fullName: string;
  month: number;
  year: number;
  paymentStatus: string;
}

export interface SearchHitInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  status: string;
  invoiceDate: string;
  dueDate: string;
}

export interface SearchCategory<T> {
  total: number;
  data: T[];
}

export interface SearchResponse {
  query: string;
  employees: SearchCategory<SearchHitEmployee>;
  attendance: SearchCategory<SearchHitAttendance>;
  leave: SearchCategory<SearchHitLeave>;
  documents: SearchCategory<SearchHitDocument>;
  payroll: SearchCategory<SearchHitPayroll>;
  invoices: SearchCategory<SearchHitInvoice>;
}
