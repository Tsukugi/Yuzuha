import {
  ATTACHMENT_BACKUP_MAX_TOTAL_BYTES,
  AttachmentBackupError,
  validateAttachmentBackupFiles,
} from './attachmentBackup';

const attachment = {
  id: 'attachment_1',
  noteId: 'note_1',
  name: 'hello.txt',
  mimeType: 'text/plain',
  byteSize: 12,
  sha256: '7509e5bda0c762d2bac7f90d758b5b2263fa01ccbc542ab5e3df163be08e6ca9',
  createdAt: '2026-07-27T12:00:00.000Z',
  updatedAt: '2026-07-27T12:00:00.000Z',
};

const file = {
  id: attachment.id,
  byteSize: attachment.byteSize,
  sha256: attachment.sha256,
  base64: 'aGVsbG8gd29ybGQh',
};

describe('encrypted attachment backup payloads', () => {
  it('accepts a complete file set whose bytes match metadata', () => {
    expect(() => validateAttachmentBackupFiles([attachment], [file])).not.toThrow();
  });

  it('rejects missing, extra, and tampered file entries', () => {
    expect(() => validateAttachmentBackupFiles([attachment], [])).toThrow(AttachmentBackupError);
    expect(() => validateAttachmentBackupFiles([], [file])).toThrow(/unknown attachment/i);
    expect(() => validateAttachmentBackupFiles([attachment], [{...file, base64: 'YWJj'}])).toThrow(/checksum/i);
  });

  it('rejects a payload above the total attachment limit', () => {
    const large = {
      ...attachment,
      byteSize: 10 * 1024 * 1024,
      sha256: 'a'.repeat(64),
    };
    const largeFile = {
      ...file,
      byteSize: large.byteSize,
      sha256: 'a'.repeat(64),
      base64: 'YQ==',
    };

    const attachments = [large, {...large, id: 'attachment_2'}, {...large, id: 'attachment_3'}, {...large, id: 'attachment_4'}];
    const files = [largeFile, {...largeFile, id: 'attachment_2'}, {...largeFile, id: 'attachment_3'}, {...largeFile, id: 'attachment_4'}];
    expect(() => validateAttachmentBackupFiles(attachments, files)).toThrow(/too large/i);
    expect(ATTACHMENT_BACKUP_MAX_TOTAL_BYTES).toBe(32 * 1024 * 1024);
  });
});
