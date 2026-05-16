import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || process.env.API_PORT || '3061', 10);

// Data directory for persistent storage
const DATA_DIR = path.join(__dirname, 'data', 'battles');
const AUDIO_DIR = path.join(DATA_DIR, 'audio');
const STORY_DIR = path.join(__dirname, 'data', 'stories');
const STORY_AUDIO_DIR = path.join(STORY_DIR, 'audio');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(AUDIO_DIR, { recursive: true });
fs.mkdirSync(STORY_DIR, { recursive: true });
fs.mkdirSync(STORY_AUDIO_DIR, { recursive: true });

// Middleware
app.use(express.json({ limit: '5mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

// CORS — allow Vite dev server
app.use((_req, res, next) => {
  console.log(`[API] ${_req.method} ${_req.path}`);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ─── Helpers ────────────────────────────────────────────────

function battlePath(id: string): string {
  // Sanitize ID to avoid path traversal
  const safe = id.replace(/[^a-zA-Z0-9_\-]/g, '');
  return path.join(DATA_DIR, `${safe}.json`);
}

function readBattle(id: string): any | null {
  const p = battlePath(id);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function writeBattle(battle: any): void {
  fs.writeFileSync(battlePath(battle.id), JSON.stringify(battle, null, 2), 'utf-8');
}

function storyPath(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_\-]/g, '');
  return path.join(STORY_DIR, `${safe}.json`);
}

function readStory(id: string): any | null {
  const p = storyPath(id);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function writeStory(story: any): void {
  fs.writeFileSync(storyPath(story.id), JSON.stringify(story, null, 2), 'utf-8');
}

// ─── Routes ─────────────────────────────────────────────────

// List all battles (sorted by date descending)
app.get('/api/battles', (_req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    const battles = files
      .map(f => {
        try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf-8')); }
        catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    res.json(battles);
  } catch (err) {
    console.error('GET /api/battles error:', err);
    res.status(500).json({ error: 'Failed to list battles' });
  }
});

// Get a single battle
app.get('/api/battles/:id', (req, res) => {
  const battle = readBattle(req.params.id);
  if (!battle) return res.status(404).json({ error: 'Battle not found' });
  res.json(battle);
});

// Create / update a battle
app.post('/api/battles', (req, res) => {
  try {
    const battle = req.body;
    if (!battle.id) {
      return res.status(400).json({ error: 'Missing battle id' });
    }
    writeBattle(battle);
    res.status(201).json({ ok: true, id: battle.id });
  } catch (err) {
    console.error('POST /api/battles error:', err);
    res.status(500).json({ error: 'Failed to save battle' });
  }
});

// Delete a battle
app.delete('/api/battles/:id', (req, res) => {
  const id = req.params.id;
  const p = battlePath(id);
  if (fs.existsSync(p)) fs.unlinkSync(p);
  
  // Clean up associated audio files
  try {
    const files = fs.readdirSync(AUDIO_DIR);
    const prefix = `${id}__`;
    for (const f of files) {
      if (f.startsWith(prefix)) {
        fs.unlinkSync(path.join(AUDIO_DIR, f));
      }
    }
  } catch (err) {
    console.error(`Failed to clean up audio for battle ${id}:`, err);
  }

  res.json({ ok: true });
});

// --- STORIES ---

app.get('/api/stories', (_req, res) => {
  try {
    const files = fs.readdirSync(STORY_DIR).filter(f => f.endsWith('.json'));
    const stories = files
      .map(f => {
        try { return JSON.parse(fs.readFileSync(path.join(STORY_DIR, f), 'utf-8')); }
        catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    res.json(stories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list stories' });
  }
});

app.get('/api/stories/:id', (req, res) => {
  const story = readStory(req.params.id);
  if (!story) return res.status(404).json({ error: 'Story not found' });
  res.json(story);
});

app.post('/api/stories', (req, res) => {
  try {
    const story = req.body;
    if (!story.id) return res.status(400).json({ error: 'Missing story id' });
    console.log(`[STORY] Saving story: ${story.id} (${story.title})`);
    writeStory(story);
    res.status(201).json({ ok: true, id: story.id });
  } catch (err) {
    console.error('POST /api/stories error:', err);
    res.status(500).json({ error: 'Failed to save story' });
  }
});

app.delete('/api/stories/:id', (req, res) => {
  const id = req.params.id;
  const p = storyPath(id);
  if (fs.existsSync(p)) fs.unlinkSync(p);
  try {
    const files = fs.readdirSync(STORY_AUDIO_DIR);
    const prefix = `${id}__`;
    for (const f of files) {
      if (f.startsWith(prefix)) fs.unlinkSync(path.join(STORY_AUDIO_DIR, f));
    }
  } catch {}
  res.json({ ok: true });
});

// ─── Audio Cache ────────────────────────────────────────────

// Get an audio file
app.get('/api/battles/:id/audio/:lineIndex/:voiceName', (req, res) => {
  const { id, lineIndex, voiceName } = req.params;
  const safeId = id.replace(/[^a-zA-Z0-9_\-]/g, '');
  const safeLine = lineIndex.replace(/[^0-9]/g, '');
  const safeVoice = voiceName.replace(/[^a-zA-Z0-9_\-]/g, '');
  
  const prefix = `${safeId}__${safeLine}__${safeVoice}`;
  
  try {
    const files = fs.readdirSync(AUDIO_DIR);
    const file = files.find(f => f.startsWith(prefix));
    
    if (!file) {
      return res.status(404).json({ error: 'Audio not found' });
    }
    
    const format = file.endsWith('.wav') ? 'wav' : 'pcm';
    res.set('X-Audio-Format', format);
    // Determine mime type, mostly for browser direct access (if needed)
    res.set('Content-Type', 'application/octet-stream');
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache forever
    
    fs.createReadStream(path.join(AUDIO_DIR, file)).pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read audio' });
  }
});

// Save an audio file
app.post('/api/battles/:id/audio/:lineIndex/:voiceName', (req, res) => {
  const { id, lineIndex, voiceName } = req.params;
  const format = req.query.format === 'wav' ? 'wav' : 'pcm';
  
  const safeId = id.replace(/[^a-zA-Z0-9_\-]/g, '');
  const safeLine = lineIndex.replace(/[^0-9]/g, '');
  const safeVoice = voiceName.replace(/[^a-zA-Z0-9_\-]/g, '');
  
  if (!Buffer.isBuffer(req.body)) {
    return res.status(400).json({ error: 'Body must be raw binary data' });
  }
  
  const filePath = path.join(AUDIO_DIR, `${safeId}__${safeLine}__${safeVoice}.${format}`);
  
  try {
    fs.writeFileSync(filePath, req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to save audio:', err);
    res.status(500).json({ error: 'Failed to save audio' });
  }
});

// --- STORY AUDIO ---

app.get('/api/stories/:id/audio/:lineIndex/:voiceName', (req, res) => {
  const { id, lineIndex, voiceName } = req.params;
  const safeId = id.replace(/[^a-zA-Z0-9_\-]/g, '');
  const safeLine = lineIndex.replace(/[^0-9]/g, '');
  const safeVoice = voiceName.replace(/[^a-zA-Z0-9_\-]/g, '');
  const prefix = `${safeId}__${safeLine}__${safeVoice}`;
  
  try {
    const files = fs.readdirSync(STORY_AUDIO_DIR);
    const file = files.find(f => f.startsWith(prefix));
    if (!file) return res.status(404).json({ error: 'Audio not found' });
    const format = file.endsWith('.wav') ? 'wav' : 'pcm';
    res.set('X-Audio-Format', format);
    res.set('Content-Type', 'application/octet-stream');
    res.set('Cache-Control', 'public, max-age=31536000');
    fs.createReadStream(path.join(STORY_AUDIO_DIR, file)).pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read audio' });
  }
});

app.post('/api/stories/:id/audio/:lineIndex/:voiceName', (req, res) => {
  const { id, lineIndex, voiceName } = req.params;
  const format = req.query.format === 'wav' ? 'wav' : 'pcm';
  const safeId = id.replace(/[^a-zA-Z0-9_\-]/g, '');
  const safeLine = lineIndex.replace(/[^0-9]/g, '');
  const safeVoice = voiceName.replace(/[^a-zA-Z0-9_\-]/g, '');
  
  if (!Buffer.isBuffer(req.body)) return res.status(400).json({ error: 'Body must be raw binary data' });
  const filePath = path.join(STORY_AUDIO_DIR, `${safeId}__${safeLine}__${safeVoice}.${format}`);
  try {
    fs.writeFileSync(filePath, req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save audio' });
  }
});

// ─── XTTS v2 proxy ──────────────────────────────────────────
// Forwards TTS requests to the local Python FastAPI server (port 5500).
// Returns 503 when the Python server is not running so the frontend can
// fall back to Piper without showing an error to the user.

const XTTS_PORT = parseInt(process.env.XTTS_PORT || '5500', 10);
const XTTS_URL = `http://127.0.0.1:${XTTS_PORT}/synthesize`;

app.post('/api/tts/xtts', async (req, res) => {
  const { text, characterId, language } = req.body as {
    text?: string;
    characterId?: string;
    language?: string;
  };

  if (!text?.trim() || !characterId?.trim()) {
    return res.status(400).json({ error: 'Missing text or characterId' });
  }

  // Sanitize characterId to prevent path traversal in the Python server
  const safeCharId = characterId.replace(/[^a-zA-Z0-9_\-]/g, '');

  try {
    const upstream = await fetch(XTTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, characterId: safeCharId, language: language ?? 'fr' }),
      signal: AbortSignal.timeout(190_000),
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '');
      return res.status(upstream.status).json({ error: errText || 'XTTS synthesis failed' });
    }

    const audioBuffer = await upstream.arrayBuffer();
    res.set('Content-Type', 'audio/wav');
    res.set('X-Xtts-Status', 'ok');
    res.send(Buffer.from(audioBuffer));
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.cause?.code === 'ECONNREFUSED') {
      // Python server not running — tell frontend to use Piper fallback
      return res.status(503).json({ error: 'XTTS server not running' });
    }
    console.error('XTTS proxy error:', err);
    res.status(503).json({ error: 'XTTS unavailable' });
  }
});

// ─── ElevenLabs proxy ───────────────────────────────────────
// Reads ELEVENLABS_API_KEY from env (.env or VPS env), reads charId→voiceId
// mapping from scripts/elevenlabs_voices.json. Returns:
//  • 401 if no API key configured
//  • 404 if no voiceId mapped for that character
//  • 503 on upstream failure (frontend falls back to XTTS/Piper)

const EL_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const EL_VOICES_PATH = path.join(__dirname, 'scripts', 'elevenlabs_voices.json');

function readElevenLabsMapping(): Record<string, string> {
  try {
    if (!fs.existsSync(EL_VOICES_PATH)) return {};
    return JSON.parse(fs.readFileSync(EL_VOICES_PATH, 'utf-8'));
  } catch (err) {
    console.warn('[elevenlabs] Failed to read voices mapping:', err);
    return {};
  }
}

app.get('/api/tts/elevenlabs/status', (_req, res) => {
  const mapping = readElevenLabsMapping();
  res.json({
    enabled: !!EL_API_KEY,
    voiceCount: Object.keys(mapping).filter(k => mapping[k]).length,
  });
});

app.post('/api/tts/elevenlabs', async (req, res) => {
  const { text, characterId } = req.body as { text?: string; characterId?: string };

  if (!EL_API_KEY) return res.status(401).json({ error: 'ELEVENLABS_API_KEY not set' });
  if (!text?.trim() || !characterId?.trim()) {
    return res.status(400).json({ error: 'Missing text or characterId' });
  }

  const mapping = readElevenLabsMapping();
  const voiceId = mapping[characterId];
  if (!voiceId) return res.status(404).json({ error: `No ElevenLabs voiceId for '${characterId}'` });

  // ElevenLabs Text-to-Speech endpoint — eleven_flash_v2_5 is fastest (~0.5s)
  // output_format=mp3_44100_64 keeps payloads small without quality loss for speech
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_64`;

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': EL_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: text.trim(),
        model_id: 'eleven_flash_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.3 },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!upstream.ok) {
      const errBody = await upstream.text().catch(() => '');
      console.warn(`[elevenlabs] upstream ${upstream.status}: ${errBody.slice(0, 200)}`);
      // 401/403 → bad key. 429 → quota. Forward as 503 so frontend falls back.
      return res.status(upstream.status === 429 ? 429 : 503).json({
        error: `ElevenLabs ${upstream.status}`,
        detail: errBody.slice(0, 300),
      });
    }

    const audioBuffer = await upstream.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg');
    res.set('X-Elevenlabs-Status', 'ok');
    res.send(Buffer.from(audioBuffer));
  } catch (err: any) {
    console.error('[elevenlabs] proxy error:', err?.message || err);
    res.status(503).json({ error: 'ElevenLabs unreachable' });
  }
});

// ─── Edge TTS (Microsoft, gratuit illimité) ─────────────────
// Utilise le WebSocket Read-Aloud d'Edge via msedge-tts. Pas de clé API.
// Voix françaises : fr-FR-DeniseNeural, fr-FR-HenriNeural, fr-FR-VivienneMultilingualNeural, etc.

const EDGE_VOICE_COUNT = 5; // doit rester aligné avec EDGE_VOICES côté client

app.get('/api/tts/edge/status', (_req, res) => {
  res.json({ enabled: true, voiceCount: EDGE_VOICE_COUNT });
});

app.post('/api/tts/edge', async (req, res) => {
  const { text, voiceId, rate, pitch } = req.body as {
    text?: string;
    voiceId?: string;
    rate?: string;
    pitch?: string;
  };
  console.log('[edge] Incoming request body:', req.body);

  if (!text?.trim()) return res.status(400).json({ error: 'Missing text' });

  const voice = (voiceId || 'fr-FR-DeniseNeural').trim();
  const tts = new MsEdgeTTS();

  try {
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    // ProsodyOptions accepte rate/pitch en string (e.g. "+10%", "-5Hz"); fallback défaut.
    const { audioStream } = tts.toStream(text.trim(), {
      ...(rate ? { rate } : {}),
      ...(pitch ? { pitch } : {}),
    } as any);

    const chunks: Buffer[] = [];
    audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
    audioStream.on('end', () => {
      const buf = Buffer.concat(chunks);
      if (buf.length === 0) {
        console.warn(`[edge] Microsoft returned 0 bytes for voice '${voice}'`);
        if (!res.headersSent) res.status(502).json({ error: 'Edge TTS returned 0 bytes' });
        return;
      }
      res.set('Content-Type', 'audio/mpeg');
      res.set('X-Edge-Voice', voice);
      res.send(buf);
    });
    audioStream.on('error', (err: any) => {
      try { tts.close(); } catch {}
      console.warn('[edge] stream error:', err?.message || err);
      if (!res.headersSent) res.status(503).json({ error: 'Edge TTS stream error' });
    });
  } catch (err: any) {
    try { tts.close(); } catch {}
    console.error('[edge] proxy error:', err?.message || err);
    if (!res.headersSent) res.status(503).json({ error: 'Edge TTS unreachable' });
  }
});

// ─── Google Cloud TTS (Neural2 / WaveNet / Studio) ──────────
// Quota gratuit : 1M caractères / mois Neural2 + 4M / mois Standard.
// Clé séparée de Gemini : GOOGLE_CLOUD_TTS_API_KEY (visible côté serveur uniquement).

const GCLOUD_API_KEY = process.env.GOOGLE_CLOUD_TTS_API_KEY ?? '';
const GCLOUD_VOICE_COUNT = 9; // aligné avec GCLOUD_VOICES côté client

app.get('/api/tts/gcloud/status', (_req, res) => {
  res.json({ enabled: !!GCLOUD_API_KEY, voiceCount: GCLOUD_API_KEY ? GCLOUD_VOICE_COUNT : 0 });
});

app.post('/api/tts/gcloud', async (req, res) => {
  const { text, voiceId, languageCode } = req.body as {
    text?: string;
    voiceId?: string;
    languageCode?: string;
  };

  if (!GCLOUD_API_KEY) return res.status(401).json({ error: 'GOOGLE_CLOUD_TTS_API_KEY not set' });
  if (!text?.trim()) return res.status(400).json({ error: 'Missing text' });

  const voice = (voiceId || 'fr-FR-Neural2-A').trim();
  const lang = (languageCode || voice.split('-').slice(0, 2).join('-')).trim();
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(GCLOUD_API_KEY)}`;

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: text.trim() },
        voice: { languageCode: lang, name: voice },
        audioConfig: { audioEncoding: 'MP3', sampleRateHertz: 24000 },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!upstream.ok) {
      const errBody = await upstream.text().catch(() => '');
      console.warn(`[gcloud] upstream ${upstream.status}: ${errBody.slice(0, 200)}`);
      return res.status(upstream.status === 429 ? 429 : 503).json({
        error: `Google Cloud TTS ${upstream.status}`,
        detail: errBody.slice(0, 300),
      });
    }

    const json = await upstream.json() as { audioContent?: string };
    if (!json.audioContent) return res.status(502).json({ error: 'Empty audioContent' });
    const mp3 = Buffer.from(json.audioContent, 'base64');
    res.set('Content-Type', 'audio/mpeg');
    res.set('X-GCloud-Voice', voice);
    res.send(mp3);
  } catch (err: any) {
    console.error('[gcloud] proxy error:', err?.message || err);
    if (!res.headersSent) res.status(503).json({ error: 'Google Cloud TTS unreachable' });
  }
});

// ─── Hugging Face Inference API ─────────────────────────────
// Gratuit (rate-limité). Modèle par défaut : facebook/mms-tts-fra.
// Le premier appel à froid peut prendre 10-30s, ensuite cache HF garde le modèle chaud.

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY ?? '';
const HF_TTS_MODEL = process.env.HF_TTS_MODEL || 'facebook/mms-tts-fra';

app.get('/api/tts/huggingface/status', (_req, res) => {
  res.json({ enabled: !!HF_API_KEY, model: HF_TTS_MODEL });
});

app.post('/api/tts/huggingface', async (req, res) => {
  const { text, model } = req.body as { text?: string; model?: string };

  if (!HF_API_KEY) return res.status(401).json({ error: 'HUGGINGFACE_API_KEY not set' });
  if (!text?.trim()) return res.status(400).json({ error: 'Missing text' });

  const useModel = (model || HF_TTS_MODEL).trim();
  const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(useModel)}`;

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text.trim() }),
      signal: AbortSignal.timeout(60_000), // cold-start des modèles HF peut être long
    });

    if (!upstream.ok) {
      const errBody = await upstream.text().catch(() => '');
      console.warn(`[hf] upstream ${upstream.status}: ${errBody.slice(0, 200)}`);
      return res.status(upstream.status === 429 ? 429 : 503).json({
        error: `HF ${upstream.status}`,
        detail: errBody.slice(0, 300),
      });
    }

    const ct = upstream.headers.get('content-type') || 'audio/flac';
    const audioBuffer = await upstream.arrayBuffer();
    res.set('Content-Type', ct);
    res.set('X-HF-Model', useModel);
    res.send(Buffer.from(audioBuffer));
  } catch (err: any) {
    console.error('[hf] proxy error:', err?.message || err);
    if (!res.headersSent) res.status(503).json({ error: 'Hugging Face unreachable' });
  }
});

// ─── Voice samples — pré-générés par npm run voices ────────
const SAMPLES_DIR = path.join(__dirname, 'scripts', 'voice_samples');

app.get('/api/voice-sample/:charId', (req, res) => {
  const safeId = req.params.charId.replace(/[^a-zA-Z0-9_\-]/g, '');
  const wavPath = path.join(SAMPLES_DIR, `${safeId}.wav`);
  if (!fs.existsSync(wavPath)) {
    return res.status(404).json({ error: `No sample for '${safeId}'` });
  }
  res.set('Content-Type', 'audio/wav');
  res.set('Cache-Control', 'public, max-age=86400');
  fs.createReadStream(wavPath).pipe(res);
});

// ─── Serve built frontend (production) ──────────────────────

const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

// ─── Start ──────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚔️  MayronCombat API running on http://0.0.0.0:${PORT}`);
  console.log(`   Battles directory: ${DATA_DIR}`);
  console.log(`   Stories directory: ${STORY_DIR}`);
});
