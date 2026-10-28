import {execFileSync} from 'node:child_process';

function resolveModule(name: string) {
  return JSON.parse(execFileSync(process.execPath, ['-e', `
    const config = require('./metro.config.js');
    const context = {resolveRequest: (_context, name, platform) => ({name, platform})};
    console.log(JSON.stringify(config.resolver.resolveRequest(context, ${JSON.stringify(name)}, 'android')));
  `], {cwd: process.cwd(), encoding: 'utf8'}));
}

describe('Metro native font contract', () => {
  it('uses the APK-bundled static icons rather than a Metro font asset', () => {
    expect(resolveModule('@react-native-vector-icons/material-design-icons')).toEqual({
      name: '@react-native-vector-icons/material-design-icons/static', platform: 'android',
    });
  });

  it('delegates other dependencies to the normal resolver', () => {
    expect(resolveModule('react-native-paper')).toEqual({name: 'react-native-paper', platform: 'android'});
  });
});
