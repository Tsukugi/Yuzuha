import {NativeModules, Platform} from 'react-native';
import type {UsageRecord} from '../shared/usage';

interface NativeUsageAccess {
  hasUsageAccess(): Promise<boolean>;
  openUsageAccessSettings(): Promise<boolean>;
  queryUsageStats(startTimeMillis: number, endTimeMillis: number): Promise<UsageRecord[]>;
}

const nativeUsageAccess = NativeModules.YuzuhaUsageAccess as NativeUsageAccess | undefined;

export const usageAccess = {
  isSupported(): boolean {
    return Platform.OS === 'android' && nativeUsageAccess !== undefined;
  },

  async hasPermission(): Promise<boolean> {
    if (!this.isSupported() || !nativeUsageAccess) {
      return false;
    }
    return nativeUsageAccess.hasUsageAccess();
  },

  async openSettings(): Promise<void> {
    if (!this.isSupported() || !nativeUsageAccess) {
      return;
    }
    await nativeUsageAccess.openUsageAccessSettings();
  },

  async query(startTimeMillis: number, endTimeMillis: number): Promise<UsageRecord[]> {
    if (!this.isSupported() || !nativeUsageAccess) {
      return [];
    }
    return nativeUsageAccess.queryUsageStats(startTimeMillis, endTimeMillis);
  },
};
