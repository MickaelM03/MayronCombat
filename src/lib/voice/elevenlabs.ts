// ElevenLabs voice cloning — appelé via le proxy serveur (qui détient la clé API).
// Le serveur lit ELEVENLABS_API_KEY + scripts/elevenlabs_voices.json (mapping charId→voiceId).
// Renvoie un Blob MP3 (décodable par decodeAudioData) ou null si :
//  - Pas de clé API configurée côté serveur (401)
//  - Pas de voiceId mappé pour ce personnage (404)
//  - Quota atteint, ou erreur serveur (5xx/429)

const ENDPOINT = '/api/tts/elevenlabs';
const STATUS_ENDPOINT = '/api/tts/elevenlabs/status';
const TIMEOUT_MS = 20_000;

let cachedStatus: { enabled: boolean; voiceCount: number } | null = null;
let quotaExhausted = false;

export async function fetchElevenLabsStatus(): Promise<{ enabled: boolean; voiceCount: number }> {
  try {
    const res = await fetch(STATUS_ENDPOINT, { signal: AbortSignal.timeout(3_000) });
    if (!res.ok) return { enabled: false, voiceCount: 0 };
    const data = await res.json();
    cachedStatus = data;
    return data;
  } catch {
    return { enabled: false, voiceCount: 0 };
  }
}

export function isElevenLabsEnabled(): boolean {
  return !!cachedStatus?.enabled && !quotaExhausted;
}

export async function tryElevenLabsAudio(text: string, charId: string | undefined): Promise<Blob | null> {
  if (!charId) return null;
  if (quotaExhausted) return null;
  // If we already know there are no voice mappings, every call would 404 —
  // skip the network round-trip entirely (saves ~50ms per line × dozens of lines).
  if (cachedStatus && (!cachedStatus.enabled || cachedStatus.voiceCount === 0)) return null;

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, characterId: charId }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (res.status === 401) {
      // No API key configured — disable for the session
      console.info('[voice] ElevenLabs disabled (no API key)');
      return null;
    }
    if (res.status === 404) return null;  // Pas de voiceId pour ce perso
    if (res.status === 429) {
      // Quota épuisé — n'essayer plus pendant cette session
      quotaExhausted = true;
      console.warn('[voice] ElevenLabs quota epuise pour ce mois → fallback XTTS');
      return null;
    }
    if (!res.ok) {
      console.warn(`[voice] ElevenLabs ${res.status} → fallback`);
      return null;
    }
    return await res.blob();
  } catch (err) {
    console.warn('[voice] ElevenLabs network error → fallback', err);
    return null;
  }
}

/** Reset (par exemple après changement de clé). */
export function resetElevenLabsState(): void {
  cachedStatus = null;
  quotaExhausted = false;
}
