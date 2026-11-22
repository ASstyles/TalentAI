import { NextRequest, NextResponse } from 'next/server';
import { parseJobDescriptionWithGemini } from '@/lib/gemini/services/job-description-analysis';
import { GeminiClient } from '@/lib/gemini/client';

export async function POST(req: NextRequest) {
  try {
    const { jobDescription } = await req.json();
    if (!jobDescription || typeof jobDescription !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid jobDescription parameter' }, { status: 400 });
    }

    if (GeminiClient.isConfigured()) {
      const extracted = await parseJobDescriptionWithGemini(jobDescription);
      return NextResponse.json({ success: true, data: extracted, source: 'gemini-live' });
    }

    return NextResponse.json({
      success: true,
      notice: 'GEMINI_API_KEY not configured. Using calibrated simulation.',
      data: {
        title: 'Lead Full-Stack Engineer',
        specialization: 'Full-Stack Engineer',
        seniority: 'senior',
        summary: 'Architect and scale high-concurrency cloud dashboards and APIs.',
        responsibilities: [
          'Design resilient micro-frontends with Next.js App Router',
          'Optimize database queries and distributed caching layers',
          'Enforce strict code reviews and mentor team members',
        ],
        mandatoryCompetencies: [
          { skillId: 'react', name: 'React', category: 'frameworks', minLevel: 4, weight: 10 },
          { skillId: 'typescript', name: 'TypeScript', category: 'languages', minLevel: 4, weight: 9 },
          { skillId: 'nodejs', name: 'Node.js', category: 'frameworks', minLevel: 4, weight: 9 },
          { skillId: 'databases', name: 'Databases & Query Optimization', category: 'databases', minLevel: 3, weight: 8 },
        ],
        preferredCompetencies: [
          { skillId: 'cloud', name: 'Docker / Cloud Services', category: 'cloud', minLevel: 3, weight: 6 },
          { skillId: 'testing', name: 'Automated Testing / Vitest', category: 'testing', minLevel: 4, weight: 7 },
        ],
      },
      source: 'calibrated-simulation',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
