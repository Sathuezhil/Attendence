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

export interface ObjectStorage {
  upload(input: UploadObjectInput): Promise<StoredObject>;
  getSignedDownloadUrl(key: string, expiresInSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
}
