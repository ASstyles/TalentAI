import { z } from 'zod';
import { GeminiClient } from '../client';
import { wrapUntrustedContent } from '@/lib/security/sanitization';
import { QuestionEvaluation } from '@/types/interview';

const EvaluationResponseSchema = z.object({
  technicalAccuracyScore: z.number().min(0).max(100),
  conceptualDepthScore: z.number().min(0).max(100),
  problemSolvingScore: z.number().min(0).max(100),
  tradeOffAwarenessScore: z.number().min(0).max(100),
  compositeScore: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  missingConcepts: z.array(z.string()),
  feedbackNotes: z.string(),
  confidence: z.number().min(0).max(1),
  suggestedFollowUpQuestion: z.string().optional(),
});

export type AdaptiveEvaluationResult = z.infer<typeof EvaluationResponseSchema>;

export async function evaluateInterviewTurnWithGemini({
  questionText,
  rubricCriteria,
  candidateResponse,
  conversationHistory,
}: {
  questionText: string;
  rubricCriteria: string[];
  candidateResponse: string;
  conversationHistory?: Array<{ question: string; answer: string }>;
}): Promise<AdaptiveEvaluationResult> {
  const wrappedResponse = wrapUntrustedContent(candidateResponse, 'candidate_response');

  const systemInstruction = `
You are a Staff Software Engineer conducting a live technical interview.
Objectively evaluate the candidate's answer against the provided rubric criteria.
Do not rely on buzzwords or superficial confidence; evaluate:
1. Technical accuracy: Are facts, algorithms, and architectures correct?
2. Conceptual depth: Does the candidate understand underlying mechanics and failure modes?
3. Trade-off awareness: Did they address scalability, complexity, latency, and memory?
4. Problem solving: Is their reasoning clear, structured, and pragmatic?

Provide scores from 0 to 100 and identify concrete missing concepts.
If this is part of an ongoing interview, provide a targeted follow-up question to probe ambiguities.
`;

  const prompt = `
Question Asked:
${questionText}

Rubric Criteria:
${rubricCriteria.join('\n- ')}

Candidate Response:
${wrappedResponse}

${
  conversationHistory && conversationHistory.length > 0
    ? `Prior Context:\n${conversationHistory.map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join('\n')}`
    : ''
}
`;

  const response = await GeminiClient.generateStructuredContent<AdaptiveEvaluationResult>({
    prompt,
    systemInstruction,
    tier: 'fast',
    temperature: 0.2,
  });

  const parsed = EvaluationResponseSchema.safeParse(response.data);
  if (!parsed.success) {
    throw new Error(`Interview evaluation validation failed: ${parsed.error.message}`);
  }

  return parsed.data;
}
