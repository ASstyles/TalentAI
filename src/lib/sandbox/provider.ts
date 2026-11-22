import { SupportedLanguage, TestCase, TestExecutionResult } from '@/types/coding';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface SandboxExecutionOptions {
  code: string;
  language: SupportedLanguage;
  testCases: TestCase[];
  timeoutMs?: number;
  memoryLimitMb?: number;
}

export interface SandboxExecutionSummary {
  passedTests: number;
  totalTests: number;
  score: number;
  executionStatus: 'passed' | 'failed' | 'timeout' | 'runtime_error' | 'provider_unconfigured';
  results: TestExecutionResult[];
  overallTimeMs: number;
  provider: string;
}

export interface SandboxExecutionProvider {
  name: string;
  isAvailable(): boolean;
  execute(options: SandboxExecutionOptions): Promise<SandboxExecutionSummary>;
}

/**
 * Production Container Worker Provider:
 * Communicates with a dedicated isolated microVM / container execution service (e.g. gVisor, Firecracker, or Docker runner)
 * that runs with non-root, read-only root, no network egress, strict cgroup CPU/memory caps, and ephemeral lifecycle.
 */
export class RemoteContainerSandboxProvider implements SandboxExecutionProvider {
  public readonly name = 'isolated-container-worker';

  public isAvailable(): boolean {
    return !!process.env.SANDBOX_WORKER_URL;
  }

  public async execute(options: SandboxExecutionOptions): Promise<SandboxExecutionSummary> {
    const workerUrl = process.env.SANDBOX_WORKER_URL;
    if (!workerUrl) {
      throw new Error('SANDBOX_WORKER_URL is not configured.');
    }

    const response = await fetch(`${workerUrl}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SANDBOX_WORKER_SECRET || ''}`,
      },
      body: JSON.stringify({
        code: options.code,
        language: options.language,
        testCases: options.testCases,
        timeoutMs: options.timeoutMs || 3000,
        memoryLimitMb: options.memoryLimitMb || 128,
        networkEgress: false,
        readOnlyRoot: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Isolated sandbox worker returned HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return {
      ...data,
      provider: this.name,
    };
  }
}

/**
 * Isolated Subprocess Runner for automated verification & test environments.
 * Runs in a stripped-down environment with NO credentials, NO API keys, bounded runtime, and temporary files.
 * NEVER uses node:vm as a security boundary.
 */
export class IsolatedSubprocessSandboxProvider implements SandboxExecutionProvider {
  public readonly name = 'isolated-subprocess-runner';

  public isAvailable(): boolean {
    // Only available in test / development environments when explicitly permitted
    return process.env.NODE_ENV === 'test' || process.env.ALLOW_LOCAL_SUBPROCESS_SANDBOX === 'true';
  }

  public async execute(options: SandboxExecutionOptions): Promise<SandboxExecutionSummary> {
    const startTime = Date.now();
    const timeoutMs = options.timeoutMs || 3000;
    const results: TestExecutionResult[] = [];
    let passedCount = 0;

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'talentai-sandbox-'));

    try {
      for (const tc of options.testCases) {
        const caseStart = Date.now();
        let actualOutput = '';
        let isSuccess = false;
        let errorMessage: string | undefined;

        try {
          if (options.language === 'javascript' || options.language === 'typescript') {
            actualOutput = await this.runIsolatedNodeScript(options.code, tc.input, timeoutMs, tmpDir);
          } else if (options.language === 'python') {
            actualOutput = await this.runIsolatedPythonScript(options.code, tc.input, timeoutMs, tmpDir);
          } else {
            throw new Error(`Language ${options.language} requires remote container worker`);
          }

          let normalizedActual = actualOutput.trim();
          let normalizedExpected = tc.expectedOutput.trim();

          try {
            const pActual = JSON.parse(normalizedActual);
            const pExpected = JSON.parse(normalizedExpected);
            isSuccess = JSON.stringify(pActual) === JSON.stringify(pExpected);
          } catch {
            isSuccess = normalizedActual === normalizedExpected;
          }

          if (isSuccess) passedCount++;
        } catch (err: unknown) {
          isSuccess = false;
          errorMessage = err instanceof Error ? err.message : String(err);
        }

        results.push({
          testCaseId: tc.id,
          passed: isSuccess,
          input: tc.isHidden ? '[HIDDEN]' : tc.input,
          expectedOutput: tc.isHidden ? '[HIDDEN]' : tc.expectedOutput,
          actualOutput: tc.isHidden ? '[HIDDEN]' : actualOutput,
          executionTimeMs: Date.now() - caseStart,
          memoryUsageKb: 12 * 1024,
          errorMessage: tc.isHidden && errorMessage ? 'Hidden test failed' : errorMessage,
        });
      }
    } finally {
      // Clean up temporary workspace directory
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }

    const totalTests = options.testCases.length;
    const score = totalTests > 0 ? Math.round((passedCount / totalTests) * 100) : 0;

    return {
      passedTests: passedCount,
      totalTests,
      score,
      executionStatus: passedCount === totalTests ? 'passed' : 'failed',
      results,
      overallTimeMs: Date.now() - startTime,
      provider: this.name,
    };
  }

