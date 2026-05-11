// Piper TTS WASM via @diffusionstudio/vits-web
// Neural-quality French TTS, fully offline on all platforms.
// Models are downloaded once (~20-60 MB) and cached in OPFS by the library.

import { predict, type VoiceId } from '@diffusionstudio/vits-web';

const MODEL_IDS: Record<string, VoiceId> = {
  Charon: 'fr_FR-tom-medium',
  Fenrir: 'fr_FR-tom-medium',
  Puck:   'fr_FR-gilles-low',
  Kore:   'fr_FR-siwis-medium',
  Aoede:  'fr_FR-siwis-medium',
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
): Promise<void> {
  const voiceId = MODEL_IDS[voiceName] ?? 'fr_FR-tom-medium';
  const cleanText = text.replace(/^[^:]+:\s*/, '');

  const blob = await predict({ text: cleanText, voiceId });
  const arrayBuffer = await blob.arrayBuffer();
  const decoded = await audioContext.decodeAudioData(arrayBuffer);

  const [semitones, rate] = STYLE_ADJUSTMENTS[voiceStyle] ?? [0, 1];

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
    source.playbackRate.value = rate;
    source.connect(outputNode);
    source.start();
    source.onended = () => resolve();
  });
}
