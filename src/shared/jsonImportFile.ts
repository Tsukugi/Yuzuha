import {errorCodes, isErrorWithCode, keepLocalCopy, pick} from '@react-native-documents/picker';
import {FileSystem} from 'react-native-file-access';
import {
  JsonImportError,
  parseJsonImport,
  type JsonImportPreview,
} from './dataImport';

export const JSON_IMPORT_MAX_BYTES = 5_000_000;

const JSON_IMPORT_MIME_TYPES = ['application/json', 'text/json'];

export interface JsonImportFilePreview extends JsonImportPreview {
  name: string;
}

export class JsonImportFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JsonImportFileError';
  }
}

export class JsonImportFileCanceled extends JsonImportFileError {
  constructor() {
    super('JSON restore was canceled.');
    this.name = 'JsonImportFileCanceled';
  }
}

export async function openJsonImportFile(): Promise<JsonImportFilePreview> {
  let pickedFile;
  try {
    [pickedFile] = await pick({
      mode: 'import',
      type: JSON_IMPORT_MIME_TYPES,
      allowMultiSelection: false,
      allowVirtualFiles: false,
    });
  } catch (error) {
    if (isCanceledError(error)) {
      throw new JsonImportFileCanceled();
    }
    throw new JsonImportFileError('The JSON export could not be opened.');
  }

  if (!pickedFile?.uri || pickedFile.error || pickedFile.hasRequestedType === false ||
      (pickedFile.type !== null && !JSON_IMPORT_MIME_TYPES.includes(pickedFile.type))) {
    throw new JsonImportFileError('The selected file is not a supported current Yuzuha JSON export.');
  }
  if (pickedFile.size !== null && pickedFile.size > JSON_IMPORT_MAX_BYTES) {
    throw new JsonImportFileError(`The JSON export is larger than ${JSON_IMPORT_MAX_BYTES} bytes.`);
  }

  let localUri: string | null = null;
  try {
    const localCopies = await keepLocalCopy({
      files: [{uri: pickedFile.uri, fileName: pickedFile.name ?? 'yuzuha-export.json'}],
      destination: 'cachesDirectory',
    });
    const localCopy = localCopies[0];
    if (!localCopy || localCopy.status !== 'success') {
      throw new JsonImportFileError('The JSON export could not be copied into app storage.');
    }
    localUri = localCopy.localUri;
    const stat = await FileSystem.stat(localUri);
    if (stat.type !== 'file' || stat.size > JSON_IMPORT_MAX_BYTES) {
      throw new JsonImportFileError(`The JSON export is larger than ${JSON_IMPORT_MAX_BYTES} bytes.`);
    }
    const raw = await FileSystem.readFile(localUri, 'utf8');
    return {
      ...parseJsonImport(raw),
      name: pickedFile.name ?? 'JSON export',
    };
  } catch (error) {
    if (error instanceof JsonImportError || error instanceof JsonImportFileError) {
      throw error;
    }
    throw new JsonImportFileError('The selected JSON export could not be read.');
  } finally {
    if (localUri) {
      await FileSystem.unlink(localUri);
    }
  }
}

function isCanceledError(error: unknown): boolean {
  return isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED;
}