  private runIsolatedNodeScript(code: string, input: string, timeoutMs: number, tmpDir: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const scriptFile = path.join(tmpDir, `exec_${Date.now()}_${Math.random().toString(36).substring(7)}.js`);
      
      const fileContent = `
        'use strict';
        const __sysStdout = process.stdout;
        const __sysExit = process.exit;

        // Neutralize global process and env credentials from execution scope
        try {
          delete global.process.env;
          Object.defineProperty(globalThis, 'process', {
            value: undefined,
            writable: false,
            configurable: true,
          });
          Object.defineProperty(global, 'process', {
            value: undefined,
            writable: false,
            configurable: true,
          });
        } catch (e) {}

        const inputData = ${JSON.stringify(input)};

        try {
          ${code}
          const fn = typeof solution === 'function' ? solution : (typeof solve === 'function' ? solve : null);
          if (!fn) {
            __sysStdout.write("ERROR: No solution() or solve() function declared");
            __sysExit(1);
          }
          let parsed;
          try { parsed = JSON.parse(inputData); } catch(e) { parsed = inputData; }
          let res;
          try {
            res = Array.isArray(parsed) ? fn(...parsed) : fn(parsed);
          } catch(e) {
            res = fn(parsed);
          }
          const out = typeof res === 'object' && res !== null ? JSON.stringify(res) : String(res);
          __sysStdout.write(out);
        } catch(err) {
          __sysStdout.write("ERROR: " + (err ? err.message : String(err)));
          __sysExit(1);
        }
      `;

      await fs.writeFile(scriptFile, fileContent, 'utf-8');

      // Execute node process with stripped environment (NO Firebase secrets, NO Gemini keys)
      const sanitizedEnv: NodeJS.ProcessEnv = {
        NODE_ENV: 'test',
        PATH: process.env.PATH,
      };

      const child = spawn('node', ['--max-old-space-size=64', scriptFile], {
        cwd: tmpDir,
        env: sanitizedEnv,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          child.kill('SIGKILL');
          reject(new Error(`Execution timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      child.stdout.on('data', (d) => {
        stdout += d.toString();
        if (stdout.length > 65536) {
          settled = true;
          child.kill('SIGKILL');
          reject(new Error('Output size limit exceeded (64KB)'));
        }
      });

      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        if (!settled) {
          settled = true;
          if (code !== 0) {
            reject(new Error(stderr.trim() || stdout.trim() || `Process exited with code ${code}`));
          } else {
            resolve(stdout.trim());
          }
        }
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        if (!settled) {
          settled = true;
          reject(new Error(`Execution runner error: ${err.message}`));
        }
      });
    });
  }

  private runIsolatedPythonScript(code: string, input: string, timeoutMs: number, tmpDir: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const scriptFile = path.join(tmpDir, `exec_${Date.now()}_${Math.random().toString(36).substring(7)}.py`);

      const fileContent = `
import json, sys

${code}

raw_input = ${JSON.stringify(input)}
try:
    parsed_input = json.loads(raw_input)
except Exception:
    parsed_input = raw_input

fn = None
if 'solution' in globals() and callable(globals()['solution']):
    fn = globals()['solution']
elif 'solve' in globals() and callable(globals()['solve']):
    fn = globals()['solve']

if fn is None:
    sys.stderr.write("No solution() or solve() function declared\\n")
    sys.exit(1)

try:
    if isinstance(parsed_input, list):
        try:
            result = fn(*parsed_input)
        except TypeError:
            result = fn(parsed_input)
    else:
        result = fn(parsed_input)
except Exception as e:
    sys.stderr.write(str(e))
    sys.exit(1)

if isinstance(result, (dict, list)):
    sys.stdout.write(json.dumps(result))
else:
    sys.stdout.write(str(result))
`;

      await fs.writeFile(scriptFile, fileContent, 'utf-8');

      // Execute Python with stripped environment
      const sanitizedEnv: NodeJS.ProcessEnv = {
        NODE_ENV: 'test',
        PYTHONPATH: '',
        PATH: process.env.PATH,
      };

      const child = spawn('python', ['-u', scriptFile], {
        cwd: tmpDir,
        env: sanitizedEnv,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          child.kill();
          reject(new Error(`Execution timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      child.stdout.on('data', (d) => {
        stdout += d.toString();
        if (stdout.length > 65536) {
          settled = true;
          child.kill();
          reject(new Error('Output size limit exceeded (64KB)'));
        }
      });

      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        if (!settled) {
          settled = true;
          if (code !== 0) {
            reject(new Error(stderr.trim() || `Process exited with code ${code}`));
          } else {
            resolve(stdout.trim());
          }
        }
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        if (!settled) {
          settled = true;
          reject(new Error(`Failed to spawn Python runner: ${err.message}`));
        }
      });
    });
  }
}
