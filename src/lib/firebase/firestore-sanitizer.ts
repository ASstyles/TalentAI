/**
 * Firestore Data Sanitization Utility
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
 */

export class PersistenceError extends Error {
  public readonly code: string;
  public readonly cause?: unknown;

  constructor(message: string, code = 'PERSISTENCE_ERROR', cause?: unknown) {
    super(message);
    this.name = 'PersistenceError';
    this.code = code;
    this.cause = cause;
  }
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
