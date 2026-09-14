import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import {
  ObjectStorage,
  StoredObject,
  UploadObjectInput,
} from './object-storage';

export class LocalObjectStorage implements ObjectStorage {
  constructor(private readonly rootDir: string) {}

  async upload(input: UploadObjectInput): Promise<StoredObject> {
    const filePath = this.resolveKey(input.key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, input.body);

    return {
      key: input.key,
      contentType: input.contentType,
      size: input.body.length,
    };
  }

  getSignedDownloadUrl(key: string): Promise<string> {
    return Promise.resolve(key);
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.resolveKey(key));
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolveKey(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  private resolveKey(key: string): string {
    const safeKey = key.replaceAll('..', '');
    return resolve(join(this.rootDir, safeKey));
  }
}
