import {errorCodes, isErrorWithCode, keepLocalCopy, pick, saveDocuments} from '@react-native-documents/picker';
import {Dirs, FileSystem} from 'react-native-file-access';
import type {AppData} from '../types/domain';
import type {AttachmentBackupFile} from './attachmentBackup';
import {
  buildEncryptedBackup,
  buildRecoveryEncryptedBackup,
  decryptEncryptedBackup,
  EncryptedBackupError,
  type BackupRandomBytes,
  type EncryptedBackupPreview,
} from './encryptedBackup';

export const ENCRYPTED_BACKUP_MIME_TYPE = 'application/json';
export const ENCRYPTED_BACKUP_FILE_PREFIX = 'yuzuha-encrypted-backup';
export const RECOVERY_BACKUP_FILE_PREFIX = 'yuzuha-recovery-backup';
export const ENCRYPTED_BACKUP_MAX_FILE_BYTES = 96 * 1024 * 1024;

export interface EncryptedBackupFileResult {
  name: string;
}

export interface EncryptedBackupFilePreview extends EncryptedBackupPreview {
  name: string;
}

export class EncryptedBackupFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptedBackupFileError';
  }
}

export class EncryptedBackupFileCanceled extends EncryptedBackupFileError {
  constructor() {
    super('Backup file operation was canceled.');
    this.name = 'EncryptedBackupFileCanceled';
  }
}

export async function saveEncryptedBackupFile(data: AppData, password: string, createdAt: string, attachmentFiles: AttachmentBackupFile[] = []): Promise<EncryptedBackupFileResult> {
  return saveEncryptedBackupFileWithBuilder(data, password, createdAt, attachmentFiles, buildBackupFileName, buildEncryptedBackup);
}

export async function saveRecoveryEncryptedBackupFile(data: AppData, recoveryKey: string, createdAt: string, attachmentFiles: AttachmentBackupFile[] = []): Promise<EncryptedBackupFileResult> {
  return saveEncryptedBackupFileWithBuilder(data, recoveryKey, createdAt, attachmentFiles, buildRecoveryBackupFileName, buildRecoveryEncryptedBackup);
}

async function saveEncryptedBackupFileWithBuilder(
  data: AppData,
  credential: string,
  createdAt: string,
  attachmentFiles: AttachmentBackupFile[],
  fileNameBuilder: (createdAt: string) => string,
  buildBackup: (data: AppData, credential: string, createdAt: string, randomBytes?: BackupRandomBytes, attachmentFiles?: AttachmentBackupFile[]) => Promise<string>,
): Promise<EncryptedBackupFileResult> {
  const fileName = fileNameBuilder(createdAt);
  const temporaryPath = `${Dirs.CacheDir}/${fileName}`;
  const temporaryUri = toFileUri(temporaryPath);
  let temporaryFileCreated = false;

  try {
    const backup = await buildBackup(data, credential, createdAt, undefined, attachmentFiles);
    await FileSystem.writeFile(temporaryPath, backup, 'utf8');
    temporaryFileCreated = true;
    const savedFiles = await saveDocuments({
      sourceUris: [temporaryUri],
      mimeType: ENCRYPTED_BACKUP_MIME_TYPE,
      fileName,
    });
    const savedFile = savedFiles[0];
    if (!savedFile || savedFile.error) {
      throw new EncryptedBackupFileError('The encrypted backup file could not be saved.');
    }
    return {name: savedFile.name ?? fileName};
  } catch (error) {
    if (isCanceledError(error)) {
      throw new EncryptedBackupFileCanceled();
    }
    if (error instanceof EncryptedBackupError || error instanceof EncryptedBackupFileError) {
      throw error;
    }
    throw new EncryptedBackupFileError('The encrypted backup file could not be saved.');
  } finally {
    if (temporaryFileCreated) {
      await FileSystem.unlink(temporaryPath);
    }
  }
}

export async function openEncryptedBackupFile(password: string): Promise<EncryptedBackupFilePreview> {
  let pickedFile;
  try {
    [pickedFile] = await pick({
      mode: 'import',
      type: ENCRYPTED_BACKUP_MIME_TYPE,
      allowMultiSelection: false,
      allowVirtualFiles: false,
    });
  } catch (error) {
    if (isCanceledError(error)) {
      throw new EncryptedBackupFileCanceled();
    }
    throw new EncryptedBackupFileError('The encrypted backup file could not be opened.');
  }

  if (!pickedFile?.uri || pickedFile.error) {
    throw new EncryptedBackupFileError('The selected encrypted backup file is not readable.');
  }
  if (pickedFile.size !== null && pickedFile.size > ENCRYPTED_BACKUP_MAX_FILE_BYTES) {
    throw new EncryptedBackupFileError(`The encrypted backup file is larger than ${ENCRYPTED_BACKUP_MAX_FILE_BYTES} bytes.`);
  }

  let localUri: string | null = null;
  try {
    const localCopies = await keepLocalCopy({
      files: [{uri: pickedFile.uri, fileName: pickedFile.name ?? 'yuzuha-encrypted-backup.json'}],
      destination: 'cachesDirectory',
    });
    const localCopy = localCopies[0];
    if (!localCopy || localCopy.status !== 'success') {
      throw new EncryptedBackupFileError('The selected encrypted backup file could not be copied into app storage.');
    }
    localUri = localCopy.localUri;
    const stat = await FileSystem.stat(localUri);
    if (stat.type !== 'file' || stat.size > ENCRYPTED_BACKUP_MAX_FILE_BYTES) {
      throw new EncryptedBackupFileError(`The encrypted backup file is larger than ${ENCRYPTED_BACKUP_MAX_FILE_BYTES} bytes.`);
    }
    const raw = await FileSystem.readFile(localUri, 'utf8');
    const preview = await decryptEncryptedBackup(raw, password);
    return {
      ...preview,
      name: pickedFile.name ?? 'encrypted backup',
    };
  } catch (error) {
    if (error instanceof EncryptedBackupError || error instanceof EncryptedBackupFileError) {
      throw error;
    }
    throw new EncryptedBackupFileError('The selected encrypted backup file could not be read.');
  } finally {
    if (localUri) {
      await FileSystem.unlink(localUri);
    }
  }
}

export function buildBackupFileName(createdAt: string): string {
  return buildDatedBackupFileName(ENCRYPTED_BACKUP_FILE_PREFIX, createdAt);
}

export function buildRecoveryBackupFileName(createdAt: string): string {
  return buildDatedBackupFileName(RECOVERY_BACKUP_FILE_PREFIX, createdAt);
}

function buildDatedBackupFileName(prefix: string, createdAt: string): string {
  const date = createdAt.slice(0, 10);
  return `${prefix}-${date}.json`;
}

function toFileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

function isCanceledError(error: unknown): boolean {
  return isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED;
}
