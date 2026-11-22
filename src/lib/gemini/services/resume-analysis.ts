import { z } from 'zod';
import { GeminiClient } from '../client';
import { wrapUntrustedContent } from '@/lib/security/sanitization';
import { ResumeExtractedData } from '@/types/resume';

const SkillSchema = z.object({
  name: z.string(),
  category: z.enum(['languages', 'frameworks', 'databases', 'cloud', 'ml', 'systems', 'testing']),
  evidenceTier: z.enum(['claimed', 'extracted', 'project_supported', 'verified', 'assessed']),
  confidence: z.number().min(0).max(1),
  sourceSnippet: z.string().optional(),
  yearsOfExperience: z.number().optional(),
});

const ProjectSchema = z.object({
  name: z.string(),
  problemSolved: z.string(),
  claimedContribution: z.string(),
  architecture: z.string(),
  technologies: z.array(z.string()),
  engineeringDecisions: z.array(z.string()),
  metricsAchieved: z.array(z.string()).optional(),
  evidenceAvailable: z.boolean(),
  repoUrl: z.string().optional(),
});

const ResumeAnalysisSchema = z.object({
  contactInfo: z.object({
    fullName: z.string(),
    email: z.string(),
    phone: z.string().optional(),
    location: z.string().optional(),
  }),
  summary: z.string(),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string(),
      fieldOfStudy: z.string(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      isVerified: z.boolean().default(false),
    })
  ),
  experience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      startDate: z.string(),
      endDate: z.string().optional(),
      highlights: z.array(z.string()),
      technologiesUsed: z.array(z.string()),
    })
  ),
  skills: z.array(SkillSchema),
  projects: z.array(ProjectSchema),
  certifications: z.array(
    z.object({
      name: z.string(),
      issuer: z.string(),
      date: z.string().optional(),
      verificationUrl: z.string().optional(),
    })
  ),
});

export type ValidatedResumeAnalysis = z.infer<typeof ResumeAnalysisSchema>;

export async function parseResumeWithGemini(rawText: string): Promise<ResumeExtractedData> {
  const wrappedInput = wrapUntrustedContent(rawText, 'untrusted_candidate_resume');

  const systemInstruction = `
You are an expert technical recruiter and talent intelligence parser.
Analyze the candidate's engineering resume with rigorous separation between:
1. Candidate-claimed abilities vs. contextualized engineering achievements.
2. For each extracted skill, determine if it is:
   - "claimed" (listed in a skills keyword section without context)
   - "extracted" (referenced in work experience with context)
   - "project_supported" (evidenced in detailed project architecture and code)
3. For projects, extract architecture, technical trade-offs, and verifiable metrics.
DO NOT hallucinate achievements. If data is missing, omit or mark appropriately.
Output MUST conform strictly to the requested JSON schema.
`;

  const prompt = `
Extract structured recruitment data from the following resume document:
${wrappedInput}
`;

  const response = await GeminiClient.generateStructuredContent<ValidatedResumeAnalysis>({
    prompt,
    systemInstruction,
    tier: 'reasoning',
    temperature: 0.1,
  });

  const parsed = ResumeAnalysisSchema.safeParse(response.data);
  if (!parsed.success) {
    throw new Error(`Resume parsing validation failed: ${parsed.error.message}`);
  }

  return parsed.data;
}
