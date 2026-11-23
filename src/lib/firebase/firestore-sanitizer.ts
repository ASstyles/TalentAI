/**
 * Firestore Data Sanitization & Diagnostic Error Classification Utility
 *
 * Recursively inspects and sanitizes data payloads before Firestore persistence:
 * 1. Omit properties whose value is undefined from objects.
 * 2. Filter out undefined elements from arrays.
 * 3. Preserve explicit null values.
 * 4. Preserve primitive types (string, number, boolean, bigint, symbol).
 * 5. Preserve Date instances.
 * 6. Preserve Firestore native types:
 *    - Timestamp (has toDate, seconds / _seconds)
 *    - GeoPoint (has latitude, longitude / _latitude, _longitude)
 *    - DocumentReference (has id, path, parent, firestore)
 *    - FieldValue sentinels (serverTimestamp, delete, arrayUnion, arrayRemove, increment)
 * 7. Recursively process plain objects and arrays.
 * 8. Classify Firestore infrastructure & permission errors with actionable guidance.
 */

export type PersistenceErrorCode =
  | 'FIRESTORE_NOT_CONFIGURED'
  | 'FIRESTORE_API_DISABLED'
  | 'FIRESTORE_PERMISSION_DENIED'
  | 'FIRESTORE_UNAVAILABLE'
  | 'FIRESTORE_READ_ERROR'
  | 'FIRESTORE_WRITE_ERROR'
  | 'NOT_FOUND'
  | 'INVALID_ARGUMENT';

export class PersistenceError extends Error {
  public readonly code: PersistenceErrorCode | string;
  public readonly cause?: unknown;
  public readonly diagnosticHelp?: string;

  constructor(
    message: string,
    code: PersistenceErrorCode | string = 'FIRESTORE_UNAVAILABLE',
    cause?: unknown,
    diagnosticHelp?: string
  ) {
    super(message);
    this.name = 'PersistenceError';
    this.code = code;
    this.cause = cause;
    this.diagnosticHelp = diagnosticHelp;
  }
}

/**
 * Classifies low-level Google Cloud / Firestore gRPC exceptions into typed PersistenceErrors
 * with clear developer remediation steps (e.g. disabled API, IAM permission denied, network unreachable).
 */
export function classifyFirestoreError(err: unknown, projectId?: string): PersistenceError {
  if (err instanceof PersistenceError) {
    return err;
  }

  const errObj = err as { code?: number | string; message?: string; details?: string };
  const message = errObj?.message || errObj?.details || String(err);
  const code = errObj?.code;

  // gRPC Code 7: PERMISSION_DENIED
  if (code === 7 || code === '7' || message.includes('PERMISSION_DENIED')) {
    if (
      message.includes('Cloud Firestore API has not been used') ||
      message.includes('it is disabled') ||
      message.includes('API has not been enabled')
    ) {
      return new PersistenceError(
        `Cloud Firestore API is disabled or not initialized in project '${projectId || 'current'}'.`,
        'FIRESTORE_API_DISABLED',
        err,
        `Visit https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${
          projectId || ''
        } to enable the Cloud Firestore API, then create a database in Native mode in Firebase Console.`
      );
    }
    return new PersistenceError(
      `Firestore permission denied for project '${projectId || 'current'}'. The service account lacks required permissions.`,
      'FIRESTORE_PERMISSION_DENIED',
      err,
      'Ensure the active service account has the Cloud Datastore User (roles/datastore.user) IAM role in Google Cloud Console IAM & Admin.'
    );
  }

  // gRPC Code 14: UNAVAILABLE or Network Deadline Exceeded
  if (
    code === 14 ||
    code === '14' ||
    message.includes('UNAVAILABLE') ||
    message.includes('DEADLINE_EXCEEDED') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ETIMEDOUT')
  ) {
    return new PersistenceError(
      'Cloud Firestore service temporarily unreachable or connection timed out.',
      'FIRESTORE_UNAVAILABLE',
      err,
      'Check network connectivity or emulator status if running locally.'
    );
  }

  // Credentials / configuration missing
  if (
    message.includes('Could not load the default credentials') ||
    message.includes('credential') ||
    message.includes('private key')
  ) {
    return new PersistenceError(
      'Firebase Admin credentials missing, invalid, or improperly formatted.',
      'FIRESTORE_NOT_CONFIGURED',
      err,
      'Verify FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env.local or Render dashboard.'
    );
  }

  // Generic write or read failure
  return new PersistenceError(
    `Firestore operation failed: ${message}`,
    'FIRESTORE_READ_ERROR',
    err
  );
}

export function isFirestoreNative(val: unknown): boolean {
  if (!val || typeof val !== 'object') return false;

  // Date instance
  if (val instanceof Date) return true;

  // Buffer / Uint8Array
  if (Buffer.isBuffer(val) || val instanceof Uint8Array) return true;

  const constructorName = val.constructor?.name || '';

  // FieldValue sentinels (serverTimestamp, delete, arrayUnion, arrayRemove, increment)
  if (
    constructorName.includes('FieldValue') ||
    (typeof (val as { isEqual?: unknown }).isEqual === 'function' &&
      (val as { _methodName?: unknown })._methodName !== undefined)
  ) {
    return true;
  }

  // Timestamp
  if (
    constructorName === 'Timestamp' ||
    (typeof (val as { toDate?: unknown }).toDate === 'function' &&
      typeof (val as { seconds?: unknown }).seconds === 'number') ||
    ((val as { _seconds?: unknown })._seconds !== undefined &&
      (val as { _nanoseconds?: unknown })._nanoseconds !== undefined)
  ) {
    return true;
  }

  // GeoPoint
  if (
    constructorName === 'GeoPoint' ||
    (typeof (val as { latitude?: unknown }).latitude === 'number' &&
      typeof (val as { longitude?: unknown }).longitude === 'number' &&
      ((val as { _latitude?: unknown })._latitude !== undefined || constructorName.includes('GeoPoint')))
  ) {
    return true;
  }

  // DocumentReference
  if (
    constructorName === 'DocumentReference' ||
    (typeof (val as { path?: unknown }).path === 'string' &&
      typeof (val as { parent?: unknown }).parent === 'object' &&
      typeof (val as { firestore?: unknown }).firestore === 'object')
  ) {
    return true;
  }

  return false;
}

export function sanitizeForFirestore<T = unknown>(input: T): T {
  if (input === undefined) {
    return undefined as unknown as T;
  }

  if (input === null || typeof input !== 'object') {
    return input;
  }

  if (isFirestoreNative(input)) {
    return input;
  }

  if (Array.isArray(input)) {
    const cleanedArray: unknown[] = [];
    for (const item of input) {
      if (item !== undefined) {
        const sanitized = sanitizeForFirestore(item);
        if (sanitized !== undefined) {
          cleanedArray.push(sanitized);
        }
      }
    }
    return cleanedArray as unknown as T;
  }

  // Plain object
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
    if (val !== undefined) {
      const sanitized = sanitizeForFirestore(val);
      if (sanitized !== undefined) {
        result[key] = sanitized;
      }
    }
  }

  return result as T;
}
