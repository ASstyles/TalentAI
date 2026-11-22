import { GeminiClient, GeminiServiceError } from './client';

export interface DiagnosticResult {
  hasApiKey: boolean;
  canConnect: boolean;
  modelsConfigured: {
    primary: string;
    reasoning: string;
    fast: string;
    fallback: string;
  };
  liveTests: {
    basicGeneration: { passed: boolean; latencyMs: number; error?: string };
    structuredJson: { passed: boolean; latencyMs: number; error?: string };
  };
  overallStatus: 'healthy' | 'degraded' | 'unconfigured' | 'error';
  errorMessage?: string;
  errorCode?: string;
  timestamp: string;
}

/**
 * Executes a full diagnostic probe of the Gemini Developer API integration.
 */
export async function runGeminiDiagnostics(): Promise<DiagnosticResult> {
  const modelsConfigured = {
    primary: GeminiClient.primaryModel,
    reasoning: GeminiClient.reasoningModel,
    fast: GeminiClient.fastModel,
    fallback: GeminiClient.fallbackModel,
  };

  if (!GeminiClient.isConfigured()) {
    return {
      hasApiKey: false,
      canConnect: false,
      modelsConfigured,
      liveTests: {
        basicGeneration: { passed: false, latencyMs: 0, error: 'GEMINI_API_KEY environment variable is not set' },
        structuredJson: { passed: false, latencyMs: 0, error: 'GEMINI_API_KEY environment variable is not set' },
      },
      overallStatus: 'unconfigured',
      errorMessage: 'GEMINI_API_KEY is not configured. Configure it in Cloud Secret Manager or .env.local to enable live inference.',
      errorCode: 'MISSING_API_KEY',
      timestamp: new Date().toISOString(),
    };
  }

  let basicPassed = false;
  let basicLatency = 0;
  let basicError: string | undefined;

  let structuredPassed = false;
  let structuredLatency = 0;
  let structuredError: string | undefined;

  // 1. Basic Generation Test
  try {
    const start = Date.now();
    const ai = GeminiClient.getClient();
    const response = await ai.models.generateContent({
      model: GeminiClient.fastModel,
      contents: 'Ping: Return the word "PONG".',
    });
    basicLatency = Date.now() - start;
    basicPassed = !!response.text;
  } catch (err: unknown) {
    const classified = GeminiClient.classifyError(err);
    basicError = classified.message;
  }

  // 2. Structured JSON Generation Test
  try {
    const start = Date.now();
    const result = await GeminiClient.generateStructuredContent<{ status: string }>({
      prompt: 'Return a JSON object with status: "ok"',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          status: { type: 'STRING' },
        },
        required: ['status'],
      },
      tier: 'fast',
    });
    structuredLatency = Date.now() - start;
    structuredPassed = result.data?.status === 'ok';
  } catch (err: unknown) {
    const classified = GeminiClient.classifyError(err);
    structuredError = classified.message;
  }

  const isHealthy = basicPassed && structuredPassed;
  const isDegraded = basicPassed || structuredPassed;

  return {
    hasApiKey: true,
    canConnect: isHealthy || isDegraded,
    modelsConfigured,
    liveTests: {
      basicGeneration: { passed: basicPassed, latencyMs: basicLatency, error: basicError },
      structuredJson: { passed: structuredPassed, latencyMs: structuredLatency, error: structuredError },
    },
    overallStatus: isHealthy ? 'healthy' : isDegraded ? 'degraded' : 'error',
    errorMessage: !isHealthy ? (basicError || structuredError) : undefined,
    errorCode: !isHealthy ? 'CONNECTIVITY_PARTIAL_FAILURE' : undefined,
    timestamp: new Date().toISOString(),
  };
}
