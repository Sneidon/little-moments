import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * Marketing version + native build number for display on Settings.
 * - **Standalone / dev client**: uses native binary values from the store build (EAS autoIncrement, etc.).
 * - **Expo Go**: uses `app.json` `expo.version` and optional `ios.buildNumber` / `android.versionCode`
 *   so you don’t show Expo Go’s own bundle version.
 */
export function getAppVersionInfo(): { marketingVersion: string; buildNumber: string | null } {
  const configMarketing = Constants.expoConfig?.version ?? '1.0.0';
  const configBuild =
    Constants.expoConfig?.ios?.buildNumber ??
    (typeof Constants.expoConfig?.android?.versionCode === 'number'
      ? String(Constants.expoConfig.android.versionCode)
      : null) ??
    null;

  const fromConfig = (): { marketingVersion: string; buildNumber: string | null } => ({
    marketingVersion: configMarketing,
    buildNumber: configBuild,
  });

  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return fromConfig();
  }

  const marketing = Constants.nativeAppVersion?.trim() || configMarketing;
  const build = Constants.nativeBuildVersion?.trim() || configBuild;

  return {
    marketingVersion: marketing,
    buildNumber: build || null,
  };
}

/** Single-line footer for Settings screens. */
export function formatSettingsVersionFooter(): string {
  const { marketingVersion, buildNumber } = getAppVersionInfo();
  if (buildNumber) {
    return `App version ${marketingVersion} (build ${buildNumber})`;
  }
  return `App version ${marketingVersion}`;
}
