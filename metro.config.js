const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force socket.io packages to resolve to their CJS entry files directly
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'socket.io-client') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/socket.io-client/build/cjs/index.js'),
      type: 'sourceFile',
    };
  }

  if (moduleName === 'socket.io-parser') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/socket.io-parser/build/cjs/index.js'),
      type: 'sourceFile',
    };
  }

  // Default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
