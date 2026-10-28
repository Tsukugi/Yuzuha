import TestRenderer, {act} from 'react-test-renderer';
import {Text} from 'react-native';

jest.mock('@react-native-documents/picker', () => ({
  errorCodes: {},
  isErrorWithCode: jest.fn(),
  keepLocalCopy: jest.fn(),
  pick: jest.fn(),
  saveDocuments: jest.fn(),
}));

jest.mock('react-native-file-access', () => ({
  Dirs: {CacheDir: '', DocumentDir: ''},
  FileSystem: {},
}));

jest.mock('../data/AppStore', () => ({useAppStore: jest.fn()}));
jest.mock('../shared/attachmentFiles', () => ({
  AttachmentFileCanceled: class AttachmentFileCanceled extends Error {},
  deleteAttachmentFile: jest.fn(),
  importAttachmentFile: jest.fn(),
  openAttachmentFile: jest.fn(),
  readAttachmentBackupFiles: jest.fn(),
  stageAttachmentBackupFiles: jest.fn(),
}));

import {BOTTOM_NAV_SAFE_AREA_INSETS, SettingsScreen, TabHeader, createStyles, formatActiveAccountCount, isMoneySecondaryView, moneyRangePeriodLabel, shouldShowBottomNavigation} from './MainApp';
import {THEME_PALETTES, ThemeProvider} from './theme';
import {emptyAppData} from '../types/domain';

const mockedUseAppStore = jest.requireMock('../data/AppStore').useAppStore as jest.Mock;

beforeEach(() => {
  mockedUseAppStore.mockReset();
});

describe('Main app layout', () => {
  it('keeps breathing room between note filters and their results', () => {
    const styles = createStyles(THEME_PALETTES.moss.light);

    expect(styles.notesFilterRow).toMatchObject({marginBottom: 16});
  });

  it('uses one content column for mobile cards', () => {
    const styles = createStyles(THEME_PALETTES.moss.light);

    expect(styles.paletteGrid).not.toHaveProperty('flexDirection', 'row');
    expect(styles.paletteOption).toMatchObject({width: '100%'});
    expect(styles.moneyActivityRow).not.toHaveProperty('flexDirection', 'row');
    expect(styles.segmentRow).toMatchObject({flexDirection: 'column'});
    expect(styles.segmentButton).toMatchObject({width: '100%'});
  });

  it('does not reserve the system bottom inset twice below the tab bar', () => {
    expect(BOTTOM_NAV_SAFE_AREA_INSETS).toEqual({bottom: 0});
  });

  it('hides primary tabs on Settings and other secondary screens', () => {
    expect(shouldShowBottomNavigation('home', false)).toBe(true);
    expect(shouldShowBottomNavigation('home', true)).toBe(false);
    expect(shouldShowBottomNavigation('appTime', false)).toBe(false);
  });

  it('treats every Money tool as a secondary screen', () => {
    expect(isMoneySecondaryView('entry')).toBe(false);
    expect(isMoneySecondaryView('report')).toBe(true);
    expect(isMoneySecondaryView('budget')).toBe(true);
    expect(isMoneySecondaryView('transfer')).toBe(true);
    expect(isMoneySecondaryView('split')).toBe(true);
    expect(isMoneySecondaryView('recurrence')).toBe(true);
  });

  it('gives every report period one menu label', () => {
    expect((['day', 'week', 'month', 'year', 'custom'] as const).map(moneyRangePeriodLabel)).toEqual(['Day', 'Week', 'Month', 'Year', 'Custom']);
  });
});

describe('Primary tab header', () => {
  it('reaches the screen edges instead of inheriting the scroll content inset', () => {
    const styles = createStyles(THEME_PALETTES.moss.light);

    expect(styles.scrollContent).toMatchObject({padding: 16, paddingTop: 16});
    expect(styles.tabHeader).toMatchObject({marginBottom: -16, marginHorizontal: -16, minHeight: 80, transform: [{translateY: -16}]});
  });

  it('uses singular account wording only for one active account', () => {
    expect(formatActiveAccountCount(1)).toBe('1 active account');
    expect(formatActiveAccountCount(2)).toBe('2 active accounts');
  });

  it('reveals a cog-labeled Settings option from the vertical overflow button', () => {
    jest.useFakeTimers();
    const onOpenSettings = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    act(() => {
      renderer = TestRenderer.create(
        <ThemeProvider>
          <TabHeader title="Money" subtitle="EUR · 2 active accounts" onOpenSettings={onOpenSettings} />
        </ThemeProvider>,
      );
    });

    expect(renderer!.root.findByProps({accessibilityLabel: 'More Money options'})).toBeDefined();
    act(() => {
      renderer!.root.findByProps({accessibilityLabel: 'More Money options'}).props.onPress();
      jest.runOnlyPendingTimers();
    });
    expect(renderer!.root.findAllByType(Text).map(node => String(node.props.children))).toEqual(expect.arrayContaining(['Money', 'EUR · 2 active accounts', 'Settings']));
    const settingsItem = renderer!.root.findByProps({accessibilityLabel: 'Open Money settings'});
    expect(settingsItem.props.leadingIcon).toBe('cog-outline');
    act(() => settingsItem.props.onPress());
    act(() => jest.advanceTimersByTime(1000));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    act(() => renderer!.unmount());
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });
});

