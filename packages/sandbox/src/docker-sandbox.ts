import { PassThrough } from 'node:stream';

import Docker from 'dockerode';

import type { CreateSandboxOptions, RunResult, Sandbox, SpawnHandle } from './types';

const DEFAULT_IMAGE = 'node:22-slim';
const SOCKET = process.env['DOCKER_SOCKET'] ?? '/var/run/docker.sock';

function collect(
  docker: Docker,
  stream: NodeJS.ReadableStream,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    const outChunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    stdout.on('data', (chunk: Buffer) => {
      outChunks.push(chunk);
    });
    stderr.on('data', (chunk: Buffer) => {
      errChunks.push(chunk);
    });
    stream.on('error', reject);
    docker.modem.demuxStream(stream, stdout, stderr);
    stream.on('end', () => {
      resolve({
        stdout: Buffer.concat(outChunks).toString('utf8'),
        stderr: Buffer.concat(errChunks).toString('utf8'),
      });
    });
  });
}

async function ensureImage(docker: Docker, image: string): Promise<void> {
  try {
    await docker.getImage(image).inspect();
  } catch {
    await new Promise<void>((resolve, reject) => {
      void docker.pull(image, (err: Error | null, stream: NodeJS.ReadableStream) => {
        if (err) {
          reject(err);
          return;
        }
        docker.modem.followProgress(stream, (followErr: Error | null) => {
          if (followErr) {
            reject(followErr);
            return;
          }
          resolve();
        });
      });
    });
  }
}

export async function createDockerSandbox(options: CreateSandboxOptions = {}): Promise<Sandbox> {
  const image = options.image ?? DEFAULT_IMAGE;
  const docker = new Docker({ socketPath: SOCKET });
  await ensureImage(docker, image);
  const binds = (options.binds ?? []).map((bind) => `${bind.hostPath}:${bind.sandboxPath}`);
  const env = Object.entries(options.env ?? {}).map(([key, value]) => `${key}=${value}`);
  const container = await docker.createContainer({
    Image: image,
    Cmd: ['sleep', 'infinity'],
    WorkingDir: '/workspace',
    ...(env.length > 0 ? { Env: env } : {}),
    HostConfig: {
      NetworkMode: 'none',
      CapDrop: ['ALL'],
      ReadonlyRootfs: true,
      Memory: 256 * 1024 * 1024,
      PidsLimit: 256,
      Tmpfs: {
        '/tmp': 'rw,noexec,nosuid,size=64m',
        '/workspace': 'rw,size=64m',
      },
      SecurityOpt: ['no-new-privileges:true'],
      ...(binds.length > 0 ? { Binds: binds } : {}),
    },
  });
  await container.start();

  async function runInside(command: string[], stdin?: string): Promise<RunResult> {
    const session = await container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
      AttachStdin: stdin !== undefined,
      WorkingDir: '/workspace',
    });
    const stream = await session.start({ hijack: true, stdin: stdin !== undefined });
    if (stdin !== undefined) {
      stream.end(stdin);
    }
    const collected = await collect(docker, stream);
    const inspect = await session.inspect();
    return {
      stdout: collected.stdout,
      stderr: collected.stderr,
      exitCode: inspect.ExitCode ?? 1,
    };
  }

  return {
    id: container.id,
    async destroy() {
      await container.stop({ t: 1 }).catch(() => undefined);
      await container.remove({ force: true }).catch(() => undefined);
    },
    async readFile(path: string) {
      const result = await runInside(['/bin/cat', path]);
      if (result.exitCode !== 0) {
        throw new Error(result.stderr || `failed to read ${path}`);
      }
      return result.stdout;
    },
    run(command: string[]) {
      return runInside(command);
    },
    async spawn(command: string[]) {
      const quoted = command.map((part) => JSON.stringify(part)).join(' ');
      const result = await runInside(['/bin/sh', '-c', `${quoted} & echo $!`]);
      const id = result.stdout.trim().split('\n').at(-1) ?? '0';
      const handle: SpawnHandle = {
        id,
        async wait() {
          return runInside(['/bin/sh', '-c', `wait ${id}`]);
        },
      };
      return handle;
    },
    async writeFile(path: string, content: string) {
      const result = await runInside(['/bin/sh', '-c', `cat > ${JSON.stringify(path)}`], content);
      if (result.exitCode !== 0) {
        throw new Error(result.stderr || `failed to write ${path}`);
      }
    },
  };
}
