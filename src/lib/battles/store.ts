import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { NarrativeMode } from './prompts';

interface SavedBattle {
  id: string;
  createdAt: number;
  p1Id: string;
  p1Name: string;
  p1Img: string;
  p1Voice?: string;
  p1VoiceStyle?: string;
  p2Id: string;
  p2Name: string;
  p2Img: string;
  p2Voice?: string;
  p2VoiceStyle?: string;
  arenaId: string;
  arenaName: string;
  arenaImg: string;
  duration: number;
  narrativeMode: NarrativeMode;
  script: unknown;
  winner: string;
}

type AudioFormat = 'pcm' | 'wav';

interface AudioEntry {
  id: string;        // `${battleId}__${lineIndex}__${voiceName}`
  battleId: string;
  lineIndex: number;
  voiceName: string;
  blob: Blob;
  format: AudioFormat;
}

interface CombatDB extends DBSchema {
  battles: {
    key: string;
    value: SavedBattle;
    indexes: { byDate: number };
  };
  audio: {
    key: string;
    value: AudioEntry;
    indexes: { byBattle: string };
  };
}

let _db: IDBPDatabase<CombatDB> | null = null;

async function getDB() {
  if (_db) return _db;
  _db = await openDB<CombatDB>('mayron-combat', 3, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const battles = db.createObjectStore('battles', { keyPath: 'id' });
        battles.createIndex('byDate', 'createdAt');
        const audio = db.createObjectStore('audio', { keyPath: 'id' });
        audio.createIndex('byBattle', 'battleId');
      }
      if (oldVersion >= 1 && oldVersion < 3 && db.objectStoreNames.contains('audio')) {
        // v2: purge cache pollué par préfixe "Nom: " envoyé à Gemini TTS
        // v3: nouvelle clé `<id>__<idx>__<voiceName>` + champ format
        db.deleteObjectStore('audio');
        const audio = db.createObjectStore('audio', { keyPath: 'id' });
        audio.createIndex('byBattle', 'battleId');
      }
    },
  });
  return _db;
}

// ─── API URL ────────────────────────────────────────────────
// In production the API runs on the same host (or a VPS URL).
// In dev it's localhost:3001. Override with VITE_API_URL env var.
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

async function apiPost(path: string, body: unknown): Promise<Response | null> {
  try {
    return await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.warn('[store] API POST failed (offline?):', e);
    return null;
  }
}

async function apiGet(path: string): Promise<Response | null> {
  try {
    return await fetch(`${API_BASE}${path}`);
  } catch (e) {
    console.warn('[store] API GET failed (offline?):', e);
    return null;
  }
}

async function apiDelete(path: string): Promise<Response | null> {
  try {
    return await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('[store] API DELETE failed (offline?):', e);
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────────

export type { SavedBattle };

export async function saveBattle(battle: Omit<SavedBattle, 'id' | 'createdAt'>): Promise<string> {
  const db = await getDB();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const full: SavedBattle = { ...battle, id, createdAt: Date.now() };

  // Save to local IndexedDB (instant, works offline)
  await db.put('battles', full);

  // Sync to server (fire-and-forget, non-blocking)
  apiPost('/api/battles', full).catch(() => {});

  return id;
}

export async function listBattles(): Promise<SavedBattle[]> {
  // Try server first (source of truth — shared across browsers)
  const res = await apiGet('/api/battles');
  if (res && res.ok) {
    try {
      const serverBattles: SavedBattle[] = await res.json();

      // Merge: sync server battles into local IndexedDB
      const db = await getDB();
      const localIds = new Set((await db.getAllKeys('battles')));
      for (const b of serverBattles) {
        if (!localIds.has(b.id)) {
          await db.put('battles', b);
        }
      }

      // Also push local-only battles to server (offline-created ones)
      const allLocal = await db.getAllFromIndex('battles', 'byDate');
      const serverIds = new Set(serverBattles.map(b => b.id));
      for (const b of allLocal) {
        if (!serverIds.has(b.id)) {
          apiPost('/api/battles', b).catch(() => {});
          serverBattles.push(b);
        }
      }

      // Return merged, sorted descending
      serverBattles.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return serverBattles;
    } catch {
      // JSON parse failed — fall through to local
    }
  }

  // Fallback: local IndexedDB
  const db = await getDB();
  const all = await db.getAllFromIndex('battles', 'byDate');
  return all.reverse();
}

export async function getBattle(id: string): Promise<SavedBattle | undefined> {
  // Try local first (faster)
  const db = await getDB();
  const local = await db.get('battles', id);
  if (local) return local;

  // Fallback: server
  const res = await apiGet(`/api/battles/${encodeURIComponent(id)}`);
  if (res && res.ok) {
    try {
      const battle: SavedBattle = await res.json();
      // Cache locally
      await db.put('battles', battle);
      return battle;
    } catch { /* ignore */ }
  }

  return undefined;
}

export async function deleteBattle(id: string): Promise<void> {
  const db = await getDB();
  const audioKeys = await db.getAllKeysFromIndex('audio', 'byBattle', id);
  const tx = db.transaction(['battles', 'audio'], 'readwrite');
  await tx.objectStore('battles').delete(id);
  for (const key of audioKeys) {
    await tx.objectStore('audio').delete(key);
  }
  await tx.done;

  // Also delete on server
  apiDelete(`/api/battles/${encodeURIComponent(id)}`).catch(() => {});
}

export async function saveAudioBlob(
  battleId: string,
  lineIndex: number,
  voiceName: string,
  blob: Blob,
  format: AudioFormat = 'pcm',
): Promise<void> {
  const db = await getDB();
  await db.put('audio', {
    id: `${battleId}__${lineIndex}__${voiceName}`,
    battleId,
    lineIndex,
    voiceName,
    blob,
    format,
  });
}

export async function getAudioBlob(
  battleId: string,
  lineIndex: number,
  voiceName: string,
): Promise<{ blob: Blob; format: AudioFormat } | undefined> {
  const db = await getDB();
  const entry = await db.get('audio', `${battleId}__${lineIndex}__${voiceName}`);
  if (!entry) return undefined;
  return { blob: entry.blob, format: entry.format ?? 'pcm' };
}
