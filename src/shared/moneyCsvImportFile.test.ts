import {beforeEach} from '@jest/globals';
import {buildMoneyCsvExport} from './dataExport';
import {emptyAppData} from '../types/domain';
import {MoneyCsvImportFileCanceled, openMoneyCsvImportFile} from './moneyCsvImportFile';

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

describe('money CSV import files', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fileAccess.FileSystem.unlink.mockResolvedValue(undefined);
  });

  it('copies, reads, validates, and cleans up a selected current CSV file', async () => {
    const data = emptyAppData();
    picker.pick.mockResolvedValue([{uri: 'content://money.csv', name: 'money.csv', type: 'text/csv', size: 120, hasRequestedType: true, error: null}]);
    picker.keepLocalCopy.mockResolvedValue([{status: 'success', sourceUri: 'content://money.csv', localUri: 'file:///cache/money.csv'}]);
    fileAccess.FileSystem.stat.mockResolvedValue({type: 'file', size: 120});
    fileAccess.FileSystem.readFile.mockResolvedValue(buildMoneyCsvExport(data));

    const preview = await openMoneyCsvImportFile(data);

    expect(preview.name).toBe('money.csv');
    expect(preview.errors).toEqual([]);
    expect(picker.pick).toHaveBeenCalledWith({
      mode: 'import',
      type: ['text/csv', 'text/comma-separated-values', 'text/plain'],
      allowMultiSelection: false,
      allowVirtualFiles: false,
    });
    expect(fileAccess.FileSystem.unlink).toHaveBeenCalledWith('file:///cache/money.csv');
  });

  it('maps picker cancellation to a typed cancellation', async () => {
    picker.pick.mockRejectedValue({code: 'OPERATION_CANCELED'});

    await expect(openMoneyCsvImportFile(emptyAppData())).rejects.toBeInstanceOf(MoneyCsvImportFileCanceled);
  });
});
