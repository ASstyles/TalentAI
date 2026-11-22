import { z } from 'zod';
import { GeminiClient } from '../client';
import { wrapUntrustedContent } from '@/lib/security/sanitization';
import { EngineeringRole, SeniorityLevel } from '@/types/job';

const JobRequirementSchema = z.object({
  title: z.string(),
  specialization: z.enum([
    'Software Engineer',
    'Frontend Engineer',
    'Backend Engineer',
    'Full-Stack Engineer',
    'AI Engineer',
    'Machine Learning Engineer',
    'Data Scientist',
    'Data Engineer',
    'Computer Vision Engineer',
    'NLP Engineer',
    'DevOps Engineer',
    'Cloud Engineer',
    'MLOps Engineer',
    'Cybersecurity Engineer',
    'QA Automation Engineer',
    'Site Reliability Engineer',
  ]),
  seniority: z.enum(['intern', 'junior', 'mid', 'senior', 'lead', 'staff']),
  responsibilities: z.array(z.string()),
  mandatoryCompetencies: z.array(
    z.object({
      skillId: z.string(),
      name: z.string(),
      category: z.enum(['languages', 'frameworks', 'databases', 'cloud', 'ml', 'systems', 'testing']),
      minLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
      weight: z.number().min(1).max(10),
    })
  ),
  preferredCompetencies: z.array(
    z.object({
      skillId: z.string(),
      name: z.string(),
      category: z.enum(['languages', 'frameworks', 'databases', 'cloud', 'ml', 'systems', 'testing']),
      minLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
      weight: z.number().min(1).max(10),
    })
  ),
  summary: z.string(),
});

export type ExtractedJobRequirements = z.infer<typeof JobRequirementSchema>;

export async function parseJobDescriptionWithGemini(rawDescription: string): Promise<ExtractedJobRequirements> {
  const wrappedInput = wrapUntrustedContent(rawDescription, 'untrusted_job_description');

  const systemInstruction = `
You are a Principal Engineering Architect defining hiring criteria.
Deconstruct this job description into strict, calibrated technical competencies.
Separate mandatory minimum qualifications from nice-to-have preferred skills.
Assign realistic weights (1 to 10) and proficiency levels (1: Novice to 5: Expert).
Output MUST conform strictly to the requested JSON schema.
`;

  const prompt = `
Parse and structure the engineering job requirements from:
${wrappedInput}
`;

  const response = await GeminiClient.generateStructuredContent<ExtractedJobRequirements>({
    prompt,
    systemInstruction,
    tier: 'reasoning',
    temperature: 0.1,
  });

  const parsed = JobRequirementSchema.safeParse(response.data);
  if (!parsed.success) {
    throw new Error(`Job description analysis validation failed: ${parsed.error.message}`);
  }

  return parsed.data;
}
