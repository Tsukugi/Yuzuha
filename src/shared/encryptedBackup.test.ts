import {emptyAppData} from '../types/domain';
import {
  BACKUP_MIN_PASSWORD_LENGTH,
  EncryptedBackupError,
  buildEncryptedBackup,
  decryptEncryptedBackup,
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
      title: 'Private',
      body: 'Do not expose this text',
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
});
