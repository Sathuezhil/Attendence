export interface StoredObject {
  key: string;
  contentType: string;
  size: number;
}

export interface UploadObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export type StorageDriver = 'gdrive' | 'local';

export interface ObjectStorage {
  readonly driver: StorageDriver;
  upload(input: UploadObjectInput): Promise<StoredObject>;
  getSignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}
