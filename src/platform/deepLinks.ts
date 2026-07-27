import {DeviceEventEmitter, NativeModules, Platform} from 'react-native';
import {normalizeDeepLink, type DeepLinkTarget} from '../shared/deepLink';

interface NativeDeepLinks {
  getInitialDeepLink?: () => Promise<unknown>;
}

const DEEP_LINK_EVENT = 'YuzuhaDeepLink';
const nativeDeepLinks = NativeModules.YuzuhaDeepLinks as NativeDeepLinks | undefined;

export const deepLinks = {
  isSupported(): boolean {
    return Platform.OS === 'android' && nativeDeepLinks?.getInitialDeepLink !== undefined;
  },

  async getInitialTarget(): Promise<DeepLinkTarget | null> {
    if (!this.isSupported() || !nativeDeepLinks?.getInitialDeepLink) {
      return null;
    }
    return normalizeDeepLink(await nativeDeepLinks.getInitialDeepLink());
  },

  onTarget(listener: (target: DeepLinkTarget) => void): {remove: () => void} {
    if (!this.isSupported()) {
      return {remove: () => undefined};
    }
    return DeviceEventEmitter.addListener(DEEP_LINK_EVENT, (value: unknown) => {
      const target = normalizeDeepLink(value);
      if (target) {
        listener(target);
      }
    });
  },
};
