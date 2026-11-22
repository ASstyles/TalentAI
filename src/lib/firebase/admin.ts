import {
  getApps,
  getApp,
  initializeApp,
  cert,
  applicationDefault,
  type App as AdminApp,
} from 'firebase-admin/app';
import { getAuth, type Auth as AdminAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore as AdminFirestore } from 'firebase-admin/firestore';
import { getStorage, type Storage as AdminStorage } from 'firebase-admin/storage';

/**
 * Initializes and returns the Firebase Admin application singleton.
 * Uses the modern modular Firebase Admin SDK v13+ architecture.
 *
 * Supports:
 * 1. Explicit Service Account credentials (FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY + FIREBASE_PROJECT_ID)
 * 2. Application Default Credentials (ADC) in Google Cloud environments
 * 3. Local Firebase Emulators (FIRESTORE_EMULATOR_HOST, FIREBASE_AUTH_EMULATOR_HOST, or test/dev mode)
 */
function initializeAdminApp(): AdminApp {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return getApp();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    (projectId ? `${projectId}.firebasestorage.app` : undefined);

  // Normalize private key if escaped newlines were provided
  const privateKey = rawPrivateKey ? rawPrivateKey.replace(/\\n/g, '\n') : undefined;

  // Case 1: Service Account Credentials explicitly provided
  if (clientEmail && privateKey && projectId) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket,
    });
  }

  // Case 2: Explicit emulator or development/test mode without service account key
  const isEmulatorOrTest = Boolean(
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||
    process.env.NODE_ENV === 'test'
  );

  if (isEmulatorOrTest || process.env.NODE_ENV === 'development') {
    if (projectId) {
      return initializeApp({
        projectId,
        storageBucket,
      });
    }
    return initializeApp({
      projectId: 'talentai-emulator',
    });
  }

  // Case 3: Application Default Credentials (ADC) for Google Cloud / Cloud Run
  try {
    return initializeApp({
      credential: applicationDefault(),
      projectId,
      storageBucket,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `[Firebase Admin] Failed to initialize Firebase Admin SDK. ` +
      `Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set, ` +
      `or run with Application Default Credentials / Emulator. Cause: ${errorMsg}`
    );
  }
}

// Single initialized Admin app instance
export const adminApp: AdminApp = initializeAdminApp();

// Typed singletons exported for authoritative server-side execution
export const adminAuth: AdminAuth = getAuth(adminApp);
export const adminDb: AdminFirestore = getFirestore(adminApp);
export const adminStorage: AdminStorage = getStorage(adminApp);

export default {
  app: adminApp,
  auth: adminAuth,
  db: adminDb,
  firestore: adminDb,
  storage: adminStorage,
};
