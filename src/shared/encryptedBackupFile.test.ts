import {emptyAppData} from '../types/domain';
import {buildEncryptedBackup} from './encryptedBackup';
import {
  EncryptedBackupFileCanceled,
  buildBackupFileName,
  openEncryptedBackupFile,
  saveEncryptedBackupFile,
} from './encryptedBackupFile';

const picker = jest.requireMock('@react-native-documents/picker') as {
  keepLocalCopy: jest.Mock;
  pick: jest.Mock;
  saveDocuments: jest.Mock;
};
const fileAccess = jest.requireMock('react-native-file-access') as {
  FileSystem: {
    readFile: jest.Mock;
    unlink: jest.Mock;
    writeFile: jest.Mock;
  };
};

jest.mock('@react-native-documents/picker', () => ({
  errorCodes: {OPERATION_CANCELED: 'OPERATION_CANCELED'},
  isErrorWithCode: (error: unknown): error is {code: string} => typeof error === 'object' && error !== null && 'code' in error,
  keepLocalCopy: jest.fn(),
  pick: jest.fn(),
  saveDocuments: jest.fn(),
}));

jest.mock('react-native-file-access', () => ({
  Dirs: {CacheDir: '/cache'},
  FileSystem: {
    readFile: jest.fn(),
    unlink: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
}));

const password = 'correct horse battery staple';
const createdAt = '2026-07-26T12:00:00.000Z';

describe('encrypted backup files', () => {
  function resetMocks() {
    jest.clearAllMocks();
    fileAccess.FileSystem.unlink.mockResolvedValue(undefined);
    fileAccess.FileSystem.writeFile.mockResolvedValue(undefined);
  }

  it('saves an encrypted JSON file through the system document picker and cleans the cache file', async () => {
    resetMocks();
    picker.saveDocuments.mockResolvedValue([{uri: 'content://saved', name: 'my-backup.json', error: null}]);

    await expect(saveEncryptedBackupFile(emptyAppData(), password, createdAt)).resolves.toEqual({name: 'my-backup.json'});

    expect(fileAccess.FileSystem.writeFile).toHaveBeenCalledWith(
      `/cache/${buildBackupFileName(createdAt)}`,
      expect.not.stringContaining('correct horse battery staple'),
      'utf8',
    );
    expect(picker.saveDocuments).toHaveBeenCalledWith({
      sourceUris: [`file:///cache/${buildBackupFileName(createdAt)}`],
      mimeType: 'application/json',
      fileName: buildBackupFileName(createdAt),
    });
    expect(fileAccess.FileSystem.unlink).toHaveBeenCalledWith(`/cache/${buildBackupFileName(createdAt)}`);
  });

  it('opens a selected file and returns the validated preview', async () => {
    resetMocks();
    const backup = await buildEncryptedBackup(emptyAppData(), password, createdAt, length => new Uint8Array(length).fill(7));
    picker.pick.mockResolvedValue([{uri: 'content://backup', name: 'picked.json', error: null}]);
    picker.keepLocalCopy.mockResolvedValue([{status: 'success', sourceUri: 'content://backup', localUri: 'file:///cache/picked.json'}]);
    fileAccess.FileSystem.readFile.mockResolvedValue(backup);

    const preview = await openEncryptedBackupFile(password);
    expect(preview).toMatchObject({name: 'picked.json', createdAt});
    expect(preview.totalRecords).toBeGreaterThan(0);
    expect(picker.pick).toHaveBeenCalledWith({
      mode: 'import',
      type: 'application/json',
      allowMultiSelection: false,
      allowVirtualFiles: false,
    });
    expect(picker.keepLocalCopy).toHaveBeenCalledWith({
      files: [{uri: 'content://backup', fileName: 'picked.json'}],
      destination: 'cachesDirectory',
    });
    expect(fileAccess.FileSystem.readFile).toHaveBeenCalledWith('file:///cache/picked.json', 'utf8');
    expect(fileAccess.FileSystem.unlink).toHaveBeenCalledWith('file:///cache/picked.json');
  });

  it('reports cancellation without converting it to a file error', async () => {
    resetMocks();
    picker.pick.mockRejectedValue({code: 'OPERATION_CANCELED'});

    await expect(openEncryptedBackupFile(password)).rejects.toBeInstanceOf(EncryptedBackupFileCanceled);
  });

  it('does not clean up a cache path when password validation fails before file creation', async () => {
    resetMocks();

    await expect(saveEncryptedBackupFile(emptyAppData(), 'short', createdAt)).rejects.toThrow(/at least 12/);
    expect(fileAccess.FileSystem.writeFile).not.toHaveBeenCalled();
    expect(fileAccess.FileSystem.unlink).not.toHaveBeenCalled();
  });
});
