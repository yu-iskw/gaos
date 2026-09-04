export async function writeContextBlob(id: string, body: string): Promise<string | undefined> {
  const bucket = process.env['GAOS_CONTEXT_BUCKET'];
  if (bucket === undefined || bucket.length === 0) {
    return undefined;
  }
  const object = `context/${id}`;
  const res = await fetch(
    `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(object)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'text/plain; charset=utf-8' },
      body,
    },
  );
  if (!res.ok) {
    throw new Error('gcs write failed');
  }
  return `gs://${bucket}/${object}`;
}
