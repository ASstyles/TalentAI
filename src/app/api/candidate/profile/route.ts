import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CandidateRepository } from '@/lib/repositories/candidate-repository';
import { authorizeRequest } from '@/lib/firebase/auth';

const ProfileUpdateSchema = z.object({
  headline: z.string().max(200).optional(),
  summary: z.string().max(3000).optional(),
  yearsOfExperience: z.number().min(0).max(50).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  githubUsername: z.string().max(100).optional(),
  linkedinUrl: z.string().max(200).optional(),
  portfolioUrl: z.string().max(200).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await authorizeRequest(req, ['candidate', 'recruiter', 'admin']);
    const { searchParams } = new URL(req.url);
    const requestedId = searchParams.get('candidateId');

    // Candidates can only read their own profile
    const targetId = session.role === 'candidate' ? session.uid : (requestedId || session.uid);

    const profile = await CandidateRepository.getProfile(targetId);
    return NextResponse.json({ success: true, data: profile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.startsWith('Unauthorized')
      ? 401
      : message.startsWith('Forbidden')
      ? 403
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Candidates can only save their own profile
    const session = await authorizeRequest(req, ['candidate']);

    const body = await req.json();
    const parsed = ProfileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid profile data', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { city, state, country, ...rest } = parsed.data;
    const locationUpdate = city || country ? { city: city || '', state, country: country || '', remotePreference: 'flexible' as const } : undefined;

    const updated = await CandidateRepository.saveProfile(session.uid, {
      ...rest,
      ...(locationUpdate ? { location: locationUpdate } : {}),
      userId: session.uid,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.startsWith('Unauthorized')
      ? 401
      : message.startsWith('Forbidden')
      ? 403
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
