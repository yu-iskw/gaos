type AgentTurnResult = {
  text: string;
};

export async function requestAgentTurn(options: {
  agentUrl: string;
  chatId: string;
  internalToken: string;
  message: string;
}): Promise<AgentTurnResult> {
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
