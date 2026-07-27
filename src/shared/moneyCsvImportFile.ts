import {errorCodes, isErrorWithCode, keepLocalCopy, pick} from '@react-native-documents/picker';
import {FileSystem} from 'react-native-file-access';
import type {AppData} from '../types/domain';
import {
  MONEY_CSV_IMPORT_MAX_BYTES,
  MoneyCsvImportError,
  parseMoneyCsvImport,
  type MoneyCsvImportPreview,
} from './moneyCsvImport';

const MONEY_CSV_MIME_TYPES = ['text/csv', 'text/comma-separated-values', 'text/plain'];

export interface MoneyCsvImportFilePreview extends MoneyCsvImportPreview {
  name: string;
}

export class MoneyCsvImportFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyCsvImportFileError';
  }
}

export class MoneyCsvImportFileCanceled extends MoneyCsvImportFileError {
  constructor() {
    super('Money CSV import was canceled.');
    this.name = 'MoneyCsvImportFileCanceled';
  }
}

export async function openMoneyCsvImportFile(current: AppData): Promise<MoneyCsvImportFilePreview> {
  let pickedFile;
  try {
    [pickedFile] = await pick({
      mode: 'import',
      type: MONEY_CSV_MIME_TYPES,
      allowMultiSelection: false,
      allowVirtualFiles: false,
    });
  } catch (error) {
    if (isCanceledError(error)) {
      throw new MoneyCsvImportFileCanceled();
    }
    throw new MoneyCsvImportFileError('The money CSV file could not be opened.');
  }

  if (!pickedFile?.uri || pickedFile.error || pickedFile.hasRequestedType === false ||
      (pickedFile.type !== null && !MONEY_CSV_MIME_TYPES.includes(pickedFile.type))) {
    throw new MoneyCsvImportFileError('The selected file is not a supported money CSV file.');
  }
  if (pickedFile.size !== null && pickedFile.size > MONEY_CSV_IMPORT_MAX_BYTES) {
    throw new MoneyCsvImportFileError(`The money CSV file is larger than ${MONEY_CSV_IMPORT_MAX_BYTES} bytes.`);
  }

  let localUri: string | null = null;
  try {
    const localCopies = await keepLocalCopy({
      files: [{uri: pickedFile.uri, fileName: pickedFile.name ?? 'yuzuha-money.csv'}],
      destination: 'cachesDirectory',
    });
    const localCopy = localCopies[0];
    if (!localCopy || localCopy.status !== 'success') {
      throw new MoneyCsvImportFileError('The selected money CSV could not be copied into app storage.');
    }
    localUri = localCopy.localUri;
    const stat = await FileSystem.stat(localUri);
    if (stat.type !== 'file' || stat.size > MONEY_CSV_IMPORT_MAX_BYTES) {
      throw new MoneyCsvImportFileError(`The money CSV file is larger than ${MONEY_CSV_IMPORT_MAX_BYTES} bytes.`);
    }
    const raw = await FileSystem.readFile(localUri, 'utf8');
    return {
      ...parseMoneyCsvImport(raw, current),
      name: pickedFile.name ?? 'money CSV',
    };
  } catch (error) {
    if (error instanceof MoneyCsvImportError || error instanceof MoneyCsvImportFileError) {
      throw error;
    }
    throw new MoneyCsvImportFileError('The selected money CSV could not be read.');
  } finally {
    if (localUri) {
      await FileSystem.unlink(localUri);
    }
  }
}

function isCanceledError(error: unknown): boolean {
  return isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED;
}
