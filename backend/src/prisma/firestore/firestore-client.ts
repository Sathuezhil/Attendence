import type { Firestore } from 'firebase-admin/firestore';
import { FirestoreDelegate } from './firestore-delegate';
import { createFirestore } from './firestore-init';
import { MODEL_CONFIG, ModelName } from './firestore-models';
import { DocumentStore, FirebaseDocumentStore } from './firestore-store';

export class FirestorePrismaClient {
  readonly store: DocumentStore;
  readonly user: FirestoreDelegate;
  readonly refreshToken: FirestoreDelegate;
  readonly employee: FirestoreDelegate;
  readonly passport: FirestoreDelegate;
  readonly visa: FirestoreDelegate;
  readonly attendance: FirestoreDelegate;
  readonly leave: FirestoreDelegate;
  readonly invoice: FirestoreDelegate;
  readonly invoiceItem: FirestoreDelegate;
  readonly payrollRecord: FirestoreDelegate;
  readonly document: FirestoreDelegate;
  readonly notification: FirestoreDelegate;
  readonly backupLog: FirestoreDelegate;
  readonly auditLog: FirestoreDelegate;
  readonly appSetting: FirestoreDelegate;

  private firestore: Firestore | null = null;
  private readonly delegates: Record<ModelName, FirestoreDelegate>;

  constructor(store?: DocumentStore) {
    this.store =
      store ??
      new FirebaseDocumentStore(() => {
        if (!this.firestore) {
          this.firestore = createFirestore();
        }
        return this.firestore;
      });

    const client = {
      store: this.store,
      delegate: (name: ModelName) => this.delegates[name],
    };
    this.delegates = {} as Record<ModelName, FirestoreDelegate>;
    for (const name of Object.keys(MODEL_CONFIG) as ModelName[]) {
      this.delegates[name] = new FirestoreDelegate(name, client);
    }

    this.user = this.delegates.user;
    this.refreshToken = this.delegates.refreshToken;
    this.employee = this.delegates.employee;
    this.passport = this.delegates.passport;
    this.visa = this.delegates.visa;
    this.attendance = this.delegates.attendance;
    this.leave = this.delegates.leave;
    this.invoice = this.delegates.invoice;
    this.invoiceItem = this.delegates.invoiceItem;
    this.payrollRecord = this.delegates.payrollRecord;
    this.document = this.delegates.document;
    this.notification = this.delegates.notification;
    this.backupLog = this.delegates.backupLog;
    this.auditLog = this.delegates.auditLog;
    this.appSetting = this.delegates.appSetting;
  }

  async $connect(): Promise<void> {
    if (!this.firestore) {
      this.firestore = createFirestore();
    }
    await this.store.ping();
  }

  async $disconnect(): Promise<void> {
    return;
  }

  async $queryRaw(
    ..._args: unknown[]
  ): Promise<Array<Record<string, unknown>>> {
    await this.store.ping();
    return [{ '?column?': 1 }];
  }

  $transaction<T>(
    fn: (tx: FirestorePrismaClient) => Promise<T>,
  ): Promise<T> {
    return fn(this);
  }
}
