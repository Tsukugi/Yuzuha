import {NativeModules, Platform} from 'react-native';
import {validateCalendarTaskDraft, type CalendarTaskDraft} from '../shared/calendarDraft';

interface NativeCalendarDrafts {
  openTaskCalendarDraft?: (title: string, details: string, dueLocalDate: string) => Promise<boolean>;
}

const nativeCalendarDrafts = NativeModules.YuzuhaCalendarDrafts as NativeCalendarDrafts | undefined;

export const calendarDrafts = {
  isSupported(): boolean {
    return Platform.OS === 'android' && nativeCalendarDrafts?.openTaskCalendarDraft !== undefined;
  },

  async openTaskDraft(draft: CalendarTaskDraft): Promise<boolean> {
    const validationError = validateCalendarTaskDraft(draft);
    if (validationError) {
      throw new Error(validationError);
    }
    if (!this.isSupported() || !nativeCalendarDrafts?.openTaskCalendarDraft) {
      return false;
    }
    return nativeCalendarDrafts.openTaskCalendarDraft(draft.title.trim(), draft.details.trim(), draft.dueLocalDate);
  },
};
