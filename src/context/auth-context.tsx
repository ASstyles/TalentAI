'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured, loadRuntimeFirebaseConfig } from '@/lib/firebase/client';
import { UserRole } from '@/types/user';

export type AuthState =
  | 'INITIALIZING'
  | 'UNAUTHENTICATED'
  | 'SESSION_SYNCING'
  | 'AUTHENTICATED'
  | 'SESSION_ERROR';

export interface AuthContextType {
  user: FirebaseUser | null;
  role: UserRole | null;
  orgId: string | null;
  loading: boolean;
  sessionReady: boolean;
  authState: AuthState;
  authError: string | null;
  idToken: string | null;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  registerCandidate: (data: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    acceptedTerms: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>('INITIALIZING');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Single-flight synchronization and request versioning
  const syncVersionRef = useRef(0);
  const inFlightSyncRef = useRef<Promise<{ success: boolean; role: UserRole | null; orgId: string | null; error?: string }> | null>(null);
  const inFlightUidRef = useRef<string | null>(null);

  /**
   * Synchronizes client Firebase authentication with the authoritative backend session API.
   * Enforces zero-trust: The frontend does NOT assume an authenticated state until
   * /api/auth/session verifies the ID token, validates account role, and issues a session cookie.
   */
  const syncSession = useCallback(
    async (
      firebaseUser: FirebaseUser | null,
      forceRefresh = false
    ): Promise<{ success: boolean; role: UserRole | null; orgId: string | null; error?: string }> => {
      const currentVersion = ++syncVersionRef.current;

      if (!firebaseUser) {
        inFlightSyncRef.current = null;
        inFlightUidRef.current = null;
        setUser(null);
        setRole(null);
        setOrgId(null);
        setIdToken(null);
        setAuthError(null);
        setAuthState('UNAUTHENTICATED');
        return { success: false, role: null, orgId: null };
      }

      // Single-flight deduplication: if already syncing for this user, join existing promise
      if (!forceRefresh && inFlightSyncRef.current && inFlightUidRef.current === firebaseUser.uid) {
        return inFlightSyncRef.current;
      }

      inFlightUidRef.current = firebaseUser.uid;
      setAuthState('SESSION_SYNCING');
      setAuthError(null);

      const syncPromise = (async () => {
        const startTime = performance.now();
        try {
          const tokenStart = performance.now();
          const token = await firebaseUser.getIdToken(forceRefresh);
          const tokenDuration = Math.round(performance.now() - tokenStart);

          const apiStart = performance.now();
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second bounded timeout

          const res = await fetch('/api/auth/session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ idToken: token }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          const apiDuration = Math.round(performance.now() - apiStart);

          // If a newer sync started or user logged out, discard this response
          if (currentVersion !== syncVersionRef.current) {
            return { success: false, role: null, orgId: null, error: 'Cancelled by subsequent authentication event' };
          }

          const data = await res.json().catch(() => ({ success: false, error: 'Invalid JSON from session API' }));

          if (res.ok && data.success && data.user) {
            let activeToken = token;
            // If the server assigned custom claims (e.g. first-time Google sign-in), refresh client token
            if (data.claimsAssigned) {
              try {
                activeToken = await firebaseUser.getIdToken(true);
              } catch (refreshErr) {
                console.warn('[AuthContext] Token force-refresh warning after claim assignment:', refreshErr);
              }
            }

            const verifiedRole = (data.user.role as UserRole) || 'candidate';
            const verifiedOrg = data.user.orgId || null;

            if (currentVersion === syncVersionRef.current) {
              setUser(firebaseUser);
              setIdToken(activeToken);
              setRole(verifiedRole);
              setOrgId(verifiedOrg);
              setAuthError(null);
              setAuthState('AUTHENTICATED');
            }

            const totalDuration = Math.round(performance.now() - startTime);
            console.debug(`[AuthPerf] Session established: token=${tokenDuration}ms, api=${apiDuration}ms, total=${totalDuration}ms`);

            return { success: true, role: verifiedRole, orgId: verifiedOrg };
          } else {
            // Problem A Fix: Explicit failure. Never fall back to unverified client token claims!
            const errorMsg = data.error || 'Server session could not be established.';
            if (currentVersion === syncVersionRef.current) {
              setUser(null);
              setIdToken(null);
              setRole(null);
              setOrgId(null);
              setAuthError(errorMsg);
              setAuthState('SESSION_ERROR');
            }
            return { success: false, role: null, orgId: null, error: errorMsg };
          }
        } catch (err: unknown) {
          if (currentVersion !== syncVersionRef.current) {
            return { success: false, role: null, orgId: null };
          }
          const message =
            err instanceof Error
              ? err.name === 'AbortError'
                ? 'Session synchronization timed out. Please check your network connection.'
                : err.message
              : 'Session synchronization failure';

          setUser(null);
          setIdToken(null);
          setRole(null);
          setOrgId(null);
          setAuthError(message);
          setAuthState('SESSION_ERROR');
          return { success: false, role: null, orgId: null, error: message };
        } finally {
          if (inFlightUidRef.current === firebaseUser.uid) {
            inFlightSyncRef.current = null;
            inFlightUidRef.current = null;
          }
        }
      })();

      inFlightSyncRef.current = syncPromise;
      return syncPromise;
    },
    []
  );

  // Initialize and listen for Firebase Auth state changes strictly in browser
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      if (typeof window === 'undefined') {
        setAuthState('UNAUTHENTICATED');
        return;
      }

      // Check if Firebase was loaded via runtime config
      if (!isFirebaseConfigured()) {
        await loadRuntimeFirebaseConfig().catch(() => null);
      }

      if (!isFirebaseConfigured()) {
        if (isMounted) setAuthState('UNAUTHENTICATED');
        return;
      }

      try {
        const auth = getFirebaseAuth();
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          if (!isMounted) return;
          if (!currentUser) {
            syncVersionRef.current++;
            inFlightSyncRef.current = null;
            inFlightUidRef.current = null;
            setUser(null);
            setRole(null);
            setOrgId(null);
            setIdToken(null);
            setAuthError(null);
            setAuthState('UNAUTHENTICATED');
          } else {
            await syncSession(currentUser);
          }
        });

        return () => {
          unsubscribe();
        };
      } catch (err) {
        console.warn('[AuthContext] Firebase auth listener skipped or failed to initialize:', err);
        if (isMounted) setAuthState('UNAUTHENTICATED');
      }
    }

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [syncSession]);

  const loginWithEmail = async (email: string, password: string) => {
    if (!isFirebaseConfigured()) {
      return {
        success: false,
        error: 'Firebase Authentication is not configured. Please verify environment settings.',
      };
    }

    try {
      setAuthState('SESSION_SYNCING');
      setAuthError(null);
      const auth = getFirebaseAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Force-refresh and synchronously await verified server session creation
      const sessionResult = await syncSession(userCredential.user, true);

      // Problem B Fix: Return success ONLY when backend session is verified and cookie is issued
      if (!sessionResult.success || !sessionResult.role) {
        return {
          success: false,
          error: sessionResult.error || 'Failed to establish verified server session.',
        };
      }

      return { success: true, role: sessionResult.role };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials. Please verify your email and password.';
      setAuthState('SESSION_ERROR');
      setAuthError(message);
      return { success: false, error: message };
    }
  };

  const loginWithGoogle = async () => {
    if (!isFirebaseConfigured()) {
      return {
        success: false,
        error: 'Firebase Authentication is not configured. Please verify environment settings.',
      };
    }

    try {
      setAuthState('SESSION_SYNCING');
      setAuthError(null);
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await signInWithPopup(auth, provider);

      // Force-refresh and synchronously await verified server session creation
      const sessionResult = await syncSession(userCredential.user, true);

      // Problem B Fix: Return success ONLY when backend session is verified and cookie is issued
      if (!sessionResult.success || !sessionResult.role) {
        return {
          success: false,
          error: sessionResult.error || 'Failed to establish verified server session.',
        };
      }

      return { success: true, role: sessionResult.role };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign-in was cancelled or encountered an error.';
      setAuthState('SESSION_ERROR');
      setAuthError(message);
      return { success: false, error: message };
    }
  };

  const registerCandidate = async (data: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    acceptedTerms: boolean;
  }) => {
    try {
      setAuthState('SESSION_SYNCING');
      setAuthError(null);

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to create candidate account');
      }

      // Automatically sign in the newly registered candidate if client auth is available
      if (isFirebaseConfigured()) {
        try {
          const auth = getFirebaseAuth();
          const cred = await signInWithEmailAndPassword(auth, data.email, data.password);

          try {
            await sendEmailVerification(cred.user);
          } catch (emailErr) {
            console.warn('[AuthContext] sendEmailVerification warning:', emailErr);
          }

          const syncRes = await syncSession(cred.user, true);
          if (!syncRes.success) {
            return { success: false, error: syncRes.error || 'Account created but session creation failed' };
          }
        } catch (signInErr) {
          console.warn('[AuthContext] Client auto-login skipped:', signInErr);
        }
      }

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setAuthState('SESSION_ERROR');
      setAuthError(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    // Invalidate any in-flight sync immediately
    syncVersionRef.current++;
    inFlightSyncRef.current = null;
    inFlightUidRef.current = null;

    setAuthState('UNAUTHENTICATED');
    setUser(null);
    setRole(null);
    setOrgId(null);
    setIdToken(null);
    setAuthError(null);

    try {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      if (isFirebaseConfigured()) {
        try {
          const auth = getFirebaseAuth();
          await firebaseSignOut(auth);
        } catch (e) {
          console.warn('[AuthContext] Sign out warning:', e);
        }
      }
      window.location.href = '/login';
    } catch (err) {
      console.error('[AuthContext] Sign out error:', err);
    }
  };

  const sendPasswordReset = async (email: string) => {
    if (!isFirebaseConfigured()) {
      return {
        success: false,
        error: 'Firebase Authentication is not configured. Please verify environment settings.',
      };
    }

    try {
      const auth = getFirebaseAuth();
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send password reset email.';
      return { success: false, error: message };
    }
  };

  const refreshSession = async () => {
    if (!isFirebaseConfigured()) return;
    try {
      const auth = getFirebaseAuth();
      if (auth.currentUser) {
        await syncSession(auth.currentUser, true);
      }
    } catch (err) {
      console.warn('[AuthContext] refreshSession warning:', err);
    }
  };

  const loading = authState === 'INITIALIZING' || authState === 'SESSION_SYNCING';
  const sessionReady = authState === 'AUTHENTICATED';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        orgId,
        loading,
        sessionReady,
        authState,
        authError,
        idToken,
        loginWithEmail,
        loginWithGoogle,
        registerCandidate,
        logout,
        sendPasswordReset,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
