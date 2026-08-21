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

import {AccountSelector} from './MainApp';
import {ThemeProvider} from './theme';
import {emptyAppData} from '../types/domain';

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

  it('renders account choices when two active accounts exist', () => {
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

    expect(renderer!.root.findAllByType(Text).map(node => String(node.props.children))).toEqual(['Account', 'Everyday', 'Savings']);
  });
});
