const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// drizzle-orm 0.33 still imports 'expo-sqlite/next', removed in expo-sqlite v14+.
const origResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'expo-sqlite/next') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/expo-sqlite/build/index.js'),
      type: 'sourceFile',
    };
  }
  if (origResolveRequest) return origResolveRequest(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
