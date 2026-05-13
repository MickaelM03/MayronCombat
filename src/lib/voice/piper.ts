// Piper TTS WASM via @diffusionstudio/vits-web
// Neural-quality French TTS, fully offline on all platforms.
// Models are downloaded once (~20-60 MB) and cached in OPFS by the library.

import { predict, type VoiceId } from '@diffusionstudio/vits-web';

const MODEL_IDS: Record<string, VoiceId> = {
  // Masculine deep/menacing
  Charon:     'fr_FR-tom-medium',
  Orus:       'fr_FR-tom-medium',
  Enceladus:  'fr_FR-tom-medium',
  Iapetus:    'fr_FR-tom-medium',
  Gacrux:     'fr_FR-tom-medium',
  Rasalgethi: 'fr_FR-tom-medium',
  Achernar:   'fr_FR-tom-medium',
  Algenib:    'fr_FR-tom-medium',
  Schedar:    'fr_FR-tom-medium',
  Zubenelgenubi: 'fr_FR-tom-medium',
  // Masculine mid/heroic / narrator-warm
  Fenrir:     'fr_FR-tom-medium',
  Sadachbia:  'fr_FR-tom-medium',
  Algieba:    'fr_FR-tom-medium',
  Alnilam:    'fr_FR-tom-medium',
  Achird:     'fr_FR-tom-medium',
  Sadaltager: 'fr_FR-tom-medium',
  // Young/agile masculine
  Puck:       'fr_FR-gilles-low',
  Zephyr:     'fr_FR-gilles-low',
  Umbriel:    'fr_FR-gilles-low',
  // Feminine voices
  Kore:        'fr_FR-siwis-medium',
  Aoede:       'fr_FR-siwis-medium',
  Leda:        'fr_FR-siwis-medium',
  Erinome:     'fr_FR-siwis-medium',
  Despina:     'fr_FR-siwis-medium',
  Autonoe:     'fr_FR-siwis-medium',
  Callirrhoe:  'fr_FR-siwis-medium',
  Pulcherrima: 'fr_FR-siwis-medium',
  Laomedeia:   'fr_FR-siwis-medium',
  Sulafat:     'fr_FR-siwis-medium',
  Vindemiatrix:'fr_FR-siwis-medium',
};

// [pitchShift semitones, rateMultiplier]
const STYLE_ADJUSTMENTS: Record<string, [number, number]> = {
  idiot:             [-4, 0.75],
  enfant:            [+5, 1.3],
  enfant_diabolique: [+3, 1.15],
  gamer:             [0,  1.05],
  gangster:          [-2, 0.95],
  papa:              [-1, 0.9],
  maman:             [+2, 0.95],
  ado_fille:         [+3, 1.15],
  ado_garcon:        [0,  1.2],
  animal:            [+7, 1.5],
  raleur:            [-4, 0.7],
  presse:            [0,  1.4],
  drama_queen:       [+4, 1.2],
  autoritaire:       [-5, 0.8],
  ivre:              [-3, 0.65],
  scientifique_fou:  [-5, 1.1],
  nerveux:           [+3, 1.35],
  guerrier:          [-4, 1.0],
  creature:          [+8, 1.6],
  froid:             [-6, 0.7],
  ogre:              [-8, 0.75],
  aventuriere:       [+1, 1.0],
  menacant:          [-5, 0.75],
  hero_jeune:        [+2, 1.25],
  monotone:          [0,  0.7],
};

// Pitch-shift via linear interpolation resampling
function pitchShift(data: Float32Array, semitones: number): Float32Array {
  if (semitones === 0) return data;
  const ratio = Math.pow(2, semitones / 12);
  const newLength = Math.round(data.length / ratio);
  const out = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const srcIdx = i * ratio;
    const lo = Math.floor(srcIdx);
    const hi = Math.min(lo + 1, data.length - 1);
    const frac = srcIdx - lo;
    out[i] = data[lo] * (1 - frac) + data[hi] * frac;
  }
  return out;
}

// Exposed for App.tsx so it can merge Piper style adjustments into cached blob params
export { STYLE_ADJUSTMENTS as PIPER_STYLE_ADJUSTMENTS };

// Some browsers (notably Firefox) can refuse OPFS GetDirectory with a
// SecurityError, which makes vits-web's predict() throw on every call. Once we
// know Piper is broken in this session, skip it immediately instead of paying
// the multi-second model-download + WASM-init + throw cycle every line.
let piperDisabled = false;
export function isPiperDisabled(): boolean { return piperDisabled; }
export function resetPiperDisabled(): void { piperDisabled = false; }

// Returns the raw WAV blob from Piper (no pitch/rate applied — caller handles params)
export async function getPiperBlob(text: string, voiceName: string): Promise<Blob | null> {
  if (piperDisabled) return null;
  try {
    const voiceId = MODEL_IDS[voiceName] ?? 'fr_FR-tom-medium';
    return await predict({ text, voiceId });
  } catch (err: any) {
    const msg = String(err?.message || err);
    // OPFS / SecurityError / WASM init failure → permanently disable for session.
    if (/security|opfs|getdirectory|wasm/i.test(msg)) {
      console.warn('[voice] Piper disabled for this session (OPFS/WASM error):', msg);
      piperDisabled = true;
    }
    return null;
  }
}

// Warm up models in the background after first user interaction
export function warmUpPiper(): void {
  // Fire and forget — errors are silent
  const warmUp = async (voiceId: VoiceId) => {
    try {
      await predict({ text: ' ', voiceId });
    } catch { /* ignore */ }
  };
  warmUp('fr_FR-tom-medium');
  warmUp('fr_FR-gilles-low');
  warmUp('fr_FR-siwis-medium');
}

export async function playPiperTTS(
  text: string,
  voiceName: string,
  voiceStyle: string,
  audioContext: AudioContext,
  outputNode: AudioNode,
  speedMultiplier: number = 1.0,
  onStart?: (duration: number) => void
): Promise<void> {
  const voiceId = MODEL_IDS[voiceName] ?? 'fr_FR-tom-medium';
  const cleanText = text.replace(/^[^:]+:\s*/, '');

  const blob = await predict({ text: cleanText, voiceId });
  const arrayBuffer = await blob.arrayBuffer();
  const decoded = await audioContext.decodeAudioData(arrayBuffer);

  const [semitones, rate] = STYLE_ADJUSTMENTS[voiceStyle] ?? [0, 1];
  const effectiveRate = rate * speedMultiplier;

  const channels: Float32Array[] = [];
  for (let c = 0; c < decoded.numberOfChannels; c++) {
    channels.push(pitchShift(decoded.getChannelData(c), semitones));
  }

  const buffer = audioContext.createBuffer(
    decoded.numberOfChannels,
    channels[0].length,
    decoded.sampleRate,
  );
  for (let c = 0; c < channels.length; c++) {
    buffer.copyToChannel(channels[c], c);
  }

  return new Promise<void>((resolve) => {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = effectiveRate;
    source.connect(outputNode);
    
    onStart?.(buffer.duration / effectiveRate);
    
    source.start();
    source.onended = () => resolve();
  });
}
