export interface SearchCategory<T> {
  total: number;
  data: T[];
}

export interface SearchResponse {
  query: string;
  employees: SearchCategory<{
    id: string;
    employeeCode: string;
    fullName: string;
    jobTitle: string | null;
    status: string;
  }>;
  attendance: SearchCategory<{
    id: string;
    date: string;
    status: string;
    employeeCode: string;
    fullName: string;
  }>;
  leave: SearchCategory<{
    id: string;
    leaveType: string;
    status: string;
    startDate: string;
    endDate: string;
    employeeCode: string;
    fullName: string;
  }>;
  documents: SearchCategory<{
    id: string;
    documentType: string;
    expiryStatus: string;
    expiryDate: string | null;
    employeeCode: string;
    fullName: string;
  }>;
  payroll: SearchCategory<{
    id: string;
    employeeCode: string;
    fullName: string;
    month: number;
    year: number;
    paymentStatus: string;
  }>;
  invoices: SearchCategory<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    status: string;
    invoiceDate: string;
    dueDate: string;
  }>;
}
