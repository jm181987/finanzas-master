import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.d6cf1d1756d1421a9cfd067d354b22a8',
  appName: 'finanzasmaster',
  webDir: 'dist',
  server: {
    url: 'https://d6cf1d17-56d1-421a-9cfd-067d354b22a8.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
