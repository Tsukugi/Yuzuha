export const SHARED_CAPTURE_MAX_CHARS = 20_000;

export interface SharedCapture {
  text: string;
  subject: string | null;
  mimeType: string | null;
}

export interface SharedCapturePayload {
  text?: unknown;
  subject?: unknown;
  mimeType?: unknown;
}

export function normalizeSharedCapture(payload: SharedCapturePayload | null | undefined): SharedCapture | null {
  const rawText = typeof payload?.text === 'string' ? payload.text.trim() : '';
  const subject = typeof payload?.subject === 'string' ? payload.subject.trim() : '';
  const text = rawText || subject;
  if (!text || text.length > SHARED_CAPTURE_MAX_CHARS) {
    return null;
  }
  return {
    text,
    subject: subject || null,
    mimeType: typeof payload?.mimeType === 'string' && payload.mimeType.trim() ? payload.mimeType.trim() : null,
  };
}

export function sharedCaptureTitle(capture: SharedCapture, fallback: string): string {
  const firstLine = capture.text.split(/\r?\n/, 1)[0]?.trim() ?? '';
  return (capture.subject || firstLine || fallback).slice(0, 80);
}
