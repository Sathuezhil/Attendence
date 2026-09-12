export const DEFAULT_EXPIRY_REMINDER_DAYS = [90, 60, 30, 7] as const;

export type ExpiryReminderDay = (typeof DEFAULT_EXPIRY_REMINDER_DAYS)[number];
