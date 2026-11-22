import { GoogleGenAI } from '@google/genai';

export type GeminiModelTier = 'primary' | 'reasoning' | 'fast' | 'fallback';

export type GeminiErrorCode =
  | 'MISSING_API_KEY'
  | 'UNAUTHORIZED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'MODEL_NOT_FOUND'
  | 'SCHEMA_VALIDATION_FAILED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN_ERROR';

export class GeminiServiceError extends Error {
  constructor(
    message: string,
    public code: GeminiErrorCode,
    public status?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'GeminiServiceError';
  }
}

/**
 * Robust singleton Gemini Client supporting configurable model tiers:
 * - Primary: GEMINI_MODEL_PRIMARY (gemini-4-neon)
 * - Reasoning: GEMINI_MODEL_REASONING (gemini-4-carbon)
 * - Fast: GEMINI_MODEL_FAST (gemini-4-hydrogen)
 * - Fallback: GEMINI_MODEL_FALLBACK (gemini-3.8-flash)
 */
class GeminiClientService {
  private client: GoogleGenAI | null = null;
  public readonly primaryModel: string;
  public readonly reasoningModel: string;
  public readonly fastModel: string;
  public readonly fallbackModel: string;

  constructor() {
    this.primaryModel = process.env.GEMINI_MODEL_PRIMARY || 'gemini-4-neon';
    this.reasoningModel = process.env.GEMINI_MODEL_REASONING || 'gemini-4-carbon';
    this.fastModel = process.env.GEMINI_MODEL_FAST || 'gemini-4-hydrogen';
    this.fallbackModel = process.env.GEMINI_MODEL_FALLBACK || 'gemini-3.8-flash';
  }

  public getClient(): GoogleGenAI {
    if (!this.client) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new GeminiServiceError(
          'GEMINI_API_KEY is not configured. Add your API key to Google Cloud Secret Manager or local environment variables.',
          'MISSING_API_KEY',
          401
        );
      }
      this.client = new GoogleGenAI({ apiKey });
    }
    return this.client;
  }

  public isConfigured(): boolean {
    return !!process.env.GEMINI_API_KEY;
  }

  public getModelName(tier: GeminiModelTier = 'primary'): string {
    switch (tier) {
      case 'primary':
        return this.primaryModel;
      case 'reasoning':
        return this.reasoningModel;
      case 'fast':
        return this.fastModel;
      case 'fallback':
      default:
        return this.fallbackModel;
    }
  }

  /**
   * Translates unknown raw errors into strongly-typed GeminiServiceError with explicit classification.
   */
  public classifyError(err: unknown): GeminiServiceError {
    if (err instanceof GeminiServiceError) return err;

    const message = err instanceof Error ? err.message : String(err);
    const lower = message.toLowerCase();

    if (lower.includes('api_key') || lower.includes('unauthorized') || lower.includes('403')) {
      return new GeminiServiceError(message, 'UNAUTHORIZED', 401, err);
    }
    if (lower.includes('429') || lower.includes('quota') || lower.includes('rate limit') || lower.includes('resource_exhausted')) {
      return new GeminiServiceError(message, 'RATE_LIMIT_EXCEEDED', 429, err);
    }
    if (lower.includes('not found') || lower.includes('404') || lower.includes('model')) {
      return new GeminiServiceError(message, 'MODEL_NOT_FOUND', 404, err);
    }
    if (lower.includes('timeout') || lower.includes('deadline')) {
      return new GeminiServiceError(message, 'TIMEOUT', 504, err);
    }
    if (lower.includes('network') || lower.includes('econnrefused') || lower.includes('fetch')) {
      return new GeminiServiceError(message, 'NETWORK_ERROR', 503, err);
    }

    return new GeminiServiceError(message, 'UNKNOWN_ERROR', 500, err);
  }

  /**
   * Generates structured JSON output with Zod/Schema enforcement and model fallback resilience.
   */
  public async generateStructuredContent<T>({
    prompt,
    systemInstruction,
    responseSchema,
    tier = 'primary',
    temperature = 0.1,
  }: {
    prompt: string;
    systemInstruction?: string;
    responseSchema?: Record<string, unknown>;
    tier?: GeminiModelTier;
    temperature?: number;
  }): Promise<{ data: T; modelUsed: string; tokenUsage: { promptTokens: number; candidatesTokens: number; totalTokens: number } }> {
    const targetModel = this.getModelName(tier);
    const fallbackModel = this.getModelName('fallback');

    const executeCall = async (modelName: string) => {
      const ai = this.getClient();
      const config: Record<string, unknown> = {
        temperature,
        responseMimeType: 'application/json',
      };

      if (responseSchema) {
        config.responseSchema = responseSchema;
      }
      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config,
      });

      const responseText = response.text;
      if (!responseText) {
        throw new GeminiServiceError(`Empty response returned from model ${modelName}`, 'SCHEMA_VALIDATION_FAILED', 500);
      }

      const parsedData = JSON.parse(responseText) as T;
      const usageMetadata = response.usageMetadata || {
        promptTokenCount: 0,
        candidatesTokenCount: 0,
        totalTokenCount: 0,
      };

      return {
        data: parsedData,
        modelUsed: modelName,
        tokenUsage: {
          promptTokens: usageMetadata.promptTokenCount ?? 0,
          candidatesTokens: usageMetadata.candidatesTokenCount ?? 0,
          totalTokens: usageMetadata.totalTokenCount ?? 0,
        },
      };
    };

    try {
      return await executeCall(targetModel);
    } catch (err: unknown) {
      const classified = this.classifyError(err);
      console.warn(`[GeminiClient] Target model ${targetModel} failed (${classified.code}): ${classified.message}.`);
      if (targetModel !== fallbackModel) {
        console.info(`[GeminiClient] Retrying with resilient fallback model: ${fallbackModel}...`);
        try {
          return await executeCall(fallbackModel);
        } catch (fallbackErr: unknown) {
          throw this.classifyError(fallbackErr);
        }
      }
      throw classified;
    }
  }
}

export const GeminiClient = new GeminiClientService();
