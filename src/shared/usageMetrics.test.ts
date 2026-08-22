import type { UsageSnapshot } from "../types/domain";
import {
  deriveUsageMetrics,
  type UsageMetricsPeriodInput,
} from "./usageMetrics";

const sourceReadAt = "2026-07-23T12:00:00.000Z";
const currentDates = new Set([
  "2026-07-20",
  "2026-07-21",
  "2026-07-22",
  "2026-07-23",
]);

function snapshot(
  packageName: string,
  displayName: string,
  localDate: string,
  durationSeconds: number,
  included = true,
): UsageSnapshot {
  return {
    id: `${packageName}_${localDate}`,
    packageName,
    displayName,
    localDate,
    durationSeconds,
    sourceReadAt,
    included,
  };
}

const currentSnapshots: UsageSnapshot[] = [
  snapshot("com.chat", "Chat", "2026-07-20", 120),
  snapshot("com.chat", "Chat", "2026-07-21", 240),
  snapshot("com.mail", "Mail", "2026-07-21", 60),
  snapshot("com.music", "Music", "2026-07-22", 300),
  snapshot("com.video", "Video", "2026-07-20", 10_000, false),
];

const previousPeriod: UsageMetricsPeriodInput = {
  snapshots: [
    snapshot("com.chat", "Chat", "2026-07-13", 200),
    snapshot("com.mail", "Mail", "2026-07-14", 280),
  ],
  localDates: new Set(["2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16"]),
  permission: "granted",
};

function currentInput(
  overrides: Partial<UsageMetricsPeriodInput> = {},
): UsageMetricsPeriodInput {
  return {
    snapshots: currentSnapshots,
    localDates: currentDates,
    permission: "granted",
    ...overrides,
  };
}

describe("derived App Time metrics", () => {
  it("computes included totals, daily average, app count, top share, change, and busiest day", () => {
    const metrics = deriveUsageMetrics({
      ...currentInput(),
      previous: previousPeriod,
    });

    expect(metrics.includedTotalSeconds).toEqual({
      status: "available",
      value: 720,
    });
    expect(metrics.averageSecondsPerLocalDay).toEqual({
      status: "available",
      value: 180,
    });
    expect(metrics.activeAppCount).toEqual({ status: "available", value: 3 });
    expect(metrics.topAppShare).toEqual({
      status: "available",
      value: {
        packageName: "com.chat",
        displayName: "Chat",
        durationSeconds: 360,
        share: 360 / 720,
      },
    });
    expect(metrics.previousEquivalentPeriodChange).toEqual({
      status: "available",
      value: { deltaSeconds: 240, fraction: 0.5 },
    });
    expect(metrics.busiestLocalDay).toEqual({
      status: "available",
      value: { localDate: "2026-07-21", durationSeconds: 300 },
    });
  });

  it("keeps excluded apps out of every included metric", () => {
    const withExcluded = deriveUsageMetrics(currentInput());
    const withoutExcluded = deriveUsageMetrics(
      currentInput({
        snapshots: currentSnapshots.filter((item) => item.included),
      }),
    );

    expect(withExcluded).toEqual(withoutExcluded);
  });

  it("uses deterministic earlier-date and package tie breakers", () => {
    const metrics = deriveUsageMetrics({
      permission: "granted",
      localDates: new Set(["2026-07-24", "2026-07-25"]),
      snapshots: [
        snapshot("com.zulu", "Zulu", "2026-07-25", 90),
        snapshot("com.alpha", "Alpha", "2026-07-24", 90),
      ],
    });

    expect(metrics.topAppShare).toEqual({
      status: "available",
      value: {
        packageName: "com.alpha",
        displayName: "Alpha",
        durationSeconds: 90,
        share: 0.5,
      },
    });
    expect(metrics.busiestLocalDay).toEqual({
      status: "available",
      value: { localDate: "2026-07-24", durationSeconds: 90 },
    });
  });

  it("marks denied access unavailable instead of treating stored data as current metrics", () => {
    const metrics = deriveUsageMetrics(currentInput({ permission: "denied" }));

    expect(metrics.includedTotalSeconds).toEqual({
      status: "unavailable",
      reason: "denied",
    });
    expect(metrics.averageSecondsPerLocalDay).toEqual({
      status: "unavailable",
      reason: "denied",
    });
    expect(metrics.activeAppCount).toEqual({
      status: "unavailable",
      reason: "denied",
    });
    expect(metrics.topAppShare).toEqual({
      status: "unavailable",
      reason: "denied",
    });
    expect(metrics.previousEquivalentPeriodChange).toEqual({
      status: "unavailable",
      reason: "denied",
    });
    expect(metrics.busiestLocalDay).toEqual({
      status: "unavailable",
      reason: "denied",
    });
  });

  it("states empty data, empty periods, and missing previous input explicitly", () => {
    const emptyData = deriveUsageMetrics(
      currentInput({
        snapshots: [
          snapshot("com.video", "Video", "2026-07-20", 10_000, false),
        ],
      }),
    );
    expect(emptyData.includedTotalSeconds).toEqual({
      status: "empty",
      reason: "no-included-usage",
    });
    expect(emptyData.activeAppCount).toEqual({
      status: "empty",
      reason: "no-included-usage",
    });
    expect(emptyData.topAppShare).toEqual({
      status: "empty",
      reason: "no-included-usage",
    });
    expect(emptyData.busiestLocalDay).toEqual({
      status: "empty",
      reason: "no-included-usage",
    });
    expect(emptyData.previousEquivalentPeriodChange).toEqual({
      status: "empty",
      reason: "no-included-usage",
    });

    const emptyPeriod = deriveUsageMetrics(
      currentInput({ localDates: new Set() }),
    );
    expect(emptyPeriod.includedTotalSeconds).toEqual({
      status: "empty",
      reason: "no-local-days",
    });

    const missingPrevious = deriveUsageMetrics(currentInput());
    expect(missingPrevious.previousEquivalentPeriodChange).toEqual({
      status: "empty",
      reason: "previous-period-not-provided",
    });
  });

  it("marks an unavailable previous period without hiding current metrics", () => {
    const metrics = deriveUsageMetrics({
      ...currentInput(),
      previous: { ...previousPeriod, permission: "unsupported" },
    });

    expect(metrics.includedTotalSeconds).toEqual({
      status: "available",
      value: 720,
    });
    expect(metrics.previousEquivalentPeriodChange).toEqual({
      status: "unavailable",
      reason: "previous-period-unavailable",
    });
  });
});
