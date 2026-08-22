import type { UsagePermissionState, UsageSnapshot } from "../types/domain";

export type UsageMetricUnavailableReason =
  Exclude<UsagePermissionState, "granted"> | "previous-period-unavailable";

export type UsageMetricEmptyReason =
  "no-local-days" | "no-included-usage" | "previous-period-not-provided";

export type UsageMetric<T> =
  | { status: "available"; value: T }
  | { status: "empty"; reason: UsageMetricEmptyReason }
  | { status: "unavailable"; reason: UsageMetricUnavailableReason };

export interface UsageMetricsPeriodInput {
  snapshots: readonly UsageSnapshot[];
  localDates: ReadonlySet<string>;
  permission: UsagePermissionState;
}

export interface UsageMetricsInput extends UsageMetricsPeriodInput {
  previous?: UsageMetricsPeriodInput | null;
}

export interface UsageTopAppShare {
  packageName: string;
  displayName: string;
  durationSeconds: number;
  /** A fraction from 0 to 1, not a percentage. */
  share: number;
}

export interface UsagePeriodChange {
  deltaSeconds: number;
  /** A fraction from 0 to 1, not a percentage; negative values indicate a decrease. */
  fraction: number;
}

export interface UsageBusiestLocalDay {
  localDate: string;
  durationSeconds: number;
}

export interface UsageMetrics {
  includedTotalSeconds: UsageMetric<number>;
  averageSecondsPerLocalDay: UsageMetric<number>;
  activeAppCount: UsageMetric<number>;
  topAppShare: UsageMetric<UsageTopAppShare>;
  previousEquivalentPeriodChange: UsageMetric<UsagePeriodChange>;
  busiestLocalDay: UsageMetric<UsageBusiestLocalDay>;
}

interface IncludedUsage {
  totalSeconds: number;
  byPackage: Map<string, { displayName: string; durationSeconds: number }>;
  byLocalDate: Map<string, number>;
}

function unavailable<T>(reason: UsageMetricUnavailableReason): UsageMetric<T> {
  return { status: "unavailable", reason };
}

function empty<T>(reason: UsageMetricEmptyReason): UsageMetric<T> {
  return { status: "empty", reason };
}

function available<T>(value: T): UsageMetric<T> {
  return { status: "available", value };
}

function permissionUnavailable(
  permission: UsagePermissionState,
): UsageMetricUnavailableReason | null {
  return permission === "granted" ? null : permission;
}

function collectIncludedUsage(
  snapshots: readonly UsageSnapshot[],
  localDates: ReadonlySet<string>,
): IncludedUsage | null {
  const includedSnapshots = snapshots.filter(
    (snapshot) =>
      snapshot.included &&
      localDates.has(snapshot.localDate) &&
      snapshot.durationSeconds > 0,
  );
  if (includedSnapshots.length === 0) {
    return null;
  }

  const byPackage = new Map<
    string,
    { displayName: string; durationSeconds: number }
  >();
  const byLocalDate = new Map<string, number>();
  let totalSeconds = 0;

  for (const snapshot of includedSnapshots) {
    totalSeconds += snapshot.durationSeconds;

    const packageUsage = byPackage.get(snapshot.packageName);
    const displayName =
      packageUsage === undefined
        ? snapshot.displayName || snapshot.packageName
        : packageUsage.displayName <
            (snapshot.displayName || snapshot.packageName)
          ? packageUsage.displayName
          : snapshot.displayName || snapshot.packageName;
    byPackage.set(snapshot.packageName, {
      displayName,
      durationSeconds:
        (packageUsage?.durationSeconds ?? 0) + snapshot.durationSeconds,
    });
    byLocalDate.set(
      snapshot.localDate,
      (byLocalDate.get(snapshot.localDate) ?? 0) + snapshot.durationSeconds,
    );
  }

  return { totalSeconds, byPackage, byLocalDate };
}

function emptyForPeriod(
  period: UsageMetricsPeriodInput,
): UsageMetricEmptyReason | null {
  if (period.localDates.size === 0) {
    return "no-local-days";
  }
  return collectIncludedUsage(period.snapshots, period.localDates) === null
    ? "no-included-usage"
    : null;
}

