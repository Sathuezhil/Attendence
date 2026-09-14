import { SearchService } from './search.service';

function emptyPage() {
  return { data: [], page: 1, limit: 8, total: 0, totalPages: 0 };
}

describe('SearchService', () => {
  const employees = { findAll: jest.fn() };
  const attendance = { findAll: jest.fn() };
  const leave = { findAll: jest.fn() };
  const documents = { list: jest.fn() };
  const payroll = { findAll: jest.fn() };
  const invoices = { findAll: jest.fn() };
  const service = new SearchService(
    employees as never,
    attendance as never,
    leave as never,
    documents as never,
    payroll as never,
    invoices as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    employees.findAll.mockResolvedValue(emptyPage());
    attendance.findAll.mockResolvedValue(emptyPage());
    leave.findAll.mockResolvedValue(emptyPage());
    documents.list.mockResolvedValue(emptyPage());
    payroll.findAll.mockResolvedValue(emptyPage());
    invoices.findAll.mockResolvedValue(emptyPage());
  });

  it('returns empty categories without hitting the database when q and filters are empty', async () => {
    await expect(service.search({})).resolves.toMatchObject({
      query: '',
      employees: { total: 0, data: [] },
      invoices: { total: 0, data: [] },
    });
    expect(employees.findAll).not.toHaveBeenCalled();
  });

  it('searches every module with a shared query and pagination limit', async () => {
    employees.findAll.mockResolvedValue({
      ...emptyPage(),
      total: 1,
      data: [
        {
          id: 'e1',
          employeeCode: 'EMP-01',
          fullName: 'Ada Lovelace',
          jobTitle: 'Engineer',
          employmentStatus: 'ACTIVE',
          basicSalary: 9000,
        },
      ],
    });

    const result = await service.search({ q: 'Ada', limit: 8 });
    expect(employees.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'Ada', page: 1, limit: 8 }),
    );
    expect(attendance.findAll).toHaveBeenCalled();
    expect(result.employees.data[0]).toEqual({
      id: 'e1',
      employeeCode: 'EMP-01',
      fullName: 'Ada Lovelace',
      jobTitle: 'Engineer',
      status: 'ACTIVE',
    });
    expect(JSON.stringify(result)).not.toContain('9000');
    expect(JSON.stringify(result)).not.toContain('basicSalary');
  });

  it('passes lateOnly and document expiry filters through', async () => {
    await service.search({ lateOnly: true, expiryStatus: 'EXPIRED' });
    expect(attendance.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ lateOnly: true, page: 1 }),
    );
    expect(documents.list).toHaveBeenCalledWith(
      expect.objectContaining({ expiryStatus: 'EXPIRED' }),
    );
  });

  it('does not scan unrelated modules when only employee filters are set', async () => {
    await service.search({ employeeStatus: 'ACTIVE' });
    expect(employees.findAll).toHaveBeenCalled();
    expect(attendance.findAll).not.toHaveBeenCalled();
    expect(payroll.findAll).not.toHaveBeenCalled();
    expect(invoices.findAll).not.toHaveBeenCalled();
    expect(leave.findAll).not.toHaveBeenCalled();
    expect(documents.list).not.toHaveBeenCalled();
  });

  it('omits payroll salary and document numbers from categorized hits', async () => {
    payroll.findAll.mockResolvedValue({
      ...emptyPage(),
      total: 1,
      data: [
        {
          id: 'p1',
          payrollMonth: 9,
          payrollYear: 2026,
          paymentStatus: 'PENDING',
          netSalary: 9000,
          employee: { employeeCode: 'EMP-01', fullName: 'Ada Lovelace' },
        },
      ],
    });
    documents.list.mockResolvedValue({
      ...emptyPage(),
      total: 1,
      data: [
        {
          id: 'd1',
          documentType: 'PASSPORT',
          expiryStatus: 'VALID',
          expiryDate: '2027-01-01',
          documentNumber: 'A1234567',
          employee: { employeeCode: 'EMP-01', fullName: 'Ada Lovelace' },
        },
      ],
    });

    const result = await service.search({ q: 'Ada' });
    expect(result.payroll.data[0]).toEqual({
      id: 'p1',
      employeeCode: 'EMP-01',
      fullName: 'Ada Lovelace',
      month: 9,
      year: 2026,
      paymentStatus: 'PENDING',
    });
    expect(JSON.stringify(result.payroll)).not.toContain('9000');
    expect(JSON.stringify(result.documents)).not.toContain('A1234567');
  });
});
