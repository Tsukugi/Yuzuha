import {beforeEach} from '@jest/globals';
import {buildJsonExport} from './dataExport';
import {emptyAppData} from '../types/domain';
import {JSON_IMPORT_MAX_BYTES, JsonImportFileCanceled, JsonImportFileError, openJsonImportFile} from './jsonImportFile';

const picker = jest.requireMock('@react-native-documents/picker') as {
  keepLocalCopy: jest.Mock;
  pick: jest.Mock;
};
const fileAccess = jest.requireMock('react-native-file-access') as {
  FileSystem: {
    readFile: jest.Mock;
    stat: jest.Mock;
    unlink: jest.Mock;
  };
};

jest.mock('@react-native-documents/picker', () => ({
  errorCodes: {OPERATION_CANCELED: 'OPERATION_CANCELED'},
  isErrorWithCode: (error: unknown): error is {code: string} => typeof error === 'object' && error !== null && 'code' in error,
  keepLocalCopy: jest.fn(),
  pick: jest.fn(),
}));

jest.mock('react-native-file-access', () => ({
  FileSystem: {
    readFile: jest.fn(),
    stat: jest.fn(),
    unlink: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('JSON import files', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fileAccess.FileSystem.unlink.mockResolvedValue(undefined);
  });

  it('copies, reads, validates, and cleans up a selected current JSON export', async () => {
    const data = emptyAppData();
    picker.pick.mockResolvedValue([{uri: 'content://yuzuha.json', name: 'yuzuha-export.json', type: 'application/json', size: 240, hasRequestedType: true, error: null}]);
    picker.keepLocalCopy.mockResolvedValue([{status: 'success', sourceUri: 'content://yuzuha.json', localUri: 'file:///cache/yuzuha-export.json'}]);
    fileAccess.FileSystem.stat.mockResolvedValue({type: 'file', size: 240});
    fileAccess.FileSystem.readFile.mockResolvedValue(buildJsonExport(data, '2026-07-27T12:00:00.000Z'));

    const preview = await openJsonImportFile();

    expect(preview.name).toBe('yuzuha-export.json');
    expect(preview.totalRecords).toBeGreaterThan(0);
    expect(picker.pick).toHaveBeenCalledWith({
      mode: 'import',
      type: ['application/json', 'text/json'],
      allowMultiSelection: false,
      allowVirtualFiles: false,
    });
    expect(fileAccess.FileSystem.unlink).toHaveBeenCalledWith('file:///cache/yuzuha-export.json');
  });

  it('maps picker cancellation to a typed cancellation', async () => {
    picker.pick.mockRejectedValue({code: 'OPERATION_CANCELED'});

    await expect(openJsonImportFile()).rejects.toBeInstanceOf(JsonImportFileCanceled);
  });

  it('rejects unsupported and oversized picker files before copying them', async () => {
    picker.pick.mockResolvedValueOnce([{uri: 'content://notes.txt', name: 'notes.txt', type: 'text/plain', size: 20, hasRequestedType: false, error: null}]);
    await expect(openJsonImportFile()).rejects.toBeInstanceOf(JsonImportFileError);
    expect(picker.keepLocalCopy).not.toHaveBeenCalled();

    picker.pick.mockResolvedValueOnce([{uri: 'content://large.json', name: 'large.json', type: 'application/json', size: JSON_IMPORT_MAX_BYTES + 1, hasRequestedType: true, error: null}]);
    await expect(openJsonImportFile()).rejects.toThrow(/larger than/i);
    expect(picker.keepLocalCopy).not.toHaveBeenCalled();
  });

  it('cleans the cache copy when current JSON validation fails', async () => {
    picker.pick.mockResolvedValue([{uri: 'content://old.json', name: 'old.json', type: 'application/json', size: 20, hasRequestedType: true, error: null}]);
    picker.keepLocalCopy.mockResolvedValue([{status: 'success', sourceUri: 'content://old.json', localUri: 'file:///cache/old.json'}]);
    fileAccess.FileSystem.stat.mockResolvedValue({type: 'file', size: 20});
    fileAccess.FileSystem.readFile.mockResolvedValue('{"exportSchemaVersion":0}');

    await expect(openJsonImportFile()).rejects.toThrow(/version|JSON/i);
    expect(fileAccess.FileSystem.unlink).toHaveBeenCalledWith('file:///cache/old.json');
  });
});
