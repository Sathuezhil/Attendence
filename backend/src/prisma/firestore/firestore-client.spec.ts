import { EmployeeStatus, Prisma } from '@prisma/client';
import { FirestorePrismaClient } from './firestore-client';
import { MemoryDocumentStore } from './firestore-store';

describe('FirestorePrismaClient', () => {
  let db: FirestorePrismaClient;

  beforeEach(() => {
    db = new FirestorePrismaClient(new MemoryDocumentStore());
  });

  it('enforces unique employee codes for active employees', async () => {
    await db.employee.create({
      data: {
        employeeCode: 'EMP-001',
        firstName: 'Ada',
        lastName: 'Lovelace',
      },
    });

    await expect(
      db.employee.create({
        data: {
          employeeCode: 'EMP-001',
          firstName: 'Grace',
          lastName: 'Hopper',
        },
      }),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
  });

  it('allows reusing a deleted employee code', async () => {
    const created = await db.employee.create({
      data: {
        employeeCode: 'EMP-002',
        firstName: 'Ada',
        lastName: 'Lovelace',
      },
    });
    await db.employee.update({
      where: { id: created.id },
      data: { deletedAt: new Date(), status: EmployeeStatus.INACTIVE },
    });

    await expect(
      db.employee.create({
        data: {
          employeeCode: 'EMP-002',
          firstName: 'Grace',
          lastName: 'Hopper',
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({ employeeCode: 'EMP-002', firstName: 'Grace' }),
    );
  });

  it('upserts attendance by employee and date and includes the employee', async () => {
    const employee = await db.employee.create({
      data: {
        employeeCode: 'EMP-003',
        firstName: 'Ada',
        lastName: 'Lovelace',
      },
    });
    const date = new Date('2026-09-14T00:00:00.000Z');

    await db.attendance.upsert({
      where: { employeeId_date: { employeeId: employee.id, date } },
      create: {
        employeeId: employee.id,
        date,
        status: 'PRESENT',
      },
      update: { status: 'HALF_DAY' },
      include: { employee: { select: { firstName: true } } },
    });

    const updated = await db.attendance.upsert({
      where: { employeeId_date: { employeeId: employee.id, date } },
      create: {
        employeeId: employee.id,
        date,
        status: 'PRESENT',
      },
      update: { status: 'HALF_DAY' },
      include: { employee: { select: { firstName: true } } },
    });

    expect(updated.status).toBe('HALF_DAY');
    expect(updated.employee).toEqual({ firstName: 'Ada' });
  });

  it('creates invoice items through nested writes', async () => {
    const invoice = await db.invoice.create({
      data: {
        invoiceNumber: 'INV-2026-0001',
        customerName: 'Acme',
        invoiceDate: new Date('2026-09-01T00:00:00.000Z'),
        dueDate: new Date('2026-09-30T00:00:00.000Z'),
        subtotal: 100,
        totalAmount: 100,
        items: {
          create: [{ description: 'Work', quantity: 1, unitPrice: 100, lineTotal: 100 }],
        },
      },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });

    expect(invoice.items).toHaveLength(1);
    expect(Number(invoice.totalAmount)).toBe(100);
    expect(invoice.items[0].description).toBe('Work');
  });
});
