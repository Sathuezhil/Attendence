import { NotificationType } from '@prisma/client';
import {
  DEFAULT_DOCUMENT_URGENT_DAYS,
  DEFAULT_DOCUMENT_WARNING_DAYS,
} from '../documents/document-expiry';
import { buildExpiryNotificationDrafts } from './expiry-notification.factory';

const today = new Date('2026-09-12T00:00:00.000Z');
const thresholds = {
  warningDays: DEFAULT_DOCUMENT_WARNING_DAYS,
  urgentDays: DEFAULT_DOCUMENT_URGENT_DAYS,
};

const employee = { firstName: 'Ada', lastName: 'Lovelace' };

describe('expiry notification drafts', () => {
  it('creates an expiring notification at the 30-day threshold', () => {
    const drafts = buildExpiryNotificationDrafts(
      [
        {
          id: 'doc-30',
          employeeId: 'emp-1',
          documentType: 'PASSPORT',
          expiryDate: new Date('2026-10-12T00:00:00.000Z'),
          employee,
        },
      ],
      today,
      thresholds,
    );

    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.type).toBe(NotificationType.DOCUMENT_EXPIRING);
    expect(drafts[0]?.title).toBe('Document expiring soon');
    expect(drafts[0]?.eventKey).toBe('document:doc-30:soon:2026-10-12');
    expect(drafts[0]?.message).not.toMatch(/A1|passport number/i);
  });

  it('creates both soon and urgent notifications at the 7-day threshold', () => {
    const drafts = buildExpiryNotificationDrafts(
      [
        {
          id: 'doc-7',
          employeeId: 'emp-1',
          documentType: 'VISA',
          expiryDate: new Date('2026-09-19T00:00:00.000Z'),
          employee,
        },
      ],
      today,
      thresholds,
    );

    expect(drafts.map((draft) => draft.eventKey)).toEqual([
      'document:doc-7:soon:2026-09-19',
      'document:doc-7:urgent:2026-09-19',
    ]);
    expect(
      drafts.every(
        (draft) => draft.type === NotificationType.DOCUMENT_EXPIRING,
      ),
    ).toBe(true);
  });

  it('creates an expired notification and no expiring events', () => {
    const drafts = buildExpiryNotificationDrafts(
      [
        {
          id: 'doc-x',
          employeeId: 'emp-1',
          documentType: 'EMIRATES_ID',
          expiryDate: new Date('2026-09-01T00:00:00.000Z'),
          employee,
        },
      ],
      today,
      thresholds,
    );

    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.type).toBe(NotificationType.DOCUMENT_EXPIRED);
    expect(drafts[0]?.eventKey).toBe('document:doc-x:expired:2026-09-01');
    expect(JSON.stringify(drafts)).not.toContain('784');
  });

  it('builds the same event keys when run twice', () => {
    const input = [
      {
        id: 'doc-30',
        employeeId: 'emp-1',
        documentType: 'PASSPORT' as const,
        expiryDate: new Date('2026-10-12T00:00:00.000Z'),
        employee,
      },
    ];

    expect(buildExpiryNotificationDrafts(input, today, thresholds)).toEqual(
      buildExpiryNotificationDrafts(input, today, thresholds),
    );
  });
});
