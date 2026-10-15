module.exports = ({ config }) => {
  const publicEnv = {
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN,
    EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME,
    EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
    EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
  };

  const googleMapsKey = publicEnv.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  return {
    ...config,
    extra: {
      ...config.extra,
      ...publicEnv,
    },
    android: {
      ...config.android,
      ...(googleMapsKey
        ? {
            config: {
              ...config.android?.config,
              googleMaps: { apiKey: googleMapsKey },
            },
          }
        : {}),
    },
  };
};
