// Shared API key storage — server-backed so a key entered on the VPS is
// available to every browser that connects. Falls back to localStorage when
// the server is unreachable (offline / dev without backend).

const API_BASE = import.meta.env.VITE_API_URL || '';
const ENDPOINT = `${API_BASE}/api/settings/keys`;

export type StoredKeys = {
  apiKey?: string;
  groqKey?: string;
  openaiKey?: string;
  deepInfraKey?: string;
  deepseekKey?: string;
};

export async function fetchServerKeys(): Promise<StoredKeys> {
  try {
    const res = await fetch(ENDPOINT, { cache: 'no-store' });
    if (!res.ok) return {};
    return (await res.json()) as StoredKeys;
  } catch {
    return {};
  }
}

let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPayload: StoredKeys = {};

export function saveServerKey(field: keyof StoredKeys, value: string): void {
  pendingPayload[field] = value;
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    const body = pendingPayload;
    pendingPayload = {};
    pendingTimer = null;
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {
      // Best-effort — localStorage already persisted the value.
    });
  }, 400);
}
