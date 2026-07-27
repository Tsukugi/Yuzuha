import {NativeModules, Platform} from 'react-native';

interface AttachmentPreviewBridge {
  openAttachment: (path: string, mimeType: string) => Promise<boolean>;
}

export class AttachmentPreviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttachmentPreviewError';
  }
}

export async function openAttachmentPreview(path: string, mimeType: string): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new AttachmentPreviewError('Attachment preview is only available on Android right now.');
  }

  const bridge = NativeModules.YuzuhaAttachmentPreview as AttachmentPreviewBridge | undefined;
  if (!bridge || typeof bridge.openAttachment !== 'function') {
    throw new AttachmentPreviewError('Attachment preview is not available in this Android build.');
  }

  try {
    await bridge.openAttachment(path, mimeType);
  } catch (error) {
    if (error instanceof Error && error.message) {
      throw new AttachmentPreviewError(error.message);
    }
    throw new AttachmentPreviewError('No Android app can open this attachment.');
  }
}
