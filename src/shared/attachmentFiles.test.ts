import {errorCodes, keepLocalCopy, pick} from '@react-native-documents/picker';
import {beforeEach} from '@jest/globals';
import {FileSystem} from 'react-native-file-access';
import {
  AttachmentFileCanceled,
  AttachmentFileError,
  attachmentFilePath,
  deleteAttachmentFile,
  deleteAttachmentFiles,
  importAttachmentFile,
} from './attachmentFiles';
import {ATTACHMENT_MAX_BYTES} from './attachment';

jest.mock('@react-native-documents/picker', () => ({
  errorCodes: {OPERATION_CANCELED: 'OPERATION_CANCELED'},
  isErrorWithCode: (error: unknown): error is {code: string} => typeof error === 'object' && error !== null && 'code' in error,
  keepLocalCopy: jest.fn(),
  pick: jest.fn(),
}));

jest.mock('react-native-file-access', () => ({
  Dirs: {DocumentDir: '/documents'},
  FileSystem: {
    cp: jest.fn(),
    exists: jest.fn(),
    hash: jest.fn(),
    mkdir: jest.fn(),
    stat: jest.fn(),
    unlink: jest.fn(),
  },
}));

const pickMock = pick as jest.MockedFunction<typeof pick>;
const keepLocalCopyMock = keepLocalCopy as jest.MockedFunction<typeof keepLocalCopy>;
const fileSystemMock = FileSystem as unknown as {
  cp: jest.Mock;
  exists: jest.Mock;
  hash: jest.Mock;
  mkdir: jest.Mock;
  stat: jest.Mock;
  unlink: jest.Mock;
};

describe('attachment files', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('imports an allowed file into private storage and records its checksum', async () => {
    pickMock.mockResolvedValue([{
      uri: 'content://source',
      name: ' photo.png ',
      type: 'image/png',
      nativeType: 'image/png',
      size: 2048,
      error: null,
      isVirtual: false,
      convertibleToMimeTypes: null,
      hasRequestedType: true,
    }]);
    keepLocalCopyMock.mockResolvedValue([{sourceUri: 'content://source', localUri: '/cache/photo.png', status: 'success'}]);
    fileSystemMock.stat
      .mockResolvedValueOnce({type: 'file', size: 2048})
      .mockResolvedValueOnce({type: 'file', size: 2048});
    fileSystemMock.exists.mockResolvedValueOnce(false);
    fileSystemMock.hash.mockResolvedValue('A'.repeat(64));

    await expect(importAttachmentFile('note_1', 'attachment_1', '2026-07-27T12:00:00.000Z')).resolves.toEqual({
      id: 'attachment_1',
      noteId: 'note_1',
      name: 'photo.png',
      mimeType: 'image/png',
      byteSize: 2048,
      sha256: 'a'.repeat(64),
      createdAt: '2026-07-27T12:00:00.000Z',
      updatedAt: '2026-07-27T12:00:00.000Z',
    });
    expect(fileSystemMock.cp).toHaveBeenCalledWith('/cache/photo.png', '/documents/attachments/attachment_1');
    expect(fileSystemMock.unlink).toHaveBeenCalledWith('/cache/photo.png');
  });

  it('rejects unsupported files before copying them', async () => {
    pickMock.mockResolvedValue([{
      uri: 'content://source',
      name: 'archive.zip',
      type: 'application/zip',
      nativeType: 'application/zip',
      size: 10,
      error: null,
      isVirtual: false,
      convertibleToMimeTypes: null,
      hasRequestedType: false,
    }]);

    await expect(importAttachmentFile('note_1', 'attachment_1', '2026-07-27T12:00:00.000Z')).rejects.toBeInstanceOf(AttachmentFileError);
    expect(keepLocalCopyMock).not.toHaveBeenCalled();
  });

  it('maps picker cancellation to a distinct result', async () => {
    pickMock.mockRejectedValue({code: errorCodes.OPERATION_CANCELED});

    await expect(importAttachmentFile('note_1', 'attachment_1', '2026-07-27T12:00:00.000Z')).rejects.toBeInstanceOf(AttachmentFileCanceled);
    expect(keepLocalCopyMock).not.toHaveBeenCalled();
  });

  it('rejects files over the size limit and removes the temporary copy', async () => {
    pickMock.mockResolvedValue([{
      uri: 'content://source',
      name: 'large.txt',
      type: 'text/plain',
      nativeType: 'text/plain',
      size: ATTACHMENT_MAX_BYTES + 1,
      error: null,
      isVirtual: false,
      convertibleToMimeTypes: null,
      hasRequestedType: true,
    }]);
    keepLocalCopyMock.mockResolvedValue([{sourceUri: 'content://source', localUri: '/cache/large.txt', status: 'success'}]);
    fileSystemMock.stat.mockResolvedValue({type: 'file', size: ATTACHMENT_MAX_BYTES + 1});

    await expect(importAttachmentFile('note_1', 'attachment_1', '2026-07-27T12:00:00.000Z')).rejects.toThrow(/between 1 byte/i);
    expect(fileSystemMock.unlink).toHaveBeenCalledWith('/cache/large.txt');
    expect(fileSystemMock.cp).not.toHaveBeenCalled();
  });

  it('deletes an existing private file and rejects unsafe IDs', async () => {
    fileSystemMock.exists.mockResolvedValue(true);

    await deleteAttachmentFile('attachment_1');

    expect(attachmentFilePath('attachment_1')).toBe('/documents/attachments/attachment_1');
    expect(fileSystemMock.unlink).toHaveBeenCalledWith('/documents/attachments/attachment_1');
    await expect(deleteAttachmentFile('../attachment_1')).rejects.toBeInstanceOf(AttachmentFileError);
  });

  it('deletes attachment files in stable input order', async () => {
    fileSystemMock.exists.mockResolvedValue(true);

    await deleteAttachmentFiles([
      {id: 'attachment_1', noteId: 'note_1', name: 'one.txt', mimeType: 'text/plain', byteSize: 1, sha256: 'a'.repeat(64), createdAt: '2026-07-27T12:00:00.000Z', updatedAt: '2026-07-27T12:00:00.000Z'},
      {id: 'attachment_2', noteId: 'note_1', name: 'two.txt', mimeType: 'text/plain', byteSize: 1, sha256: 'b'.repeat(64), createdAt: '2026-07-27T12:00:00.000Z', updatedAt: '2026-07-27T12:00:00.000Z'},
    ]);

    expect(fileSystemMock.unlink.mock.calls).toEqual([
      ['/documents/attachments/attachment_1'],
      ['/documents/attachments/attachment_2'],
    ]);
  });
});
