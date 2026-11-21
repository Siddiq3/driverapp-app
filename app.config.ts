import type { ExpoConfig } from "expo/config";

// Values come from .env (see .env.example). EXPO_PUBLIC_* values are bundled
// into the app; never put secret keys in them.
const config: ExpoConfig = {
  name: "DriverApp",
  slug: "driverapp",
  scheme: "driverapp",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#000000",
  },
  android: {
    package: "com.siddiq.driverapp",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#000000",
    },
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "POST_NOTIFICATIONS",
      "VIBRATE",
    ],
    config: {
      googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY },
    },
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
  },
  ios: {
    bundleIdentifier: "com.siddiq.driverapp",
    supportsTablet: false,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "Your location is used to find drivers near you and to show your pickup point.",
    },
  },
  plugins: [
    "expo-router",
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Your location is used to find drivers near you and to show your pickup point.",
      },
    ],
    [
      "expo-notifications",
      {
        color: "#000000",
      },
    ],
    "@react-native-google-signin/google-signin",
  ],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
};

export default config;
