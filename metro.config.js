const { getDefaultConfig } = require('metro-config');

module.exports = (async () => {
  const config = await getDefaultConfig();

  return {
    transformer: config.transformer,
    resolver: {
      ...config.resolver,
      sourceExts: [...config.resolver.sourceExts, 'cjs', 'ts', 'tsx']
    }
  };
})();
