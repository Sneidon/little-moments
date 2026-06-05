const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/** Required by @react-native-firebase when using `useFrameworks: static` (see rnfirebase.io). */
function withRnFirebaseStaticFramework(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');
      if (!contents.includes('$RNFirebaseAsStaticFramework')) {
        contents = contents.replace(
          /(platform :ios[^\n]*\n)/,
          `$1$RNFirebaseAsStaticFramework = true\n`
        );
        fs.writeFileSync(podfilePath, contents);
      }
      return cfg;
    },
  ]);
}

module.exports = withRnFirebaseStaticFramework;
