import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface StoryLine {
  speaker: string;
  text: string;
  action?: string;
  choices?: { text: string; action: string }[]; // Only present at the end of a chapter in interactive mode
}

interface SavedStory {
  id: string;
  createdAt: number;
  title: string;
  characterIds: string[];
  arenaId: string;
  arenaName: string;
  arenaImg: string;
  theme: string;
  isInteractive: boolean;
  isFinished?: boolean;
  script: StoryLine[]; // Flattened sequence of all lines generated so far
}

type AudioFormat = 'pcm' | 'wav';

interface StoryAudioEntry {
  id: string;        // `${storyId}__${lineIndex}__${voiceName}`
  storyId: string;
  lineIndex: number;
  voiceName: string;
  blob: Blob;
  format: AudioFormat;
}

interface StoryDB extends DBSchema {
  stories: {
    key: string;
    value: SavedStory;
    indexes: { byDate: number };
  };
  story_audio: {
    key: string;
    value: StoryAudioEntry;
    indexes: { byStory: string };
  };
}

let _db: IDBPDatabase<StoryDB> | null = null;

async function getDB() {
  if (_db) return _db;
  _db = await openDB<StoryDB>('mayron-stories', 1, {
    upgrade(db) {
      const stories = db.createObjectStore('stories', { keyPath: 'id' });
      stories.createIndex('byDate', 'createdAt');
      const audio = db.createObjectStore('story_audio', { keyPath: 'id' });
      audio.createIndex('byStory', 'storyId');
    },
  });
  return _db;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

async function apiPost(path: string, body: unknown): Promise<Response | null> {
  try {
    return await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.warn('[story-store] API POST failed:', e);
    return null;
  }
}

async function apiGet(path: string): Promise<Response | null> {
  try {
    return await fetch(`${API_BASE}${path}`);
  } catch (e) {
    console.warn('[story-store] API GET failed:', e);
    return null;
  }
}

export type { SavedStory, StoryLine };

export async function saveStory(story: Omit<SavedStory, 'id' | 'createdAt'>): Promise<string> {
  const db = await getDB();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const full: SavedStory = { ...story, id, createdAt: Date.now() };

  await db.put('stories', full);
  apiPost('/api/stories', full).catch(() => {});
  return id;
}

export async function updateStory(story: SavedStory): Promise<void> {
  const db = await getDB();
  await db.put('stories', story);
  apiPost('/api/stories', story).catch(() => {});
}

export async function listStories(): Promise<SavedStory[]> {
  const res = await apiGet('/api/stories');
  if (res && res.ok) {
    try {
      const serverStories: SavedStory[] = await res.json();
      const db = await getDB();
      const localIds = new Set((await db.getAllKeys('stories')));
      for (const s of serverStories) {
        if (!localIds.has(s.id)) await db.put('stories', s);
      }
      const allLocal = await db.getAllFromIndex('stories', 'byDate');
      const serverIds = new Set(serverStories.map(s => s.id));
      for (const s of allLocal) {
        if (!serverIds.has(s.id)) {
          apiPost('/api/stories', s).catch(() => {});
          serverStories.push(s);
        }
      }
      serverStories.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return serverStories;
    } catch { }
  }

  const db = await getDB();
  const all = await db.getAllFromIndex('stories', 'byDate');
  return all.reverse();
}

export async function getStory(id: string): Promise<SavedStory | undefined> {
  const db = await getDB();
  const local = await db.get('stories', id);
  if (local) return local;

  const res = await apiGet(`/api/stories/${encodeURIComponent(id)}`);
  if (res && res.ok) {
    try {
      const story: SavedStory = await res.json();
      await db.put('stories', story);
      return story;
    } catch { }
  }
  return undefined;
}

export async function saveStoryAudio(
  storyId: string,
  lineIndex: number,
  voiceName: string,
  blob: Blob,
  format: AudioFormat = 'pcm',
): Promise<void> {
  const db = await getDB();
  await db.put('story_audio', {
    id: `${storyId}__${lineIndex}__${voiceName}`,
    storyId,
    lineIndex,
    voiceName,
    blob,
    format,
  });

  try {
    const safeVoice = encodeURIComponent(voiceName);
    const buffer = await blob.arrayBuffer();
    fetch(`${API_BASE}/api/stories/${storyId}/audio/${lineIndex}/${safeVoice}?format=${format}`, {
      method: 'POST',
      body: buffer,
      headers: { 'Content-Type': 'application/octet-stream' }
    }).catch(() => {});
  } catch { }
}

export async function getStoryAudio(
  storyId: string,
  lineIndex: number,
  voiceName: string,
): Promise<{ blob: Blob; format: AudioFormat } | undefined> {
  const db = await getDB();
  const id = `${storyId}__${lineIndex}__${voiceName}`;
  const entry = await db.get('story_audio', id);
  if (entry) return { blob: entry.blob, format: entry.format ?? 'pcm' };

  try {
    const safeVoice = encodeURIComponent(voiceName);
    const res = await fetch(`${API_BASE}/api/stories/${storyId}/audio/${lineIndex}/${safeVoice}`);
    if (res.ok) {
      const blob = await res.blob();
      const format = (res.headers.get('X-Audio-Format') as AudioFormat) ?? 'pcm';
      await db.put('story_audio', { id, storyId, lineIndex, voiceName, blob, format });
      return { blob, format };
    }
  } catch { }
  return undefined;
}
