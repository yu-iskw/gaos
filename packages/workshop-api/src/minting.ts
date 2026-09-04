export function ambientVendorsFromEnv(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const raw = env['GAOS_AMBIENT_VENDORS'] ?? '';
  return new Set(
    raw
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0),
  );
}

export function assertAmbientAllowed(vendor: string, ambient: boolean, allowed: Set<string>): void {
  if (!ambient) {
    return;
  }
  if (!allowed.has(vendor)) {
    throw new Error('ambient not allowed');
  }
}
