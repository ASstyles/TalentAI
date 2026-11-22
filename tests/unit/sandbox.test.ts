import { describe, it, expect } from 'vitest';
import { executeInIsolatedSandbox } from '@/lib/sandbox/runner';

describe('Isolated Code Execution Sandbox', () => {
  it('correctly executes valid JavaScript code and passes test cases', async () => {
    const code = `
      function solution(a, b) {
        return a + b;
      }
    `;

    const summary = await executeInIsolatedSandbox({
      code,
      language: 'javascript',
      testCases: [
        { id: '1', input: '[2, 3]', expectedOutput: '5', isHidden: false },
        { id: '2', input: '[-1, 10]', expectedOutput: '9', isHidden: true },
      ],
    });

    expect(summary.passedTests).toBe(2);
    expect(summary.totalTests).toBe(2);
    expect(summary.score).toBe(100);
    expect(summary.executionStatus).toBe('passed');
  });

  it('safely neutralizes malicious sandbox escape attempts via constructor', async () => {
    const exploitCode = `
      function solution() {
        try {
          return typeof (function(){}).constructor("return process")();
        } catch(e) {
          return "blocked";
        }
      }
    `;

    const summary = await executeInIsolatedSandbox({
      code: exploitCode,
      language: 'javascript',
      testCases: [
        { id: '1', input: '[]', expectedOutput: 'blocked', isHidden: false },
      ],
    });

    // In a secured VM, process is not defined, so it returns "blocked" or "undefined"
    expect(['blocked', 'undefined']).toContain(summary.results[0].actualOutput);
  });

  it('correctly executes Python code in isolated runner', async () => {
    const pythonCode = `
def solution(a, b):
    return a * b
`;

    const summary = await executeInIsolatedSandbox({
      code: pythonCode,
      language: 'python',
      testCases: [
        { id: 'py-1', input: '[6, 7]', expectedOutput: '42', isHidden: false },
        { id: 'py-2', input: '[-3, 4]', expectedOutput: '-12', isHidden: true },
      ],
    });

    expect(summary.passedTests).toBe(2);
    expect(summary.score).toBe(100);
    expect(summary.executionStatus).toBe('passed');
  });
});
