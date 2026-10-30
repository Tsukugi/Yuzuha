import TestRenderer, {act} from 'react-test-renderer';
import {Alert, AppState, BackHandler, Text, ScrollView, View, KeyboardAvoidingView, Platform} from 'react-native';
import {Button, Menu, List} from 'react-native-paper';

jest.mock('@react-native-documents/picker', () => ({errorCodes: {}, isErrorWithCode: jest.fn(), keepLocalCopy: jest.fn(), pick: jest.fn(), saveDocuments: jest.fn()}));
jest.mock('react-native-file-access', () => ({Dirs: {CacheDir: '', DocumentDir: ''}, FileSystem: {}}));
jest.mock('../data/AppStore', () => ({useAppStore: jest.fn()}));
jest.mock('../shared/attachmentFiles', () => ({AttachmentFileCanceled: class extends Error {}, deleteAttachmentFile: jest.fn(), importAttachmentFile: jest.fn(), openAttachmentFile: jest.fn(), readAttachmentBackupFiles: jest.fn(), stageAttachmentBackupFiles: jest.fn()}));
jest.mock('../platform/usageAccess', () => ({usageAccess: {isSupported: () => true, hasPermission: jest.fn(), openSettings: jest.fn(), query: jest.fn()}}));

import {HomeScreen, MainApp, MoneyScreen, TabHeader, createStyles} from './MainApp';
import {THEME_PALETTES, ThemeProvider} from './theme';
import {ChoiceMenu, DeferredSection} from './ProgressiveControls';
import {emptyAppData} from '../types/domain';
import {usageAccess} from '../platform/usageAccess';

const store = jest.requireMock('../data/AppStore').useAppStore as jest.Mock;
let renderer: TestRenderer.ReactTestRenderer;
let backListeners: Array<Parameters<typeof BackHandler.addEventListener>[1]>;
let resume: (state: import('react-native').AppStateStatus) => void;

async function mount(element = <MainApp />) {
  await act(async () => {renderer = TestRenderer.create(<ThemeProvider>{element}</ThemeProvider>);});
}
function press(label: string) {
  act(() => renderer.root.findByProps({accessibilityLabel: label}).props.onPress());
}
function texts() {return renderer.root.findAllByType(Text).map(n => String(n.props.children)).join('\n');}
function back() {
  act(() => {for (const handler of [...backListeners].reverse()) {if (handler({} as Parameters<typeof handler>[0])) break;}});
}

