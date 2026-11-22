import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBUHQ7bSlAIM1i9JbPXE7O03Td6iyKk1UM',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'talentai-dba5f.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'talentai-dba5f',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'talentai-dba5f.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '724443356848',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:724443356848:web:74cf95fb034fe439c22575',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-PQMT4DVKXC',
};

// Initialize Firebase Client app singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Analytics safely on client browser only to prevent SSR crashes
let analyticsInstance: Analytics | null = null;
export const getClientAnalytics = async (): Promise<Analytics | null> => {
  if (typeof window !== 'undefined' && (await isSupported())) {
    if (!analyticsInstance) {
      analyticsInstance = getAnalytics(app);
    }
    return analyticsInstance;
  }
  return null;
};

export default app;
