import {xchacha20poly1305} from '@noble/ciphers/chacha.js';
import {scryptAsync} from '@noble/hashes/scrypt.js';
import {utf8ToBytes} from '@noble/hashes/utils.js';
import type {AppData} from '../types/domain';
import {buildJsonExport} from './dataExport';
import {parseJsonImport, type JsonImportPreview} from './dataImport';

export const ENCRYPTED_BACKUP_SCHEMA_VERSION = 1 as const;
export const BACKUP_CIPHER_NAME = 'xchacha20-poly1305' as const;
export const BACKUP_KDF_NAME = 'scrypt' as const;
export const BACKUP_SCRYPT_N = 2 ** 15;
export const BACKUP_SCRYPT_R = 8;
export const BACKUP_SCRYPT_P = 1;
export const BACKUP_KEY_BYTES = 32;
export const BACKUP_SALT_BYTES = 16;
export const BACKUP_NONCE_BYTES = 24;
export const BACKUP_MIN_PASSWORD_LENGTH = 12;
export const BACKUP_MAX_PLAINTEXT_BYTES = 16 * 1024 * 1024;
export const RECOVERY_KEY_BYTES = 32;
export const RECOVERY_KEY_HEX_LENGTH = RECOVERY_KEY_BYTES * 2;

const BACKUP_SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;

interface EncryptedBackupKdf {
  name: typeof BACKUP_KDF_NAME;
  N: number;
  r: number;
  p: number;
  dkLen: typeof BACKUP_KEY_BYTES;
  saltBase64: string;
}

interface EncryptedBackupCipher {
  name: typeof BACKUP_CIPHER_NAME;
  nonceBase64: string;
  tagBytes: 16;
}

interface EncryptedBackupHeader {
  backupSchemaVersion: typeof ENCRYPTED_BACKUP_SCHEMA_VERSION;
  appSchemaVersion: AppData['schemaVersion'];
  createdAt: string;
  credential: EncryptedBackupCredential;
  kdf: EncryptedBackupKdf;
  cipher: EncryptedBackupCipher;
}

export type EncryptedBackupCredential = 'password' | 'recovery-key';

export interface EncryptedBackupEnvelope {
  header: EncryptedBackupHeader;
  ciphertextBase64: string;
}

export interface EncryptedBackupPreview extends JsonImportPreview {
  createdAt: string;
  encryptedBytes: number;
  credential: EncryptedBackupCredential;
}

export class EncryptedBackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptedBackupError';
  }
}

export type BackupRandomBytes = (length: number) => Uint8Array;

export async function buildEncryptedBackup(
  data: AppData,
  password: string,
  createdAt: string,
  randomBytes: BackupRandomBytes = secureRandomBytes,
): Promise<string> {
  return buildEncryptedBackupWithCredential(data, password, createdAt, 'password', randomBytes);
}

export async function buildRecoveryEncryptedBackup(
  data: AppData,
  recoveryKey: string,
  createdAt: string,
  randomBytes: BackupRandomBytes = secureRandomBytes,
): Promise<string> {
  return buildEncryptedBackupWithCredential(data, normalizeRecoveryKey(recoveryKey), createdAt, 'recovery-key', randomBytes);
}

async function buildEncryptedBackupWithCredential(
  data: AppData,
  credential: string,
  createdAt: string,
  credentialType: EncryptedBackupCredential,
  randomBytes: BackupRandomBytes,
): Promise<string> {
  if (credentialType === 'password') {
    validatePassword(credential);
  }
  if (!isIsoDate(createdAt)) {
    throw new EncryptedBackupError('Backup timestamp is invalid.');
  }

  const salt = getRandomBytes(randomBytes, BACKUP_SALT_BYTES);
  const nonce = getRandomBytes(randomBytes, BACKUP_NONCE_BYTES);
  const header: EncryptedBackupHeader = {
    backupSchemaVersion: ENCRYPTED_BACKUP_SCHEMA_VERSION,
    appSchemaVersion: data.schemaVersion,
    createdAt,
    credential: credentialType,
    kdf: {
      name: BACKUP_KDF_NAME,
      N: BACKUP_SCRYPT_N,
      r: BACKUP_SCRYPT_R,
      p: BACKUP_SCRYPT_P,
      dkLen: BACKUP_KEY_BYTES,
      saltBase64: bytesToBase64(salt),
    },
    cipher: {
      name: BACKUP_CIPHER_NAME,
      nonceBase64: bytesToBase64(nonce),
      tagBytes: 16,
    },
  };
  const headerJson = JSON.stringify(header);
  const plaintext = utf8ToBytes(buildJsonExport(data, createdAt));
  if (plaintext.length > BACKUP_MAX_PLAINTEXT_BYTES) {
    throw new EncryptedBackupError('This workspace is too large for a local encrypted backup.');
  }
  const key = await deriveKey(credential, salt, header.kdf);
  const ciphertext = xchacha20poly1305(key, nonce, utf8ToBytes(headerJson)).encrypt(plaintext);
  return JSON.stringify({header, ciphertextBase64: bytesToBase64(ciphertext)} satisfies EncryptedBackupEnvelope);
}

