const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force socket.io to use CommonJS builds
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('socket.io-parser')) {
    // Redirect to CJS build
    const newModuleName = moduleName.replace(
      'socket.io-parser',
      'socket.io-parser/build/cjs'
    );
    return context.resolveRequest(context, newModuleName, platform);
  }

  if (moduleName.startsWith('socket.io-client')) {
    // Redirect to CJS build
    const newModuleName = moduleName.replace(
      'socket.io-client',
      'socket.io-client/build/cjs'
    );
    return context.resolveRequest(context, newModuleName, platform);
  }

  // Default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });