import { FIXTURE_FILES } from './fixture-gadget';
import { postProposal } from './proposal-client';

import type { HostConfig } from './proposal-client';

export { postProposal } from './proposal-client';

export async function runTurn(
  config: HostConfig,
  input: { chatId: string; message: string },
): Promise<{ text: string }> {
  if ((process.env['GAOS_MODEL'] ?? 'fixture') === 'fixture') {
    await postProposal(config, input.chatId, FIXTURE_FILES);
    return { text: 'Proposed a gadget with client.js and server.js.' };
  }
  const { streamTurn } = await import('./mastra-agent');
  return streamTurn(config, input);
}
