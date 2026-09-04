import { describe, expect, it } from 'vitest';

const apiUrl = process.env['WORKSHOP_API_URL'] ?? 'http://127.0.0.1:8080';
const agentUrl = process.env['AGENT_HOST_URL'] ?? 'http://127.0.0.1:8081';
const webUrl = process.env['WORKSHOP_WEB_URL'] ?? 'http://127.0.0.1:5173';

async function health(url: string): Promise<unknown> {
  const res = await fetch(`${url}/health`);
  expect(res.ok).toBe(true);
  return res.json();
}

describe('compose smoke', () => {
  it('workshop-api answers /health', async () => {
    await expect(health(apiUrl)).resolves.toMatchObject({ ok: true, service: 'workshop-api' });
  });

  it('agent-host answers /health', async () => {
    await expect(health(agentUrl)).resolves.toMatchObject({ ok: true, service: 'agent-host' });
  });

  it('workshop-web answers /health', async () => {
    await expect(health(webUrl)).resolves.toMatchObject({ ok: true, service: 'workshop-web' });
  });
});
