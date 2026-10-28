const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

// Icons use the font shipped by the native 0.3.x APK. OTA carries JavaScript only.
const config = {
  resolver: {
    resolveRequest(context, moduleName, platform) {
      const resolvedName = moduleName === '@react-native-vector-icons/material-design-icons'
        ? '@react-native-vector-icons/material-design-icons/static'
        : moduleName;
      return context.resolveRequest(context, resolvedName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
