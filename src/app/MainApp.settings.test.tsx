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

import {SettingsScreen, createStyles} from './MainApp';
import {THEME_PALETTES, ThemeProvider} from './theme';

describe('Main app layout', () => {
  it('keeps breathing room between note filters and their results', () => {
    const styles = createStyles(THEME_PALETTES.moss.light);

    expect(styles.notesFilterRow).toMatchObject({marginBottom: 16});
  });
});

describe('Settings screen', () => {
  it('shows the OTA update controls when opened', () => {
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

    act(() => {
      renderer!.root.findByProps({accessibilityLabel: 'Show Appearance'}).props.onPress();
    });

    const paletteText = renderer!.root.findAllByType(Text).map(node => String(node.props.children));
    for (const label of ['Moss', 'Ocean', 'Sunset', 'Plum', 'Citrus']) {
      expect(paletteText).toContain(label);
    }

    act(() => {
      renderer!.root.findByProps({accessibilityLabel: 'Use Ocean color palette'}).props.onPress();
    });

    expect(renderer!.root.findByProps({accessibilityLabel: 'Use Ocean color palette'}).props.accessibilityState).toEqual({selected: true});
    expect(renderer!.root.findAllByType(Text).map(node => String(node.props.children))).toContain('Ocean · System (light)');
  });

  it('can start with Appearance expanded for the local device smoke route', () => {
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    act(() => {
      renderer = TestRenderer.create(
        <ThemeProvider>
          <SettingsScreen bundleVersion="0.1.3" initiallyOpenAppearance onBack={jest.fn()} />
        </ThemeProvider>,
      );
    });

    expect(renderer!.root.findByProps({accessibilityLabel: 'Hide Appearance'})).toBeDefined();
    expect(renderer!.root.findAllByType(Text).map(node => String(node.props.children))).toContain('Citrus');
  });
});
