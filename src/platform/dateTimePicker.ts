import { NativeModules, Platform } from "react-native";

/** A strict local calendar date with no timezone or time component: YYYY-MM-DD. */
export type LocalDateString = string;

/** A strict local wall-clock time with no date or timezone: HH:mm (24-hour). */
export type LocalTimeString = string;

interface NativeDateTimePicker {
  openDatePicker: (
    initialLocalDate: LocalDateString,
  ) => Promise<LocalDateString | null>;
  openTimePicker: (
    initialLocalTime: LocalTimeString,
  ) => Promise<LocalTimeString | null>;
}

export class DateTimePickerError extends Error {
  constructor(
    message: string,
    readonly code: string = "DATE_TIME_PICKER_FAILED",
  ) {
    super(message);
    this.name = "DateTimePickerError";
  }
}

const nativeDateTimePicker = NativeModules.YuzuhaDateTimePicker as
  NativeDateTimePicker | undefined;

export const dateTimePicker = {
  isSupported(): boolean {
    return Platform.OS === "android" && hasNativePicker(nativeDateTimePicker);
  },

  async pickDate(
    initialLocalDate: LocalDateString,
  ): Promise<LocalDateString | null> {
    const bridge = requireNativePicker();
    try {
      return await bridge.openDatePicker(initialLocalDate);
    } catch (error) {
      throw toDateTimePickerError(error);
    }
  },

  async pickTime(
    initialLocalTime: LocalTimeString,
  ): Promise<LocalTimeString | null> {
    const bridge = requireNativePicker();
    try {
      return await bridge.openTimePicker(initialLocalTime);
    } catch (error) {
      throw toDateTimePickerError(error);
    }
  },
};

function hasNativePicker(
  value: NativeDateTimePicker | undefined,
): value is NativeDateTimePicker {
  return (
    typeof value?.openDatePicker === "function" &&
    typeof value.openTimePicker === "function"
  );
}

function requireNativePicker(): NativeDateTimePicker {
  if (Platform.OS !== "android") {
    throw new DateTimePickerError(
      "OS date and time pickers are only available on Android right now.",
      "DATE_TIME_PICKER_UNSUPPORTED_PLATFORM",
    );
  }
  if (!hasNativePicker(nativeDateTimePicker)) {
    throw new DateTimePickerError(
      "The Android date and time picker bridge is not available in this build.",
      "DATE_TIME_PICKER_UNAVAILABLE",
    );
  }
  return nativeDateTimePicker;
}

function toDateTimePickerError(error: unknown): DateTimePickerError {
  if (error instanceof DateTimePickerError) {
    return error;
  }
  if (error instanceof Error) {
    const code =
      typeof (error as Error & { code?: unknown }).code === "string"
        ? (error as Error & { code: string }).code
        : "DATE_TIME_PICKER_FAILED";
    return new DateTimePickerError(
      error.message || "The Android date or time picker failed.",
      code,
    );
  }
  return new DateTimePickerError("The Android date or time picker failed.");
}