beforeEach(() => {
  jest.useFakeTimers();
  backListeners = [];
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    backListeners.push(handler);
    return {remove: () => {backListeners = backListeners.filter(item => item !== handler);}};
  });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
    resume = handler;
    return {remove: jest.fn()};
  });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  store.mockReturnValue({data: emptyAppData(), setUsagePermission: jest.fn().mockResolvedValue(undefined)});
  jest.mocked(usageAccess.hasPermission).mockResolvedValue(false);
});
afterEach(() => {
  act(() => jest.runOnlyPendingTimers());
  if (renderer) act(() => renderer.unmount());
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it('YZ-018/YZ-025 exposes period alternatives through one labeled menu', async () => {
  await mount();
  expect(renderer.root.findAllByType(ChoiceMenu)).toHaveLength(1);
  expect(texts()).toContain('Period · Today');
  expect(texts()).not.toContain('This week');
  await act(async () => press('Choose period'));
  act(() => jest.advanceTimersByTime(1000));
  const menu = renderer.root.findByType(ChoiceMenu).findByType(Menu);
  expect(menu.props.visible).toBe(true);
  const options = menu.props.children.props.children;
  expect(options[0].props.accessibilityState.selected).toBe(true);
  await act(async () => options[1].props.onPress());
  act(() => jest.advanceTimersByTime(1000));
  expect(texts()).toContain('Period · This week');
  expect(renderer.root.findByType(ChoiceMenu).findByType(Menu).props.visible).toBe(false);
});

it('YZ-019 Android Back returns from Settings to the selected tab', async () => {
  await mount();
  act(() => renderer.root.findByType(HomeScreen).props.onOpenSettings());
  expect(texts()).toContain('Settings');
  await act(async () => back());
  expect(texts()).toContain('Overview');
});

it('YZ-019 Android Back keeps an unsaved note until discard is confirmed', async () => {
  await mount();
  act(() => renderer.root.findByType(HomeScreen).props.onQuickCapture('notes'));
  act(() => renderer.root.findByProps({accessibilityLabel: 'Note title'}).props.onChangeText('Keep my draft'));
  await act(async () => back());
  expect(Alert.alert).toHaveBeenCalledWith('Discard changes?', expect.any(String), expect.any(Array));
  expect(renderer.root.findByProps({accessibilityLabel: 'Note title'}).props.value).toBe('Keep my draft');
  const buttons = jest.mocked(Alert.alert).mock.calls[0][2]!;
  act(() => buttons.find(button => button.text === 'Discard')!.onPress!());
  expect(texts()).not.toContain('Save note');
});

it('YZ-020 invalid JSON shows its error while Export and backup is closed', async () => {
  await mount();
  act(() => renderer.root.findByType(HomeScreen).props.onOpenDataTools());
  press('Show Restore JSON export');
  act(() => renderer.root.findByProps({accessibilityLabel: 'JSON restore text'}).props.onChangeText('not-json'));
  press('Preview restore');
  expect(texts()).toContain('The restore text is not valid JSON.');
  expect(texts()).not.toContain('Share JSON export');
});

it('YZ-021 periodic capture starts with Repeat enabled while normal capture does not', async () => {
  await mount(<MoneyScreen focusMoneyId={null} focusBudgetId={null} openAdd={false} onAddHandled={() => {}} onFocusHandled={() => {}} onBudgetFocusHandled={() => {}} onSecondaryScreenChange={() => {}} onOpenSettings={() => {}} />);
  act(() => renderer.root.findByType(TabHeader).props.actions.find((a: {label: string}) => a.label === 'Periodic money').onPress());
  press('Add periodic operation');
  expect(renderer.root.findByProps({accessibilityLabel: 'Repeat'}).props.accessibilityState?.checked ?? renderer.root.findByProps({accessibilityLabel: 'Repeat'}).props.value).toBe(true);
  expect(texts()).toContain('Save periodic operation');
  press('Cancel');
  press('Add money entry');
  expect(texts()).toContain('Save entry');
  expect(texts()).not.toContain('Save periodic operation');
});

it('YZ-022 rechecks Usage Access when the app resumes', async () => {
  await mount();
  await act(async () => renderer.root.findByType(HomeScreen).props.onNavigate('appTime'));
  expect(texts()).toContain('Usage Access is off');
  jest.mocked(usageAccess.hasPermission).mockResolvedValue(true);
  expect(resume).toBeDefined();
  await act(async () => resume('active'));
  expect(texts()).not.toContain('Usage Access is off');
  expect(texts()).toContain('Refresh selected period');
});

it('YZ-023 primary save/cancel actions have familiar icons and keep their labels', async () => {
  await mount();
  act(() => renderer.root.findByType(HomeScreen).props.onQuickCapture('notes'));
  const buttons = renderer.root.findAllByType(Button);
  expect(buttons.find(n => n.props.accessibilityLabel === 'Save note')!.props.icon).toBe('content-save-outline');
  expect(buttons.find(n => n.props.accessibilityLabel === 'Cancel')!.props.icon).toBe('close');
});

it('YZ-019 closes an open snooze menu before returning from the Settings detail', async () => {
  await mount();
  act(() => renderer.root.findByType(HomeScreen).props.onOpenSettings());
  act(() => renderer.root.findAllByType(List.Item).find(n => n.props.title === 'Task reminders')!.props.onPress());
  expect(renderer.root.findAllByProps({accessibilityLabel: 'Choose snooze duration'})).toHaveLength(0);
  press('Show Delivery options');
  const menu = renderer.root.findByType(Menu);
  act(() => menu.props.anchor.props.onPress());
  expect(renderer.root.findByType(Menu).props.visible).toBe(true);
  await act(async () => back());
  expect(renderer.root.findByType(Menu).props.visible).toBe(false);
  act(() => jest.advanceTimersByTime(1000));
  expect(texts()).toContain('Snooze');
  await act(async () => back());
  expect(renderer.root.findByProps({accessibilityLabel: 'Show Delivery options'})).toBeDefined();
  await act(async () => back());
  expect(texts()).toContain('Settings');
  expect(renderer.root.findAllByType(List.Item).some(n => n.props.title === 'Task reminders')).toBe(true);
});

it('YZ-024 money actions occupy a reserved row outside the scrolling form', async () => {
  await mount();
  act(() => renderer.root.findByType(HomeScreen).props.onQuickCapture('money'));
  const actions = renderer.root.findByProps({accessibilityLabel: 'Money form actions'});
  expect(actions.findAllByType(Button).map(n => n.props.accessibilityLabel)).toEqual(['Save entry', 'Cancel']);
  expect(renderer.root.findAllByType(ScrollView).every(scroll => !scroll.findAllByType(View).includes(actions))).toBe(true);
  expect(renderer.root.findByType(KeyboardAvoidingView).props.behavior).toBe(Platform.OS === 'ios' ? 'padding' : 'height');
  expect(texts()).not.toContain('Occurred date and time');
  press('Show More entry details');
  expect(texts()).toContain('Occurred date and time');
});

it('YZ-025 money keeps optional recurrence hidden and preserves it when collapsed', async () => {
  await mount();
  act(() => renderer.root.findByType(HomeScreen).props.onQuickCapture('money'));
  expect(renderer.root.findAllByProps({accessibilityLabel: 'Repeat'})).toHaveLength(0);
  expect(renderer.root.findByProps({accessibilityLabel: 'Choose category'})).toBeDefined();
  act(() => renderer.root.findByProps({accessibilityLabel: 'Amount'}).props.onChangeText('9.50'));
  press('Show Repeat operation');
  press('Repeat');
  press('Hide Repeat operation');
  expect(renderer.root.findAllByProps({accessibilityLabel: 'Periodic interval'})).toHaveLength(0);
  expect(texts()).toContain('Save periodic operation');
  expect(renderer.root.findByProps({accessibilityLabel: 'Amount'}).props.value).toBe('9.50');
  press('Show Repeat operation');
  expect(renderer.root.findByProps({accessibilityLabel: 'Repeat'}).props.accessibilityState.checked).toBe(true);
});

it('YZ-025 note search waits for Save this search before showing a naming form', async () => {
  await mount();
  act(() => renderer.root.findByType(HomeScreen).props.onNavigate('notes'));
  act(() => renderer.root.findByProps({accessibilityLabel: 'Search notes'}).props.onChangeText('work'));
  expect(renderer.root.findAllByProps({accessibilityLabel: 'Saved search name'})).toHaveLength(0);
  press('Show Save this search');
  act(() => renderer.root.findByProps({accessibilityLabel: 'Saved search name'}).props.onChangeText('Work notes'));
  press('Hide Save this search');
  press('Show Save this search');
  expect(renderer.root.findByProps({accessibilityLabel: 'Saved search name'}).props.value).toBe('Work notes');
  expect(renderer.root.findByProps({accessibilityLabel: 'Search notes'}).props.value).toBe('work');
});

it('YZ-025 edit targets reveal their deferred form and Android Back folds it first', async () => {
  const element = (target: string | null) => <ThemeProvider><DeferredSection title="Edit record" revealKey={target}><Text>Editor fields</Text></DeferredSection></ThemeProvider>;
  await act(async () => {renderer = TestRenderer.create(element(null));});
  expect(texts()).not.toContain('Editor fields');
  await act(async () => renderer.update(element('record-1')));
  expect(texts()).toContain('Editor fields');
  await act(async () => back());
  expect(texts()).not.toContain('Editor fields');
  await act(async () => renderer.update(element('record-2')));
  expect(texts()).toContain('Editor fields');
});

it('YZ-025 validation feedback stays visible when its optional form is folded', async () => {
  store.mockReturnValue({data: emptyAppData(), addMoneyAccount: jest.fn().mockRejectedValue(new Error('Account already exists.'))});
  await mount();
  act(() => renderer.root.findByType(HomeScreen).props.onOpenSettings());
  press('Open Money settings');
  press('Show Add account');
  act(() => renderer.root.findByProps({accessibilityLabel: 'New account name'}).props.onChangeText('Everyday'));
  await act(async () => press('Add account'));
  press('Hide Add account');
  expect(renderer.root.findAllByProps({accessibilityLabel: 'New account name'})).toHaveLength(0);
  expect(texts()).toContain('Account already exists.');
});

it('YZ-027 add buttons overlay full-height lists with scroll-end clearance', async () => {
  const styles = createStyles(THEME_PALETTES.moss.light);
  expect(styles.fab).toMatchObject({position: 'absolute', bottom: 16, right: 16});
  expect(styles.fab).not.toHaveProperty('margin');
  expect(styles.fabLayer).toMatchObject({position: 'absolute', bottom: 0, left: 0, right: 0});
  await mount();
  const home = renderer.root.findByType(HomeScreen);
  expect(home.findByType(ScrollView).props.contentContainerStyle).toEqual(
    expect.arrayContaining([expect.objectContaining({paddingBottom: 96})]),
  );
});
