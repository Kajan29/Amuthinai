const path = require('path');

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add SVG transformer
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts, 'svg'],
  resolveRequest: (context, moduleName, platform) => {
    if (platform === 'web' && moduleName === 'react-native-maps') {
      // Return an empty module for web
      return {
        type: 'empty',
      };
    }
    // Ensure you call the default resolver.
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
