/**
 * Extends app.json (passed in as `config`) with build-profile-specific values.
 * @param {{ config: import('expo/config').ExpoConfig }} ctx
 * @returns {import('expo/config').ExpoConfig}
 */
module.exports = ({ config }) => {
  const profile = process.env.EAS_BUILD_PROFILE ?? '';
  const apsEnvironment =
    profile === 'development' || profile === 'preview' ? 'development' : 'production';

  return {
    ...config,
    ios: {
      ...config.ios,
      entitlements: {
        ...(config.ios?.entitlements ?? {}),
        'aps-environment': apsEnvironment,
      },
    },
  };
};
