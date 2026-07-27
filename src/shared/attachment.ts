export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_MAX_PER_NOTE = 10;
export const ATTACHMENT_MAX_NAME_LENGTH = 255;

export const ATTACHMENT_PICKER_TYPES = ['image/*', 'application/pdf', 'text/plain'] as const;

const SUPPORTED_ATTACHMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
]);

export function isSupportedAttachmentMimeType(value: string): boolean {
  return SUPPORTED_ATTACHMENT_MIME_TYPES.has(value.toLowerCase());
}

export function isSha256(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}
