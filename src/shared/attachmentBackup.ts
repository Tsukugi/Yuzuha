import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex} from '@noble/hashes/utils.js';
import type {Attachment} from '../types/domain';
import {ATTACHMENT_MAX_BYTES, isSha256} from './attachment';

export const ATTACHMENT_BACKUP_MAX_TOTAL_BYTES = 32 * 1024 * 1024;

export interface AttachmentBackupFile {
  id: string;
  byteSize: number;
  sha256: string;
  base64: string;
}

export interface AttachmentRestoreStage {
  commit: () => Promise<void>;
  discard: () => Promise<void>;
}

export class AttachmentBackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttachmentBackupError';
  }
}

export function validateAttachmentBackupFiles(attachments: Attachment[], files: AttachmentBackupFile[]): void {
  if (!Array.isArray(files)) {
    throw new AttachmentBackupError('The encrypted backup has invalid attachment files.');
  }

  const attachmentById = new Map(attachments.map(attachment => [attachment.id, attachment]));
  const fileIds = new Set<string>();
  const declaredTotalBytes = files.reduce((total, file) => total + (Number.isSafeInteger(file.byteSize) && file.byteSize > 0 ? file.byteSize : 0), 0);
  if (declaredTotalBytes > ATTACHMENT_BACKUP_MAX_TOTAL_BYTES) {
    throw new AttachmentBackupError('The attachment files are too large for one encrypted backup.');
  }
  let totalBytes = 0;

  for (const file of files) {
    if (fileIds.has(file.id) || !attachmentById.has(file.id)) {
      throw new AttachmentBackupError('The encrypted backup has duplicate or unknown attachment files.');
    }
    fileIds.add(file.id);

    const attachment = attachmentById.get(file.id);
    if (!attachment || !Number.isSafeInteger(file.byteSize) || file.byteSize <= 0 || file.byteSize > ATTACHMENT_MAX_BYTES ||
        file.byteSize !== attachment.byteSize || file.sha256 !== attachment.sha256 || !isSha256(file.sha256) ||
        !isBase64(file.base64)) {
      throw new AttachmentBackupError(`Attachment ${file.id} does not match its metadata.`);
    }

    totalBytes += file.byteSize;
    if (totalBytes > ATTACHMENT_BACKUP_MAX_TOTAL_BYTES) {
      throw new AttachmentBackupError('The attachment files are too large for one encrypted backup.');
    }
    const bytes = decodeBase64(file.base64);
    if (bytes.length !== file.byteSize || bytesToHex(sha256(bytes)) !== file.sha256) {
      throw new AttachmentBackupError(`Attachment ${file.id} failed its checksum check.`);
    }
  }

  if (fileIds.size !== attachments.length) {
    throw new AttachmentBackupError('The encrypted backup does not contain all attachment files.');
  }
}

function isBase64(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value);
}

function decodeBase64(value: string): Uint8Array {
  const outputLength = (value.length / 4) * 3 - (value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0);
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
