import {emptyAppData} from '../types/domain';
import {
  BACKUP_MIN_PASSWORD_LENGTH,
  EncryptedBackupError,
  buildEncryptedBackup,
  buildRecoveryEncryptedBackup,
  decryptEncryptedBackup,
  generateRecoveryKey,
} from './encryptedBackup';

const password = 'correct horse battery staple';
const createdAt = '2026-07-26T12:00:00.000Z';

function deterministicRandomBytes(length: number): Uint8Array {
  return Uint8Array.from({length}, (_, index) => (index * 17 + 3) % 256);
}

describe('encrypted backups', () => {
  it('round-trips the complete workspace and keeps plaintext out of the envelope', async () => {
    const data = emptyAppData();
    data.notes.push({
      id: 'note_secret',
      title: 'Privé 🗂️',
      body: 'Do not expose this text — café',
      isPinned: false,
      createdAt,
      updatedAt: createdAt,
    });

    const backup = await buildEncryptedBackup(data, password, createdAt, deterministicRandomBytes);
    const preview = await decryptEncryptedBackup(backup, password);

    expect(backup).not.toContain('Do not expose this text');
    expect(preview.data).toEqual(data);
    expect(preview.recordCounts.notes).toBe(1);
    expect(preview.createdAt).toBe(createdAt);
    expect(preview.encryptedBytes).toBeGreaterThan(16);
  });

  it('rejects a wrong password and authenticated tampering', async () => {
    const backup = await buildEncryptedBackup(emptyAppData(), password, createdAt, deterministicRandomBytes);

    await expect(decryptEncryptedBackup(backup, 'wrong password that is long')).rejects.toThrow(/password/i);

    const parsed = JSON.parse(backup) as {ciphertextBase64: string};
    const index = parsed.ciphertextBase64.length - 3;
    parsed.ciphertextBase64 = `${parsed.ciphertextBase64.slice(0, index)}${parsed.ciphertextBase64[index] === 'A' ? 'B' : 'A'}${parsed.ciphertextBase64.slice(index + 1)}`;
    await expect(decryptEncryptedBackup(JSON.stringify(parsed), password)).rejects.toThrow(/password|damaged/i);
  });

  it('rejects weak passwords and unsupported backup envelopes', async () => {
    await expect(buildEncryptedBackup(emptyAppData(), 'short', createdAt, deterministicRandomBytes)).rejects.toThrow(
      `at least ${BACKUP_MIN_PASSWORD_LENGTH}`,
    );

    await expect(decryptEncryptedBackup('{"header":{},"ciphertextBase64":""}', password)).rejects.toBeInstanceOf(EncryptedBackupError);
  });

  it('generates a recovery key and uses it for a separately labeled encrypted backup', async () => {
    const recoveryKey = generateRecoveryKey(length => new Uint8Array(length).fill(0xab));
    expect(recoveryKey).toBe('ABABABAB-ABABABAB-ABABABAB-ABABABAB-ABABABAB-ABABABAB-ABABABAB-ABABABAB');

    const backup = await buildRecoveryEncryptedBackup(emptyAppData(), recoveryKey, createdAt, deterministicRandomBytes);
    const envelope = JSON.parse(backup) as {header: {credential: string}};
    const preview = await decryptEncryptedBackup(backup, recoveryKey.replaceAll('-', '').toLowerCase());

    expect(envelope.header.credential).toBe('recovery-key');
    expect(backup).not.toContain(recoveryKey);
    expect(preview.credential).toBe('recovery-key');
    expect(preview.createdAt).toBe(createdAt);

    const wrongRecoveryKey = generateRecoveryKey(length => new Uint8Array(length).fill(0xcd));
    await expect(decryptEncryptedBackup(backup, wrongRecoveryKey)).rejects.toThrow(/password|damaged/i);

    const tampered = JSON.parse(backup) as {header: {credential: string}};
    tampered.header.credential = 'password';
    await expect(decryptEncryptedBackup(JSON.stringify(tampered), recoveryKey)).rejects.toThrow(/password|damaged/i);
  });

  it('normalizes recovery key input and rejects malformed keys', async () => {
    const recoveryKey = generateRecoveryKey(length => new Uint8Array(length).fill(0x01));
    const ungroupedLowercase = recoveryKey.replaceAll('-', '').toLowerCase();
    await expect(buildRecoveryEncryptedBackup(emptyAppData(), ungroupedLowercase, createdAt, deterministicRandomBytes)).resolves.toBeDefined();
    await expect(buildRecoveryEncryptedBackup(emptyAppData(), 'not-a-recovery-key', createdAt, deterministicRandomBytes)).rejects.toThrow(/64 hexadecimal/);
  });

  it('decrypts on devices without a built-in TextDecoder', async () => {
    const backup = await buildEncryptedBackup(emptyAppData(), password, createdAt, deterministicRandomBytes);
    const originalDecoder = globalThis.TextDecoder;
    Object.defineProperty(globalThis, 'TextDecoder', {configurable: true, value: undefined});

    try {
      await expect(decryptEncryptedBackup(backup, password)).resolves.toMatchObject({createdAt});
    } finally {
      Object.defineProperty(globalThis, 'TextDecoder', {configurable: true, value: originalDecoder});
    }
  });
});
