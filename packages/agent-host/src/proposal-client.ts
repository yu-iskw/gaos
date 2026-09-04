export type HostConfig = {
  internalToken: string;
  workshopUrl: string;
};

export async function postProposal(
  config: HostConfig,
  chatId: string,
  files: Record<string, string>,
): Promise<void> {
  const res = await fetch(new URL('/internal/proposals', config.workshopUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.internalToken}`,
    },
    body: JSON.stringify({ chatId, files }),
  });
  if (!res.ok) {
    throw new Error(`writeProposal failed ${String(res.status)}`);
  }
}
