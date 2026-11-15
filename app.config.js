// Expo combina este archivo con app.json. Aquí solo se agrega la clave de
// Google Maps, que se lee de la variable de entorno MAPS_API_KEY (archivo .env
// local, que NO se sube al repositorio).
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...(config.android && config.android.config),
      googleMaps: {
        apiKey: process.env.MAPS_API_KEY ?? '',
      },
    },
  },
});
