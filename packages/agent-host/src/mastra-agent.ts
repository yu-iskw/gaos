import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { postProposal, type HostConfig } from './proposal-client';

function createWorkshopAgent(config: HostConfig) {
  const writeProposal = createTool({
    id: 'writeProposal',
    description: 'Write gadget files as an uncommitted proposal for the current chat.',
    inputSchema: z.object({
      chatId: z.string(),
      files: z.record(z.string(), z.string()),
    }),
    execute: async (inputData: unknown) => {
      const parsed = z
        .object({ chatId: z.string(), files: z.record(z.string(), z.string()) })
        .parse(inputData);
      await postProposal(config, parsed.chatId, parsed.files);
      return { ok: true };
    },
  });
  return new Agent({
    id: 'workshop-agent',
    name: 'workshop-agent',
    instructions:
      'You write private gadgets. Call writeProposal with client.js and server.js. Do not claim accept happened.',
    model: 'google/gemini-2.5-flash',
    tools: { writeProposal },
  });
}

export async function streamTurn(config: HostConfig, message: string): Promise<{ text: string }> {
  const agent = createWorkshopAgent(config);
  const stream = await agent.stream(message);
  return { text: await stream.text };
}
