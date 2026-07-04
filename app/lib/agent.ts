const AGENT_PORTS = [3001, 3002, 3003, 3004, 3005];

async function findAgentUrl(): Promise<string | null> {
  for (const port of AGENT_PORTS) {
    try {
      const res = await fetch(`http://localhost:${port}/ping`, {
        signal: AbortSignal.timeout(500),
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.status === 'ok') return `http://localhost:${port}`;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export async function pingAgent(): Promise<boolean> {
  const url = await findAgentUrl();
  return url !== null;
}

export async function savePrompt(filePath: string, data: object): Promise<{ ok: boolean; error?: string }> {
  const url = await findAgentUrl();
  if (!url) return { ok: false, error: '에이전트가 실행중이지 않습니다.' };
  const res = await fetch(`${url}/save-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: filePath, data }),
  });
  return res.json();
}

export async function searchPrompts(root: string, query: string): Promise<{ ok: boolean; results?: object[]; error?: string }> {
  const url = await findAgentUrl();
  if (!url) return { ok: false, error: '에이전트가 실행중이지 않습니다.' };
  const res = await fetch(`${url}/search-prompts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ root, query }),
  });
  return res.json();
}

export async function openFolder(folderPath: string): Promise<{ ok: boolean; error?: string }> {
  const url = await findAgentUrl();
  if (!url) return { ok: false, error: '에이전트가 실행중이지 않습니다.' };
  const res = await fetch(`${url}/open-folder?path=${encodeURIComponent(folderPath)}`);
  return res.json();
}
