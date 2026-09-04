export function parseIsolationJson(raw: string): boolean {
  const parsed: unknown = JSON.parse(raw);
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    'reachedApi' in parsed &&
    parsed.reachedApi === true
  );
}