function emptyMetrics(reason: UsageMetricEmptyReason): UsageMetrics {
  return {
    includedTotalSeconds: empty(reason),
    averageSecondsPerLocalDay: empty(reason),
    activeAppCount: empty(reason),
    topAppShare: empty(reason),
    previousEquivalentPeriodChange: empty(reason),
    busiestLocalDay: empty(reason),
  };
}

function unavailableMetrics(
  reason: UsageMetricUnavailableReason,
): UsageMetrics {
  return {
    includedTotalSeconds: unavailable(reason),
    averageSecondsPerLocalDay: unavailable(reason),
    activeAppCount: unavailable(reason),
    topAppShare: unavailable(reason),
    previousEquivalentPeriodChange: unavailable(reason),
    busiestLocalDay: unavailable(reason),
  };
}

function selectTopApp(
  byPackage: IncludedUsage["byPackage"],
  totalSeconds: number,
): UsageTopAppShare {
  const top = [...byPackage.entries()].sort(
    ([leftPackage, left], [rightPackage, right]) => {
      const durationOrder = right.durationSeconds - left.durationSeconds;
      return durationOrder !== 0
        ? durationOrder
        : leftPackage < rightPackage
          ? -1
          : leftPackage > rightPackage
            ? 1
            : 0;
    },
  )[0];
  const [packageName, usage] = top;
  return {
    packageName,
    displayName: usage.displayName,
    durationSeconds: usage.durationSeconds,
    share: usage.durationSeconds / totalSeconds,
  };
}

function selectBusiestLocalDay(
  byLocalDate: IncludedUsage["byLocalDate"],
): UsageBusiestLocalDay {
  const busiest = [...byLocalDate.entries()].sort(
    ([leftDate, leftSeconds], [rightDate, rightSeconds]) => {
      const durationOrder = rightSeconds - leftSeconds;
      return durationOrder !== 0
        ? durationOrder
        : leftDate < rightDate
          ? -1
          : leftDate > rightDate
            ? 1
            : 0;
    },
  )[0];
  const [localDate, durationSeconds] = busiest;
  return { localDate, durationSeconds };
}

function previousEquivalentPeriodChange(
  input: UsageMetricsInput,
  currentTotalSeconds: number,
): UsageMetric<UsagePeriodChange> {
  if (input.previous === undefined || input.previous === null) {
    return empty("previous-period-not-provided");
  }

  const previousUnavailable = permissionUnavailable(input.previous.permission);
  if (previousUnavailable !== null) {
    return unavailable("previous-period-unavailable");
  }

  const previousEmpty = emptyForPeriod(input.previous);
  if (previousEmpty !== null) {
    return empty(previousEmpty);
  }

  const previousUsage = collectIncludedUsage(
    input.previous.snapshots,
    input.previous.localDates,
  );
  if (previousUsage === null || previousUsage.totalSeconds === 0) {
    return empty("no-included-usage");
  }

  const deltaSeconds = currentTotalSeconds - previousUsage.totalSeconds;
  return available({
    deltaSeconds,
    fraction: deltaSeconds / previousUsage.totalSeconds,
  });
}

/**
 * Derives local App Time metrics from already aggregated snapshots. The average
 * denominator is every selected local day, including days with no usage.
 */
export function deriveUsageMetrics(input: UsageMetricsInput): UsageMetrics {
  const currentUnavailable = permissionUnavailable(input.permission);
  if (currentUnavailable !== null) {
    return unavailableMetrics(currentUnavailable);
  }

  const currentEmpty = emptyForPeriod(input);
  if (currentEmpty !== null) {
    return emptyMetrics(currentEmpty);
  }

  const currentUsage = collectIncludedUsage(input.snapshots, input.localDates);
  if (currentUsage === null) {
    return emptyMetrics("no-included-usage");
  }

  return {
    includedTotalSeconds: available(currentUsage.totalSeconds),
    averageSecondsPerLocalDay: available(
      currentUsage.totalSeconds / input.localDates.size,
    ),
    activeAppCount: available(currentUsage.byPackage.size),
    topAppShare: available(
      selectTopApp(currentUsage.byPackage, currentUsage.totalSeconds),
    ),
    previousEquivalentPeriodChange: previousEquivalentPeriodChange(
      input,
      currentUsage.totalSeconds,
    ),
    busiestLocalDay: available(selectBusiestLocalDay(currentUsage.byLocalDate)),
  };
}
