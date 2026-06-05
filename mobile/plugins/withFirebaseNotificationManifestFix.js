const { withAndroidManifest } = require('@expo/config-plugins');

const META_REPLACE_RESOURCE = [
  'com.google.firebase.messaging.default_notification_color',
  'com.google.firebase.messaging.default_notification_icon',
];

const META_REPLACE_VALUE = ['com.google.firebase.messaging.default_notification_channel_id'];

/** Resolves manifest merger conflicts between expo-notifications and @react-native-firebase/messaging. */
function withFirebaseNotificationManifestFix(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$ = {
      ...manifest.$,
      'xmlns:tools': 'http://schemas.android.com/tools',
    };

    const application = manifest.application?.[0];
    if (!application?.['meta-data']) return cfg;

    for (const entry of application['meta-data']) {
      const name = entry.$?.['android:name'];
      if (META_REPLACE_RESOURCE.includes(name)) {
        entry.$['tools:replace'] = 'android:resource';
      } else if (META_REPLACE_VALUE.includes(name)) {
        entry.$['tools:replace'] = 'android:value';
      }
    }

    return cfg;
  });
}

module.exports = withFirebaseNotificationManifestFix;
