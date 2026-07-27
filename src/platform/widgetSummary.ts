import {NativeModules, Platform} from 'react-native';
import type {WidgetSummary} from '../shared/widgetSummary';

interface NativeWidgetSummary {
  updateSummary: (openTaskCount: number, activeNoteCount: number) => Promise<boolean>;
}

const nativeWidgetSummary = NativeModules.YuzuhaWidgetSummary as NativeWidgetSummary | undefined;

export const widgetSummary = {
  isSupported(): boolean {
    return Platform.OS === 'android' && typeof nativeWidgetSummary?.updateSummary === 'function';
  },

  async update(summary: WidgetSummary): Promise<boolean> {
    if (!this.isSupported() || !nativeWidgetSummary) {
      return false;
    }
    try {
      return await nativeWidgetSummary.updateSummary(summary.openTaskCount, summary.activeNoteCount);
    } catch {
      return false;
    }
  },
};
