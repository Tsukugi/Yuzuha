import TestRenderer, {act} from 'react-test-renderer';
import {Text} from 'react-native';
import {Button} from 'react-native-paper';

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

import {AccountSelector, MoneyReportScreen, MoneyScreen} from './MainApp';
import {ThemeProvider} from './theme';
import {emptyAppData} from '../types/domain';

const mockedUseAppStore = jest.requireMock('../data/AppStore').useAppStore as jest.Mock;

beforeEach(() => {
  mockedUseAppStore.mockReset();
});

describe('AccountSelector', () => {
  it('does not render a redundant account choice for one active account', () => {
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    act(() => {
      renderer = TestRenderer.create(
        <ThemeProvider>
          <AccountSelector accounts={emptyAppData().accounts} selectedAccountId="account_everyday" onSelect={jest.fn()} />
        </ThemeProvider>,
      );
    });

    expect(renderer!.root.findAllByType(Text).map(node => String(node.props.children))).toEqual([]);
  });

  it('shows only the selected account until choices are requested', async () => {
    jest.useFakeTimers();
    const [everyday] = emptyAppData().accounts;
    const savings = {...everyday, id: 'account_savings', name: 'Savings'};
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    act(() => {
      renderer = TestRenderer.create(
        <ThemeProvider>
          <AccountSelector accounts={[everyday, savings]} selectedAccountId={everyday.id} onSelect={jest.fn()} />
        </ThemeProvider>,
      );
    });

    expect(renderer!.root.findAllByType(Text).map(node => String(node.props.children))).toContain('Account · Everyday');
    expect(renderer!.root.findAllByType(Text).map(node => String(node.props.children))).not.toContain('Savings');
    expect(renderer!.root.findByProps({accessibilityLabel: 'Choose account'})).toBeDefined();
    await act(async () => renderer!.unmount());
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });
});

describe('Money mobile navigation', () => {
  it('keeps filters before content and moves secondary tools into the header menu', () => {
    jest.useFakeTimers();
    mockedUseAppStore.mockReturnValue({
      data: emptyAppData(),
      addMoney: jest.fn(),
      addMoneyRecurrence: jest.fn(),
      updateMoney: jest.fn(),
      deleteMoney: jest.fn(),
    });
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    act(() => {
      renderer = TestRenderer.create(
        <ThemeProvider>
          <MoneyScreen
            focusMoneyId={null}
            focusBudgetId={null}
            openAdd={false}
            onAddHandled={jest.fn()}
            onFocusHandled={jest.fn()}
            onBudgetFocusHandled={jest.fn()}
            onSecondaryScreenChange={jest.fn()}
            onOpenSettings={jest.fn()}
          />
        </ThemeProvider>,
      );
    });

    const visibleText = renderer!.root.findAllByType(Text).map(node => String(node.props.children));
    expect(visibleText).not.toContain('More money actions');
    expect(visibleText).not.toContain('Entries (0)');
    expect(visibleText).not.toContain('Entries');
    expect(visibleText.indexOf('Filters')).toBeLessThan(visibleText.indexOf('Total balance'));

    act(() => {
      renderer!.root.findByProps({accessibilityLabel: 'More Money options'}).props.onPress();
      jest.runOnlyPendingTimers();
    });
    for (const label of ['Budgets', 'Report', 'Transfer', 'Split entry', 'Periodic money', 'Account balances', 'Settings']) {
      expect(renderer!.root.findAllByType(Text).map(node => String(node.props.children))).toContain(label);
    }

    act(() => renderer!.root.findByProps({accessibilityLabel: 'Open account balances'}).props.onPress());
    expect(renderer!.root.findAllByType(Text).map(node => String(node.props.children))).toContain('Account balances');
    expect(renderer!.root.findByProps({accessibilityLabel: 'Back to Money'})).toBeDefined();
    expect(renderer!.root.findAllByProps({accessibilityLabel: 'Home'})).toHaveLength(0);

    act(() => renderer!.unmount());
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it('uses one full-width period control instead of a wrapped option row', () => {
    jest.useFakeTimers();
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    act(() => {
      renderer = TestRenderer.create(
        <ThemeProvider>
          <MoneyReportScreen data={emptyAppData()} onBack={jest.fn()} />
        </ThemeProvider>,
      );
    });

    expect(renderer!.root.findAllByType(Button).filter(node => node.props.accessibilityLabel === 'Choose report period')).toHaveLength(1);
    const visibleText = renderer!.root.findAllByType(Text).map(node => String(node.props.children));
    expect(visibleText).toContain('Month');
    for (const hiddenOption of ['Day', 'Week', 'Year', 'Custom']) {
      expect(visibleText).not.toContain(hiddenOption);
    }

    act(() => renderer!.unmount());
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });
});
