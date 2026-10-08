const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../shared')];

// The Firebase JS SDK ships separate ESM and CJS builds. With package `exports`
// resolution (on by default since SDK 53), `firebase/auth`'s React Native build
// can load a different copy of `@firebase/app` than `firebase/app`, which fails
// with "Component auth has not been registered yet". Resolve Firebase packages via
// their `main` / `react-native` fields instead. Package exports stay on for
// everything else (e.g. `@react-navigation/bottom-tabs/unstable` needs them).
config.resolver.sourceExts.push('cjs');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'firebase' || moduleName.startsWith('firebase/') || moduleName.startsWith('@firebase/')) {
    return context.resolveRequest({ ...context, unstable_enablePackageExports: false }, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
