const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Podfile flags required by @react-native-firebase with `useFrameworks: static` (see rnfirebase.io):
 * - `$RNFirebaseAsStaticFramework` builds the RNFB pods as static frameworks.
 * - `$RNFirebaseDisableSPM` resolves firebase-ios-sdk via CocoaPods instead of Swift Package Manager,
 *   since SPM + static linkage produces duplicate Firebase symbols (RNFB v23+ refuses to install).
 */
const FLAGS = ['$RNFirebaseAsStaticFramework = true', '$RNFirebaseDisableSPM = true'];

function withRnFirebaseStaticFramework(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');
      const missing = FLAGS.filter((flag) => !contents.includes(flag.split(' ')[0]));
      if (missing.length) {
        contents = contents.replace(/(platform :ios[^\n]*\n)/, `$1${missing.join('\n')}\n`);
        fs.writeFileSync(podfilePath, contents);
      }
      return cfg;
    },
  ]);
}

module.exports = withRnFirebaseStaticFramework;
