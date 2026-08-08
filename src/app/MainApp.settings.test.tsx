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

import {SettingsScreen} from './MainApp';

describe('Settings screen', () => {
  it('shows the OTA update controls when opened', () => {
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    act(() => {
      renderer = TestRenderer.create(
        <SettingsScreen bundleVersion="0.1.3" onBack={jest.fn()} />,
      );
    });

    expect(renderer).toBeDefined();
    const text = renderer!.root.findAllByType(Text).map(node => String(node.props.children));
    expect(text).toContain('Settings');
    expect(text).toContain('Code updates');
    expect(renderer!.root.findByProps({accessibilityLabel: 'Check for updates'})).toBeDefined();
  });
});
