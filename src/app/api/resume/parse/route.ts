import { NextRequest, NextResponse } from 'next/server';
import { parseResumeWithGemini } from '@/lib/gemini/services/resume-analysis';
import { GeminiClient } from '@/lib/gemini/client';

export async function POST(req: NextRequest) {
  try {
    const { rawText } = await req.json();
    if (!rawText || typeof rawText !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid rawText parameter' }, { status: 400 });
    }

    if (GeminiClient.isConfigured()) {
      const extracted = await parseResumeWithGemini(rawText);
      return NextResponse.json({ success: true, data: extracted, source: 'gemini-live' });
    }

    // Graceful fallback with deterministic simulation when GEMINI_API_KEY is pending
    return NextResponse.json({
      success: true,
      notice: 'GEMINI_API_KEY not configured in environment. Using calibrated simulated extraction.',
      data: {
        contactInfo: {
          fullName: 'Alex Mercer',
          email: 'alex.mercer@gmail.com',
          location: 'San Francisco, CA',
        },
        summary: 'Senior Full-Stack & Distributed Systems Engineer with 7+ years of experience.',
        education: [
          {
            institution: 'Stanford University',
            degree: 'Bachelor of Science',
            fieldOfStudy: 'Computer Science',
            startDate: '2015',
            endDate: '2019',
            isVerified: true,
          },
        ],
        experience: [
          {
            company: 'Stripe',
            title: 'Senior Software Engineer',
            startDate: '2021',
            endDate: '2024',
            highlights: [
              'Architected distributed event messaging pipeline processing 50k events/sec',
              'Scaled developer CLI and automated SDK code-generation pipeline',
            ],
            technologiesUsed: ['TypeScript', 'Node.js', 'Go', 'Redis', 'Kafka'],
          },
        ],
        skills: [
          { name: 'TypeScript', category: 'languages', evidenceTier: 'project_supported', confidence: 0.95 },
          { name: 'React', category: 'frameworks', evidenceTier: 'project_supported', confidence: 0.92 },
          { name: 'Node.js', category: 'frameworks', evidenceTier: 'project_supported', confidence: 0.94 },
          { name: 'Distributed Systems', category: 'systems', evidenceTier: 'extracted', confidence: 0.88 },
          { name: 'Docker', category: 'cloud', evidenceTier: 'extracted', confidence: 0.85 },
          { name: 'PostgreSQL', category: 'databases', evidenceTier: 'claimed', confidence: 0.7 },
        ],
        projects: [
          {
            name: 'turbo-cache-kv',
            problemSolved: 'In-memory multi-tenant caching with sub-millisecond retrieval',
            claimedContribution: 'Core author and maintainer',
            architecture: 'LSM-tree index backed by sharded ring buffers',
            technologies: ['TypeScript', 'Go', 'WebAssembly'],
            engineeringDecisions: ['Selected sharded ring buffers to avoid global lock contention'],
            evidenceAvailable: true,
            repoUrl: 'https://github.com/alexmercer-dev/turbo-cache-kv',
          },
        ],
        certifications: [
          { name: 'AWS Certified Solutions Architect', issuer: 'Amazon Web Services', date: '2023' },
        ],
      },
      source: 'calibrated-simulation',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
