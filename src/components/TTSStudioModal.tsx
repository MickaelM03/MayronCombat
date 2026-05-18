import React, { useState, useRef, useCallback } from 'react';
import { X, Play, Download, Loader2, Mic, Sliders, Volume2, Music2, RotateCcw } from 'lucide-react';
import { GEMINI_VOICES, PROVIDERS, VoiceProvider, VoiceOverride } from './VoiceConfigurator';
import { EDGE_VOICES } from '../lib/voice/edgetts';
import { GCLOUD_VOICES } from '../lib/voice/gcloudtts';

// ── Styles expressifs (ton/expression) ──────────────────────────────────────
export const TTS_TONES: Array<{ id: string; label: string; emoji: string; prompt: string }> = [
  { id: 'neutre',     label: 'Neutre',      emoji: '😐', prompt: 'Parle de manière neutre et claire.' },
  { id: 'doux',       label: 'Doux',        emoji: '🌸', prompt: 'Parle doucement, avec une voix apaisante et bienveillante.' },
  { id: 'motivant',   label: 'Motivant',    emoji: '💪', prompt: 'Parle avec énergie et enthousiasme, comme un coach sportif.' },
  { id: 'joyeux',     label: 'Joyeux',      emoji: '😄', prompt: 'Parle avec joie et gaieté, souriant dans la voix.' },
  { id: 'calme',      label: 'Calme',       emoji: '🧘', prompt: 'Parle lentement et calmement, ton apaisant de méditation.' },
  { id: 'serieux',    label: 'Sérieux',     emoji: '🧐', prompt: 'Parle de manière sérieuse et professionnelle.' },
  { id: 'autoritaire',label: 'Autoritaire', emoji: '👮', prompt: 'Parle avec autorité et fermeté, voix de commandement.' },
  { id: 'dramatique', label: 'Dramatique',  emoji: '🎭', prompt: 'Parle de manière très expressive et dramatique, comme un acteur de théâtre.' },
  { id: 'mystere',    label: 'Mystérieux',  emoji: '🌙', prompt: 'Parle avec une voix mystérieuse, intrigante et envoûtante.' },
  { id: 'enfantin',   label: 'Enfantin',    emoji: '🧸', prompt: 'Parle avec une voix douce adaptée aux enfants, simple et claire.' },
  { id: 'heroique',   label: 'Héroïque',    emoji: '⚔️', prompt: 'Parle avec bravoure et détermination, comme un héros épique.' },
  { id: 'malicieux',  label: 'Malicieux',   emoji: '😈', prompt: 'Parle avec espièglerie et un ton légèrement taquin.' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onTestVoice: (text: string, voiceName: string, voiceStyle: string, params: VoiceOverride) => Promise<void>;
  geminiApiKey?: string;
}

async function pcmToWavBlob(pcmBlob: Blob, sampleRate = 24000): Promise<Blob> {
  const pcmBuffer = await pcmBlob.arrayBuffer();
  const pcmData = new Int16Array(pcmBuffer);
  const numChannels = 1;
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = pcmData.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE'); writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true); view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < pcmData.length; i++) view.setInt16(44 + i * 2, pcmData[i], true);
  return new Blob([buffer], { type: 'audio/wav' });
}

export default function TTSStudioModal({ isOpen, onClose, onTestVoice, geminiApiKey }: Props) {
  const [prompt, setPrompt] = useState('');
  const [provider, setProvider] = useState<VoiceProvider>('edge');
  const [geminiVoice, setGeminiVoice] = useState('Aoede');
  const [edgeVoice, setEdgeVoice] = useState('fr-FR-DeniseNeural');
  const [gcloudVoice, setGcloudVoice] = useState('fr-FR-Neural2-A');
  const [tone, setTone] = useState('neutre');
  const [customTonePrompt, setCustomTonePrompt] = useState('');
  const [pitch, setPitch] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [bass, setBass] = useState(0);
  const [mid, setMid] = useState(0);
  const [treble, setTreble] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'prompt' | 'settings'>('prompt');

  const toneObj = TTS_TONES.find(t => t.id === tone)!;
  const effectiveTonePrompt = customTonePrompt.trim() || toneObj.prompt;

  // Résout la clé Gemini depuis toutes les sources disponibles
  const effectiveGeminiKey = (
    geminiApiKey ||
    (process.env as any).GEMINI_API_KEY ||
    localStorage.getItem('mayron.apiKey') ||
    ''
  ).split(/[,;\n]/)[0].trim(); // Prend la première clé si plusieurs

  const buildParams = useCallback((): VoiceOverride => {
    const voiceId = provider === 'edge' ? edgeVoice : provider === 'gcloud' ? gcloudVoice : undefined;
    return {
      voice: geminiVoice,
      voiceStyle: tone,
      customPrompt: effectiveTonePrompt,
      pitchShift: pitch,
      playbackRate: speed,
      volume,
      provider,
      providerVoiceId: voiceId,
      bass, mid, treble,
      useDefaultVoice: false,
    };
  }, [provider, geminiVoice, edgeVoice, gcloudVoice, tone, effectiveTonePrompt, pitch, speed, volume, bass, mid, treble]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  /** Joue un blob WAV/PCM directement avec les réglages audio courants. */
  const playBlobDirect = async (blob: Blob, fmt: 'pcm' | 'wav') => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    const arrayBuffer = await blob.arrayBuffer();
    let audioBuffer: AudioBuffer;

    if (fmt === 'wav') {
      audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    } else {
      // PCM Int16 @ 24000 Hz
      const int16 = new Int16Array(arrayBuffer);
      audioBuffer = ctx.createBuffer(1, int16.length, 24000);
      const ch = audioBuffer.getChannelData(0);
      for (let i = 0; i < int16.length; i++) ch[i] = int16[i] / 32768;
    }

    // Stop previous
    try { sourceRef.current?.stop(); } catch {}

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    // Pitch via playbackRate
    const pitchRatio = Math.pow(2, pitch / 12);
    source.playbackRate.value = speed * pitchRatio;

    // EQ chain
    const bassF = ctx.createBiquadFilter();
    bassF.type = 'lowshelf'; bassF.frequency.value = 200; bassF.gain.value = bass;
    const midF = ctx.createBiquadFilter();
    midF.type = 'peaking'; midF.frequency.value = 1000; midF.Q.value = 0.5; midF.gain.value = mid;
    const trebleF = ctx.createBiquadFilter();
    trebleF.type = 'highshelf'; trebleF.frequency.value = 3000; trebleF.gain.value = treble;
    const gainNode = ctx.createGain();
    gainNode.gain.value = volume;

    source.connect(bassF);
    bassF.connect(midF);
    midF.connect(trebleF);
    trebleF.connect(gainNode);
    gainNode.connect(ctx.destination);

    sourceRef.current = source;
    return new Promise<void>(resolve => {
      source.onended = () => {
        try { source.disconnect(); gainNode.disconnect(); } catch {}
        resolve();
      };
      source.start();
    });
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) { setError('Entrez un texte à lire.'); return; }
    setError('');
    setIsGenerating(true);
    setLastBlob(null);
    try {
      let blob: Blob | null = null;
      let fmt: 'pcm' | 'wav' = 'wav';

      if (provider === 'edge') {
        const res = await fetch('/api/tts/edge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: prompt.trim(), voiceId: edgeVoice }),
          signal: AbortSignal.timeout(25_000),
        });
        if (res.ok) blob = await res.blob();

      } else if (provider === 'gcloud') {
        const res = await fetch('/api/tts/gcloud', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: prompt.trim(), voiceId: gcloudVoice }),
          signal: AbortSignal.timeout(25_000),
        });
        if (res.ok) blob = await res.blob();

      } else if (provider === 'gemini' && effectiveGeminiKey) {
        // Appel direct Gemini avec la voix ET le ton choisis — aucune cascade
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: effectiveGeminiKey });
        const prompted = `Dis ceci ${effectiveTonePrompt}:\n"${prompt.trim()}"`;
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-preview-tts',
          contents: [{ parts: [{ text: prompted }] }],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: geminiVoice } } },
          },
        });
        const parts = response.candidates?.[0]?.content?.parts;
        const audioPart = parts?.find((p: any) => p.inlineData?.mimeType?.includes('audio'));
        if (audioPart?.inlineData?.data) {
          const bin = window.atob(audioPart.inlineData.data);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          blob = new Blob([bytes.buffer], { type: 'audio/pcm' });
          fmt = 'pcm';
          console.log('[Studio TTS] Gemini PCM reçu:', blob.size, 'bytes, voix:', geminiVoice);
        } else {
          console.warn('[Studio TTS] Gemini: aucune partie audio dans la réponse', response.candidates?.[0]);
        }

      } else if (provider === 'gemini' && !effectiveGeminiKey) {
        setError('Aucune clé API Gemini configurée. Ajoutez-la dans les réglages.');
        return;
      } else {
        // Fallback HF / autre : délègue à onTestVoice (pas de téléchargement)
        await onTestVoice(prompt.trim(), geminiVoice, tone, buildParams());
        return;
      }

      if (blob && blob.size > 0) {
        // 1. Convertit en WAV et active le bouton de téléchargement IMMÉDIATEMENT
        const wavBlob = fmt === 'pcm' ? await pcmToWavBlob(blob) : blob;
        setLastBlob(wavBlob);
        // 2. Lance la lecture ensuite (sans bloquer le rendu UI)
        playBlobDirect(blob, fmt).catch(err => {
          console.warn('[Studio TTS] Lecture échouée:', err);
        });
      } else {
        setError('Échec de la génération audio. Vérifiez le serveur TTS.');
      }
    } catch (e: any) {
      setError(e?.message || 'Erreur inconnue');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!lastBlob) return;
    const safeName = prompt.trim().slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_') || 'tts_output';
    const url = URL.createObjectURL(lastBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}_${provider}_${Date.now()}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const voiceList = provider === 'edge' ? EDGE_VOICES : provider === 'gcloud' ? GCLOUD_VOICES : null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative bg-gray-950 border border-purple-700/50 rounded-2xl w-full max-w-2xl shadow-[0_0_80px_rgba(147,51,234,0.3)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 bg-gradient-to-r from-purple-950/60 to-gray-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
              <Mic size={18} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-wide uppercase">Studio TTS</h2>
              <p className="text-[10px] text-gray-500">Génération vocale personnalisée</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          {(['prompt', 'settings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                activeTab === tab ? 'text-purple-300 border-b-2 border-purple-500 bg-purple-950/20' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'prompt' ? <><Music2 size={12} /> Texte & Voix</> : <><Sliders size={12} /> Réglages Audio</>}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto custom-scrollbar">
          {activeTab === 'prompt' ? (
            <>
              {/* Prompt */}
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1.5">Texte à lire</label>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="Entrez le texte que vous souhaitez faire lire par la voix synthétique..."
                  rows={4}
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-purple-500 transition-colors resize-none placeholder:text-gray-600"
                />
                <p className="text-[9px] text-gray-600 mt-1">{prompt.length} caractères</p>
              </div>

              {/* Provider */}
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1.5">Modèle TTS</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {PROVIDERS.filter(p => ['gemini', 'edge', 'gcloud', 'hf'].includes(p.id)).map(p => (
                    <button
                      key={p.id}
                      onClick={() => setProvider(p.id as VoiceProvider)}
                      className={`py-2 px-2 rounded-lg text-[10px] font-bold border transition-all text-left ${
                        provider === p.id
                          ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                          : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <div>{p.label}</div>
                      <div className="text-[8px] text-gray-500 font-normal mt-0.5 leading-tight">{p.desc.split('—')[0]}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice selector */}
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1.5">Voix</label>
                {voiceList ? (
                  <select
                    value={provider === 'edge' ? edgeVoice : gcloudVoice}
                    onChange={e => provider === 'edge' ? setEdgeVoice(e.target.value) : setGcloudVoice(e.target.value)}
                    className="w-full bg-black border border-gray-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                  >
                    {voiceList.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.gender === 'F' ? '♀' : '♂'} {v.id.split('-').pop()?.replace(/Neural$|MultilingualNeural$/i, '') || v.id} — {v.desc}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={geminiVoice}
                    onChange={e => setGeminiVoice(e.target.value)}
                    className="w-full bg-black border border-gray-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                  >
                    {GEMINI_VOICES.map(v => (
                      <option key={v.name} value={v.name}>
                        {v.gender === 'F' ? '♀' : '♂'} {v.name} — {v.desc}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Tone */}
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1.5">Ton & Expression</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 mb-3">
                  {TTS_TONES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTone(t.id)}
                      className={`py-2 px-2 rounded-lg text-[10px] border transition-all flex flex-col items-center gap-0.5 ${
                        tone === t.id
                          ? 'bg-pink-600/20 border-pink-500 text-pink-300'
                          : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <span className="text-base leading-none">{t.emoji}</span>
                      <span className="font-bold">{t.label}</span>
                    </button>
                  ))}
                </div>

                {/* Prompt aperçu / override */}
                <div className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-2.5">
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Directive de ton</p>
                  <textarea
                    value={customTonePrompt}
                    onChange={e => setCustomTonePrompt(e.target.value)}
                    placeholder={toneObj.prompt}
                    rows={2}
                    className="w-full bg-transparent text-[11px] text-gray-300 outline-none resize-none placeholder:text-gray-600"
                  />
                  {customTonePrompt && (
                    <button onClick={() => setCustomTonePrompt('')} className="text-[9px] text-gray-600 hover:text-gray-400">↺ Réinitialiser</button>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Settings tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Réglages audio fins</p>
                <button
                  onClick={() => { setPitch(0); setSpeed(1.0); setVolume(1.0); setBass(0); setMid(0); setTreble(0); }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-red-900/40 text-gray-400 hover:text-red-400 text-[10px] font-medium border border-gray-700 hover:border-red-700/50 transition-all"
                  title="Réinitialiser tous les réglages audio"
                >
                  <RotateCcw size={10} />
                  Réinitialiser tout
                </button>
              </div>

              {[
                { label: 'Pitch', value: pitch, set: setPitch, min: -8, max: 8, step: 1, unit: ' st', def: 0 },
                { label: 'Vitesse', value: speed, set: setSpeed, min: 0.5, max: 2.0, step: 0.05, unit: 'x', def: 1.0 },
                { label: 'Volume', value: volume, set: setVolume, min: 0.1, max: 2.0, step: 0.05, unit: 'x', def: 1.0 },
                { label: 'Grave', value: bass, set: setBass, min: -20, max: 20, step: 1, unit: ' dB', def: 0 },
                { label: 'Médium', value: mid, set: setMid, min: -20, max: 20, step: 1, unit: ' dB', def: 0 },
                { label: 'Aigu', value: treble, set: setTreble, min: -20, max: 20, step: 1, unit: ' dB', def: 0 },
              ].map(({ label, value, set, min, max, step, unit, def }) => (
                <div key={label} className="flex items-center gap-3">
                  <label className="text-[10px] text-gray-400 w-14 flex-shrink-0 text-right">{label}</label>
                  <input
                    type="range" min={min} max={max} step={step} value={value}
                    onChange={e => set(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 accent-purple-500 cursor-pointer"
                  />
                  <span className={`text-[11px] w-14 text-right font-mono ${Math.abs(value - def) < 0.01 ? 'text-gray-500' : 'text-purple-400 font-bold'}`}>
                    {value.toFixed(step < 1 ? (step < 0.1 ? 2 : 1) : 0)}{unit}
                  </span>
                  {Math.abs(value - def) >= 0.01 && (
                    <button onClick={() => set(def)} className="text-gray-600 hover:text-white text-[10px]">↺</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-950/50 border border-red-700/40 rounded-xl px-3 py-2 text-[11px] text-red-400">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-gray-800 bg-gray-950 flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${
              isGenerating
                ? 'bg-purple-800 text-purple-300 cursor-wait'
                : prompt.trim()
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-900/40'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            {isGenerating ? <><Loader2 size={16} className="animate-spin" /> Génération...</> : <><Play size={16} /> Générer & Écouter</>}
          </button>

          {lastBlob && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold transition-all shadow-lg shadow-emerald-900/30"
              title="Télécharger en .wav"
            >
              <Download size={16} />
              .wav
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