describe('Settings screen', () => {
  it('opens workspace, app-time, and task-reminder configuration on dedicated screens', async () => {
    jest.useFakeTimers();
    const data = emptyAppData();
    data.usageSnapshots = [{id: 'usage_chat', packageName: 'com.chat', displayName: 'Chat', localDate: '2026-09-02', durationSeconds: 120, sourceReadAt: '2026-09-02T12:00:00.000Z', included: true}];
    const setWeekStartsOn = jest.fn().mockResolvedValue(undefined);
    const setNotificationQuietHours = jest.fn().mockResolvedValue(undefined);
    const toggleUsageExclusion = jest.fn().mockResolvedValue(undefined);
    mockedUseAppStore.mockReturnValue({
      data,
      setWeekStartsOn,
      setNotificationQuietHours,
      toggleUsageExclusion,
    });
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    act(() => {
      renderer = TestRenderer.create(
        <ThemeProvider>
          <SettingsScreen bundleVersion="0.2.0" onBack={jest.fn()} />
        </ThemeProvider>,
      );
    });

    const text = renderer!.root.findAllByType(Text).map(node => String(node.props.children));
    expect(text).toEqual(expect.arrayContaining(['General', 'App time', 'Task reminders']));
    expect(text).not.toContain('Week starts on');
    expect(renderer!.root.findAllByProps({accessibilityLabel: 'Save notification settings'})).toHaveLength(0);

    act(() => renderer!.root.findByProps({accessibilityLabel: 'Open General settings'}).props.onPress());
    expect(renderer!.root.findAllByType(Text).map(node => String(node.props.children))).toEqual(expect.arrayContaining(['Week starts on', 'Sunday', 'Monday']));
    expect(renderer!.root.findAllByType(Text).map(node => String(node.props.children))).not.toContain('App time');
    act(() => renderer!.root.findByProps({accessibilityLabel: 'Sunday'}).props.onPress());
    expect(setWeekStartsOn).toHaveBeenCalledWith(0);
    act(() => renderer!.root.findByProps({accessibilityLabel: 'Back to Settings'}).props.onPress());

    act(() => renderer!.root.findByProps({accessibilityLabel: 'Open Money settings'}).props.onPress());
    expect(renderer!.root.findAllByType(Text).map(node => String(node.props.children))).toEqual(expect.arrayContaining(['Accounts', 'Categories', 'Payees']));
    expect(renderer!.root.findAllByProps({accessibilityLabel: 'New account name'})).toHaveLength(0);
    act(() => renderer!.root.findByProps({accessibilityLabel: 'Show Add account'}).props.onPress());
    expect(renderer!.root.findByProps({accessibilityLabel: 'New account name'})).toBeDefined();
    act(() => renderer!.root.findByProps({accessibilityLabel: 'Back to Settings'}).props.onPress());

    act(() => renderer!.root.findByProps({accessibilityLabel: 'Open Task organization settings'}).props.onPress());
    expect(renderer!.root.findAllByType(Text).map(node => String(node.props.children))).toEqual(expect.arrayContaining(['Dependencies', 'Projects', 'Templates', 'Lists', 'Recurring tasks']));
    expect(renderer!.root.findAllByProps({accessibilityLabel: 'Project name'})).toHaveLength(0);
    act(() => renderer!.root.findByProps({accessibilityLabel: 'Open Projects'}).props.onPress());
    expect(renderer!.root.findAllByProps({accessibilityLabel: 'Project name'})).toHaveLength(0);
    act(() => renderer!.root.findByProps({accessibilityLabel: 'Show Add project'}).props.onPress());
    expect(renderer!.root.findByProps({accessibilityLabel: 'Project name'})).toBeDefined();
    act(() => renderer!.root.findByProps({accessibilityLabel: 'Back to categories'}).props.onPress());
    act(() => renderer!.root.findByProps({accessibilityLabel: 'Back to Settings'}).props.onPress());

    act(() => renderer!.root.findByProps({accessibilityLabel: 'Open App time settings'}).props.onPress());
    expect(renderer!.root.findAllByType(Text).map(node => String(node.props.children))).toContain('App groups');
    act(() => renderer!.root.findByProps({accessibilityLabel: 'Exclude'}).props.onPress());
    expect(toggleUsageExclusion).toHaveBeenCalledWith('com.chat');
    act(() => renderer!.root.findByProps({accessibilityLabel: 'Back to Settings'}).props.onPress());

    act(() => renderer!.root.findByProps({accessibilityLabel: 'Open Task reminders settings'}).props.onPress());
    expect(renderer!.root.findByProps({accessibilityLabel: 'Save notification settings'})).toBeDefined();
    await act(async () => renderer!.root.findByProps({accessibilityLabel: 'Save notification settings'}).props.onPress());
    expect(setNotificationQuietHours).toHaveBeenCalledWith('', '', 60, true, true);
    act(() => renderer!.unmount());
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it('opens OTA update controls on a dedicated screen', () => {
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    act(() => {
      renderer = TestRenderer.create(
        <ThemeProvider>
          <SettingsScreen bundleVersion="0.1.3" onBack={jest.fn()} />
        </ThemeProvider>,
      );
    });

    expect(renderer).toBeDefined();
    const text = renderer!.root.findAllByType(Text).map(node => String(node.props.children));
    expect(text).toContain('Settings');
    expect(text).toContain('Code updates');
    expect(renderer!.root.findAllByProps({accessibilityLabel: 'Check for updates'})).toHaveLength(0);
    act(() => renderer!.root.findByProps({accessibilityLabel: 'Open Code updates settings'}).props.onPress());
    expect(renderer!.root.findByProps({accessibilityLabel: 'Check for updates'})).toBeDefined();
  });

  it('shows five color palettes and changes the active palette', () => {
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    act(() => {
      renderer = TestRenderer.create(
        <ThemeProvider>
          <SettingsScreen bundleVersion="0.1.3" onBack={jest.fn()} />
        </ThemeProvider>,
      );
    });

    act(() => renderer!.root.findByProps({accessibilityLabel: 'Open Appearance settings'}).props.onPress());

    const paletteText = renderer!.root.findAllByType(Text).map(node => String(node.props.children));
    for (const label of ['Moss', 'Ocean', 'Sunset', 'Plum', 'Citrus']) {
      expect(paletteText).toContain(label);
    }

    act(() => {
      renderer!.root.findByProps({accessibilityLabel: 'Use Ocean color palette'}).props.onPress();
    });

    expect(renderer!.root.findByProps({accessibilityLabel: 'Use Ocean color palette'}).props.accessibilityState).toEqual({selected: true});
    act(() => renderer!.root.findByProps({accessibilityLabel: 'Back to Settings'}).props.onPress());
    expect(renderer!.root.findAllByType(Text).map(node => String(node.props.children))).toContain('Ocean · System (light)');
  });

  it('can start on the dedicated Appearance screen for the local device smoke route', () => {
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    act(() => {
      renderer = TestRenderer.create(
        <ThemeProvider>
          <SettingsScreen bundleVersion="0.1.3" initiallyOpenAppearance onBack={jest.fn()} />
        </ThemeProvider>,
      );
    });

    expect(renderer!.root.findByProps({accessibilityLabel: 'Back to Settings'})).toBeDefined();
    expect(renderer!.root.findAllByProps({accessibilityLabel: 'Open General settings'})).toHaveLength(0);
    expect(renderer!.root.findAllByType(Text).map(node => String(node.props.children))).toContain('Citrus');
  });

  it('shows the one-time native transition clearly on legacy OTA 0.1.11', () => {
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    act(() => {
      renderer = TestRenderer.create(
        <ThemeProvider>
          <SettingsScreen bundleVersion="0.1.11" onBack={jest.fn()} />
        </ThemeProvider>,
      );
    });

    act(() => renderer!.root.findByProps({accessibilityLabel: 'Open Code updates settings'}).props.onPress());
    expect(renderer!.root.findAllByType(Text).map(node => String(node.props.children))).toContain(
      'This is the final update for the old Android shell. Install the latest Yuzuha APK once to enable automatic future APK updates.',
    );
    expect(renderer!.root.findByProps({accessibilityLabel: 'Open latest Yuzuha APK'})).toBeDefined();
  });
});
