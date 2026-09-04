import { describe, expect, it } from 'vitest';

import { createCloudRunSandbox } from './cloud-run-sandbox';

import type { RunCli } from './cloud-run-sandbox';
import type { RunResult } from './types';

describe('createCloudRunSandbox', () => {
  it('runs sandbox run --detach --write without --allow-egress, then exec and delete', async () => {
    const calls: string[][] = [];
    const runCli: RunCli = (args) => {
      calls.push(args);
      const result: RunResult = { stdout: '1\n', stderr: '', exitCode: 0 };
      return Promise.resolve(result);
    };
    const sandbox = await createCloudRunSandbox({
      name: 'gadget-1',
      runCli,
      binds: [{ hostPath: '/tmp/gaos-gadgets/gadget-1', sandboxPath: '/mnt/gadget' }],
      env: { GADGET_ID: 'gadget-1' },
    });
    expect(sandbox.id).toBe('gadget-1');
    expect(calls[0]).toEqual([
      'run',
      'gadget-1',
      '--detach',
      '--write',
      '--mount',
      'type=bind,source=/tmp/gaos-gadgets/gadget-1,destination=/mnt/gadget',
      '--env',
      'GADGET_ID=gadget-1',
      '--',
      '/usr/bin/sleep',
      'infinity',
    ]);
    expect(calls[0]?.includes('--allow-egress')).toBe(false);

    await sandbox.writeFile('server.js', 'ok');
    expect(calls.at(-1)?.[0]).toBe('exec');
    expect(calls.at(-1)?.[1]).toBe('gadget-1');

    await sandbox.run(['/bin/true']);
    await sandbox.spawn(['node', 'server.js']);
    await sandbox.readFile('/workspace/isolation-result.json');
    await sandbox.destroy();
    expect(calls.at(-1)).toEqual(['delete', 'gadget-1', '--force']);
  });

  it('refuses --allow-egress for gadget sandboxes', async () => {
    await expect(
      createCloudRunSandbox({
        allowEgress: true,
        runCli: () => Promise.resolve({ stdout: '', stderr: '', exitCode: 0 }),
      }),
    ).rejects.toThrow('allow-egress');
  });
});
