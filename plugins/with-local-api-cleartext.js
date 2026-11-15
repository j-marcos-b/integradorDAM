const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withLocalApiCleartext(config) {
  const permiteHttp = process.env.EXPO_PUBLIC_API_URL?.startsWith('http://') ?? false;

  return withAndroidManifest(config, (modConfig) => {
    const application = modConfig.modResults.manifest.application?.[0];
    if (!application) {
      throw new Error('No se encontró la aplicación en AndroidManifest.xml.');
    }

    application.$['android:usesCleartextTraffic'] = String(permiteHttp);
    return modConfig;
  });
};
