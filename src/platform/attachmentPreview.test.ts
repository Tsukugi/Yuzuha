import {NativeModules} from 'react-native';
import {beforeEach} from '@jest/globals';
import {AttachmentPreviewError, openAttachmentPreview} from './attachmentPreview';

jest.mock('react-native', () => ({
  NativeModules: {
    YuzuhaAttachmentPreview: {
      openAttachment: jest.fn(),
    },
  },
  Platform: {OS: 'android'},
}));

const openAttachmentMock = (NativeModules.YuzuhaAttachmentPreview as {openAttachment: jest.Mock}).openAttachment;

describe('attachment preview bridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens an app-private file through the Android bridge', async () => {
    openAttachmentMock.mockResolvedValue(true);

    await expect(openAttachmentPreview('/data/user/0/dev.yuzuha/files/attachments/attachment_1', 'application/pdf')).resolves.toBeUndefined();

    expect(openAttachmentMock).toHaveBeenCalledWith('/data/user/0/dev.yuzuha/files/attachments/attachment_1', 'application/pdf');
  });

  it('turns bridge failures into a preview error', async () => {
    openAttachmentMock.mockRejectedValue(new Error('No Android app can open this attachment.'));

    await expect(openAttachmentPreview('/data/user/0/dev.yuzuha/files/attachments/attachment_1', 'text/plain')).rejects.toEqual(
      new AttachmentPreviewError('No Android app can open this attachment.'),
    );
  });
});
