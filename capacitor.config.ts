import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.campusmobility.app',
  appName: 'CampusMobility',
  webDir: 'dist',
  server: {
    cleartext: true,
    allowNavigation: [
      'campusmobility-9kz2.onrender.com',
      '*.onrender.com',
      '*.run.app',
      '*.project-osrm.org',
      '*.openstreetmap.org'
    ]
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"],
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#000000",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#10b981"
    }
  }
};

export default config;
