// Edge TTS provider — voix Microsoft Read-Aloud (gratuit illimité, ~15 voix FR).
// Pas de clé API. Le proxy serveur (/api/tts/edge) ouvre une WebSocket vers Microsoft.
//
// Renvoie un Blob MP3 décodable par AudioContext.decodeAudioData, ou null si :
//  - Texte vide
//  - Serveur indisponible (back-off temporel comme XTTS)
//  - 5xx upstream

const ENDPOINT = '/api/tts/edge';
const STATUS_ENDPOINT = '/api/tts/edge/status';
const TIMEOUT_MS = 20_000;

// Voix Edge françaises (Neural). 'desc' = hint pour l'UI ; rester aligné avec le mapping côté serveur.
export const EDGE_VOICES = [
  { id: 'fr-FR-DeniseNeural',               gender: 'F' as const, desc: 'Femme, posée' },
  { id: 'fr-FR-VivienneMultilingualNeural', gender: 'F' as const, desc: 'Femme, chaleureuse' },
  { id: 'fr-FR-EloiseNeural',               gender: 'F' as const, desc: 'Fille' },
  { id: 'fr-FR-HenriNeural',                gender: 'M' as const, desc: 'Homme, narrateur' },
  { id: 'fr-FR-RemyMultilingualNeural',     gender: 'M' as const, desc: 'Homme, expressif' },
];

let cachedStatus: { enabled: boolean; voiceCount: number } | null = null;
// Back-off temporel après échec serveur (même pattern que xtts.ts).
let unavailableUntil = 0;

export async function fetchEdgeStatus(): Promise<{ enabled: boolean; voiceCount: number }> {
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

export function isEdgeEnabled(): boolean {
  return !!cachedStatus?.enabled && Date.now() >= unavailableUntil;
}

export function resetEdgeState(): void {
  cachedStatus = null;
  unavailableUntil = 0;
}

export async function tryEdgeAudio(text: string, voiceId?: string): Promise<Blob | null> {
  if (!text?.trim()) return null;
  if (Date.now() < unavailableUntil) return null;

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId: voiceId || 'fr-FR-DeniseNeural' }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (res.status === 503) {
      unavailableUntil = Date.now() + 30_000;
      console.warn('[voice] Edge TTS 503 → back-off 30s');
      return null;
    }
    if (!res.ok) {
      console.warn(`[voice] Edge TTS ${res.status} → fallback`);
      return null;
    }
    const blob = await res.blob();
    if (blob.size === 0) {
      console.warn(`[voice] Edge TTS returned 0 bytes → fallback`);
      return null;
    }
    return blob;
  } catch (err) {
    unavailableUntil = Date.now() + 30_000;
    console.warn('[voice] Edge TTS network error → back-off 30s', err);
    return null;
  }
}
