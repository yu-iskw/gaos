import { afterEach, describe, expect, it } from 'vitest';

import { writeContextBlob } from './gcs-context';

describe('writeContextBlob', () => {
  afterEach(() => {
    delete process.env['GAOS_CONTEXT_BUCKET'];
  });

  it('skips upload when no bucket is configured', async () => {
    delete process.env['GAOS_CONTEXT_BUCKET'];
    await expect(writeContextBlob('id', 'body')).resolves.toBeUndefined();
  });

  it('uploads to GCS when a bucket is set', async () => {
    process.env['GAOS_CONTEXT_BUCKET'] = 'gaos-context';
    const original = globalThis.fetch;
    globalThis.fetch = (url) => {
      const href = url instanceof URL ? url.href : typeof url === 'string' ? url : '';
      expect(href).toContain('/b/gaos-context/o');
      return Promise.resolve(new Response('{}', { status: 200 }));
    };
    try {
      await expect(writeContextBlob('doc-1', 'hello')).resolves.toBe(
        'gs://gaos-context/context/doc-1',
      );
    } finally {
      globalThis.fetch = original;
    }
  });
});
