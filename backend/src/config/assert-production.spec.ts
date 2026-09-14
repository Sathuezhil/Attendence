import { assertProductionConfig } from './assert-production';

describe('assertProductionConfig', () => {
  const strong = 'a'.repeat(40);
  const storage = {
    clientId: 'client-id',
    clientSecret: 'client-secret',
    refreshToken: 'refresh-token',
    folderId: 'folder-id',
  };
  const firestore = {
    projectId: 'employee-management',
    clientEmail: 'firebase-adminsdk@example.iam.gserviceaccount.com',
    privateKey: '-----BEGIN PRIVATE KEY-----\\nfake\\n-----END PRIVATE KEY-----\\n',
  };

  it('allows development even with weak secrets', () => {
    expect(() =>
      assertProductionConfig({
        nodeEnv: 'development',
        corsOrigins: ['*'],
        jwt: { accessSecret: 'short', refreshSecret: 'short' },
      }),
    ).not.toThrow();
  });

  it('rejects wildcard CORS in production', () => {
    expect(() =>
      assertProductionConfig({
        nodeEnv: 'production',
        corsOrigins: ['*'],
        jwt: { accessSecret: strong, refreshSecret: `${strong}b` },
        firestore,
        storage,
      }),
    ).toThrow(/CORS_ORIGIN/);
  });

  it('rejects missing Firestore in production', () => {
    expect(() =>
      assertProductionConfig({
        nodeEnv: 'production',
        corsOrigins: ['https://admin.example'],
        jwt: { accessSecret: strong, refreshSecret: `${strong}b` },
        storage,
      }),
    ).toThrow(/Firestore is required/);
  });

  it('rejects missing Google Drive storage in production', () => {
    expect(() =>
      assertProductionConfig({
        nodeEnv: 'production',
        corsOrigins: ['https://admin.example'],
        jwt: { accessSecret: strong, refreshSecret: `${strong}b` },
        firestore,
      }),
    ).toThrow(/Google Drive storage is required/);
  });
});
