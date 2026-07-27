import {normalizeSharedCapture, sharedCaptureTitle, SHARED_CAPTURE_MAX_CHARS} from './shareCapture';

describe('share capture contract', () => {
  it('normalizes text and keeps optional metadata', () => {
    expect(normalizeSharedCapture({text: '  Save this\n', subject: '  Article  ', mimeType: ' text/plain '})).toEqual({
      text: 'Save this',
      subject: 'Article',
      mimeType: 'text/plain',
    });
  });

  it('uses a subject-only share as the capture text', () => {
    const capture = normalizeSharedCapture({text: '  ', subject: '  Shared title  '});
    expect(capture).toEqual({text: 'Shared title', subject: 'Shared title', mimeType: null});
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
});
