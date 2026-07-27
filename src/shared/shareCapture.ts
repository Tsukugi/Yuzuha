import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_NAME_LENGTH,
  isSupportedAttachmentMimeType,
} from './attachment';

export const SHARED_CAPTURE_MAX_CHARS = 20_000;

export interface SharedCapture {
  text: string;
  subject: string | null;
  mimeType: string | null;
  attachment: SharedAttachment | null;
}

export interface SharedAttachment {
  uri: string;
  name: string;
  mimeType: string;
  byteSize: number | null;
}

export interface SharedCapturePayload {
  text?: unknown;
  subject?: unknown;
  mimeType?: unknown;
  attachmentUri?: unknown;
  attachmentName?: unknown;
  attachmentMimeType?: unknown;
  attachmentByteSize?: unknown;
}

export function normalizeSharedCapture(payload: SharedCapturePayload | null | undefined): SharedCapture | null {
  const rawText = typeof payload?.text === 'string' ? payload.text.trim() : '';
  const subject = typeof payload?.subject === 'string' ? payload.subject.trim() : '';
  const text = rawText || subject;
  const attachment = normalizeSharedAttachment(payload);
  if ((!text && !attachment) || text.length > SHARED_CAPTURE_MAX_CHARS) {
    return null;
  }
  return {
    text,
    subject: subject || null,
    mimeType: typeof payload?.mimeType === 'string' && payload.mimeType.trim() ? payload.mimeType.trim() : null,
    attachment,
  };
}

export function sharedCaptureTitle(capture: SharedCapture, fallback: string): string {
  const firstLine = capture.text.split(/\r?\n/, 1)[0]?.trim() ?? '';
  return (capture.subject || firstLine || capture.attachment?.name || fallback).slice(0, 80);
}

function normalizeSharedAttachment(payload: SharedCapturePayload | null | undefined): SharedAttachment | null {
  const uri = typeof payload?.attachmentUri === 'string' ? payload.attachmentUri.trim() : '';
  const name = typeof payload?.attachmentName === 'string' ? payload.attachmentName.trim() : '';
  const mimeType = typeof payload?.attachmentMimeType === 'string' ? payload.attachmentMimeType.trim().toLowerCase() : '';
  if (!uri && !name && !mimeType && payload?.attachmentByteSize === undefined) {
    return null;
  }
  if (!uri || !name || name.length > ATTACHMENT_MAX_NAME_LENGTH || !isSupportedAttachmentMimeType(mimeType)) {
    return null;
  }
  let byteSize: number | null = null;
  if (payload?.attachmentByteSize !== undefined && payload.attachmentByteSize !== null) {
    if (typeof payload.attachmentByteSize !== 'number' || !Number.isSafeInteger(payload.attachmentByteSize) || payload.attachmentByteSize <= 0 || payload.attachmentByteSize > ATTACHMENT_MAX_BYTES) {
      return null;
    }
    byteSize = payload.attachmentByteSize;
  }
  return {uri, name, mimeType, byteSize};
}
