import {
  SandboxExecutionOptions,
  SandboxExecutionSummary,
  RemoteContainerSandboxProvider,
  IsolatedSubprocessSandboxProvider,
  SandboxExecutionProvider,
} from './provider';

export type { SandboxExecutionOptions, SandboxExecutionSummary };

/**
 * Returns the active sandbox execution provider according to deployment configuration.
 * Prioritizes dedicated remote container infrastructure (Docker / gVisor / Firecracker worker).
 * Falls back to isolated subprocess runner only in test / development environments when permitted.
 */
export function getActiveSandboxProvider(): SandboxExecutionProvider | null {
  const containerProvider = new RemoteContainerSandboxProvider();
  if (containerProvider.isAvailable()) {
    return containerProvider;
  }

  const subprocessProvider = new IsolatedSubprocessSandboxProvider();
  if (subprocessProvider.isAvailable()) {
    return subprocessProvider;
  }

  return null;
}

/**
 * Executes candidate code against deterministic test cases.
 * Strictly adheres to Zero-Trust Sandboxing:
 * - node:vm is COMPLETELY REMOVED per Node.js official security guidance.
 * - If no isolated execution provider is configured, execution is disabled to prevent host compromise.
 */
export async function executeInIsolatedSandbox(
  options: SandboxExecutionOptions
): Promise<SandboxExecutionSummary> {
  const provider = getActiveSandboxProvider();

  if (!provider) {
    throw new Error(
      'EXECUTION_PROVIDER_UNCONFIGURED: Secure isolated container infrastructure is not configured. ' +
      'Direct arbitrary code execution on the application server is disabled to prevent host compromise. ' +
      '(node:vm has been decommissioned per Node.js security advisories). ' +
      'Please configure SANDBOX_WORKER_URL in your deployment environment.'
    );
  }

  return await provider.execute(options);
}
