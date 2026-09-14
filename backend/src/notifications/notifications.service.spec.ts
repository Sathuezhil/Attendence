import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

const row = {
  id: '11111111-1111-1111-1111-111111111111',
  type: 'DOCUMENT_EXPIRED',
  title: 'Document expired',
  message: 'Passport for Ada Lovelace expired on 2026-09-01.',
  employeeId: 'emp-1',
  documentId: 'doc-1',
  eventKey: 'document:doc-1:expired:2026-09-01',
  isRead: false,
  createdAt: new Date('2026-09-12T08:00:00.000Z'),
  readAt: null,
  employee: {
    id: 'emp-1',
    employeeCode: 'EMP-001',
    firstName: 'Ada',
    lastName: 'Lovelace',
  },
  document: {
    id: 'doc-1',
    documentType: 'PASSPORT',
    expiryDate: new Date('2026-09-01T00:00:00.000Z'),
  },
};

describe('NotificationsService', () => {
  const prisma = {
    notification: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(prisma as never);
  });

  it('returns an unread count', async () => {
    prisma.notification.count.mockResolvedValue(4);
    await expect(service.unreadCount()).resolves.toEqual({ count: 4 });
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { isRead: false },
    });
  });

  it('filters unread notifications', async () => {
    prisma.notification.count.mockResolvedValue(1);
    prisma.notification.findMany.mockResolvedValue([row]);

    const result = await service.list({ unreadOnly: true, page: 1, limit: 20 });
    expect(result.total).toBe(1);
    expect(result.data[0]?.isRead).toBe(false);
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type: undefined, isRead: false },
      }),
    );
  });

  it('marks one notification as read', async () => {
    prisma.notification.findUnique.mockResolvedValue(row);
    prisma.notification.update.mockResolvedValue({
      ...row,
      isRead: true,
      readAt: new Date('2026-09-12T09:00:00.000Z'),
    });

    const result = await service.markRead(row.id);
    expect(result.isRead).toBe(true);
    expect(result.readAt).toBe('2026-09-12T09:00:00.000Z');
  });

  it('marks all unread notifications as read', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 3 });
    await expect(service.markAllRead()).resolves.toEqual({ count: 3 });
  });

  it('rejects a missing notification', async () => {
    prisma.notification.findUnique.mockResolvedValue(null);
    await expect(service.markRead(row.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
