import {normalizeSharedCapture, sharedCaptureTitle, SHARED_CAPTURE_MAX_CHARS} from './shareCapture';
import {ATTACHMENT_MAX_BYTES} from './attachment';

describe('share capture contract', () => {
  it('normalizes text and keeps optional metadata', () => {
    expect(normalizeSharedCapture({text: '  Save this\n', subject: '  Article  ', mimeType: ' text/plain '})).toEqual({
      text: 'Save this',
      subject: 'Article',
      mimeType: 'text/plain',
      attachment: null,
    });
  });

  it('uses a subject-only share as the capture text', () => {
    const capture = normalizeSharedCapture({text: '  ', subject: '  Shared title  '});
    expect(capture).toEqual({text: 'Shared title', subject: 'Shared title', mimeType: null, attachment: null});
    expect(capture && sharedCaptureTitle(capture, 'Fallback')).toBe('Shared title');
  });

  it('rejects empty and oversized shares without truncating them', () => {
    expect(normalizeSharedCapture({text: ' ', subject: null})).toBeNull();
    expect(normalizeSharedCapture({text: 'x'.repeat(SHARED_CAPTURE_MAX_CHARS + 1)})).toBeNull();
  });

  it('uses the first line for a capture without a subject', () => {
    const capture = normalizeSharedCapture({text: 'First line\nLonger body'});
    expect(capture && sharedCaptureTitle(capture, 'Fallback')).toBe('First line');
  });

  it('normalizes a supported shared attachment without copying its bytes', () => {
    const capture = normalizeSharedCapture({
      attachmentUri: ' content://source/photo ',
      attachmentName: ' photo.png ',
      attachmentMimeType: 'IMAGE/PNG',
      attachmentByteSize: 2048,
    });
    expect(capture).toEqual({
      text: '',
      subject: null,
      mimeType: null,
      attachment: {
        uri: 'content://source/photo',
        name: 'photo.png',
        mimeType: 'image/png',
        byteSize: 2048,
      },
    });
    expect(capture && sharedCaptureTitle(capture, 'Shared file')).toBe('photo.png');
  });

  it('rejects an unsupported or oversized shared attachment', () => {
    expect(normalizeSharedCapture({
      attachmentUri: 'content://source/archive',
      attachmentName: 'archive.zip',
      attachmentMimeType: 'application/zip',
      attachmentByteSize: 10,
    })).toBeNull();
    expect(normalizeSharedCapture({
      attachmentUri: 'content://source/large',
      attachmentName: 'large.pdf',
      attachmentMimeType: 'application/pdf',
      attachmentByteSize: ATTACHMENT_MAX_BYTES + 1,
    })).toBeNull();
  });
});
