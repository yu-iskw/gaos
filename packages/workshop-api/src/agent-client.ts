type AgentTurnResult = {
  text: string;
};

export type AgentTurnOptions = {
  agentUrl: string;
  chatId: string;
  internalToken: string;
  message: string;
  onChunk?: (chunk: string) => void;
};

/** Prefix workshop-api attaches when Preview reports a gadget error. Mirrored in agent-host instructions. */
export const PREVIEW_ERROR_PREFIX = 'The previous gadget failed in Preview:\n';

export function agentMessageFromUser(text: string, previewError?: string): string {
  if (previewError === undefined || previewError.length === 0) {
    return text;
  }
  return `${PREVIEW_ERROR_PREFIX}${previewError}\n\n${text}`;
}

function parseChunk(line: string): string | undefined {
  if (line.length === 0) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null || !('text' in parsed)) {
    return undefined;
  }
  const text = parsed.text;
  return typeof text === 'string' ? text : undefined;
}

async function jsonTurn(options: AgentTurnOptions): Promise<AgentTurnResult> {
  const res = await fetch(new URL('/agent/turn', options.agentUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${options.internalToken}`,
    },
    body: JSON.stringify({ chatId: options.chatId, message: options.message }),
  });
  if (!res.ok) {
    throw new Error(`agent-host ${String(res.status)}`);
  }
  const body: unknown = await res.json();
  if (typeof body !== 'object' || body === null || !('text' in body)) {
    throw new Error('invalid agent response');
  }
  const text = body.text;
  if (typeof text !== 'string') {
    throw new Error('invalid agent response');
  }
  return { text };
}

async function streamTurn(options: AgentTurnOptions): Promise<AgentTurnResult | undefined> {
  const res = await fetch(new URL('/agent/turn/stream', options.agentUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${options.internalToken}`,
    },
    body: JSON.stringify({ chatId: options.chatId, message: options.message }),
  });
  if (!res.ok) {
    return undefined;
  }
  const raw = await res.text();
  let text = '';
  for (const line of raw.split('\n')) {
    const chunk = parseChunk(line);
    if (chunk === undefined) {
      continue;
    }
    text += chunk;
    options.onChunk?.(chunk);
  }
  return { text };
}

export async function requestAgentTurn(options: AgentTurnOptions): Promise<AgentTurnResult> {
  if (options.onChunk !== undefined) {
    const streamed = await streamTurn(options);
    // A 200 stream (including empty text) already ran the agent turn — do not
    // fall through to /agent/turn or writeProposal/LLM run twice.
    if (streamed !== undefined) {
      return streamed;
    }
  }
  const result = await jsonTurn(options);
  options.onChunk?.(result.text);
  return result;
}
