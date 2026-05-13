// Hugging Face Inference API — TTS via modèles open source.
// Modèle par défaut côté serveur : facebook/mms-tts-fra (Meta MMS, français).
// Gratuit mais rate-limité ; le premier appel à froid peut prendre 10-30s.

const ENDPOINT = '/api/tts/huggingface';
const STATUS_ENDPOINT = '/api/tts/huggingface/status';
// Timeout long pour couvrir le cold-start du modèle côté HF.
const TIMEOUT_MS = 75_000;

let cachedStatus: { enabled: boolean; model?: string } | null = null;
// Back-off après rate-limit (HF est sévère).
let rateLimitedUntil = 0;

export async function fetchHFStatus(): Promise<{ enabled: boolean; model?: string }> {
  try {
    const res = await fetch(STATUS_ENDPOINT, { signal: AbortSignal.timeout(3_000) });
    if (!res.ok) return { enabled: false };
    const data = await res.json();
    cachedStatus = data;
    return data;
  } catch {
    return { enabled: false };
  }
}

export function isHFEnabled(): boolean {
  return !!cachedStatus?.enabled && Date.now() >= rateLimitedUntil;
}

export function resetHFState(): void {
  cachedStatus = null;
  rateLimitedUntil = 0;
}

export async function tryHuggingFaceAudio(text: string): Promise<Blob | null> {
  if (!text?.trim()) return null;
  if (Date.now() < rateLimitedUntil) return null;
  if (cachedStatus && !cachedStatus.enabled) return null;

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (res.status === 401) {
      console.info('[voice] Hugging Face — pas de clé API');
      return null;
    }
    if (res.status === 429) {
      rateLimitedUntil = Date.now() + 60_000;
      console.warn('[voice] Hugging Face rate-limited → back-off 60s');
      return null;
    }
    if (!res.ok) {
      console.warn(`[voice] Hugging Face ${res.status} → fallback`);
      return null;
    }
    return await res.blob();
  } catch (err) {
    console.warn('[voice] Hugging Face network/timeout error → fallback', err);
    return null;
  }
}
