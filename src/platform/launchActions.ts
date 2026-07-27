import {DeviceEventEmitter, NativeModules, Platform} from 'react-native';
import {normalizeLaunchAction, type LaunchAction} from '../shared/launchAction';

interface NativeLaunchActions {
  getInitialLaunchAction?: () => Promise<unknown>;
}

const LAUNCH_ACTION_EVENT = 'YuzuhaLaunchAction';
const nativeLaunchActions = NativeModules.YuzuhaLaunchActions as NativeLaunchActions | undefined;

export const launchActions = {
  isSupported(): boolean {
    return Platform.OS === 'android' && nativeLaunchActions?.getInitialLaunchAction !== undefined;
  },

  async getInitialAction(): Promise<LaunchAction | null> {
    if (!this.isSupported() || !nativeLaunchActions?.getInitialLaunchAction) {
      return null;
    }
    return normalizeLaunchAction(await nativeLaunchActions.getInitialLaunchAction());
  },

  onAction(listener: (action: LaunchAction) => void): {remove: () => void} {
    if (!this.isSupported()) {
      return {remove: () => undefined};
    }
    return DeviceEventEmitter.addListener(LAUNCH_ACTION_EVENT, (action: unknown) => {
      const normalized = normalizeLaunchAction(action);
      if (normalized) {
        listener(normalized);
      }
    });
  },
};
