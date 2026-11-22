import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

const REQUIRED_CONFIG_KEYS = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
] as const;

/**
 * Returns raw public Firebase configuration extracted from environment variables.
 */
export function getFirebaseClientConfig(): Partial<FirebaseClientConfig> {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

/**
 * Checks whether all required Firebase client configuration variables are present and non-empty.
 */
export function isFirebaseConfigured(): boolean {
  const config = getFirebaseClientConfig();
  return REQUIRED_CONFIG_KEYS.every((key) => {
    const val = config[key];
    return typeof val === 'string' && val.trim().length > 0;
  });
}

/**
 * Validates configuration and returns the typed config object.
 * Throws a clear, descriptive error if any required variables are missing.
 * Never supplies fake/mock values or fallback project IDs.
 */
export function validateFirebaseConfig(): FirebaseClientConfig {
  const config = getFirebaseClientConfig();
  const missing = REQUIRED_CONFIG_KEYS.filter((key) => {
    const val = config[key];
    return !val || typeof val !== 'string' || val.trim().length === 0;
  });

  if (missing.length > 0) {
    const missingVars = missing.map(
      (k) => `NEXT_PUBLIC_FIREBASE_${k.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`
    );
    throw new Error(
      `[Firebase Client] Missing required configuration fields: ${missing.join(', ')}. ` +
      `Ensure environment variables (${missingVars.join(', ')}) are configured in .env.local or CI settings.`
    );
  }

  return config as FirebaseClientConfig;
}

// Singletons cached lazily in memory
let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;
let cachedStorage: FirebaseStorage | null = null;
let cachedAnalytics: Analytics | null = null;

/**
 * Resets cached singletons (useful for test isolation).
 */
export function resetFirebaseClientInstances(): void {
  cachedApp = null;
  cachedAuth = null;
  cachedDb = null;
  cachedStorage = null;
  cachedAnalytics = null;
}

/**
 * Lazily initializes and returns the client FirebaseApp singleton.
 * Safe to import on server; will only initialize when explicitly called.
 */
export function getFirebaseApp(): FirebaseApp {
  if (cachedApp) {
    return cachedApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    cachedApp = getApp();
    return cachedApp;
  }

  const config = validateFirebaseConfig();
  cachedApp = initializeApp(config);
  return cachedApp;
}

/**
 * Lazily retrieves the client Auth instance.
 * Never executes at module scope.
 */
export function getFirebaseAuth(): Auth {
  if (cachedAuth) {
    return cachedAuth;
  }
  const app = getFirebaseApp();
  cachedAuth = getAuth(app);
  return cachedAuth;
}

/**
 * Lazily retrieves the client Firestore instance.
 * Never executes at module scope.
 */
export function getFirebaseFirestore(): Firestore {
  if (cachedDb) {
    return cachedDb;
  }
  const app = getFirebaseApp();
  cachedDb = getFirestore(app);
  return cachedDb;
}

/**
 * Lazily retrieves the client FirebaseStorage instance.
 * Never executes at module scope.
 */
export function getFirebaseStorage(): FirebaseStorage {
  if (cachedStorage) {
    return cachedStorage;
  }
  const app = getFirebaseApp();
  cachedStorage = getStorage(app);
  return cachedStorage;
}

/**
 * Safely initializes Google Analytics only when supported and in a browser context.
 */
export const getClientAnalytics = async (): Promise<Analytics | null> => {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!isFirebaseConfigured()) {
    return null;
  }
  try {
    if (await isSupported()) {
      if (!cachedAnalytics) {
        const app = getFirebaseApp();
        cachedAnalytics = getAnalytics(app);
      }
      return cachedAnalytics;
    }
  } catch (err) {
    console.warn('[Firebase Analytics] Analytics initialization skipped:', err);
  }
  return null;
};

// Proxied singletons for backward compatibility with any legacy direct imports.
// Merely importing these will NOT trigger initialization or throw errors during SSR/SSG.
export const auth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    const instance = getFirebaseAuth();
    const val = (instance as any)[prop];
    return typeof val === 'function' ? val.bind(instance) : val;
  },
});

export const db: Firestore = new Proxy({} as Firestore, {
  get(_, prop) {
    const instance = getFirebaseFirestore();
    const val = (instance as any)[prop];
    return typeof val === 'function' ? val.bind(instance) : val;
  },
});

export const storage: FirebaseStorage = new Proxy({} as FirebaseStorage, {
  get(_, prop) {
    const instance = getFirebaseStorage();
    const val = (instance as any)[prop];
    return typeof val === 'function' ? val.bind(instance) : val;
  },
});

const clientModule = {
  get app() {
    return getFirebaseApp();
  },
};

export default clientModule;
