import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

// Save original process.env
const originalEnv = { ...process.env };

describe('Firebase Lazy Initialization & Server-Side Import Safety', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('1. Importing Firebase client module does NOT trigger Firebase initialization at module evaluation time', async () => {
    // Clear all Firebase-related env vars
    delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    delete process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    // Importing the client module must not throw auth/invalid-api-key or any error
    const clientModule = await import('@/lib/firebase/client');

    expect(clientModule).toBeDefined();
    expect(typeof clientModule.getFirebaseApp).toBe('function');
    expect(typeof clientModule.getFirebaseAuth).toBe('function');
    expect(typeof clientModule.isFirebaseConfigured).toBe('function');
    expect(clientModule.isFirebaseConfigured()).toBe(false);
  });

  it('2. Missing configuration produces an actionable error when client SDK is invoked directly without fabricated fallbacks', async () => {
    delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    const { getFirebaseApp, getFirebaseAuth, validateFirebaseConfig, isFirebaseConfigured } = await import('@/lib/firebase/client');

    expect(isFirebaseConfigured()).toBe(false);

    expect(() => validateFirebaseConfig()).toThrowError(
      /Missing required configuration fields: apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId/i
    );

    expect(() => getFirebaseApp()).toThrowError(
      /Missing required configuration fields/i
    );

    expect(() => getFirebaseAuth()).toThrowError(
      /Missing required configuration fields/i
    );
  });

  it('3. Repeated initialization calls reuse existing FirebaseApp singleton', async () => {
    // Provide valid mock client env vars
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key-xyz123';
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test-proj.firebaseapp.com';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-proj';
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test-proj.firebasestorage.app';
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '1234567890';
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:1234567890:web:abcdef123';

    const { getFirebaseApp, isFirebaseConfigured } = await import('@/lib/firebase/client');
    expect(isFirebaseConfigured()).toBe(true);

    const app1 = getFirebaseApp();
    const app2 = getFirebaseApp();

    expect(app1).toBeDefined();
    expect(app1).toBe(app2); // Single instance reused
  });

  it('4. Registration page renders safely without Firebase initialization when unconfigured', async () => {
    delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    // Mock useRouter from next/navigation
    vi.mock('next/navigation', () => ({
      useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
        back: vi.fn(),
      }),
      useSearchParams: () => new URLSearchParams(),
      usePathname: () => '/register',
    }));

    const { AuthProvider } = await import('@/context/auth-context');
    const { default: RegisterPage } = await import('@/app/register/page');

    // Rendering with AuthProvider must succeed without throwing auth/invalid-api-key
    const { getByText, getByPlaceholderText } = render(
      React.createElement(AuthProvider, null, React.createElement(RegisterPage, null))
    );

    expect(getByText(/Create Your Candidate Account/i)).toBeInTheDocument();
    expect(getByPlaceholderText(/Alex Mercer/i)).toBeInTheDocument();
  }, 15000);

  it('5. Login page renders safely without Firebase initialization when unconfigured', async () => {
    delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    const { AuthProvider } = await import('@/context/auth-context');
    const { default: LoginPage } = await import('@/app/login/page');

    // Rendering with AuthProvider must succeed without throwing
    const { getByText } = render(
      React.createElement(AuthProvider, null, React.createElement(LoginPage, null))
    );

    expect(getByText(/Welcome to/i)).toBeInTheDocument();
    expect(getByText(/Candidate Login/i)).toBeInTheDocument();
    expect(getByText(/Recruiter Login/i)).toBeInTheDocument();
  }, 15000);

  it('6. Does not expose Firebase Admin credentials in client configuration', async () => {
    const { getFirebaseClientConfig } = await import('@/lib/firebase/client');
    const clientConfig = getFirebaseClientConfig();

    expect((clientConfig as any).privateKey).toBeUndefined();
    expect((clientConfig as any).clientEmail).toBeUndefined();
    expect((clientConfig as any).FIREBASE_PRIVATE_KEY).toBeUndefined();
  });
});
