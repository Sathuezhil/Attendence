import type { Firestore } from 'firebase-admin/firestore';

export type StoredRecord = Record<string, unknown> & { id: string };

export interface DocumentStore {
  load(collection: string): Promise<Map<string, StoredRecord>>;
  set(
    collection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<void>;
  delete(collection: string, id: string): Promise<void>;
  ping(): Promise<void>;
}

export class MemoryDocumentStore implements DocumentStore {
  private readonly collections = new Map<string, Map<string, StoredRecord>>();

  private bucket(collection: string): Map<string, StoredRecord> {
    let bucket = this.collections.get(collection);
    if (!bucket) {
      bucket = new Map();
      this.collections.set(collection, bucket);
    }
    return bucket;
  }

  async load(collection: string): Promise<Map<string, StoredRecord>> {
    const copy = new Map<string, StoredRecord>();
    for (const [id, record] of this.bucket(collection)) {
      copy.set(id, { ...record });
    }
    return copy;
  }

  async set(
    collection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    this.bucket(collection).set(id, { ...data, id } as StoredRecord);
  }

  async delete(collection: string, id: string): Promise<void> {
    this.bucket(collection).delete(id);
  }

  async ping(): Promise<void> {
    return;
  }
}

export class FirebaseDocumentStore implements DocumentStore {
  constructor(private readonly getDb: () => Firestore | null) {}

  private requireDb(): Firestore {
    const db = this.getDb();
    if (!db) {
      throw new Error('Firestore is not configured');
    }
    return db;
  }

  async load(collection: string): Promise<Map<string, StoredRecord>> {
    const snap = await this.requireDb().collection(collection).get();
    const records = new Map<string, StoredRecord>();
    for (const doc of snap.docs) {
      records.set(doc.id, { id: doc.id, ...doc.data() } as StoredRecord);
    }
    return records;
  }

  async set(
    collection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await this.requireDb().collection(collection).doc(id).set(data);
  }

  async delete(collection: string, id: string): Promise<void> {
    await this.requireDb().collection(collection).doc(id).delete();
  }

  async ping(): Promise<void> {
    await this.requireDb().collection('app_settings').limit(1).get();
  }
}
