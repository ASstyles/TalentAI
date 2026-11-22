import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/firebase/auth';
import { AssessmentRepository } from '@/lib/repositories/assessment-repository';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await authorizeRequest(req, ['candidate', 'recruiter', 'admin']);
    const { id } = await params;
    const assessment = await AssessmentRepository.getPublicAssessment(id);

    if (!assessment) {
      return NextResponse.json(
        { error: `Assessment with ID '${id}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: assessment });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.startsWith('Forbidden') ? 403 : message.startsWith('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
