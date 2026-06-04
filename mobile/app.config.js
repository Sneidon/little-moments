const app = require('./app.json');

/** @type {import('expo/config').ExpoConfig} */
module.exports = () => {
  const profile = process.env.EAS_BUILD_PROFILE ?? '';
  const apsEnvironment =
    profile === 'development' || profile === 'preview' ? 'development' : 'production';

  return {
    expo: {
      ...app.expo,
      ios: {
        ...app.expo.ios,
        entitlements: {
          ...(app.expo.ios?.entitlements ?? {}),
          'aps-environment': apsEnvironment,
        },
      },
    },
  };
};
