// Google Cloud Text-to-Speech — voix Neural2 / WaveNet / Studio (séparé de Gemini).
// Clé API stockée côté serveur (process.env.GOOGLE_CLOUD_TTS_API_KEY).
// Free tier : 1 000 000 chars/mois Neural2 — largement suffisant pour cette app.
//
// Renvoie un Blob MP3 ou null.

const ENDPOINT = '/api/tts/gcloud';
const STATUS_ENDPOINT = '/api/tts/gcloud/status';
const TIMEOUT_MS = 18_000;

// Voix françaises principales. Liste complète :
// https://cloud.google.com/text-to-speech/docs/voices
export const GCLOUD_VOICES = [
  { id: 'fr-FR-Neural2-A', gender: 'F' as const, desc: 'Neural2 A — claire' },
  { id: 'fr-FR-Neural2-B', gender: 'M' as const, desc: 'Neural2 B — posé' },
  { id: 'fr-FR-Neural2-C', gender: 'F' as const, desc: 'Neural2 C — douce' },
  { id: 'fr-FR-Neural2-D', gender: 'M' as const, desc: 'Neural2 D — grave' },
  { id: 'fr-FR-Neural2-E', gender: 'F' as const, desc: 'Neural2 E — vive' },
  { id: 'fr-FR-Wavenet-A', gender: 'F' as const, desc: 'Wavenet A — classique' },
  { id: 'fr-FR-Wavenet-B', gender: 'M' as const, desc: 'Wavenet B — classique' },
  { id: 'fr-FR-Studio-A',  gender: 'F' as const, desc: 'Studio A — premium' },
  { id: 'fr-FR-Studio-D',  gender: 'M' as const, desc: 'Studio D — premium' },
];

let cachedStatus: { enabled: boolean; voiceCount: number } | null = null;
let quotaExhausted = false;

export async function fetchGCloudStatus(): Promise<{ enabled: boolean; voiceCount: number }> {
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

export function isGCloudEnabled(): boolean {
  return !!cachedStatus?.enabled && !quotaExhausted;
}

export function resetGCloudState(): void {
  cachedStatus = null;
  quotaExhausted = false;
}

export async function tryGCloudAudio(text: string, voiceId?: string): Promise<Blob | null> {
  if (!text?.trim()) return null;
  if (quotaExhausted) return null;
  // Skip si on sait qu'il n'y a pas de clé API côté serveur.
  if (cachedStatus && !cachedStatus.enabled) return null;

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId: voiceId || 'fr-FR-Neural2-A' }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (res.status === 401) {
      console.info('[voice] Google Cloud TTS — pas de clé API');
      return null;
    }
    if (res.status === 429) {
      quotaExhausted = true;
      console.warn('[voice] Google Cloud TTS quota dépassé → fallback');
      return null;
    }
    if (!res.ok) {
      console.warn(`[voice] Google Cloud TTS ${res.status} → fallback`);
      return null;
    }
    return await res.blob();
  } catch (err) {
    console.warn('[voice] Google Cloud TTS network error → fallback', err);
    return null;
  }
}
