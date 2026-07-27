import {errorCodes, isErrorWithCode, keepLocalCopy, pick} from '@react-native-documents/picker';
import {Dirs, FileSystem} from 'react-native-file-access';
import type {Attachment} from '../types/domain';
import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_NAME_LENGTH,
  ATTACHMENT_PICKER_TYPES,
  isSupportedAttachmentMimeType,
} from './attachment';

export const ATTACHMENT_DIRECTORY_NAME = 'attachments';

export class AttachmentFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttachmentFileError';
  }
}

export class AttachmentFileCanceled extends AttachmentFileError {
  constructor() {
    super('Attachment file selection was canceled.');
    this.name = 'AttachmentFileCanceled';
  }
}

export function attachmentFilePath(attachmentId: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(attachmentId)) {
    throw new AttachmentFileError('Attachment ID is invalid.');
  }
  return `${Dirs.DocumentDir}/${ATTACHMENT_DIRECTORY_NAME}/${attachmentId}`;
}

export async function importAttachmentFile(noteId: string, attachmentId: string, createdAt: string): Promise<Attachment> {
  const targetPath = attachmentFilePath(attachmentId);
  let localUri: string | null = null;
  let targetCreated = false;
  let completed = false;

  try {
    const selectedFile = await selectAttachmentFile();
    const name = selectedFile.name?.trim() ?? '';
    const mimeType = (selectedFile.type ?? '').toLowerCase();
    if (!name || name.length > ATTACHMENT_MAX_NAME_LENGTH || !isSupportedAttachmentMimeType(mimeType)) {
      throw new AttachmentFileError('This file type or name is not supported.');
    }

    const localCopies = await keepLocalCopy({
      files: [{uri: selectedFile.uri, fileName: name}],
      destination: 'cachesDirectory',
    });
    const localCopy = localCopies[0];
    if (!localCopy || localCopy.status !== 'success') {
      throw new AttachmentFileError('The selected attachment could not be copied into app storage.');
    }
    localUri = localCopy.localUri;
    const sourceStat = await FileSystem.stat(localUri);
    if (sourceStat.type !== 'file' || sourceStat.size <= 0 || sourceStat.size > ATTACHMENT_MAX_BYTES) {
      throw new AttachmentFileError(`Attachments must be between 1 byte and ${ATTACHMENT_MAX_BYTES} bytes.`);
    }

    await ensureAttachmentDirectory();
    await FileSystem.cp(localUri, targetPath);
    targetCreated = true;
    const targetStat = await FileSystem.stat(targetPath);
    if (targetStat.type !== 'file' || targetStat.size !== sourceStat.size) {
      throw new AttachmentFileError('The saved attachment size could not be verified.');
    }
    const sha256 = (await FileSystem.hash(targetPath, 'SHA-256')).toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(sha256)) {
      throw new AttachmentFileError('The saved attachment checksum is invalid.');
    }
    completed = true;
    return {
      id: attachmentId,
      noteId,
      name,
      mimeType,
      byteSize: targetStat.size,
      sha256,
      createdAt,
      updatedAt: createdAt,
    };
  } catch (error) {
    if (error instanceof AttachmentFileError) {
      throw error;
    }
    throw new AttachmentFileError('The attachment could not be imported.');
  } finally {
    if (localUri) {
      await FileSystem.unlink(localUri);
    }
    if (targetCreated && !completed) {
      await FileSystem.unlink(targetPath);
    }
  }
}

export async function deleteAttachmentFile(attachmentId: string): Promise<void> {
  const path = attachmentFilePath(attachmentId);
  if (await FileSystem.exists(path)) {
    await FileSystem.unlink(path);
  }
}

export async function deleteAttachmentFiles(attachments: Attachment[]): Promise<void> {
  for (const attachment of attachments) {
    await deleteAttachmentFile(attachment.id);
  }
}

async function selectAttachmentFile() {
  let pickedFiles;
  try {
    pickedFiles = await pick({
      mode: 'import',
      type: [...ATTACHMENT_PICKER_TYPES],
      allowMultiSelection: false,
      allowVirtualFiles: false,
    });
  } catch (error) {
    if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
      throw new AttachmentFileCanceled();
    }
    throw new AttachmentFileError('The attachment picker could not be opened.');
  }

  const selectedFile = pickedFiles[0];
  if (!selectedFile?.uri || selectedFile.error || !selectedFile.type) {
    throw new AttachmentFileError('The selected attachment is not readable.');
  }
  return selectedFile;
}

async function ensureAttachmentDirectory(): Promise<void> {
  const directory = `${Dirs.DocumentDir}/${ATTACHMENT_DIRECTORY_NAME}`;
  if (!(await FileSystem.exists(directory))) {
    await FileSystem.mkdir(directory);
  }
}
