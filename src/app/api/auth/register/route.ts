import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuth } from '@/lib/firebase/admin';
import { setUserRole } from '@/lib/firebase/auth';
import { UserRepository } from '@/lib/repositories/user-repository';
import { CandidateRepository } from '@/lib/repositories/candidate-repository';

// Password must be at least 8 chars with 1 upper, 1 lower, 1 digit, and 1 special symbol
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])[A-Za-z\d@$!%*?&_\-#]{8,}$/;

const RegisterSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      PASSWORD_REGEX,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&_-#)'
    ),
  confirmPassword: z.string(),
  acceptedTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the Terms of Service and Privacy Policy to proceed',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { fullName, email, password } = parsed.data;

    // Check if user already exists
    try {
      const existingUser = await adminAuth.getUserByEmail(email);
      if (existingUser) {
        return NextResponse.json(
          { error: 'An account with this email address already exists. Please sign in instead.' },
          { status: 409 }
        );
      }
    } catch {
      // User does not exist, proceed
    }

    // 1. Create User in Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: fullName,
      emailVerified: false,
    });

    // 2. Authoritative role assignment: STRICTLY 'candidate'. Never allow role escalation on registration.
    await setUserRole(userRecord.uid, 'candidate');

    // 3. Create persistent user record in Firestore
    await UserRepository.createOrUpdate(userRecord.uid, {
      email,
      displayName: fullName,
      role: 'candidate',
      status: 'active',
    });

    // 4. Initialize candidate profile in Firestore
    await CandidateRepository.saveProfile(userRecord.uid, {
      headline: 'Software Engineer',
      summary: '',
      yearsOfExperience: 0,
      location: { city: '', country: '', remotePreference: 'flexible' },
      overallVerificationScore: 0,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Candidate account created successfully',
        uid: userRecord.uid,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
