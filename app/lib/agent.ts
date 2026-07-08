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

export async function savePreset(projPath: string, filename: string, data: object): Promise<{ ok: boolean; path?: string; error?: string }> {
  const url = await findAgentUrl();
  if (!url) return { ok: false, error: '에이전트가 실행중이지 않습니다.' };
  const res = await fetch(`${url}/save-preset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proj_path: projPath, filename, data }),
  });
  return res.json();
}

export async function listPresets(projPath: string): Promise<{ ok: boolean; presets?: { filename: string; root: string; data: Record<string, unknown> }[]; error?: string }> {
  const url = await findAgentUrl();
  if (!url) return { ok: false, error: '에이전트가 실행중이지 않습니다.' };
  const res = await fetch(`${url}/list-presets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proj_path: projPath }),
  });
  return res.json();
}

export async function createProject(parentPath: string, code: string): Promise<{ ok: boolean; path?: string; error?: string }> {
  const url = await findAgentUrl();
  if (!url) return { ok: false, error: '에이전트가 실행중이지 않습니다.' };
  const res = await fetch(`${url}/create-project`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parent_path: parentPath, code }),
  });
  return res.json();
}

export async function getImage(filePath: string): Promise<{ ok: boolean; data?: string; error?: string }> {
  const url = await findAgentUrl();
  if (!url) return { ok: false, error: '에이전트가 실행중이지 않습니다.' };
  const res = await fetch(`${url}/get-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: filePath }),
  });
  return res.json();
}

export async function pickFile(initialDir?: string): Promise<{ ok: boolean; path?: string; name?: string; data?: Record<string, unknown>; error?: string }> {
  const url = await findAgentUrl();
  if (!url) return { ok: false, error: '에이전트가 실행중이지 않습니다.' };
  const res = await fetch(`${url}/pick-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initial_dir: initialDir ?? '~' }),
  });
  return res.json();
}

export async function pickFolder(): Promise<{ ok: boolean; path?: string; name?: string; error?: string }> {
  const url = await findAgentUrl();
  if (!url) return { ok: false, error: '에이전트가 실행중이지 않습니다.' };
  const res = await fetch(`${url}/pick-folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  return res.json();
}

export async function nextVersion(folder: string, base: string): Promise<{ ok: boolean; next_name?: string; sub?: number; error?: string }> {
  const url = await findAgentUrl();
  if (!url) return { ok: false, error: '에이전트가 실행중이지 않습니다.' };
  const res = await fetch(`${url}/next-version`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder, base }),
  });
  return res.json();
}

export async function checkFile(filePath: string): Promise<{ ok: boolean; exists?: boolean; error?: string }> {
  const url = await findAgentUrl();
  if (!url) return { ok: false, error: '에이전트가 실행중이지 않습니다.' };
  const res = await fetch(`${url}/check-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: filePath }),
  });
  return res.json();
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

export async function saveSettings(_root = '', settings: object, isPrivate = false): Promise<{ ok: boolean; error?: string }> {
  const url = await findAgentUrl();
  if (!url) return { ok: false, error: '에이전트가 실행중이지 않습니다.' };
  const res = await fetch(`${url}/save-settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings, private: isPrivate }),
  });
  return res.json();
}

export async function loadSettings(_root = ''): Promise<{ ok: boolean; data?: { settings?: Record<string, unknown>; private?: Record<string, unknown> }; error?: string }> {
  const url = await findAgentUrl();
  if (!url) return { ok: false, error: '에이전트가 실행중이지 않습니다.' };
  const res = await fetch(`${url}/load-settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  return res.json();
}

export async function fetchModels(apiKey: string): Promise<{ ok: boolean; models?: string[]; image_models?: string[]; error?: string }> {
  const url = await findAgentUrl();
  if (!url) return { ok: false, error: '에이전트가 실행중이지 않습니다.' };
  const res = await fetch(`${url}/fetch-models`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey }),
  });
  return res.json();
}

export async function generatePrompt(apiKey: string, zones: Record<string, string>, workType: string, model = 'gpt-4o-mini'): Promise<{ ok: boolean; prompt_en?: string; prompt_ko?: string; error?: string }> {
  const url = await findAgentUrl();
  if (!url) return { ok: false, error: '에이전트가 실행중이지 않습니다.' };
  const res = await fetch(`${url}/generate-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, zones, work_type: workType, model }),
  });
  return res.json();
}

export async function generateImage(apiKey: string, prompt: string, savePath: string, model = 'dall-e-3'): Promise<{ ok: boolean; saved?: string; error?: string }> {
  const url = await findAgentUrl();
  if (!url) return { ok: false, error: '에이전트가 실행중이지 않습니다.' };
  const res = await fetch(`${url}/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, prompt, save_path: savePath, model }),
  });
  return res.json();
}

export async function scanAssets(root: string): Promise<{ ok: boolean; assets?: Record<string, {name: string; versions: string[]}[]>; error?: string }> {
  const url = await findAgentUrl();
  if (!url) return { ok: false, error: '에이전트가 실행중이지 않습니다.' };
  const res = await fetch(`${url}/scan-assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ root }),
  });
  return res.json();
}

export async function scanShots(root: string): Promise<{ ok: boolean; shots?: Record<string, Record<string, {cut: string; has: boolean}[]>>; error?: string }> {
  const url = await findAgentUrl();
  if (!url) return { ok: false, error: '에이전트가 실행중이지 않습니다.' };
  const res = await fetch(`${url}/scan-shots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ root }),
  });
  return res.json();
}

export async function openFolder(folderPath: string): Promise<{ ok: boolean; error?: string }> {
  const url = await findAgentUrl();
  if (!url) return { ok: false, error: '에이전트가 실행중이지 않습니다.' };
  const res = await fetch(`${url}/open-folder?path=${encodeURIComponent(folderPath)}`);
  return res.json();
}

export async function openFile(filePath: string): Promise<{ ok: boolean; error?: string }> {
  const url = await findAgentUrl();
  if (!url) return { ok: false, error: '에이전트가 실행중이지 않습니다.' };
  const res = await fetch(`${url}/open-file?path=${encodeURIComponent(filePath)}`);
  return res.json();
}
