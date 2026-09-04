import { createVertex } from '@ai-sdk/google-vertex';
import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { WORKSHOP_AGENT_INSTRUCTIONS } from './gadget-contract';
import { postProposal, type HostConfig } from './proposal-client';

function vertexModelId(raw: string): string {
  const slash = raw.lastIndexOf('/');
  return slash === -1 ? raw : raw.slice(slash + 1);
}

function vertexModel() {
  const project = process.env['GOOGLE_VERTEX_PROJECT'];
  if (project === undefined || project.length === 0) {
    throw new Error('GOOGLE_VERTEX_PROJECT is required when GAOS_MODEL is not fixture');
  }
  const location = process.env['GOOGLE_VERTEX_LOCATION'] ?? 'global';
  const vertex = createVertex({ location, project });
  const raw = process.env['GAOS_MODEL'] ?? 'google-vertex/gemini-2.5-flash';
  return vertex(vertexModelId(raw));
}

function createWorkshopAgent(config: HostConfig, chatId: string) {
  const writeProposal = createTool({
    id: 'writeProposal',
    description: 'Write gadget files as an uncommitted proposal for the current chat.',
    inputSchema: z.object({
      files: z.record(z.string(), z.string()),
    }),
    execute: async (inputData: unknown) => {
      const parsed = z.object({ files: z.record(z.string(), z.string()) }).parse(inputData);
      await postProposal(config, chatId, parsed.files);
      return { ok: true };
    },
  });
  return new Agent({
    id: 'workshop-agent',
    name: 'workshop-agent',
    instructions: WORKSHOP_AGENT_INSTRUCTIONS,
    model: vertexModel(),
    tools: { writeProposal },
  });
}

export async function streamTurn(
  config: HostConfig,
  input: { chatId: string; message: string },
): Promise<{ text: string }> {
  const agent = createWorkshopAgent(config, input.chatId);
  const stream = await agent.stream(input.message, { maxSteps: 8 });
  const maybeStream = stream as { text: Promise<string>; textStream?: AsyncIterable<string> };
  if (maybeStream.textStream !== undefined) {
    let text = '';
    for await (const chunk of maybeStream.textStream) {
      text += chunk;
    }
    return { text };
  }
  return { text: await maybeStream.text };
}
