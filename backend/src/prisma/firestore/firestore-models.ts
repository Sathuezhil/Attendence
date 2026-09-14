export type RelationKind = 'belongsTo' | 'hasMany';

export interface ModelRelation {
  kind: RelationKind;
  model: ModelName;
  foreignKey: string;
}

export interface UniqueIndex {
  name: string;
  fields: string[];
  /** Only enforce when these field values match (e.g. deletedAt is null). */
  whereEquals?: Record<string, unknown>;
  skipIfNull?: string[];
}

export interface ModelConfig {
  collection: string;
  dateOnlyFields: string[];
  dateTimeFields: string[];
  decimalFields: string[];
  defaults: Record<string, unknown>;
  uniques: UniqueIndex[];
  relations: Record<string, ModelRelation>;
}

export type ModelName =
  | 'user'
  | 'refreshToken'
  | 'employee'
  | 'passport'
  | 'visa'
  | 'attendance'
  | 'leave'
  | 'invoice'
  | 'invoiceItem'
  | 'payrollRecord'
  | 'document'
  | 'notification'
  | 'backupLog'
  | 'auditLog'
  | 'appSetting';

export const MODEL_CONFIG: Record<ModelName, ModelConfig> = {
  user: {
    collection: 'users',
    dateOnlyFields: [],
    dateTimeFields: ['createdAt', 'updatedAt'],
    decimalFields: [],
    defaults: {
      role: 'ADMIN',
      twoFactorEnabled: false,
      twoFactorSecret: null,
    },
    uniques: [{ name: 'email', fields: ['email'] }],
    relations: {
      refreshTokens: {
        kind: 'hasMany',
        model: 'refreshToken',
        foreignKey: 'userId',
      },
    },
  },
  refreshToken: {
    collection: 'refresh_tokens',
    dateOnlyFields: [],
    dateTimeFields: ['expiresAt', 'revokedAt', 'createdAt'],
    decimalFields: [],
    defaults: { revokedAt: null },
    uniques: [{ name: 'tokenHash', fields: ['tokenHash'] }],
    relations: {
      user: { kind: 'belongsTo', model: 'user', foreignKey: 'userId' },
    },
  },
  employee: {
    collection: 'employees',
    dateOnlyFields: ['dateOfBirth', 'joiningDate'],
    dateTimeFields: ['deletedAt', 'createdAt', 'updatedAt'],
    decimalFields: ['salary'],
    defaults: {
      status: 'ACTIVE',
      email: null,
      phone: null,
      alternatePhone: null,
      dateOfBirth: null,
      gender: null,
      nationality: null,
      jobTitle: null,
      joiningDate: null,
      salary: null,
      profileImageUrl: null,
      deletedAt: null,
    },
    uniques: [
      {
        name: 'employeeCode',
        fields: ['employeeCode'],
        whereEquals: { deletedAt: null },
      },
      {
        name: 'email',
        fields: ['email'],
        whereEquals: { deletedAt: null },
        skipIfNull: ['email'],
      },
    ],
    relations: {},
  },
  passport: {
    collection: 'passports',
    dateOnlyFields: ['issueDate', 'expiryDate'],
    dateTimeFields: ['createdAt', 'updatedAt'],
    decimalFields: [],
    defaults: {},
    uniques: [
      {
        name: 'passportNumber',
        fields: ['passportNumber'],
        skipIfNull: ['passportNumber'],
      },
    ],
    relations: {
      employee: {
        kind: 'belongsTo',
        model: 'employee',
        foreignKey: 'employeeId',
      },
    },
  },
  visa: {
    collection: 'visas',
    dateOnlyFields: ['issueDate', 'expiryDate'],
    dateTimeFields: ['createdAt', 'updatedAt'],
    decimalFields: [],
    defaults: {},
    uniques: [
      {
        name: 'visaNumber',
        fields: ['visaNumber'],
        skipIfNull: ['visaNumber'],
      },
    ],
    relations: {
      employee: {
        kind: 'belongsTo',
        model: 'employee',
        foreignKey: 'employeeId',
      },
    },
  },
  attendance: {
    collection: 'attendances',
    dateOnlyFields: ['date'],
    dateTimeFields: ['checkIn', 'checkOut', 'createdAt', 'updatedAt'],
    decimalFields: [],
    defaults: {
      source: 'MANUAL',
      notes: null,
      metadata: null,
      checkIn: null,
      checkOut: null,
      lateMinutes: null,
      workingMinutes: null,
    },
    uniques: [{ name: 'employeeId_date', fields: ['employeeId', 'date'] }],
    relations: {
      employee: {
        kind: 'belongsTo',
        model: 'employee',
        foreignKey: 'employeeId',
      },
    },
  },
  leave: {
    collection: 'leaves',
    dateOnlyFields: ['startDate', 'endDate'],
    dateTimeFields: ['approvedAt', 'createdAt', 'updatedAt'],
    decimalFields: [],
    defaults: {
      status: 'PENDING',
      reason: null,
      approvedById: null,
      approvedAt: null,
      rejectionReason: null,
    },
    uniques: [],
    relations: {
      employee: {
        kind: 'belongsTo',
        model: 'employee',
        foreignKey: 'employeeId',
      },
      approvedBy: {
        kind: 'belongsTo',
        model: 'user',
        foreignKey: 'approvedById',
      },
    },
  },
  invoice: {
    collection: 'invoices',
    dateOnlyFields: ['invoiceDate', 'dueDate'],
    dateTimeFields: ['createdAt', 'updatedAt'],
    decimalFields: [
      'subtotal',
      'taxAmount',
      'discountAmount',
      'totalAmount',
    ],
    defaults: {
      status: 'DRAFT',
      taxAmount: 0,
      discountAmount: 0,
      customerEmail: null,
      customerPhone: null,
      customerAddress: null,
      notes: null,
    },
    uniques: [{ name: 'invoiceNumber', fields: ['invoiceNumber'] }],
    relations: {
      items: {
        kind: 'hasMany',
        model: 'invoiceItem',
        foreignKey: 'invoiceId',
      },
    },
  },
  invoiceItem: {
    collection: 'invoice_items',
    dateOnlyFields: [],
    dateTimeFields: ['createdAt', 'updatedAt'],
    decimalFields: [
      'quantity',
      'unitPrice',
      'taxRate',
      'discount',
      'lineTotal',
    ],
    defaults: { taxRate: 0, discount: 0 },
    uniques: [],
    relations: {
      invoice: {
        kind: 'belongsTo',
        model: 'invoice',
        foreignKey: 'invoiceId',
      },
    },
  },
  payrollRecord: {
    collection: 'payroll_records',
    dateOnlyFields: ['paymentDate'],
    dateTimeFields: ['createdAt', 'updatedAt'],
    decimalFields: [
      'basicSalary',
      'allowances',
      'overtimeAmount',
      'deductions',
      'unpaidLeaveDeduction',
      'otherDeductions',
      'grossSalary',
      'netSalary',
    ],
    defaults: {
      allowances: 0,
      overtimeAmount: 0,
      deductions: 0,
      unpaidLeaveDeduction: 0,
      otherDeductions: 0,
      unpaidLeaveDays: 0,
      paymentStatus: 'PENDING',
      paymentDate: null,
      notes: null,
    },
    uniques: [
      {
        name: 'employeeId_payrollMonth_payrollYear',
        fields: ['employeeId', 'payrollMonth', 'payrollYear'],
      },
    ],
    relations: {
      employee: {
        kind: 'belongsTo',
        model: 'employee',
        foreignKey: 'employeeId',
      },
    },
  },
  document: {
    collection: 'documents',
    dateOnlyFields: ['issueDate', 'expiryDate'],
    dateTimeFields: ['createdAt', 'updatedAt'],
    decimalFields: [],
    defaults: { notes: null, documentNumber: null },
    uniques: [],
    relations: {
      employee: {
        kind: 'belongsTo',
        model: 'employee',
        foreignKey: 'employeeId',
      },
    },
  },
  notification: {
    collection: 'notifications',
    dateOnlyFields: [],
    dateTimeFields: ['createdAt', 'readAt'],
    decimalFields: [],
    defaults: {
      isRead: false,
      employeeId: null,
      documentId: null,
      readAt: null,
    },
    uniques: [{ name: 'eventKey', fields: ['eventKey'] }],
    relations: {
      employee: {
        kind: 'belongsTo',
        model: 'employee',
        foreignKey: 'employeeId',
      },
      document: {
        kind: 'belongsTo',
        model: 'document',
        foreignKey: 'documentId',
      },
    },
  },
  backupLog: {
    collection: 'backup_logs',
    dateOnlyFields: [],
    dateTimeFields: ['createdAt', 'completedAt'],
    decimalFields: [],
    defaults: {
      fileName: null,
      storageLocation: null,
      errorMessage: null,
      completedAt: null,
    },
    uniques: [],
    relations: {},
  },
  auditLog: {
    collection: 'audit_logs',
    dateOnlyFields: [],
    dateTimeFields: ['createdAt'],
    decimalFields: [],
    defaults: { actorId: null, entityId: null, metadata: null },
    uniques: [],
    relations: {
      actor: { kind: 'belongsTo', model: 'user', foreignKey: 'actorId' },
    },
  },
  appSetting: {
    collection: 'app_settings',
    dateOnlyFields: [],
    dateTimeFields: ['createdAt', 'updatedAt'],
    decimalFields: [],
    defaults: {},
    uniques: [{ name: 'key', fields: ['key'] }],
    relations: {},
  },
};

export const COLLECTION_NAMES = Object.values(MODEL_CONFIG).map(
  (model) => model.collection,
);