export async function decryptEncryptedBackup(raw: string, password: string): Promise<EncryptedBackupPreview> {
  validatePassword(password);
  const envelope = parseEnvelope(raw);
  const salt = base64ToBytes(envelope.header.kdf.saltBase64, BACKUP_SALT_BYTES);
  const nonce = base64ToBytes(envelope.header.cipher.nonceBase64, BACKUP_NONCE_BYTES);
  const ciphertext = base64ToBytes(envelope.ciphertextBase64);
  if (ciphertext.length <= envelope.header.cipher.tagBytes || ciphertext.length > BACKUP_MAX_PLAINTEXT_BYTES + envelope.header.cipher.tagBytes) {
    throw new EncryptedBackupError('Encrypted backup size is invalid.');
  }

  try {
    const credential = envelope.header.credential === 'recovery-key' ? normalizeRecoveryKey(password) : password;
    const key = await deriveKey(credential, salt, envelope.header.kdf);
    const plaintext = xchacha20poly1305(key, nonce, utf8ToBytes(JSON.stringify(envelope.header))).decrypt(ciphertext);
    const preview = parseJsonImport(decodeUtf8(plaintext));
    if (preview.data.schemaVersion !== envelope.header.appSchemaVersion) {
      throw new EncryptedBackupError('Encrypted backup metadata does not match its data.');
    }
    return {
      ...preview,
      createdAt: envelope.header.createdAt,
      encryptedBytes: ciphertext.length,
      credential: envelope.header.credential,
    };
  } catch (error) {
    if (error instanceof EncryptedBackupError) {
      throw error;
    }
    throw new EncryptedBackupError('The password is wrong or the encrypted backup is damaged.');
  }
}

function parseEnvelope(raw: string): EncryptedBackupEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new EncryptedBackupError('Encrypted backup is not valid JSON.');
  }
  if (!isRecord(parsed) || !isRecord(parsed.header) || typeof parsed.ciphertextBase64 !== 'string') {
    throw new EncryptedBackupError('Encrypted backup envelope is invalid.');
  }
  const header = parsed.header;
  const kdf = header.kdf;
  const cipher = header.cipher;
  const credential = header.credential;
  if (
    header.backupSchemaVersion !== ENCRYPTED_BACKUP_SCHEMA_VERSION ||
    typeof header.appSchemaVersion !== 'number' ||
    !Number.isInteger(header.appSchemaVersion) ||
    header.appSchemaVersion < 1 ||
    header.appSchemaVersion > 10 ||
    !isIsoDate(header.createdAt) ||
    (credential !== undefined && credential !== 'password' && credential !== 'recovery-key') ||
    !isRecord(kdf) ||
    !isRecord(cipher) ||
    kdf.name !== BACKUP_KDF_NAME ||
    kdf.N !== BACKUP_SCRYPT_N ||
    kdf.r !== BACKUP_SCRYPT_R ||
    kdf.p !== BACKUP_SCRYPT_P ||
    kdf.dkLen !== BACKUP_KEY_BYTES ||
    typeof kdf.saltBase64 !== 'string' ||
    cipher.name !== BACKUP_CIPHER_NAME ||
    typeof cipher.nonceBase64 !== 'string' ||
    cipher.tagBytes !== 16
  ) {
    throw new EncryptedBackupError('Encrypted backup parameters are not supported.');
  }
  return {
    ...parsed,
    header: {...header, credential: credential ?? 'password'},
  } as unknown as EncryptedBackupEnvelope;
}

async function deriveKey(password: string, salt: Uint8Array, kdf: EncryptedBackupKdf): Promise<Uint8Array> {
  return scryptAsync(password, salt, {
    N: kdf.N,
    r: kdf.r,
    p: kdf.p,
    dkLen: kdf.dkLen,
    asyncTick: 10,
    maxmem: BACKUP_SCRYPT_MAX_MEMORY,
  });
}

function validatePassword(password: string): void {
  if (typeof password !== 'string' || password.length < BACKUP_MIN_PASSWORD_LENGTH) {
    throw new EncryptedBackupError(`Backup password must be at least ${BACKUP_MIN_PASSWORD_LENGTH} characters.`);
  }
}

export function generateRecoveryKey(randomBytes: BackupRandomBytes = secureRandomBytes): string {
  return formatRecoveryKey(getRandomBytes(randomBytes, RECOVERY_KEY_BYTES));
}

