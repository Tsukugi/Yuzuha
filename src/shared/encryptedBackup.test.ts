import {xchacha20poly1305} from '@noble/ciphers/chacha.js';
import {scryptAsync} from '@noble/hashes/scrypt.js';
import {utf8ToBytes} from '@noble/hashes/utils.js';
import {emptyAppData} from '../types/domain';
import {
  BACKUP_MIN_PASSWORD_LENGTH,
  BACKUP_KEY_BYTES,
  BACKUP_KDF_NAME,
  BACKUP_SCRYPT_N,
  BACKUP_SCRYPT_P,
  BACKUP_SCRYPT_R,
  BACKUP_CIPHER_NAME,
  BACKUP_NONCE_BYTES,
  BACKUP_SALT_BYTES,
  EncryptedBackupError,
  buildEncryptedBackup,
  buildRecoveryEncryptedBackup,
  decryptEncryptedBackup,
  generateRecoveryKey,
} from './encryptedBackup';
import {buildJsonExport} from './dataExport';

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
    data.attachments.push({
      id: 'attachment_secret',
      noteId: 'note_secret',
      name: 'private.txt',
      mimeType: 'text/plain',
      byteSize: 12,
      sha256: '7509e5bda0c762d2bac7f90d758b5b2263fa01ccbc542ab5e3df163be08e6ca9',
      createdAt,
      updatedAt: createdAt,
    });

    const attachmentFiles = [{
      id: 'attachment_secret',
      byteSize: 12,
      sha256: '7509e5bda0c762d2bac7f90d758b5b2263fa01ccbc542ab5e3df163be08e6ca9',
      base64: 'aGVsbG8gd29ybGQh',
    }];
    const backup = await buildEncryptedBackup(data, password, createdAt, deterministicRandomBytes, attachmentFiles);
    const preview = await decryptEncryptedBackup(backup, password);

    expect(backup).not.toContain('Do not expose this text');
    expect(preview.data).toEqual(data);
    expect(preview.recordCounts.notes).toBe(1);
    expect(preview.recordCounts.attachments).toBe(1);
    expect(preview.attachmentFiles).toEqual(attachmentFiles);
    expect(preview.createdAt).toBe(createdAt);
    expect(preview.encryptedBytes).toBeGreaterThan(16);
  });

  it('reads a schema 1 encrypted backup without attachment bytes', async () => {
    const data = emptyAppData();
    data.notes.push({
      id: 'legacy_note',
      title: 'Legacy note',
      body: '',
      isPinned: false,
      createdAt,
      updatedAt: createdAt,
    });
    data.attachments.push({
      id: 'legacy_attachment',
      noteId: 'legacy_note',
      name: 'legacy.txt',
      mimeType: 'text/plain',
      byteSize: 12,
      sha256: '7509e5bda0c762d2bac7f90d758b5b2263fa01ccbc542ab5e3df163be08e6ca9',
      createdAt,
      updatedAt: createdAt,
    });
    const salt = Uint8Array.from({length: BACKUP_SALT_BYTES}, (_, index) => index + 1);
    const nonce = Uint8Array.from({length: BACKUP_NONCE_BYTES}, (_, index) => index + 2);
    const header = {
      backupSchemaVersion: 1,
      appSchemaVersion: data.schemaVersion,
      createdAt,
      credential: 'password',
      kdf: {
        name: BACKUP_KDF_NAME,
        N: BACKUP_SCRYPT_N,
        r: BACKUP_SCRYPT_R,
        p: BACKUP_SCRYPT_P,
        dkLen: BACKUP_KEY_BYTES,
        saltBase64: toBase64(salt),
      },
      cipher: {
        name: BACKUP_CIPHER_NAME,
        nonceBase64: toBase64(nonce),
        tagBytes: 16,
      },
    };
    const key = await scryptAsync(password, salt, {N: BACKUP_SCRYPT_N, r: BACKUP_SCRYPT_R, p: BACKUP_SCRYPT_P, dkLen: BACKUP_KEY_BYTES});
    const ciphertext = xchacha20poly1305(key, nonce, utf8ToBytes(JSON.stringify(header))).encrypt(utf8ToBytes(buildJsonExport(data, createdAt)));
    const raw = JSON.stringify({header, ciphertextBase64: toBase64(ciphertext)});

    const preview = await decryptEncryptedBackup(raw, password);

    expect(preview.data).toEqual(data);
    expect(preview.recordCounts.attachments).toBe(1);
    expect(preview.attachmentFiles).toEqual([]);
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

function toBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    result += alphabet[first >> 2];
    result += alphabet[((first & 3) << 4) | (second === undefined ? 0 : second >> 4)];
    result += second === undefined ? '=' : alphabet[((second & 15) << 2) | (third === undefined ? 0 : third >> 6)];
    result += third === undefined ? '=' : alphabet[third & 63];
  }
  return result;
}
