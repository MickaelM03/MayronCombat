// XTTS v2 local voice cloning provider
// Requires scripts/tts_server.py running on localhost:5500
// Falls back silently (returns null) when server is unavailable.

const XTTS_ENDPOINT = '/api/tts/xtts';
// XTTS sur CPU = ~25s/ligne ; le premier appel inclut le chargement du modèle (~65s).
// Le timeout doit couvrir le pire cas pour éviter NS_BINDING_ABORTED.
const TIMEOUT_MS = 120_000;

// null = unknown, number = retry after this timestamp, true = confirmed available
let serverState: boolean | null | number = null;

function canTry(): boolean {
  if (serverState === false) return false;           // explicitly disabled (future use)
  if (serverState === true || serverState === null) return true;
  if (typeof serverState === 'number') return Date.now() >= serverState; // timed retry
  return true;
}

export async function tryXttsAudio(text: string, charId: string | undefined): Promise<Blob | null> {
  if (!charId) return null;
  if (!canTry()) return null;

  try {
    const res = await fetch(XTTS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, characterId: charId, language: 'fr' }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (res.status === 503) {
      // Python server not started or still loading — retry in 45s
      serverState = Date.now() + 45_000;
      console.info('[voice] XTTS loading/unavailable → Piper fallback (retry in 45s)');
      return null;
    }

    if (res.status === 404) {
      // No voice sample for this character — skip silently, don't affect server state
      console.info(`[voice] XTTS: no sample for '${charId}' → Piper fallback`);
      return null;
    }

    if (!res.ok) {
      console.warn(`[voice] XTTS error ${res.status} → Piper fallback`);
      return null;
    }

    serverState = true;
    const blob = await res.blob();
    console.info(`[voice] tier=xtts char=${charId}`);
    return blob;
  } catch {
    // Network error (server not started) — retry in 30s instead of disabling permanently
    serverState = Date.now() + 30_000;
    console.info('[voice] XTTS unreachable → Piper fallback (retry in 30s)');
    return null;
  }
}

/** Reset the availability cache (e.g. user manually starts the server mid-session). */
export function resetXttsCache(): void {
  serverState = null;
}

/** True if the server has been confirmed available this session. */
export function isXttsAvailable(): boolean {
  return serverState === true;
}

/**
 * Direct synthesis call (bypasses back-off cache and tolerates a cold model).
 * Designed for pre-generation, where we want each line to keep trying even
 * if a previous one timed out.
 *
 * Uses a longer timeout (180s) to cover the cold-start window (~100s on CPU),
 * and supports a single retry on transient failure.
 */
export async function xttsSynthesize(
  text: string,
  charId: string,
  opts: { timeoutMs?: number; retries?: number } = {},
): Promise<Blob | null> {
  const timeoutMs = opts.timeoutMs ?? 180_000;
  const retries = opts.retries ?? 1;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(XTTS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, characterId: charId, language: 'fr' }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (res.ok) {
        serverState = true;
        return await res.blob();
      }

      if (res.status === 404) return null;       // pas de sample pour ce perso
      if (res.status === 503 && attempt < retries) {
        // Serveur encore en chargement — pause puis retry
        await new Promise(r => setTimeout(r, 5_000));
        continue;
      }
      return null;
    } catch (err) {
      // Timeout / réseau — un nouveau coup pour rattraper un cold start
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 2_000));
        continue;
      }
      return null;
    }
  }
  return null;
}