export function normalizeRecoveryKey(value: string): string {
  const compact = value.replace(/[\s-]/g, '').toUpperCase();
  if (!new RegExp(`^[0-9A-F]{${RECOVERY_KEY_HEX_LENGTH}}$`).test(compact)) {
    throw new EncryptedBackupError('Recovery key must contain 64 hexadecimal characters.');
  }
  const groups: string[] = [];
  for (let index = 0; index < compact.length; index += 8) {
    groups.push(compact.slice(index, index + 8));
  }
  return groups.join('-');
}

export function isRecoveryKey(value: string): boolean {
  try {
    normalizeRecoveryKey(value);
    return true;
  } catch {
    return false;
  }
}

function secureRandomBytes(length: number): Uint8Array {
  const cryptoProvider = (globalThis as typeof globalThis & {crypto?: {getRandomValues: (array: Uint8Array) => Uint8Array}}).crypto;
  if (!cryptoProvider || typeof cryptoProvider.getRandomValues !== 'function') {
    throw new EncryptedBackupError('Secure random bytes are not available on this device.');
  }
  return cryptoProvider.getRandomValues(new Uint8Array(length));
}

function getRandomBytes(randomBytes: BackupRandomBytes, length: number): Uint8Array {
  const bytes = randomBytes(length);
  if (!(bytes instanceof Uint8Array) || bytes.length !== length) {
    throw new EncryptedBackupError('The backup random source returned an invalid length.');
  }
  return bytes;
}

function formatRecoveryKey(bytes: Uint8Array): string {
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  const groups: string[] = [];
  for (let index = 0; index < hex.length; index += 8) {
    groups.push(hex.slice(index, index + 8));
  }
  return groups.join('-');
}

function decodeUtf8(bytes: Uint8Array): string {
  let result = '';

  for (let index = 0; index < bytes.length; ) {
    const first = bytes[index++];
    let codePoint: number;

    if (first <= 0x7f) {
      codePoint = first;
    } else if (first >= 0xc2 && first <= 0xdf) {
      const second = nextContinuationByte(bytes, index++);
      codePoint = ((first & 0x1f) << 6) | (second & 0x3f);
    } else if (first >= 0xe0 && first <= 0xef) {
      const second = nextContinuationByte(bytes, index++);
      const third = nextContinuationByte(bytes, index++);
      if ((first === 0xe0 && second < 0xa0) || (first === 0xed && second >= 0xa0)) {
        throw new EncryptedBackupError('Encrypted backup text is invalid.');
      }
      codePoint = ((first & 0x0f) << 12) | ((second & 0x3f) << 6) | (third & 0x3f);
    } else if (first >= 0xf0 && first <= 0xf4) {
      const second = nextContinuationByte(bytes, index++);
      const third = nextContinuationByte(bytes, index++);
      const fourth = nextContinuationByte(bytes, index++);
      if ((first === 0xf0 && second < 0x90) || (first === 0xf4 && second > 0x8f)) {
        throw new EncryptedBackupError('Encrypted backup text is invalid.');
      }
      codePoint = ((first & 0x07) << 18) | ((second & 0x3f) << 12) | ((third & 0x3f) << 6) | (fourth & 0x3f);
    } else {
      throw new EncryptedBackupError('Encrypted backup text is invalid.');
    }

    result += String.fromCodePoint(codePoint);
  }

  return result;
}

function nextContinuationByte(bytes: Uint8Array, index: number): number {
  const byte = bytes[index];
  if (byte === undefined || byte < 0x80 || byte > 0xbf) {
    throw new EncryptedBackupError('Encrypted backup text is invalid.');
  }
  return byte;
}

function bytesToBase64(bytes: Uint8Array): string {
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

function base64ToBytes(value: string, expectedLength?: number): Uint8Array {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new EncryptedBackupError('Encrypted backup contains invalid base64 data.');
  }
  const outputLength = (value.length / 4) * 3 - (value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0);
  if (expectedLength !== undefined && outputLength !== expectedLength) {
    throw new EncryptedBackupError('Encrypted backup field length is invalid.');
  }
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const output = new Uint8Array(outputLength);
  let outputIndex = 0;
  for (let index = 0; index < value.length; index += 4) {
    const first = alphabet.indexOf(value[index]);
    const second = alphabet.indexOf(value[index + 1]);
    const third = value[index + 2] === '=' ? 0 : alphabet.indexOf(value[index + 2]);
    const fourth = value[index + 3] === '=' ? 0 : alphabet.indexOf(value[index + 3]);
    output[outputIndex++] = (first << 2) | (second >> 4);
    if (outputIndex < output.length) {
      output[outputIndex++] = ((second & 15) << 4) | (third >> 2);
    }
    if (outputIndex < output.length) {
      output[outputIndex++] = ((third & 3) << 6) | fourth;
    }
  }
  return output;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}
