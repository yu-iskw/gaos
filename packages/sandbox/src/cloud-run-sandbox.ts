import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import type { CreateSandboxOptions, RunResult, Sandbox, SpawnHandle } from './types';

/** Wraps `/usr/local/gcp/bin/sandbox`. Compose cannot emulate this CLI. */

export const CLOUD_RUN_SANDBOX_BIN = '/usr/local/gcp/bin/sandbox';

export type RunCli = (args: string[], stdin?: string) => Promise<RunResult>;

export type CloudRunSandboxOptions = CreateSandboxOptions & {
  allowEgress?: boolean;
  binary?: string;
  name?: string;
  runCli?: RunCli;
};

function runSandboxCli(binary: string, args: string[], stdin?: string): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => {
      stdout.push(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr.push(chunk);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
        exitCode: code ?? 1,
      });
    });
    if (stdin !== undefined) {
      child.stdin.end(stdin);
    } else {
      child.stdin.end();
    }
  });
}

function quote(value: string): string {
  return JSON.stringify(value);
}

export async function createCloudRunSandbox(
  options: CloudRunSandboxOptions = {},
): Promise<Sandbox> {
  if (options.allowEgress === true) {
    throw new Error('gadget sandboxes must not set --allow-egress');
  }
  const binary = options.binary ?? CLOUD_RUN_SANDBOX_BIN;
  const runCli = options.runCli ?? ((args, stdin) => runSandboxCli(binary, args, stdin));
  const id = options.name ?? `gaos-${randomUUID()}`;
  const args = ['run', id, '--detach', '--write'];
  for (const bind of options.binds ?? []) {
    args.push('--mount', `type=bind,source=${bind.hostPath},destination=${bind.sandboxPath}`);
  }
  for (const [key, value] of Object.entries(options.env ?? {})) {
    args.push('--env', `${key}=${value}`);
  }
  args.push('--', '/usr/bin/sleep', 'infinity');
  const started = await runCli(args);
  if (started.exitCode !== 0) {
    throw new Error(started.stderr || `sandbox run failed for ${id}`);
  }

  async function execIn(command: string[], stdin?: string): Promise<RunResult> {
    return runCli(['exec', id, '--', ...command], stdin);
  }

  return {
    id,
    async destroy() {
      await runCli(['delete', id, '--force']);
    },
    async readFile(path) {
      const result = await execIn(['/bin/cat', path]);
      if (result.exitCode !== 0) {
        throw new Error(result.stderr || `failed to read ${path}`);
      }
      return result.stdout;
    },
    run(command) {
      return execIn(command);
    },
    async spawn(command) {
      const quoted = command.map((part) => quote(part)).join(' ');
      const result = await execIn(['/bin/sh', '-c', `${quoted} & echo $!`]);
      const handleId = result.stdout.trim().split('\n').at(-1) ?? '0';
      const handle: SpawnHandle = {
        id: handleId,
        async wait() {
          return execIn(['/bin/sh', '-c', `wait ${handleId}`]);
        },
      };
      return handle;
    },
    async writeFile(path, content) {
      const result = await execIn(['/bin/sh', '-c', `cat > ${quote(path)}`], content);
      if (result.exitCode !== 0) {
        throw new Error(result.stderr || `failed to write ${path}`);
      }
    },
  };
}
