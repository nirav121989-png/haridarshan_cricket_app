import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.haridarshan.cricket',
  appName: 'Haridarshan Cricket',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
