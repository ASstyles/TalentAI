'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase/client';
import { UserRole } from '@/types/user';

export interface AuthContextType {
  user: FirebaseUser | null;
  role: UserRole | null;
  orgId: string | null;
  loading: boolean;
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
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync token and claims with backend session
  const syncSession = useCallback(async (firebaseUser: FirebaseUser | null): Promise<{ role: UserRole | null; orgId: string | null }> => {
    if (!firebaseUser) {
      setUser(null);
      setRole(null);
      setOrgId(null);
      setIdToken(null);
      return { role: null, orgId: null };
    }

    try {
      const token = await firebaseUser.getIdToken(false);
      setIdToken(token);
      setUser(firebaseUser);

      // Verify token with backend session endpoint
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ idToken: token }),
      });

      if (res.ok) {
        const data = await res.json();
        const userRole = (data.user?.role as UserRole) || 'candidate';
        const userOrg = data.user?.orgId || null;
        setRole(userRole);
        setOrgId(userOrg);
        return { role: userRole, orgId: userOrg };
      } else {
        // Fall back to token claims if endpoint has transient error
        const idTokenResult = await firebaseUser.getIdTokenResult();
        const fallbackRole = (idTokenResult.claims.role as UserRole) || 'candidate';
        const fallbackOrg = (idTokenResult.claims.orgId as string) || null;
        setRole(fallbackRole);
        setOrgId(fallbackOrg);
        return { role: fallbackRole, orgId: fallbackOrg };
      }
    } catch (err) {
      console.error('[AuthContext] Session synchronization error:', err);
      return { role: null, orgId: null };
    }
  }, []);

  // Listen for auth state changes strictly in the browser when Firebase is configured
  useEffect(() => {
    if (typeof window === 'undefined' || !isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const auth = getFirebaseAuth();
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setLoading(true);
        await syncSession(currentUser);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn('[AuthContext] Firebase auth listener skipped or failed to initialize:', err);
      setLoading(false);
    }
  }, [syncSession]);

  const loginWithEmail = async (email: string, password: string) => {
    if (!isFirebaseConfigured()) {
      return {
        success: false,
        error: 'Firebase Authentication is not configured. Please verify environment settings.',
      };
    }

    try {
      setLoading(true);
      const auth = getFirebaseAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const sessionResult = await syncSession(userCredential.user);
      return { success: true, role: sessionResult.role || undefined };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials. Please verify your email and password.';
      return { success: false, error: message };
    } finally {
      setLoading(false);
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
      setLoading(true);
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await signInWithPopup(auth, provider);
      const sessionResult = await syncSession(userCredential.user);
      return { success: true, role: sessionResult.role || undefined };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign-in was cancelled or encountered an error.';
      return { success: false, error: message };
    } finally {
      setLoading(false);
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
      setLoading(true);
      // Provision via trusted backend account provisioning API
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
          
          // Trigger verification email
          try {
            await sendEmailVerification(cred.user);
          } catch (emailErr) {
            console.warn('[AuthContext] sendEmailVerification warning:', emailErr);
          }

          await syncSession(cred.user);
        } catch (signInErr) {
          console.warn('[AuthContext] Client auto-login skipped:', signInErr);
        }
      }

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      if (isFirebaseConfigured()) {
        try {
          const auth = getFirebaseAuth();
          await firebaseSignOut(auth);
        } catch (e) {
          console.warn('[AuthContext] Sign out warning:', e);
        }
      }
      setUser(null);
      setRole(null);
      setOrgId(null);
      setIdToken(null);
      window.location.href = '/login';
    } catch (err) {
      console.error('[AuthContext] Sign out error:', err);
    } finally {
      setLoading(false);
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
        await auth.currentUser.getIdToken(true);
        await syncSession(auth.currentUser);
      }
    } catch (err) {
      console.warn('[AuthContext] refreshSession warning:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        orgId,
        loading,
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
