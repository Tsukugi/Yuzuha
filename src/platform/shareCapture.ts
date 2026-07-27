import {DeviceEventEmitter, NativeModules, Platform} from 'react-native';
import {normalizeSharedCapture, type SharedCapture, type SharedCapturePayload} from '../shared/shareCapture';

interface NativeShareCapture {
  getInitialSharedCapture?: () => Promise<SharedCapturePayload | null>;
}

const SHARED_CAPTURE_EVENT = 'YuzuhaSharedCapture';
const nativeShareCapture = NativeModules.YuzuhaShareCapture as NativeShareCapture | undefined;

export class ShareCaptureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShareCaptureError';
  }
}

export const shareCapture = {
  isSupported(): boolean {
    return Platform.OS === 'android' && nativeShareCapture?.getInitialSharedCapture !== undefined;
  },

  async getInitialCapture(): Promise<SharedCapture | null> {
    if (!this.isSupported() || !nativeShareCapture?.getInitialSharedCapture) {
      return null;
    }
    try {
      return normalizeSharedCapture(await nativeShareCapture.getInitialSharedCapture());
    } catch (error) {
      throw new ShareCaptureError(error instanceof Error && error.message ? error.message : 'The shared text could not be opened.');
    }
  },

  onCapture(listener: (capture: SharedCapture) => void): {remove: () => void} {
    if (!this.isSupported()) {
      return {remove: () => undefined};
    }
    return DeviceEventEmitter.addListener(SHARED_CAPTURE_EVENT, (payload: SharedCapturePayload | null) => {
      const capture = normalizeSharedCapture(payload);
      if (capture) {
        listener(capture);
      }
    });
  },
};
