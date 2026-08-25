import {isApkReleaseVersion, isOtaVersionForNative, isReleaseKindAllowed} from './versionPolicy';

describe('Android release version policy', () => {
  it('publishes a stable APK for every release version', () => {
    expect(isApkReleaseVersion('0.2.0')).toBe(true);
    expect(isApkReleaseVersion('0.2.1')).toBe(true);
    expect(isApkReleaseVersion('0.3.4')).toBe(true);
    expect(isApkReleaseVersion('1.0.0')).toBe(true);
    expect(isApkReleaseVersion('0.2.0-alpha.1')).toBe(false);
  });

  it('keeps OTA releases on the installed native major/minor line', () => {
    expect(isOtaVersionForNative('0.1.11', '0.1.3')).toBe(true);
    expect(isOtaVersionForNative('0.2.1', '0.2.0')).toBe(true);
    expect(isOtaVersionForNative('0.2.8', '0.2.7')).toBe(true);
    expect(isOtaVersionForNative('0.3.0', '0.2.0')).toBe(false);
    expect(isOtaVersionForNative('0.3.1', '0.2.0')).toBe(false);
    expect(isOtaVersionForNative('0.2.0', '0.2.0')).toBe(false);
    expect(isOtaVersionForNative('0.2.1-alpha.1', '0.2.0')).toBe(false);
  });

  it('requires native baselines to reset patch and compatible releases to increment it', () => {
    expect(isReleaseKindAllowed('0.3.0', 'native-baseline')).toBe(true);
    expect(isReleaseKindAllowed('1.0.0', 'native-baseline')).toBe(true);
    expect(isReleaseKindAllowed('0.3.4', 'native-baseline')).toBe(false);
    expect(isReleaseKindAllowed('0.3.4', 'compatible-patch')).toBe(true);
    expect(isReleaseKindAllowed('0.3.0', 'compatible-patch')).toBe(false);
  });
});
