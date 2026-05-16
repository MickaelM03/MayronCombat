import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sword,
  Shield,
  MapPin,
  Zap,
  User,
  Users,
  Play,
  Trash2,
  Swords,
  Flame,
  Target,
  Volume2,
  RefreshCw,
  Skull,
  ChevronLeft,
  ChevronRight,
  Music,
  Clock,
  Lock,
  X,
  AlertTriangle,
  Settings2,
  Home,
  History as HistoryIcon,
  Save,
  BookOpen
} from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import HomePage from './components/HomePage';
import NarrativeModeSelector from './components/NarrativeModeSelector';
import BattleLibrary from './components/BattleLibrary';
import BatchGenerator from './components/BatchGenerator';
import VoiceConfigurator, { VoiceOverride, getDefaultAudioSettings, getDefaultEdgeVoice } from './components/VoiceConfigurator';
import { NarrativeMode, NARRATIVE_MODE_META, getNarrativeDirectives, getNarrativeModeLabel } from './lib/battles/prompts';
import { saveBattle, saveAudioBlob, getAudioBlob, SavedBattle } from './lib/battles/store';
import StoryConfigurator from './components/StoryMode/StoryConfigurator';
import StoryViewer from './components/StoryMode/StoryViewer';
import StoryLibrary from './components/StoryMode/StoryLibrary';
import { getStoryDirectives, StoryChapterJSON } from './lib/story/prompts';
import { saveStory, updateStory, getStory, getStoryAudio, saveStoryAudio, listStories, SavedStory, StoryLine } from './lib/story/store';
import { fetchServerKeys, saveServerKey } from './lib/settings/keys';
import { generateWithFallback, AICascadeConfig } from './lib/ai/cascade';

import { playWebSpeechEnhanced } from './lib/voice/webspeech';
import { playPiperTTS, getPiperBlob, PIPER_STYLE_ADJUSTMENTS } from './lib/voice/piper';
import { tryXttsAudio, xttsSynthesize } from './lib/voice/xtts';
import { tryElevenLabsAudio, fetchElevenLabsStatus } from './lib/voice/elevenlabs';
import { tryEdgeAudio } from './lib/voice/edgetts';
import { tryGCloudAudio } from './lib/voice/gcloudtts';
import { tryHuggingFaceAudio } from './lib/voice/huggingface';
import { CHARACTERS, ARENAS, STYLES, STYLE_PROMPTS } from './lib/constants';

// --- CONFIGURATION DU ROSTER (Le Multivers) ---

// Constants are now imported from ./lib/constants


const MOCK_BATTLE = {
  intro: { text: "Bienvenue dans l'arène pour ce combat de DÉMONSTRATION ! Préparez-vous, ça va chier !", speaker: "Arbitre" },
  rounds: [
    {
      title: "ROUND 1",
      dialogues: [
        { speaker: "Joueur 1", text: "Joueur 1: Ha ha ha ! Je n'ai pas besoin d'API pour te démonter la gueule !", action: "Provocation" },
        { speaker: "Joueur 2", text: "Joueur 2: Grrr... C'est ce qu'on va voir, espèce de clampin !", action: "Réplique" }
      ]
    },
    {
      title: "ROUND 2",
      dialogues: [
        { speaker: "Arbitre", text: "ROUND 2... BASTON !", action: "Gong" },
        { speaker: "Joueur 1", text: "Joueur 1: COMBO D'IMAGES ! PRENDS ÇA DANS TES DENTS !", action: "Attaque Spéciale" },
        { speaker: "Joueur 2", text: "Joueur 2: Aïe ! Putain ça pique !", action: "Encaisse" }
      ]
    }
  ],
  winner: "Le Joueur de Démo",
  finishingMove: { type: "FATALITY", description: "DEMO-TALITY! Le combat se termine dans un bain de sang pixelisé !", speaker: "Arbitre" },
  conclusion: { text: "Mettez une clé API si vous voulez la vraie violence !", speaker: "Arbitre" }
};

// --- COMPOSANT PRINCIPAL ---

export default function App() {
  const [appMode, setAppMode] = useState<'HOME' | 'BRAWLER' | 'STORY_CONFIG' | 'STORY_PLAY' | 'STORY_LIBRARY'>('HOME');
  const [gameState, setGameState] = useState<'SETUP' | 'LOADING' | 'COMBAT' | 'ERROR'>('SETUP');
  const [currentStory, setCurrentStory] = useState<SavedStory | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);

  const [p1, setP1] = useState(CHARACTERS[0]);
  const [p2, setP2] = useState(CHARACTERS[1]);
  const [p1Style, setP1Style] = useState(STYLES[0]);
  const [p2Style, setP2Style] = useState(STYLES[0]);
  const [arena, setArena] = useState(ARENAS[0]);
  const [arenaOffset, setArenaOffset] = useState(0);

  const [battleData, setBattleData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeLineIdx, setActiveLineIdx] = useState<number>(-1);
  const [bufferingIdx, setBufferingIdx] = useState<number>(-1);
  // Index up to which dialogue lines have been revealed in the current step.
  // Prevents the on-screen text from racing ahead of the voice playback.
  const [revealedIdx, setRevealedIdx] = useState<number>(-1);
  // Tier (moteur TTS) en cours pour la ligne active — alimente le badge.
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeLineDuration, setActiveLineDuration] = useState<number>(0);
  const [storySpeed, setStorySpeed] = useState<number>(1.0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [tempApiKey, setTempApiKey] = useState<string>(() =>
    localStorage.getItem('mayron.apiKey') ?? ''
  );
  const [groqKey, setGroqKey] = useState<string>(() =>
    localStorage.getItem('mayron.groqKey') ?? ''
  );
  const [openaiKey, setOpenaiKey] = useState<string>(() =>
    localStorage.getItem('mayron.openaiKey') ?? ''
  );
  const [deepInfraKey, setDeepInfraKey] = useState<string>(() =>
    localStorage.getItem('mayron.deepInfraKey') ?? ''
  );
  const [deepseekKey, setDeepseekKey] = useState<string>(() =>
    localStorage.getItem('mayron.deepseekKey') ?? ''
  );

  const saveApiKey = (key: string) => {
    setTempApiKey(key);
    if (key) localStorage.setItem('mayron.apiKey', key);
    else localStorage.removeItem('mayron.apiKey');
    saveServerKey('apiKey', key);
  };

  const saveGroqKey = (key: string) => {
    setGroqKey(key);
    if (key) localStorage.setItem('mayron.groqKey', key);
    else localStorage.removeItem('mayron.groqKey');
    saveServerKey('groqKey', key);
  };

  const saveOpenaiKey = (key: string) => {
    setOpenaiKey(key);
    if (key) localStorage.setItem('mayron.openaiKey', key);
    else localStorage.removeItem('mayron.openaiKey');
    saveServerKey('openaiKey', key);
  };

  const saveDeepInfraKey = (key: string) => {
    setDeepInfraKey(key);
    if (key) localStorage.setItem('mayron.deepInfraKey', key);
    else localStorage.removeItem('mayron.deepInfraKey');
    saveServerKey('deepInfraKey', key);
  };

  const saveDeepseekKey = (key: string) => {
    setDeepseekKey(key);
    if (key) localStorage.setItem('mayron.deepseekKey', key);
    else localStorage.removeItem('mayron.deepseekKey');
    saveServerKey('deepseekKey', key);
  };

  // On mount, hydrate keys from the server so a key entered on any browser
  // is available to every other browser that connects to this VPS.
  useEffect(() => {
    fetchServerKeys().then(remote => {
      if (remote.apiKey !== undefined && remote.apiKey !== tempApiKey) {
        setTempApiKey(remote.apiKey);
        if (remote.apiKey) localStorage.setItem('mayron.apiKey', remote.apiKey);
        else localStorage.removeItem('mayron.apiKey');
      }
      if (remote.groqKey !== undefined && remote.groqKey !== groqKey) {
        setGroqKey(remote.groqKey);
        if (remote.groqKey) localStorage.setItem('mayron.groqKey', remote.groqKey);
        else localStorage.removeItem('mayron.groqKey');
      }
      if (remote.openaiKey !== undefined && remote.openaiKey !== openaiKey) {
        setOpenaiKey(remote.openaiKey);
        if (remote.openaiKey) localStorage.setItem('mayron.openaiKey', remote.openaiKey);
        else localStorage.removeItem('mayron.openaiKey');
      }
      if (remote.deepInfraKey !== undefined && remote.deepInfraKey !== deepInfraKey) {
        setDeepInfraKey(remote.deepInfraKey);
        if (remote.deepInfraKey) localStorage.setItem('mayron.deepInfraKey', remote.deepInfraKey);
        else localStorage.removeItem('mayron.deepInfraKey');
      }
      if (remote.deepseekKey !== undefined && remote.deepseekKey !== deepseekKey) {
        setDeepseekKey(remote.deepseekKey);
        if (remote.deepseekKey) localStorage.setItem('mayron.deepseekKey', remote.deepseekKey);
        else localStorage.removeItem('mayron.deepseekKey');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getAIConfig = useCallback((): AICascadeConfig => {
    const rawKeys = process.env.GEMINI_API_KEY || tempApiKey;
    const geminiKeys = rawKeys.split(/[,;\n]/).map(k => k.trim()).filter(k => k.length > 5);
    
    return {
      geminiKeys,
      openaiKey: openaiKey || undefined,
      groqKey: groqKey || undefined,
      deepInfraKey: deepInfraKey || undefined,
      deepseekKey: deepseekKey || undefined,
    };
  }, [tempApiKey, openaiKey, groqKey, deepInfraKey, deepseekKey]);
  const [selectingPlayer, setSelectingPlayer] = useState<1 | 2>(1);
  const [matchDuration, setMatchDuration] = useState(3);
  const [charSearch, setCharSearch] = useState('');
  const audioBgRef = useRef<HTMLAudioElement | null>(null);

  // Narrative mode (parental control)
  const [narrativeMode, setNarrativeMode] = useState<NarrativeMode>(() => {
    const saved = localStorage.getItem('mayron.narrativeMode');
    return (saved ? Number(saved) : 1) as NarrativeMode;
  });
  const [showParentalModal, setShowParentalModal] = useState(false);
  const [parentalCode, setParentalCode] = useState("");
  const [parentalError, setParentalError] = useState(false);
  const [pendingMode, setPendingMode] = useState<NarrativeMode | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [parentalTab, setParentalTab] = useState<'mode' | 'voix'>('mode');
  const PARENTAL_CODE = "2604";

  // Voice overrides — persisted in localStorage, applied on character selection
  const [voiceOverrides, setVoiceOverrides] = useState<Record<string, VoiceOverride>>(() => {
    try {
      const saved = localStorage.getItem('mayron.voiceOverrides');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const saveVoiceOverrides = (ovr: Record<string, VoiceOverride>) => {
    setVoiceOverrides(ovr);
    localStorage.setItem('mayron.voiceOverrides', JSON.stringify(ovr));
  };

  // Apply voice overrides to a character
  const withVoiceOverride = (char: typeof CHARACTERS[0]) => {
    const ovr = voiceOverrides[char.id];
    if (!ovr) return char;
    return { ...char, voice: ovr.voice, voiceStyle: ovr.voiceStyle };
  };

  // Sync P1/P2 when overrides change
  useEffect(() => {
    setP1(prev => withVoiceOverride(CHARACTERS.find(c => c.id === prev.id) || prev));
    setP2(prev => withVoiceOverride(CHARACTERS.find(c => c.id === prev.id) || prev));
  }, [voiceOverrides]);

  // Piper warmup désactivé au démarrage : déclenche une SecurityError OPFS dans vits-web
  // (le worker cross-origin ne peut pas accéder à OPFS).
  // Les modèles Piper se chargent à la première utilisation réelle, c'est acceptable.

  // Détection ElevenLabs au démarrage (clé API + nombre de voix mappées)
  useEffect(() => {
    fetchElevenLabsStatus().catch(() => {});
    listStories().catch(() => {});
  }, []);

  // Test a voice from the configurator (with fine-tuned params)
  const testVoice = async (text: string, voiceName: string, voiceStyle: string, params: VoiceOverride, charId?: string) => {
    const audioCtx = getAudioCtx();
    const cleanText = text.replace(/^[^:]+:\s*/, '');

    if (params.customPrompt?.trim()) {
      STYLE_PROMPTS['__custom__'] = params.customPrompt.trim();
    }

    // When the user has flipped "voix par défaut" we bypass every cloning tier
    // so the preview matches what the combat will actually play.
    const useDefault = params.useDefaultVoice === true;
    const forcedProvider = params.provider && params.provider !== 'auto' ? params.provider : null;

    try {
      // ─── Provider forcé en premier (préview = combat réel) ───
      if (forcedProvider === 'edge') {
        const b = await tryEdgeAudio(cleanText, params.providerVoiceId);
        if (b) { await playPcmBlobWithParams(b, 'wav', params); return; }
        throw new Error('Edge TTS failed or returned empty blob');
      } else if (forcedProvider === 'gcloud') {
        const b = await tryGCloudAudio(cleanText, params.providerVoiceId);
        if (b) { await playPcmBlobWithParams(b, 'wav', params); return; }
        throw new Error('GCloud TTS failed');
      } else if (forcedProvider === 'hf') {
        const b = await tryHuggingFaceAudio(cleanText);
        if (b) { await playPcmBlobWithParams(b, 'wav', params); return; }
        throw new Error('HF TTS failed');
      } else if (forcedProvider === 'piper') {
        const b = await getPiperBlob(cleanText, voiceName);
        if (b) { await playPcmBlobWithParams(b, 'wav', params); return; }
        throw new Error('Piper TTS failed');
      } else if (forcedProvider === 'elevenlabs') {
        const b = await tryElevenLabsAudio(cleanText, charId);
        if (b) { await playPcmBlobWithParams(b, 'wav', params); return; }
        throw new Error('ElevenLabs TTS failed');
      } else if (forcedProvider === 'xtts') {
        const b = await tryXttsAudio(cleanText, charId);
        if (b) { await playPcmBlobWithParams(b, 'wav', params); return; }
        throw new Error('XTTS failed');
      }
      // forcedProvider === 'gemini' → tombera sur le bloc Gemini ci-dessous.

      // Priorité 1 : ElevenLabs (voix clonée pro, ~1-2s, qualité maximale)
      if (!useDefault && !forcedProvider) {
        const elBlob = await tryElevenLabsAudio(cleanText, charId);
        if (elBlob) {
          await playPcmBlobWithParams(elBlob, 'wav', params);
          return;
        }

        // Priorité 2 : sample WAV pré-généré (instantané, 100% local — sonne authentique
        // mais NE clone PAS : c'est l'extrait original, le combat utilisera autre chose)
        if (charId) {
          try {
            const sampleRes = await fetch(`/api/voice-sample/${encodeURIComponent(charId)}`, {
              signal: AbortSignal.timeout(3_000),
            });
            if (sampleRes.ok) {
              const blob = await sampleRes.blob();
              await playPcmBlobWithParams(blob, 'wav', params);
              return;
            }
          } catch { /* sample absent ou serveur hors ligne → fallback */ }
        }

        // Priorité 3 : XTTS local (voix clonée, requiert le serveur Python)
        const xttsBlob = await tryXttsAudio(cleanText, charId);
        if (xttsBlob) {
          await playPcmBlobWithParams(xttsBlob, 'wav', params);
          return;
        }
      }

      // Priorité Gemini (si clé API) — applique la persona/style sur la voix curatée.
      const apiKey = process.env.GEMINI_API_KEY || tempApiKey;
      if (apiKey) {
        const effectiveStyle = params?.customPrompt?.trim() ? '__custom__' : voiceStyle;
        const gBlob = await fetchGeminiAudio(cleanText, voiceName, effectiveStyle, getAIConfig());
        if (gBlob) {
          await playPcmBlobWithParams(gBlob, 'pcm', params);
          return;
        }
      }

      // Edge TTS — gratuit, illimité, voix française fluide. Fallback de luxe
      // si Gemini a épuisé son quota du jour.
      {
        const edgeBlob = await tryEdgeAudio(cleanText, params.providerVoiceId);
        if (edgeBlob) {
          await playPcmBlobWithParams(edgeBlob, 'wav', params);
          return;
        }
      }

      // Priorité 3 : Piper WASM (synthèse locale, chargement initial ~10s)
      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime((params.volume ?? 1.0) * 0.75, audioCtx.currentTime);
      gainNode.connect(getCompressor(audioCtx));
      try {
        await playPiperTTS(cleanText, voiceName, voiceStyle, audioCtx, gainNode);
      } catch {
        // Priorité 4 : Web Speech API (voix système, toujours dispo)
        await playWebSpeechEnhanced(cleanText, voiceName, voiceStyle);
      } finally {
        try { gainNode.disconnect(); } catch {}
      }
    } finally {
      delete STYLE_PROMPTS['__custom__'];
    }
  };

  const applyNarrativeMode = (mode: NarrativeMode) => {
    setNarrativeMode(mode);
    localStorage.setItem('mayron.narrativeMode', String(mode));
  };

  // Musique: online = fichier audio, offline = génération Web Audio
  useEffect(() => {
    if (!audioContextRef.current && musicEnabled) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (musicEnabled && gameState === 'SETUP') {
      stopBgMusicOffline();
      const audio = audioBgRef.current;
      if (audio) {
        audio.volume = 0.4;
        const playPromise = audio.play();
        if (playPromise) {
          playPromise.catch(() => {
            // Browser blocked autoplay or source failed — use offline synth
            console.log("Audio play blocked, starting offline music");
            getAudioCtx();
            startBgMusicOffline();
          });
        }
        // Also handle network errors on the audio element
        const handleError = () => {
          console.log("Audio source error, starting offline music");
          getAudioCtx();
          startBgMusicOffline();
        };
        audio.addEventListener('error', handleError, { once: true });
        return () => audio.removeEventListener('error', handleError);
      } else {
        getAudioCtx();
        startBgMusicOffline();
      }
    } else {
      audioBgRef.current?.pause();
      stopBgMusicOffline();
    }
  }, [musicEnabled, gameState]);

  const currentAudioSource = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const musicNodesRef = useRef<{ osc?: OscillatorNode; gain?: GainNode; interval?: ReturnType<typeof setInterval> } | null>(null);
  const currentBattleId = useRef<string | null>(null);
  const currentLineIndex = useRef<number>(0);


  // Génère une musique de style jeu de combat avec Web Audio API (fonctionne hors ligne)
  const startBgMusicOffline = () => {
    if (!audioContextRef.current) return;
    if (musicNodesRef.current?.interval) clearInterval(musicNodesRef.current.interval);
    const ctx = audioContextRef.current;
    const notes = [220, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00, 440];
    let step = 0;
    const gainMaster = ctx.createGain();
    gainMaster.gain.setValueAtTime(0.08, ctx.currentTime);
    gainMaster.connect(ctx.destination);
    const interval = setInterval(() => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(notes[step % notes.length] * (step % 16 < 8 ? 1 : 1.5), ctx.currentTime);
      g.gain.setValueAtTime(0.3, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(g);
      g.connect(gainMaster);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
      step++;
    }, 200);
    musicNodesRef.current = { interval };
  };

  const stopBgMusicOffline = () => {
    if (musicNodesRef.current?.interval) {
      clearInterval(musicNodesRef.current.interval);
      musicNodesRef.current = null;
    }
  };

  const getAudioCtx = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  // Helper to merge overrides with sensible defaults based on voiceStyle and voiceName
  const buildParams = useCallback((charId: string, charVoice: string, charVoiceStyle: string) => {
    const ovr = voiceOverrides[charId];
    const defaultAudio = getDefaultAudioSettings(charVoiceStyle);
    const defaultEdge = getDefaultEdgeVoice(charVoice, charVoiceStyle);
    
    return {
      voice: ovr?.voice ?? charVoice,
      voiceStyle: ovr?.voiceStyle ?? charVoiceStyle,
      customPrompt: ovr?.customPrompt ?? '',
      pitchShift: ovr?.pitchShift ?? defaultAudio.pitchShift,
      playbackRate: ovr?.playbackRate ?? defaultAudio.playbackRate,
      webPitch: ovr?.webPitch ?? 1.0,
      volume: ovr?.volume ?? 1.0,
      useDefaultVoice: ovr?.useDefaultVoice ?? false,
      provider: ovr?.provider ?? 'edge',
      providerVoiceId: ovr?.providerVoiceId ?? defaultEdge,
      bass: ovr?.bass ?? defaultAudio.bass,
      mid: ovr?.mid ?? defaultAudio.mid,
      treble: ovr?.treble ?? defaultAudio.treble,
    } as VoiceOverride;
  }, [voiceOverrides]);

  const getVoiceForSpeaker = (speaker: string): { 
    voiceName: string; 
    voiceStyle: string; 
    charId?: string;
    params?: VoiceOverride 
  } => {
    const speakerLower = speaker.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Story Mode : vérifie en priorité les personnages de l'histoire
    if (currentStory) {
      for (const id of currentStory.characterIds) {
        const char = CHARACTERS.find(c => c.id === id);
        if (char) {
          const nameLower = char.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (speakerLower.includes(nameLower) || nameLower.includes(speakerLower)) {
            return { voiceName: char.voice, voiceStyle: char.voiceStyle, charId: char.id, params: buildParams(char.id, char.voice, char.voiceStyle) };
          }
        }
      }
    }

    // Check P1
    const p1NameLower = p1.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (speakerLower.includes(p1NameLower) || p1NameLower.includes(speakerLower)) {
      return { voiceName: p1.voice, voiceStyle: p1.voiceStyle, charId: p1.id, params: buildParams(p1.id, p1.voice, p1.voiceStyle) };
    }
    // Check P2
    const p2NameLower = p2.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (speakerLower.includes(p2NameLower) || p2NameLower.includes(speakerLower)) {
      return { voiceName: p2.voice, voiceStyle: p2.voiceStyle, charId: p2.id, params: buildParams(p2.id, p2.voice, p2.voiceStyle) };
    }
    // Also check partial names
    const p1FirstWord = p1NameLower.split(/[\s-]/)[0];
    const p2FirstWord = p2NameLower.split(/[\s-]/)[0];
    if (p1FirstWord.length > 2 && speakerLower.includes(p1FirstWord)) {
      return { voiceName: p1.voice, voiceStyle: p1.voiceStyle, charId: p1.id, params: buildParams(p1.id, p1.voice, p1.voiceStyle) };
    }
    if (p2FirstWord.length > 2 && speakerLower.includes(p2FirstWord)) {
      return { voiceName: p2.voice, voiceStyle: p2.voiceStyle, charId: p2.id, params: buildParams(p2.id, p2.voice, p2.voiceStyle) };
    }

    // Default: Arbitre voice
    const arbitreStyle = '';
    return { voiceName: 'Aoede', voiceStyle: arbitreStyle, params: {
      voice: 'Aoede',
      voiceStyle: arbitreStyle,
      pitchShift: 0,
      playbackRate: 1.0,
      volume: 1.0,
      provider: 'edge',
      providerVoiceId: getDefaultEdgeVoice('Aoede', arbitreStyle),
      bass: 0, mid: 0, treble: 0
    } as VoiceOverride };
  };

  // Fallback offline : Web Speech API avec profils de voix distinctifs par personnage

  const playPcmBlob = (blob: Blob, format: 'pcm' | 'wav' = 'pcm'): Promise<void> => {
    return playPcmBlobWithParams(blob, format, {
      voice: '', voiceStyle: '', volume: 1.0, playbackRate: 1.0, pitchShift: 0
    });
  };

  // Loudness normalization: bring every source (ElevenLabs, sample WAV, XTTS,
  // Piper, etc.) to a comparable RMS so a quiet ElevenLabs line is not followed
  // by a thundering Piper one. Target ~ -16 dBFS, clamped to a safe range.
  const computeNormGain = (buffer: AudioBuffer, targetRms = 0.15): number => {
    let sum = 0;
    let count = 0;
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const d = buffer.getChannelData(c);
      // Sample every 4th frame — plenty for an RMS estimate, 4x cheaper.
      for (let i = 0; i < d.length; i += 4) {
        sum += d[i] * d[i];
        count++;
      }
    }
    if (count === 0) return 1.0;
    const rms = Math.sqrt(sum / count);
    if (rms < 1e-4) return 1.0;
    return Math.min(3.5, Math.max(0.4, targetRms / rms));
  };

  // Shared compressor: tames peaks, keeps perceived loudness steady across sources.
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const getCompressor = (audioCtx: AudioContext): DynamicsCompressorNode => {
    if (compressorRef.current && (compressorRef.current as any).context === audioCtx) {
      return compressorRef.current;
    }
    const comp = audioCtx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-20, audioCtx.currentTime);
    comp.knee.setValueAtTime(8, audioCtx.currentTime);
    comp.ratio.setValueAtTime(4, audioCtx.currentTime);
    comp.attack.setValueAtTime(0.005, audioCtx.currentTime);
    comp.release.setValueAtTime(0.12, audioCtx.currentTime);
    comp.connect(audioCtx.destination);
    compressorRef.current = comp;
    return comp;
  };

  const playPcmBlobWithParams = (
    blob: Blob,
    format: 'pcm' | 'wav',
    params: VoiceOverride,
    speedMultiplier: number = 1.0,
    onStart?: (durationSeconds: number) => void
  ): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      const audioCtx = getAudioCtx();
      const arrayBuffer = await blob.arrayBuffer();

      let audioBuffer: AudioBuffer;
      try {
        if (format === 'wav') {
          audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
        } else {
          const int16Array = new Int16Array(arrayBuffer);
          audioBuffer = audioCtx.createBuffer(1, int16Array.length, 24000);
          const channelData = audioBuffer.getChannelData(0);
          for (let i = 0; i < int16Array.length; i++) {
            channelData[i] = int16Array[i] / 32768.0;
          }
          // Micro fade-in/out (3ms) to prevent clicks between lines
          const fade = Math.min(72, Math.floor(int16Array.length / 8));
          for (let i = 0; i < fade; i++) {
            const t = i / fade;
            channelData[i] *= t;
            channelData[int16Array.length - 1 - i] *= t;
          }
        }
      } catch (err) {
        console.error('[voice] Error decoding audio blob. Invalid format or corrupted cache:', err);
        reject(err);
        return;
      }

      try { currentAudioSource.current?.stop(); } catch { /* already stopped */ }

      const normGain = computeNormGain(audioBuffer);
      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime((params.volume ?? 1.0) * normGain, audioCtx.currentTime);
      gainNode.connect(getCompressor(audioCtx));

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;

      // Pitch shift via playbackRate: semitones to ratio
      // semitones = 12 * log2(ratio)  =>  ratio = 2^(semitones/12)
      const pitchRatio = Math.pow(2, (params.pitchShift ?? 0) / 12);
      const effectiveRate = (params.playbackRate ?? 1.0) * pitchRatio * speedMultiplier;

      source.playbackRate.setValueAtTime(effectiveRate, audioCtx.currentTime);
      
      // --- Auto-trim silence ---
      const channelData = audioBuffer.getChannelData(0);
      let startIndex = 0;
      let endIndex = channelData.length - 1;
      const threshold = 0.02; // 2% amplitude seuil de bruit
      while (startIndex < channelData.length && Math.abs(channelData[startIndex]) < threshold) startIndex++;
      while (endIndex > startIndex && Math.abs(channelData[endIndex]) < threshold) endIndex--;
      
      // On garde 50ms de marge de sécurité pour ne pas couper de consonnes
      const padding = Math.floor(0.05 * audioBuffer.sampleRate);
      const safeStartIndex = Math.max(0, startIndex - padding);
      const safeEndIndex = Math.min(channelData.length, endIndex + padding);
      const safeActiveSamples = safeEndIndex - safeStartIndex;

      const offsetSeconds = safeStartIndex / audioBuffer.sampleRate;
      const trueDuration = safeActiveSamples > 0 ? safeActiveSamples / audioBuffer.sampleRate : audioBuffer.duration;

      const durationSeconds = trueDuration / effectiveRate;
      onStart?.(durationSeconds);

      // --- NEW: Add EQ filters ---
      const bassNode = audioCtx.createBiquadFilter();
      bassNode.type = 'lowshelf';
      bassNode.frequency.value = 200;
      bassNode.gain.value = params.bass ?? 0;

      const midNode = audioCtx.createBiquadFilter();
      midNode.type = 'peaking';
      midNode.frequency.value = 1000;
      midNode.Q.value = 0.5;
      midNode.gain.value = params.mid ?? 0;

      const trebleNode = audioCtx.createBiquadFilter();
      trebleNode.type = 'highshelf';
      trebleNode.frequency.value = 3000;
      trebleNode.gain.value = params.treble ?? 0;

      source.connect(bassNode);
      bassNode.connect(midNode);
      midNode.connect(trebleNode);
      trebleNode.connect(gainNode);
      // On commence la lecture exactement au début du son (sans le silence)
      source.start(0, offsetSeconds, trueDuration);

      currentAudioSource.current = source;
      source.onended = () => {
        try { source.disconnect(); gainNode.disconnect(); } catch {}
        resolve();
      };
    });
  };

  // Once Gemini's free-tier daily quota is exhausted there's no point hammering
  // it for every line — each call wastes ~500ms+ and burns the user's patience.
  // Use a session-level kill switch so the whole replay just bypasses Gemini.
  const geminiDeadUntilRef = useRef<number>(0);
  const isGeminiDead = () => Date.now() < geminiDeadUntilRef.current;
  const markGeminiDead = (ms: number) => {
    geminiDeadUntilRef.current = Math.max(geminiDeadUntilRef.current, Date.now() + ms);
  };

  const fetchGeminiAudio = async (
    cleanText: string,
    voiceName: string,
    voiceStyle: string,
    aiConfig: AICascadeConfig,
  ): Promise<Blob | null> => {
    if (isGeminiDead()) return null;

    const persona = STYLE_PROMPTS[voiceStyle];
    const ttsText = cleanText;
    if (!ttsText) return null;

    const prompted = persona
      ? `Dis ceci ${persona}:\n"${ttsText}"`
      : `Dis ceci avec énergie et expressivité, comme un commentateur sportif:\n"${ttsText}"`;

    for (let i = 0; i < aiConfig.geminiKeys.length; i++) {
      const apiKey = aiConfig.geminiKeys[i].trim();
      if (!apiKey) continue;
      const ai = new GoogleGenAI({ apiKey });
      
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash-exp",
          contents: [{ parts: [{ text: prompted }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName } },
            },
          },
        });
        const parts = response.candidates?.[0]?.content?.parts;
        const audioPart = parts?.find(p => p.inlineData && p.inlineData.mimeType.includes("audio"));
        if (!audioPart?.inlineData?.data) continue;

        const binaryString = window.atob(audioPart.inlineData.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let j = 0; j < binaryString.length; j++) bytes[j] = binaryString.charCodeAt(j);
        
        return new Blob([bytes.buffer], { type: 'audio/pcm' });
      } catch (e: any) {
        const msg = String(e?.message || e);
        console.warn(`[ai-audio] Gemini #${i + 1} échoué:`, msg);
        if (/RESOURCE_EXHAUSTED|quota|free_tier_requests|429/i.test(msg)) {
          if (i === aiConfig.geminiKeys.length - 1) {
            console.warn('[gemini] quota épuisée pour TOUTES les clés → Gemini désactivé pour 30 min');
            markGeminiDead(30 * 60000);
          }
          continue;
        }
      }
    }
    return null;
  };

  // Quel "tier" (moteur TTS) a réellement servi la ligne — propagé jusqu'à
  // l'UI pour afficher un petit badge sur la bulle active.
  type Tier =
    | 'cache'
    | 'elevenlabs'
    | 'gemini'
    | 'edge'
    | 'gcloud'
    | 'hf'
    | 'xtts'
    | 'piper'
    | 'webspeech';

  type PreparedAudio =
    | { kind: 'blob'; tier: Tier; blob: Blob; format: 'pcm' | 'wav'; params?: VoiceOverride }
    | { kind: 'piper'; tier: Tier; text: string; voiceName: string; voiceStyle: string; params?: VoiceOverride }
    | { kind: 'webspeech'; tier: Tier; text: string; voiceName: string; voiceStyle: string; params?: VoiceOverride }
    | { kind: 'silent'; tier: Tier };

  // Phase fetch (non bloquante pour le playback) — peut être lancée en parallèle pour plusieurs lignes
  const prepareLineAudio = async (
    text: string,
    voiceName: string,
    voiceStyle: string,
    lineIdx: number,
    params?: VoiceOverride,
    charId?: string,
  ): Promise<PreparedAudio> => {
    if (!voiceEnabled) return { kind: 'silent', tier: 'webspeech' };

    const battleId = currentBattleId.current;
    const forcedProvider = params?.provider && params.provider !== 'auto' ? params.provider : null;

    // Compute Piper-specific pitch/rate adjustments (used for both cache retrieval and fresh synthesis)
    const [piperPitch, piperRate] = PIPER_STYLE_ADJUSTMENTS[voiceStyle] ?? [0, 1];
    const piperParams: VoiceOverride = {
      voice: voiceName,
      voiceStyle,
      ...(params ?? {}),
      pitchShift: (params?.pitchShift ?? 0) + piperPitch,
      playbackRate: (params?.playbackRate ?? 1.0) * piperRate,
    };

    // Cache lookup — quand un provider est forcé, on regarde aussi son slot dédié.
    if (battleId && lineIdx >= 0) {
      if (forcedProvider) {
        const providerCached = await getAudioBlob(battleId, lineIdx, voiceName + '__' + forcedProvider);
        if (providerCached && providerCached.blob.size > 500) {
          return { kind: 'blob', tier: 'cache', blob: providerCached.blob, format: providerCached.format, params };
        }
      }
      // Check main cache: Gemini (PCM) ou ElevenLabs (MP3 décodable en WAV)
      const cached = await getAudioBlob(battleId, lineIdx, voiceName);
      if (cached && cached.blob.size > 500) return { kind: 'blob', tier: 'cache', blob: cached.blob, format: cached.format, params };

      // Check Piper cache (saved under voiceName + '__piper' to avoid collision with Gemini/XTTS)
      const piperCached = await getAudioBlob(battleId, lineIdx, voiceName + '__piper');
      if (piperCached && piperCached.blob.size > 500) {
        console.info(`[voice] tier=piper-cache line=${lineIdx}`);
        return { kind: 'blob', tier: 'cache', blob: piperCached.blob, format: 'wav', params: piperParams };
      }
    }

    const apiKey = process.env.GEMINI_API_KEY || tempApiKey;
    // Clean text for ALL TTS providers: remove speaker prefix, emojis, and *actions*
    const cleanText = text
      .replace(/^[^:]+:\s*/, '')
      .replace(/[\u{1F600}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}⚡✨🏆]/gu, '')
      .replace(/\*[^*]+\*/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    // Handle custom prompt override
    const effectiveStyle = params?.customPrompt?.trim() ? '__custom__' : voiceStyle;
    if (params?.customPrompt?.trim()) {
      STYLE_PROMPTS['__custom__'] = params.customPrompt.trim();
    }

    // When the user has flipped "voix par défaut" for this character, we skip
    // every cloning tier (ElevenLabs + XTTS) and use the curated Gemini/Piper
    // voice directly — same pipeline as the Arbitre's intonation-rich voice.
    const useDefault = params?.useDefaultVoice === true;

    // Helper : persiste le blob dans le slot de cache approprié.
    const persist = (key: string, blob: Blob, fmt: 'pcm' | 'wav') => {
      if (battleId && lineIdx >= 0) {
        saveAudioBlob(battleId, lineIdx, key, blob, fmt).catch(() => {});
      }
    };

    try {
      // ─── Étape 1 : provider forcé en priorité (zéro régression : si KO → cascade) ───
      if (forcedProvider === 'edge') {
        const blob = await tryEdgeAudio(cleanText, params?.providerVoiceId);
        if (blob && blob.size > 500) {
          console.info(`[voice] tier=edge line=${lineIdx} voice=${params?.providerVoiceId}`);
          persist(voiceName + '__edge', blob, 'wav');
          return { kind: 'blob', tier: 'edge', blob, format: 'wav', params };
        }
      } else if (forcedProvider === 'gcloud') {
        const blob = await tryGCloudAudio(cleanText, params?.providerVoiceId);
        if (blob) {
          console.info(`[voice] tier=gcloud line=${lineIdx} voice=${params?.providerVoiceId}`);
          persist(voiceName + '__gcloud', blob, 'wav');
          return { kind: 'blob', tier: 'gcloud', blob, format: 'wav', params };
        }
      } else if (forcedProvider === 'hf') {
        const blob = await tryHuggingFaceAudio(cleanText);
        if (blob) {
          console.info(`[voice] tier=hf line=${lineIdx}`);
          persist(voiceName + '__hf', blob, 'wav');
          return { kind: 'blob', tier: 'hf', blob, format: 'wav', params };
        }
      } else if (forcedProvider === 'piper') {
        const blob = await getPiperBlob(cleanText, voiceName);
        if (blob) {
          console.info(`[voice] tier=piper(forced) line=${lineIdx}`);
          persist(voiceName + '__piper', blob, 'wav');
          return { kind: 'blob', tier: 'piper', blob, format: 'wav', params: piperParams };
        }
      } else if (forcedProvider === 'gemini' && apiKey) {
        const blob = await fetchGeminiAudio(cleanText, voiceName, effectiveStyle, getAIConfig());
        if (blob) {
          console.info(`[voice] tier=gemini(forced) line=${lineIdx}`);
          persist(voiceName, blob, 'pcm');
          return { kind: 'blob', tier: 'gemini', blob, format: 'pcm', params };
        }
      } else if (forcedProvider === 'elevenlabs') {
        const blob = await tryElevenLabsAudio(cleanText, charId);
        if (blob) {
          console.info(`[voice] tier=elevenlabs(forced) line=${lineIdx}`);
          persist(voiceName, blob, 'wav');
          return { kind: 'blob', tier: 'elevenlabs', blob, format: 'wav', params };
        }
      } else if (forcedProvider === 'xtts') {
        const blob = await tryXttsAudio(cleanText, charId);
        if (blob) {
          console.info(`[voice] tier=xtts(forced) line=${lineIdx}`);
          persist(voiceName, blob, 'wav');
          return { kind: 'blob', tier: 'xtts', blob, format: 'wav', params };
        }
      }

      // ─── Étape 2 : cascade par défaut (= mode 'auto') ───
      // Priorité 0 : ElevenLabs (voix clonée, ~1s, qualité maximale).
      if (!useDefault) {
        const elBlob = await tryElevenLabsAudio(cleanText, charId);
        if (elBlob) {
          console.info(`[voice] tier=elevenlabs line=${lineIdx} char=${charId}`);
          persist(voiceName, elBlob, 'wav');
          return { kind: 'blob', tier: 'elevenlabs', blob: elBlob, format: 'wav', params };
        }
      }

      if (apiKey) {
        const blob = await fetchGeminiAudio(cleanText, voiceName, effectiveStyle, getAIConfig());
        if (blob) {
          console.info(`[voice] tier=gemini line=${lineIdx} voice=${voiceName} style=${voiceStyle} default=${useDefault}`);
          persist(voiceName, blob, 'pcm');
          return { kind: 'blob', tier: 'gemini', blob, format: 'pcm', params };
        }
        console.warn(`[voice] tier=fallback (Gemini KO) line=${lineIdx} voice=${voiceName}`);
      } else if (!useDefault) {
        console.info(`[voice] tier=xtts (no API key) line=${lineIdx} voice=${voiceName}`);
      }

      // Edge TTS — gratuit illimité, excellente qualité, voix française par défaut.
      // Inséré ici dans la cascade pour combler le trou quand Gemini est mort.
      {
        const edgeBlob = await tryEdgeAudio(cleanText, params?.providerVoiceId);
        if (edgeBlob) {
          console.info(`[voice] tier=edge(cascade) line=${lineIdx}`);
          persist(voiceName + '__edge', edgeBlob, 'wav');
          return { kind: 'blob', tier: 'edge', blob: edgeBlob, format: 'wav', params };
        }
      }

      // XTTS v2 local voice cloning (requires scripts/tts_server.py running).
      // Skipped entirely when "voix par défaut" is on.
      if (!useDefault) {
        const xttsBlob = await tryXttsAudio(cleanText, charId);
        if (xttsBlob) {
          persist(voiceName, xttsBlob, 'wav');
          return { kind: 'blob', tier: 'xtts', blob: xttsBlob, format: 'wav', params };
        }
      }

      // Piper: synthesize eagerly and cache in IndexedDB for offline replay
      const piperBlob = await getPiperBlob(cleanText, voiceName);
      if (piperBlob && piperBlob.size > 500) {
        console.info(`[voice] tier=piper line=${lineIdx} voice=${voiceName}`);
        persist(voiceName + '__piper', piperBlob, 'wav');
        return { kind: 'blob', tier: 'piper', blob: piperBlob, format: 'wav', params: piperParams };
      }

      // Last resort: lazy Piper (plays at playback time, not cached)
      return { kind: 'piper', tier: 'webspeech', text: cleanText, voiceName, voiceStyle, params };
    } finally {
      if (params?.customPrompt?.trim()) delete STYLE_PROMPTS['__custom__'];
    }
  };

  const playPreparedAudio = async (
    prepared: PreparedAudio, 
    fallbackText: string,
    fallbackVoice: string,
    fallbackStyle: string,
    speedMultiplier: number = 1.0, 
    onStart?: (dur: number) => void
  ) => {
    if (prepared.kind === 'silent') {
      onStart?.(2.0 / speedMultiplier);
      await new Promise(r => setTimeout(r, 2000 / speedMultiplier));
      return;
    }

    const audioCtx = getAudioCtx();
    const gainNode = audioCtx.createGain();
    const vol = prepared.params?.volume ?? 1.0;
    gainNode.gain.setValueAtTime(vol * 0.75, audioCtx.currentTime);
    gainNode.connect(getCompressor(audioCtx));

    try {
      if (prepared.kind === 'blob') {
        try {
          await playPcmBlobWithParams(prepared.blob, prepared.format, prepared.params || { voice: '', voiceStyle: '', volume: vol }, speedMultiplier, onStart);
          return;
        } catch (err) {
          console.warn('[voice] Blob playback failed (corrupted cache?), falling back to webspeech', err);
        }
      }
      
      // Fallback ou WebSpeech natif
      if (prepared.kind === 'piper') {
        try {
          await playPiperTTS(prepared.text, prepared.voiceName, prepared.voiceStyle, audioCtx, gainNode, speedMultiplier, onStart);
          return;
        } catch {
          console.warn(`[voice] Piper KO → Web Speech (voix système, peu naturelle).`);
          await playWebSpeechEnhanced(prepared.text, prepared.voiceName, prepared.voiceStyle, prepared.params?.playbackRate ?? 1.0, prepared.params?.webPitch ?? 1.0, onStart);
        }
      } else {
        const text = prepared.kind === 'webspeech' ? prepared.text : fallbackText;
        const voice = prepared.kind === 'webspeech' ? prepared.voiceName : fallbackVoice;
        const style = prepared.kind === 'webspeech' ? prepared.voiceStyle : fallbackStyle;
        console.warn(`[voice] Web Speech utilisé (voix système, peu naturelle).`);
        await playWebSpeechEnhanced(text, voice, style, prepared.params?.playbackRate ?? 1.0, prepared.params?.webPitch ?? 1.0, onStart);
      }
    } finally {
      try { gainNode.disconnect(); } catch {}
    }
  };

  const generateBatch = async (count: number): Promise<{ ok: number; fail: number }> => {
    let ok = 0;
    let fail = 0;
    const aiConfig = getAIConfig();
    if (aiConfig.geminiKeys.length === 0 && !aiConfig.openaiKey && !aiConfig.groqKey) return { ok: 0, fail: count };

    for (let i = 0; i < count; i++) {
      try {
        const rp1 = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
        let rp2 = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
        while (rp2.id === rp1.id) rp2 = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
        const rStyle1 = STYLES[Math.floor(Math.random() * STYLES.length)];
        const rStyle2 = STYLES[Math.floor(Math.random() * STYLES.length)];
        const rArena = ARENAS[Math.floor(Math.random() * ARENAS.length)];
        const dur = [3, 5][Math.floor(Math.random() * 2)];

        const directives = getNarrativeDirectives(narrativeMode, rp1.name, rp2.name, dur);
        const voiceStyleDesc = (vs: string) =>
          vs === 'idiot' ? 'lent, stupide' : vs === 'enfant' ? 'gamin insolent' :
          vs === 'guerrier' ? 'crie ses attaques' : vs === 'creature' ? 'dit uniquement Pika pika' :
          vs === 'ivre' ? 'parle de façon pâteuse' : vs === 'scientifique_fou' ? 'sarcastique, rote' :
          vs === 'monotone' ? 'plat et glaçant' : 'personnalité standard';

        const prompt = `Tu es le "Grand Maître du Multivers". Génère un script de combat JSON.
- Combattant 1 : ${rp1.name} (Style : ${rStyle1.name}) → ${voiceStyleDesc(rp1.voiceStyle)}
- Combattant 2 : ${rp2.name} (Style : ${rStyle2.name}) → ${voiceStyleDesc(rp2.voiceStyle)}
- Arène : ${rArena.name}
- Rounds : EXACTEMENT ${dur}
- Mode : ${getNarrativeModeLabel(narrativeMode)}
DIRECTIVES :
${directives}
FORMAT JSON identique au schéma standard (intro, rounds, winner, finishingMove, conclusion).`;

        const result = await generateWithFallback(prompt, aiConfig, {
          type: Type.OBJECT,
          properties: {
            intro: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, speaker: { type: Type.STRING } }, required: ['text', 'speaker'] },
            rounds: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, dialogues: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { speaker: { type: Type.STRING }, text: { type: Type.STRING }, action: { type: Type.STRING } }, required: ['speaker', 'text'] } } }, required: ['title', 'dialogues'] } },
            winner: { type: Type.STRING },
            finishingMove: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, description: { type: Type.STRING }, speaker: { type: Type.STRING } }, required: ['type', 'description', 'speaker'] },
            conclusion: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, speaker: { type: Type.STRING } }, required: ['text', 'speaker'] },
          },
          required: ['intro', 'rounds', 'winner', 'finishingMove', 'conclusion'],
        });

        const data = JSON.parse(result.text?.trim() || '{}');
        await saveBattle({
          p1Id: rp1.id, p1Name: rp1.name, p1Img: rp1.img,
          p1Voice: rp1.voice, p1VoiceStyle: rp1.voiceStyle,
          p2Id: rp2.id, p2Name: rp2.name, p2Img: rp2.img,
          p2Voice: rp2.voice, p2VoiceStyle: rp2.voiceStyle,
          arenaId: rArena.id, arenaName: rArena.name, arenaImg: rArena.img,
          duration: dur, narrativeMode, script: data, winner: data.winner ?? '',
        });
        ok++;
        // Brief pause to avoid rate limiting
        await new Promise(r => setTimeout(r, 1200));
      } catch {
        fail++;
      }
    }
    return { ok, fail };
  };

  const STORY_THEMES = [
    "Une quête mystique pour retrouver un artefact perdu",
    "Une enquête policière dans un futur cyberpunk",
    "Une comédie absurde impliquant un chat et un banquier",
    "Une évasion spectaculaire d'une prison de haute sécurité",
    "Une exploration périlleuse d'une planète hostile",
    "Un tournoi de cuisine qui tourne mal",
    "Un road trip interdimensionnel hilarant",
    "Une invasion extraterrestre à déjouer",
    "La quête du meilleur burger du multivers",
    "Un mystère à résoudre dans un manoir hanté"
  ];

  const generateBatchStories = async (
    count: number,
    mode: 'linear' | 'interactive',
    chapters: number
  ): Promise<{ ok: number; fail: number }> => {
    let ok = 0;
    let fail = 0;
    const aiConfig = getAIConfig();
    if (aiConfig.geminiKeys.length === 0 && !aiConfig.openaiKey && !aiConfig.groqKey) return { ok: 0, fail: count };

    for (let i = 0; i < count; i++) {
      try {
        // Pick random characters (3-5)
        const shuffled = [...CHARACTERS].sort(() => Math.random() - 0.5);
        const numChars = 3 + Math.floor(Math.random() * 3); // 3-5
        const chars = shuffled.slice(0, numChars);
        const arena = ARENAS[Math.floor(Math.random() * ARENAS.length)];
        const theme = STORY_THEMES[Math.floor(Math.random() * STORY_THEMES.length)];
        const isInteractive = mode === 'interactive';

        const charNames = chars.map(c => c.name);
        const modeDirective = {
          1: "Mode FAMILLE : Pas de violence, pas de gros mots, ton bienveillant et magique. Style conte pour enfants.",
          2: "Mode COMIQUE : Humour absurde, situations ridicules, gags visuels décrits par le narrateur. Style cartoon.",
          3: "Mode SÉRIEUX : Ton dramatique, épique, enjeux élevés, style roman d'aventure sérieux ou thriller.",
          4: "Mode LÉGER : Ton familier, taquineries, un peu de piquant mais reste gentil et divertissant.",
          5: "Mode TRASH : Humour noir, gros mots créatifs, situations cyniques et décalées. Style déjanté.",
          6: "Mode HARDCORE : Sans filtre, trash extrême, style South Park / Tarantino. Dialogue percutant et situations chaotiques.",
        }[narrativeMode];

        const linesPerChapter = 5;
        const totalLines = chapters * linesPerChapter;

        const interactiveRule = isInteractive
          ? `Ajoute un champ "choices" avec 2-3 options après chaque groupe de ${linesPerChapter} lignes (sauf le dernier). Le dernier groupe doit avoir "isEnd": true.`
          : 'Ne mets pas de "choices". Mets "isEnd": true à la fin de l\'histoire.';

        const prompt = `Tu es le "Grand Archiviste du Multivers", un conteur de génie. Génère une histoire JSON.

PERSONNAGES (respecte leurs personnalités et tics de langage) : ${charNames.join(', ')}
LIEU : ${arena.name}
THÈME : ${theme}
${modeDirective}

RÈGLES :
- L'histoire doit faire EXACTEMENT ${totalLines} lignes de dialogue/narration.
- Chaque ligne "text" DOIT commencer par "NomDuPerso: " (exemple: "Homer Simpson: Oh punaise !).
- Pour le narrateur : "Narrateur: ..."
${interactiveRule}

FORMAT JSON :
{
  "title": "Titre de l'histoire",
  "lines": [
    { "speaker": "Nom", "text": "Nom: Dialogue", "action": "Action" }
    ${isInteractive ? ',"choices": [ { "text": "Choix 1", "action": "..." }, { "text": "Choix 2", "action": "..." } ], "isEnd": false' : ', "isEnd": true'}
  ]
}

Réponds UNIQUEMENT par le JSON.`;

        const result = await generateWithFallback(prompt, aiConfig);
        const text = result.text || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) { fail++; continue; }

        const storyJson = JSON.parse(jsonMatch[0]);

        const story = {
          title: storyJson.title || `Chronique : ${theme.substring(0, 40)}`,
          characterIds: chars.map(c => c.id),
          arenaId: arena.id,
          arenaName: arena.name,
          arenaImg: arena.img,
          theme,
          isInteractive,
          isFinished: true,
          script: storyJson.lines || []
        };

        await saveStory(story);
        ok++;
        await new Promise(r => setTimeout(r, 1200));
      } catch {
        fail++;
      }
    }
    return { ok, fail };
  };

  const handleReplay = (saved: SavedBattle) => {
    getAudioCtx();
    currentBattleId.current = saved.id;
    currentLineIndex.current = 0;
    // Priorité aux voix persistées dans SavedBattle, fallback sur CHARACTERS, puis défaut
    const findChar = (
      id: string,
      name: string,
      img: string,
      savedVoice?: string,
      savedStyle?: string,
    ) => {
      const base = CHARACTERS.find(c => c.id === id);
      return {
        id,
        name,
        img,
        color: base?.color ?? 'from-gray-700 to-black',
        faction: base?.faction ?? '',
        voice: savedVoice ?? base?.voice ?? 'Fenrir',
        voiceStyle: savedStyle ?? base?.voiceStyle ?? '',
      };
    };
    setP1(findChar(saved.p1Id, saved.p1Name, saved.p1Img, saved.p1Voice, saved.p1VoiceStyle) as typeof CHARACTERS[0]);
    setP2(findChar(saved.p2Id, saved.p2Name, saved.p2Img, saved.p2Voice, saved.p2VoiceStyle) as typeof CHARACTERS[0]);
    setArena(ARENAS.find(a => a.id === saved.arenaId) ?? ARENAS[0]);
    setBattleData(saved.script);
    setCurrentStep(0);
    setRevealedIdx(-1);
    setGameState('COMBAT');
  };

  // Pré-génère via XTTS toutes les répliques d'un combat sauvegardé.
  // Une fois en cache IDB, le replay est instantané et 100% offline.
  // Renvoie le rapport (ok / total). Émet la progression via onProgress.
  const preGenerateBattleVoices = async (
    saved: SavedBattle,
    onProgress?: (done: number, total: number, label: string) => void,
  ): Promise<{ ok: number; total: number; skipped: number; failed: number }> => {
    const script: any = saved.script;
    if (!script) return { ok: 0, total: 0, skipped: 0, failed: 0 };

    // Active temporairement l'ID du combat pour que prepareLineAudio mette en cache
    const previousBattleId = currentBattleId.current;
    currentBattleId.current = saved.id;

    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const p1Name = norm(saved.p1Name);
    const p2Name = norm(saved.p2Name);
    const p1V = saved.p1Voice ?? CHARACTERS.find(c => c.id === saved.p1Id)?.voice ?? 'Fenrir';
    const p2V = saved.p2Voice ?? CHARACTERS.find(c => c.id === saved.p2Id)?.voice ?? 'Fenrir';

    const resolveSpeaker = (speaker: string): { voiceName: string; voiceStyle: string; charId?: string; params: VoiceOverride } => {
      const s = norm(speaker || '');
      if (s.includes(p1Name) || p1Name.includes(s)) return { voiceName: p1V, voiceStyle: saved.p1VoiceStyle || '', charId: saved.p1Id, params: buildParams(saved.p1Id, p1V, saved.p1VoiceStyle || '') };
      if (s.includes(p2Name) || p2Name.includes(s)) return { voiceName: p2V, voiceStyle: saved.p2VoiceStyle || '', charId: saved.p2Id, params: buildParams(saved.p2Id, p2V, saved.p2VoiceStyle || '') };
      const p1First = p1Name.split(/[\s-]/)[0];
      const p2First = p2Name.split(/[\s-]/)[0];
      if (p1First.length > 2 && s.includes(p1First)) return { voiceName: p1V, voiceStyle: saved.p1VoiceStyle || '', charId: saved.p1Id, params: buildParams(saved.p1Id, p1V, saved.p1VoiceStyle || '') };
      if (p2First.length > 2 && s.includes(p2First)) return { voiceName: p2V, voiceStyle: saved.p2VoiceStyle || '', charId: saved.p2Id, params: buildParams(saved.p2Id, p2V, saved.p2VoiceStyle || '') };
      const arbitreStyle = '';
      return { voiceName: 'Aoede', voiceStyle: arbitreStyle, params: {
        voice: 'Aoede',
        voiceStyle: arbitreStyle,
        pitchShift: 0,
        playbackRate: 1.0,
        volume: 1.0,
        provider: 'edge',
        providerVoiceId: getDefaultEdgeVoice('Aoede', arbitreStyle),
        bass: 0, mid: 0, treble: 0
      } as VoiceOverride };
    };

    // Reconstruit la liste de lignes dans le MÊME ordre que la lecture (runStep)
    const lines: { text: string; speaker: string }[] = [];
    if (script.intro) lines.push({ text: script.intro.text, speaker: script.intro.speaker || 'Arbitre' });
    for (const round of (script.rounds ?? [])) {
      lines.push({ text: `${round.title} !`, speaker: 'Arbitre' });
      for (const d of (round.dialogues ?? [])) {
        lines.push({ text: d.text, speaker: d.speaker });
      }
    }
    if (script.finishingMove) {
      lines.push({
        text: script.finishingMove.text || script.finishingMove.description || '',
        speaker: script.finishingMove.speaker || 'Arbitre',
      });
    }
    if (script.conclusion) {
      lines.push({ text: script.conclusion.text, speaker: script.conclusion.speaker || 'Arbitre' });
    }

    const total = lines.length;
    let ok = 0, skipped = 0, failed = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const { voiceName, voiceStyle, charId, params } = resolveSpeaker(line.speaker);
      onProgress?.(i, total, line.speaker);

      const cleanText = (line.text || '')
        .replace(/^[^:]+:\s*/, '')
        .replace(/[\u{1F600}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}⚡✨🏆]/gu, '')
        .replace(/\*[^*]+\*/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

      if (!cleanText) {
        skipped++;
        continue;
      }

      const forcedProvider = params?.provider && params.provider !== 'auto' ? params.provider : null;
      let cacheKey = voiceName;
      if (forcedProvider === 'edge') cacheKey = voiceName + '__edge';
      else if (forcedProvider === 'gcloud') cacheKey = voiceName + '__gcloud';
      else if (forcedProvider === 'hf') cacheKey = voiceName + '__hf';
      else if (forcedProvider === 'piper') cacheKey = voiceName + '__piper';

      const existing = await getAudioBlob(saved.id, i, cacheKey);
      if (existing && existing.blob.size > 500) { ok++; continue; }

      // Try the requested provider exactly like prepareLineAudio
      let blob: Blob | null = null;
      let format: 'pcm' | 'wav' = 'wav';

      try {
        if (forcedProvider === 'edge') {
          blob = await tryEdgeAudio(cleanText, params?.providerVoiceId);
        } else if (forcedProvider === 'piper') {
          blob = await getPiperBlob(cleanText, voiceName);
        } else if (forcedProvider === 'gemini') {
          const apiKey = process.env.GEMINI_API_KEY || tempApiKey;
          if (apiKey) {
            blob = await fetchGeminiAudio(cleanText, voiceName, voiceStyle, getAIConfig());
          }
        } else if (forcedProvider === 'elevenlabs' && charId) {
          blob = await tryElevenLabsAudio(cleanText, charId);
        } else if (forcedProvider === 'xtts' && charId) {
          blob = await tryXttsAudio(cleanText, charId);
        }

        if (blob && blob.size > 500) {
          await saveAudioBlob(saved.id, i, cacheKey, blob, format);
          ok++;
        } else {
          // Si on n'a pas pu forcer, on tente le fallback prepareLineAudio standard
          const prepared = await prepareLineAudio(line.text || '', voiceName, voiceStyle, i, params, charId);
          if (prepared.kind === 'blob') {
            ok++;
          } else {
            failed++;
          }
        }
      } catch (err) {
        failed++;
      }
    }
    onProgress?.(total, total, '');
    
    // Restaure l'ID du combat
    currentBattleId.current = previousBattleId;
    return { ok, total, skipped, failed };
  };

  const generateCombat = async (isDemo = false) => {
    // Activation du contexte audio lors d'une interaction utilisateur
    getAudioCtx();
    setGameState('LOADING');

    if (isDemo) {
      await new Promise(r => setTimeout(r, 1500));
      setBattleData(MOCK_BATTLE);
      setCurrentStep(0);
      setRevealedIdx(-1);
      setGameState('COMBAT');
      return;
    }

    try {
      const aiConfig = getAIConfig();
      if (aiConfig.geminiKeys.length === 0 && !aiConfig.openaiKey && !aiConfig.groqKey) {
        setGameState('SETUP');
        throw new Error("Clé API manquante. Entre-la dans le menu 🔒 Contrôle Parental (tu peux en mettre plusieurs séparées par des virgules), ou lance la Démo.");
      }

      const trashDirectives = getNarrativeDirectives(narrativeMode, p1.name, p2.name, matchDuration);

      const prompt = `Tu es le "Grand Maître du Multivers", le narrateur officiel d'un tournoi de combat ultime. Génère un script de combat en JSON.

PARAMÈTRES D'ENTRÉE :
- Combattant 1 : ${p1.name} (Style : ${p1Style.name})
  → Personnalité vocale : ${p1.voiceStyle === 'idiot' ? 'Parle de manière lente et stupide, fait des "D\'oh!", mange en parlant' : p1.voiceStyle === 'enfant' ? 'Voix de gamin insolent, dit "Ay caramba!"' : p1.voiceStyle === 'enfant_diabolique' ? 'Voix de petite fille terrifiante, ricane de façon démoniaque' : p1.voiceStyle === 'gangster' ? 'Parle comme un gangster de quartier, argot de rue' : p1.voiceStyle === 'animal' ? 'Fait des miaulements agressifs "Miiaaou! Pschh!", griffes' : p1.voiceStyle === 'ivre' ? 'Parle de manière pâteuse, bafouille, rote, hoquets "Hic!"' : p1.voiceStyle === 'scientifique_fou' ? 'Sarcastique, rote en parlant "*buuurp*", condescendant' : p1.voiceStyle === 'nerveux' ? 'Bégaie, stressé "Oh j-je-jeez Rick!", paniqué' : p1.voiceStyle === 'guerrier' ? 'Crie ses attaques "KAMEHAMEHA!!!", déterminé' : p1.voiceStyle === 'creature' ? 'Dit uniquement "Pika pika! Pikaaa-CHUUU!" avec des variations' : p1.voiceStyle === 'froid' ? 'Phrases courtes, calme mortel, peu de mots' : p1.voiceStyle === 'ogre' ? 'Parle avec un accent rustique, fait des blagues d\'ogre' : p1.voiceStyle === 'menacant' ? 'Parle lentement avec menace "Je suis celui qui frappe à la porte"' : p1.voiceStyle === 'monotone' ? 'Ton plat et glaçant, pas d\'émotion visible, terrifiant' : p1.voiceStyle === 'drama_queen' ? 'Exagère tout "Oh mon Dieuuu!", théâtral' : p1.voiceStyle === 'presse' ? 'Parle vite, stressé, toujours pressé "J\'ai une commande!"' : 'Personnalité standard'}
- Combattant 2 : ${p2.name} (Style : ${p2Style.name})
  → Personnalité vocale : ${p2.voiceStyle === 'idiot' ? 'Parle de manière lente et stupide, fait des "D\'oh!", mange en parlant' : p2.voiceStyle === 'enfant' ? 'Voix de gamin insolent, dit "Ay caramba!"' : p2.voiceStyle === 'enfant_diabolique' ? 'Voix de petite fille terrifiante, ricane de façon démoniaque' : p2.voiceStyle === 'gangster' ? 'Parle comme un gangster de quartier, argot de rue' : p2.voiceStyle === 'animal' ? 'Fait des miaulements agressifs "Miiaaou! Pschh!", griffes' : p2.voiceStyle === 'ivre' ? 'Parle de manière pâteuse, bafouille, rote, hoquets "Hic!"' : p2.voiceStyle === 'scientifique_fou' ? 'Sarcastique, rote en parlant "*buuurp*", condescendant' : p2.voiceStyle === 'nerveux' ? 'Bégaie, stressé "Oh j-je-jeez Rick!", paniqué' : p2.voiceStyle === 'guerrier' ? 'Crie ses attaques "KAMEHAMEHA!!!", déterminé' : p2.voiceStyle === 'creature' ? 'Dit uniquement "Pika pika! Pikaaa-CHUUU!" avec des variations' : p2.voiceStyle === 'froid' ? 'Phrases courtes, calme mortel, peu de mots' : p2.voiceStyle === 'ogre' ? 'Parle avec un accent rustique, fait des blagues d\'ogre' : p2.voiceStyle === 'menacant' ? 'Parle lentement avec menace "Je suis celui qui frappe à la porte"' : p2.voiceStyle === 'monotone' ? 'Ton plat et glaçant, pas d\'émotion visible, terrifiant' : p2.voiceStyle === 'drama_queen' ? 'Exagère tout "Oh mon Dieuuu!", théâtral' : p2.voiceStyle === 'presse' ? 'Parle vite, stressé, toujours pressé "J\'ai une commande!"' : 'Personnalité standard'}
- Arène : ${arena.name}
- Nombre de rounds requis : EXACTEMENT ${matchDuration} rounds.
- Mode : ${getNarrativeModeLabel(narrativeMode)}

DIRECTIVES DE RÉDACTION :
${trashDirectives}

IMPORTANT POUR LA VOIX : Chaque réplique sera lue par un moteur de synthèse vocale. Écris les dialogues de manière à ce qu'ils sonnent naturels à l'oral. Utilise des pauses (...), des cris (!!!), des hésitations, des onomatopées qui correspondent à la personnalité vocale décrite ci-dessus. Les répliques doivent être COURTES (max 2-3 phrases) pour être fluides en TTS.

FORMAT JSON REQUIS :
{
  "intro": { "text": "Bienvenue dans l'arène de ${arena.name} ! Que le combat commence ! Ding ding !", "speaker": "Arbitre" },
  "rounds": [
    {
      "title": "ROUND 1",
      "dialogues": [
        { "speaker": "${p1.name}", "text": "${p1.name}: Ta réplique trash ici ! Bam !", "action": "Provocation" },
        { "speaker": "${p2.name}", "text": "${p2.name}: Ma réponse ! Grrr...", "action": "Réplique" }
      ]
    }
  ],
  "winner": "${p1.name}",
  "finishingMove": { "type": "FATALITY", "description": "FATALITY! ${p1.name} détruit son adversaire ! K.O. !", "speaker": "Arbitre" },
  "conclusion": { "text": "La victoire est absolue pour ${p1.name} ! Mwahaha !", "speaker": "Arbitre" }
}`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          intro: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, speaker: { type: Type.STRING } }, required: ["text", "speaker"] },
          rounds: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                dialogues: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      speaker: { type: Type.STRING },
                      text: { type: Type.STRING },
                      action: { type: Type.STRING }
                    },
                    required: ["speaker", "text"]
                  }
                }
              },
              required: ["title", "dialogues"]
            }
          },
          winner: { type: Type.STRING },
          finishingMove: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, description: { type: Type.STRING }, speaker: { type: Type.STRING } }, required: ["type", "description", "speaker"] },
          conclusion: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, speaker: { type: Type.STRING } }, required: ["text", "speaker"] }
        },
        required: ["intro", "rounds", "winner", "finishingMove", "conclusion"]
      };

      const result = await generateWithFallback(prompt, aiConfig, schema);
      const data = JSON.parse(result.text?.trim() || "{}");
      const battleId = await saveBattle({
        p1Id: p1.id, p1Name: p1.name, p1Img: p1.img,
        p1Voice: p1.voice, p1VoiceStyle: p1.voiceStyle,
        p2Id: p2.id, p2Name: p2.name, p2Img: p2.img,
        p2Voice: p2.voice, p2VoiceStyle: p2.voiceStyle,
        arenaId: arena.id, arenaName: arena.name, arenaImg: arena.img,
        duration: matchDuration,
        narrativeMode,
        script: data,
        winner: data.winner ?? '',
      });
      currentBattleId.current = battleId;
      currentLineIndex.current = 0;
      setBattleData(data);
      setCurrentStep(0);
      setRevealedIdx(-1);
      setGameState('COMBAT');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message);
      setGameState('ERROR');
    }
  };

  useEffect(() => {
    let isActive = true;
    const runStep = async () => {
      const totalSteps = battleData?.rounds ? battleData.rounds.length + 2 : 0;
      if (gameState !== 'COMBAT' || !battleData || currentStep >= totalSteps) return;
      setIsSpeaking(true);
      // Hide every line of the upcoming step until its voice catches up.
      setRevealedIdx(-1);

      let lines = [];
      if (currentStep === 0) {
        lines = [battleData.intro];
      } else if (currentStep > 0 && currentStep <= battleData.rounds.length) {
        const round = battleData.rounds[currentStep - 1];
        lines = [{ text: `${round.title} !`, speaker: "Arbitre" }, ...round.dialogues];
      } else {
        lines = [battleData.finishingMove, battleData.conclusion];
      }

      // PREFETCH PARALLÈLE : on lance le fetch des N lignes en même temps,
      // puis on joue séquentiellement → lignes 2..N déjà prêtes pendant que la 1 joue.
      const baseIdx = currentLineIndex.current;
      currentLineIndex.current += lines.length;

      const preparedPromises = lines.map((line, i) => {
        const textToSpeak = line.text || line.description;
        const { voiceName, voiceStyle, charId, params } = getVoiceForSpeaker(line.speaker || 'Arbitre');
        return prepareLineAudio(textToSpeak, voiceName, voiceStyle, baseIdx + i, params, charId);
      });

      for (let i = 0; i < lines.length; i++) {
        if (!isActive) break;
        // Reveal this line just before its voice starts (or during buffering).
        setRevealedIdx(i);
        setBufferingIdx(i);
        const prepared = await preparedPromises[i];
        setBufferingIdx(-1);
        if (!isActive) break;
        setActiveLineIdx(i);
        setCurrentTier(prepared.tier);
        const { voiceName, voiceStyle } = getVoiceForSpeaker(lines[i].speaker || 'Arbitre');
        const textToSpeak = lines[i].text || lines[i].description;
        await playPreparedAudio(prepared, textToSpeak, voiceName, voiceStyle, storySpeed, (dur) => setActiveLineDuration(dur));
        setActiveLineIdx(-1);
        setCurrentTier(null);
        setActiveLineDuration(0);
      }

      if (isActive) { setBufferingIdx(-1); setCurrentTier(null); }
      setIsSpeaking(false);
      if (isActive && currentStep < totalSteps - 1) {
        await new Promise(r => setTimeout(r, 500 / storySpeed));
        setCurrentStep(prev => prev + 1);
      }
    };
    runStep();
    return () => {
      isActive = false;
    };
  }, [currentStep, gameState, battleData, voiceEnabled]);

  // Stoppe l'audio uniquement quand on quitte le combat (vrai reset)
  useEffect(() => {
    if (gameState !== 'COMBAT' && currentAudioSource.current) {
      try { currentAudioSource.current.stop(); } catch {}
      currentAudioSource.current = null;
    }
  }, [gameState]);

  // Si mode Accueil, on affiche la nouvelle HomePage
  if (appMode === 'HOME') {
    return (
      <>
        <HomePage onSelectMode={setAppMode} narrativeMode={narrativeMode} onOpenParentalControl={() => setShowParentalModal(true)} />
        <AnimatePresence>
          {showParentalModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
              onClick={() => { setShowParentalModal(false); setParentalCode(""); setParentalError(false); setPendingMode(null); setShowConfirm(false); }}
            >
              <motion.div
                initial={{ scale: 0.8, y: 40 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 40 }}
                onClick={(e) => e.stopPropagation()}
                className={`bg-gray-900 border-2 border-red-600/60 rounded-3xl p-6 w-full shadow-[0_0_60px_rgba(220,38,38,0.3)] relative max-h-[90vh] overflow-y-auto transition-all ${parentalTab === 'voix' ? 'max-w-lg' : 'max-w-sm'}`}
              >
                <button
                  onClick={() => { setShowParentalModal(false); setParentalCode(""); setParentalError(false); setPendingMode(null); setShowConfirm(false); setParentalTab('mode'); }}
                  className="absolute top-3 right-3 p-1 text-gray-500 hover:text-white transition-colors z-10"
                >
                  <X size={20} />
                </button>
                <div className="text-center mb-3">
                  <h3 className="sf-title text-xl text-red-500 uppercase">Contrôle Parental</h3>
                </div>
                <div className="flex gap-1 mb-4 bg-gray-800 rounded-xl p-1">
                  <button
                    onClick={() => setParentalTab('mode')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${parentalTab === 'mode' ? 'bg-red-700 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                  >🎮 Mode</button>
                  <button
                    onClick={() => setParentalTab('voix')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${parentalTab === 'voix' ? 'bg-purple-700 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                  >🎙️ Voix</button>
                </div>
                {parentalTab === 'mode' && (<>
                  <div className="text-center mb-4 px-4 py-2 rounded-xl bg-gray-800 border border-gray-700">
                    <span className="text-xs uppercase tracking-wider font-bold text-gray-400">Mode actuel : </span>
                    <span className="font-black text-sm text-white">{NARRATIVE_MODE_META[narrativeMode].icon} {NARRATIVE_MODE_META[narrativeMode].name}</span>
                  </div>
                  <div className="mb-4 space-y-3">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Cerveaux Gemini (Séparez par virgules)</label>
                      <div className="flex gap-2">
                        <input type="password" placeholder="AIza... , AIza..." value={tempApiKey} onChange={e => saveApiKey(e.target.value)} className="flex-1 bg-black border border-gray-700 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-yellow-500 transition-colors" />
                        {tempApiKey && <button onClick={() => saveApiKey('')} className="px-2 py-1 rounded-lg text-[10px] text-gray-500 hover:text-red-400 border border-gray-700 hover:border-red-700 transition-colors"><X size={12} /></button>}
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-800">
                      <label className="text-[9px] text-gray-600 uppercase tracking-widest block mb-2 font-bold italic">Options de Secours (Fallback)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] text-gray-500 block mb-1">Groq Key (Llama 3.3)</label>
                          <input type="password" placeholder="gsk_..." value={groqKey} onChange={e => saveGroqKey(e.target.value)} className="w-full bg-black border border-gray-800 rounded-lg px-2 py-1.5 text-[10px] font-mono outline-none focus:border-purple-500 transition-colors" />
                        </div>
                        <div>
                          <label className="text-[8px] text-gray-500 block mb-1">OpenAI Key (GPT-4o)</label>
                          <input type="password" placeholder="sk-..." value={openaiKey} onChange={e => saveOpenaiKey(e.target.value)} className="w-full bg-black border border-gray-800 rounded-lg px-2 py-1.5 text-[10px] font-mono outline-none focus:border-blue-500 transition-colors" />
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] text-gray-500 block mb-1">DeepInfra Key</label>
                          <input type="password" placeholder="Key..." value={deepInfraKey} onChange={e => saveDeepInfraKey(e.target.value)} className="w-full bg-black border border-gray-800 rounded-lg px-2 py-1.5 text-[10px] font-mono outline-none focus:border-cyan-500 transition-colors" />
                        </div>
                        <div>
                          <label className="text-[8px] text-gray-500 block mb-1">DeepSeek Key</label>
                          <input type="password" placeholder="sk-..." value={deepseekKey} onChange={e => saveDeepseekKey(e.target.value)} className="w-full bg-black border border-gray-800 rounded-lg px-2 py-1.5 text-[10px] font-mono outline-none focus:border-emerald-500 transition-colors" />
                        </div>
                      </div>
                    </div>

                    <p className="text-[9px] text-gray-600 bg-black/40 p-2 rounded-lg border border-gray-800/50">
                      {getAIConfig().geminiKeys.length > 0 
                        ? `✓ ${getAIConfig().geminiKeys.length} cerveau(x) Gemini actifs. Fallback auto sur la suite si quota épuisé.` 
                        : '⚠️ Aucune clé Gemini configurée.'}
                    </p>
                  </div>
                  <NarrativeModeSelector
                    current={pendingMode ?? narrativeMode}
                    onChange={(mode) => {
                      if (mode === 1) { applyNarrativeMode(1); setShowParentalModal(false); setParentalCode(""); setParentalError(false); setPendingMode(null); setShowConfirm(false); }
                      else { setPendingMode(mode); setParentalCode(""); setParentalError(false); setShowConfirm(false); }
                    }}
                  />
                  {pendingMode !== null && pendingMode > 1 && (
                    <div className="mt-4">
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-2">Code Parental pour {NARRATIVE_MODE_META[pendingMode].icon} {NARRATIVE_MODE_META[pendingMode].name}</label>
                      <input type="password" maxLength={4} value={parentalCode} onChange={(e) => { setParentalCode(e.target.value.replace(/\D/g, '')); setParentalError(false); }} placeholder="● ● ● ●" className={`w-full bg-black border-2 rounded-xl px-4 py-3 text-center text-lg tracking-[0.5em] font-mono outline-none transition-colors ${parentalError ? 'border-red-500 animate-shake' : 'border-gray-700 focus:border-red-500'}`} onKeyDown={(e) => { if (e.key === 'Enter' && parentalCode === PARENTAL_CODE) { if (NARRATIVE_MODE_META[pendingMode].requiresConfirm && !showConfirm) { setShowConfirm(true); } else { applyNarrativeMode(pendingMode); setShowParentalModal(false); setParentalCode(""); setPendingMode(null); setShowConfirm(false); } } else if (e.key === 'Enter') { setParentalError(true); } }} />
                      {parentalError && <p className="text-red-400 text-[10px] text-center mt-1 animate-pulse">❌ Code incorrect !</p>}
                      {showConfirm && <p className="text-orange-400 text-[10px] text-center mt-2 animate-pulse">⚠️ Mode {NARRATIVE_MODE_META[pendingMode].name} — Contenu adulte. Confirmer ?</p>}
                      <button onClick={() => { if (parentalCode !== PARENTAL_CODE) { setParentalError(true); return; } if (NARRATIVE_MODE_META[pendingMode].requiresConfirm && !showConfirm) { setShowConfirm(true); return; } applyNarrativeMode(pendingMode); setShowParentalModal(false); setParentalCode(""); setPendingMode(null); setShowConfirm(false); }} className="w-full mt-3 py-3 rounded-xl bg-red-700 hover:bg-red-600 text-white font-black uppercase text-sm tracking-wider transition-colors">{showConfirm ? '⚠️ Confirmer' : `Activer ${NARRATIVE_MODE_META[pendingMode].icon} ${NARRATIVE_MODE_META[pendingMode].name}`}</button>
                    </div>
                  )}
                  {narrativeMode > 1 && <BatchGenerator onGenerateBattles={generateBatch} onGenerateStories={generateBatchStories} />}
                </>)}
                {parentalTab === 'voix' && (
                  <VoiceConfigurator characters={CHARACTERS} overrides={voiceOverrides} stylePrompts={STYLE_PROMPTS} onSave={saveVoiceOverrides} onTestVoice={testVoice} />
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // --- LOGIQUE STORY MODE ---
  
  const handleStartStory = async (config: any) => {
    setAppMode('STORY_PLAY');
    setIsGeneratingStory(true);
    setErrorMsg("");

    if (!config.characters || config.characters.length === 0) {
      setErrorMsg("Ajoutez au moins un personnage avant de lancer l'aventure.");
      setAppMode('STORY_CONFIG');
      setIsGeneratingStory(false);
      return;
    }

    try {
      const isMaPremiereAventure = config.theme.includes('Ma Première Aventure');

      if (isMaPremiereAventure) {
        // Mode "Ma Première Aventure" : On fusionne l'intro et le choix pour éviter les doublons
        const initialLines = [
          { 
            speaker: "Narrateur", 
            text: `Narrateur: Bienvenue dans cette nouvelle aventure : "${config.theme}". Avant de partir, tu dois choisir ton héros. Qui vas-tu incarner ?`, 
            action: "Choix du Héros",
            choices: config.characters.map((c: any) => ({
              text: `Incarner ${c.name}`,
              action: `Le joueur choisit d'incarner ${c.name}. Ce personnage sera le héros principal et commence avec son équipement de base.`
            }))
          }
        ];

        const newStory: Omit<SavedStory, 'id' | 'createdAt'> = {
          title: config.theme,
          characterIds: config.characters.map((c: any) => c.id),
          arenaId: config.arena.id,
          arenaName: config.arena.name,
          arenaImg: config.arena.img,
          theme: config.theme,
          isInteractive: true,
          isFinished: false,
          script: initialLines
        };

        const id = await saveStory(newStory);
        const saved = await getStory(id);
        if (saved) setCurrentStory(saved);
        return;
      }

      const aiConfig = getAIConfig();
      if (aiConfig.geminiKeys.length === 0 && !aiConfig.openaiKey && !aiConfig.groqKey) {
        throw new Error("Une clé API Gemini est requise pour générer des histoires non-MPA.");
      }

      const charNames = config.characters.map((c: any) => c.name);
      const prompt = getStoryDirectives(narrativeMode, charNames, config.arena.name, config.theme, config.isInteractive, undefined, undefined, 0, config.duration ?? 5);

      const result = await generateWithFallback(prompt, aiConfig);
      const text = result.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Format JSON invalide reçu de l'IA.");
      
      const storyJson: StoryChapterJSON = JSON.parse(jsonMatch[0]);
      
      const newLines = [...storyJson.lines];
      if (storyJson.choices && newLines.length > 0) {
        newLines[newLines.length - 1].choices = storyJson.choices;
      }
      
      const newStory: Omit<SavedStory, 'id' | 'createdAt'> = {
        title: storyJson.title || "Une Nouvelle Chronique",
        characterIds: config.characters.map((c: any) => c.id),
        arenaId: config.arena.id,
        arenaName: config.arena.name,
        arenaImg: config.arena.img,
        theme: config.theme,
        isInteractive: config.isInteractive,
        isFinished: !!storyJson.isEnd,
        script: newLines
      };

      const id = await saveStory(newStory);
      const saved = await getStory(id);
      if (saved) setCurrentStory(saved);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Échec de la génération de l'histoire: " + err.message);
      setAppMode('STORY_CONFIG');
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const handleChoice = async (choiceText: string, choiceAction: string, inventoryUpdate?: { type: 'ITEM' | 'ALLY', name: string }) => {
    if (!currentStory) return;
    setIsGeneratingStory(true);

    const aiConfig = getAIConfig();
    try {
      const charNames = currentStory.characterIds.map(id => CHARACTERS.find(c => c.id === id)?.name || id);
      const previousContext = currentStory.script.map(l => `${l.speaker}: ${l.text}`).join('\n');
      const choiceContext = `Le lecteur a choisi : "${choiceText}" (${choiceAction})`;
      
      // Mise à jour de l'inventaire si c'est un choix MPA
      let updatedInventory = { 
        items: [], 
        allies: [], 
        ...currentStory.inventory 
      };
      
      // 1. Choix du Héros
      if (choiceText.startsWith("Incarner ")) {
        const heroName = choiceText.replace("Incarner ", "");
        const hero = CHARACTERS.find(c => c.name === heroName);
        if (hero) updatedInventory.heroId = hero.id;
      }
      
      // 2. Mise à jour via inventoryUpdate de l'IA
      if (inventoryUpdate) {
        if (inventoryUpdate.type === 'ITEM' && !updatedInventory.items.includes(inventoryUpdate.name)) {
          updatedInventory.items = [...updatedInventory.items, inventoryUpdate.name];
        } else if (inventoryUpdate.type === 'ALLY' && !updatedInventory.allies.includes(inventoryUpdate.name)) {
          updatedInventory.allies = [...updatedInventory.allies, inventoryUpdate.name];
        }
      }

      const prompt = getStoryDirectives(
        narrativeMode, 
        charNames, 
        currentStory.arenaName, 
        currentStory.theme, 
        true, 
        `${previousContext}\n\n${choiceContext}`,
        updatedInventory,
        currentStory.script.length
      );

      const result = await generateWithFallback(prompt, aiConfig);
      const text = result.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Format JSON invalide reçu de l'IA.");
      
      const storyJson: StoryChapterJSON = JSON.parse(jsonMatch[0]);
      
      const newLines = [...storyJson.lines];
      if (storyJson.choices && newLines.length > 0) {
        newLines[newLines.length - 1].choices = storyJson.choices;
      }
      
      const updatedStory = {
        ...currentStory,
        isFinished: !!storyJson.isEnd,
        script: [...currentStory.script, ...newLines],
        inventory: updatedInventory
      };

      await updateStory(updatedStory);
      setCurrentStory(updatedStory);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Échec de la suite de l'histoire: " + err.message);
      setGameState('ERROR');
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const playStoryVoice = async (line: StoryLine, index: number, storyId: string, onStart?: (duration: number) => void) => {
    if (!voiceEnabled) return;

    // Check cache first
    const cached = await getStoryAudio(storyId, index, line.speaker);
    if (cached) {
      const params = getVoiceForSpeaker(line.speaker).params || ({} as VoiceOverride);
      await playPcmBlobWithParams(cached.blob, cached.format, params, 1.0, onStart);
      return;
    }

    // Generate and save
    const { voiceName, voiceStyle, charId, params } = getVoiceForSpeaker(line.speaker);
    const cleanText = line.text.replace(/^[^:]+:\s*/, '');

    const apiKey = process.env.GEMINI_API_KEY || tempApiKey;
    let blob: Blob | null = null;
    let format: 'pcm' | 'wav' = 'pcm';

    if (apiKey) {
      blob = await fetchGeminiAudio(cleanText, voiceName, voiceStyle, getAIConfig());
      format = 'pcm';
    }

    if (!blob) {
      blob = await tryEdgeAudio(cleanText, params?.providerVoiceId || getDefaultEdgeVoice(voiceName, voiceStyle));
      format = 'wav';
    }

    if (blob) {
      await saveStoryAudio(storyId, index, line.speaker, blob, format);
      await playPcmBlobWithParams(blob, format, params || ({} as VoiceOverride), 1.0, onStart);
    }
  };

  if (appMode === 'STORY_CONFIG') {
    return (
      <div className="relative overflow-x-hidden bg-mesh min-h-screen">
        {/* Navigation Header */}
        <div className="fixed top-0 left-0 right-0 z-[100] px-4 py-3 flex justify-between items-center pointer-events-none">
          <motion.button
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            onClick={() => setAppMode('HOME')}
            className="p-3 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 text-white hover:bg-amber-600 transition-all shadow-2xl pointer-events-auto group"
            title="Accueil"
          >
            <Home size={22} className="group-hover:scale-110 transition-transform" />
          </motion.button>
          
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex gap-2 pointer-events-auto"
          >
            <button
              onClick={() => setAppMode('STORY_LIBRARY')}
              className="p-3 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 text-white hover:bg-amber-600 transition-all shadow-2xl group"
              title="Bibliothèque"
            >
              <HistoryIcon size={22} className="group-hover:rotate-12 transition-transform" />
            </button>
          </motion.div>
        </div>

        <StoryConfigurator onStart={handleStartStory} onBack={() => setAppMode('HOME')} errorMsg={errorMsg} />
      </div>
    );
  }

  if (appMode === 'STORY_LIBRARY') {
    return <StoryLibrary onReplay={(story) => { setCurrentStory(story); setAppMode('STORY_PLAY'); }} onBack={() => setAppMode('STORY_CONFIG')} />;
  }

  if (appMode === 'STORY_PLAY') {
    if (!currentStory) {
      return (
        <div className="h-screen bg-[#1a140f] flex flex-col items-center justify-center text-[#e2d1b3] font-serif">
          <RefreshCw size={48} className="animate-spin text-amber-500 mb-4" />
          <p className="text-xl italic animate-pulse tracking-widest">L'histoire s'écrit dans les étoiles...</p>
        </div>
      );
    }
    return (
      <StoryViewer
        story={currentStory}
        onChoice={handleChoice}
        onBack={() => {
          setCurrentStory(null);
          setAppMode('STORY_CONFIG');
        }}
        playVoice={playStoryVoice}
        stopVoice={() => { try { currentAudioSource.current?.stop(); } catch {} }}
        isGenerating={isGeneratingStory}
      />
    );
  }

  // Sinon, c'est le mode BRAWLER (le comportement existant)
  if (gameState === 'COMBAT') {
    return (
      <div className="relative">
        <CombatView p1={p1} p2={p2} arena={arena} battleData={battleData} currentStep={currentStep} activeLineIdx={activeLineIdx} activeLineDuration={activeLineDuration} bufferingIdx={bufferingIdx} revealedIdx={revealedIdx} currentTier={currentTier} storySpeed={storySpeed} setStorySpeed={setStorySpeed} onReset={() => setGameState('SETUP')} />
        <button
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className="fixed bottom-4 right-4 z-50 p-3 bg-gray-900/80 rounded-full border border-gray-700 text-white hover:bg-red-600 transition-colors"
        >
          {voiceEnabled ? <Volume2 size={24} /> : <Volume2 size={24} className="opacity-40" />}
        </button>
      </div>
    );
  }

  if (gameState === 'ERROR') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-10 text-center">
        <Skull size={64} className="text-red-500 mb-6" />
        <h2 className="text-4xl font-black text-white uppercase italic mb-4">Erreur Fatale</h2>
        <p className="text-gray-400 max-w-md mb-8">{errorMsg}</p>
        <button onClick={() => setGameState('SETUP')} className="px-8 py-3 bg-red-600 text-white font-bold rounded-full hover:bg-red-700 transition-colors">Réessayer</button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white font-sans overflow-hidden p-2 md:p-4 flex flex-col items-center selection:bg-red-500/30 scanlines">
      {/* Street Fighter Audio - multiple sources for reliability */}
      <audio ref={audioBgRef} loop preload="auto">
        <source src="https://vgmsite.com/soundtracks/street-fighter-ii-the-definitive-soundtrack/ynidrlgp/1-02%20Ryu%20Stage.mp3" type="audio/mpeg" />
        <source src="https://archive.org/download/StreetFighterIIMusic/SF2_Guile.mp3" type="audio/mpeg" />
      </audio>
      
      {/* Top-right buttons */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        {/* Retour à l'accueil */}
        <button
          onClick={() => setAppMode('HOME')}
          className="p-3 bg-gray-900/80 rounded-full border border-gray-700 text-white transition-colors shadow-lg hover:bg-gray-700 hover:border-gray-500"
          title="Retour à l'accueil"
        >
          <Home size={22} />
        </button>

        {/* Bibliothèque de combats sauvegardés */}
        <BattleLibrary onReplay={handleReplay} onPreGenerate={preGenerateBattleVoices} />

        {/* Bouton Musique */}
        <button
          onClick={() => {
            setMusicEnabled(!musicEnabled);
            // Force user interaction to unlock audio context
            if (!musicEnabled && audioBgRef.current) {
              audioBgRef.current.play().catch(() => {});
            }
          }}
          className="p-3 bg-gray-900/80 rounded-full border border-gray-700 text-white hover:bg-yellow-600 transition-colors shadow-lg"
        >
          {musicEnabled ? <Music size={24} className="text-yellow-500 animate-pulse" /> : <Music size={24} className="opacity-40" />}
        </button>
      </div>

      {/* Parental Control Modal */}
      <AnimatePresence>
        {showParentalModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => { setShowParentalModal(false); setParentalCode(""); setParentalError(false); setPendingMode(null); setShowConfirm(false); }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 40 }}
              onClick={(e) => e.stopPropagation()}
              className={`bg-gray-900 border-2 border-red-600/60 rounded-3xl p-6 w-full shadow-[0_0_60px_rgba(220,38,38,0.3)] relative max-h-[90vh] overflow-y-auto transition-all ${parentalTab === 'voix' ? 'max-w-lg' : 'max-w-sm'}`}
            >
              <button
                onClick={() => { setShowParentalModal(false); setParentalCode(""); setParentalError(false); setPendingMode(null); setShowConfirm(false); setParentalTab('mode'); }}
                className="absolute top-3 right-3 p-1 text-gray-500 hover:text-white transition-colors z-10"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-3">
                <h3 className="sf-title text-xl text-red-500 uppercase">Contrôle Parental</h3>
              </div>

              {/* Tab bar */}
              <div className="flex gap-1 mb-4 bg-gray-800 rounded-xl p-1">
                <button
                  onClick={() => setParentalTab('mode')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    parentalTab === 'mode'
                      ? 'bg-red-700 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  🎮 Mode
                </button>
                <button
                  onClick={() => setParentalTab('voix')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    parentalTab === 'voix'
                      ? 'bg-purple-700 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  🎙️ Voix
                </button>
              </div>

              {/* ─── MODE TAB ─── */}
              {parentalTab === 'mode' && (<>
              {/* Current mode badge */}
              <div className="text-center mb-4 px-4 py-2 rounded-xl bg-gray-800 border border-gray-700">
                <span className="text-xs uppercase tracking-wider font-bold text-gray-400">Mode actuel : </span>
                <span className="font-black text-sm text-white">{NARRATIVE_MODE_META[narrativeMode].icon} {NARRATIVE_MODE_META[narrativeMode].name}</span>
              </div>

              {/* API Key — behind PIN, stored in localStorage only */}
                  <div className="mb-4 space-y-3">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Cerveaux Gemini (Séparez par virgules)</label>
                      <div className="flex gap-2">
                        <input type="password" placeholder="AIza... , AIza..." value={tempApiKey} onChange={e => saveApiKey(e.target.value)} className="flex-1 bg-black border border-gray-700 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-yellow-500 transition-colors" />
                        {tempApiKey && <button onClick={() => saveApiKey('')} className="px-2 py-1 rounded-lg text-[10px] text-gray-500 hover:text-red-400 border border-gray-700 hover:border-red-700 transition-colors"><X size={12} /></button>}
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-800">
                      <label className="text-[9px] text-gray-600 uppercase tracking-widest block mb-2 font-bold italic">Options de Secours (Fallback)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] text-gray-500 block mb-1">Groq Key (Llama 3.3)</label>
                          <input type="password" placeholder="gsk_..." value={groqKey} onChange={e => saveGroqKey(e.target.value)} className="w-full bg-black border border-gray-800 rounded-lg px-2 py-1.5 text-[10px] font-mono outline-none focus:border-purple-500 transition-colors" />
                        </div>
                        <div>
                          <label className="text-[8px] text-gray-500 block mb-1">OpenAI Key (GPT-4o)</label>
                          <input type="password" placeholder="sk-..." value={openaiKey} onChange={e => saveOpenaiKey(e.target.value)} className="w-full bg-black border border-gray-800 rounded-lg px-2 py-1.5 text-[10px] font-mono outline-none focus:border-blue-500 transition-colors" />
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] text-gray-500 block mb-1">DeepInfra Key</label>
                          <input type="password" placeholder="Key..." value={deepInfraKey} onChange={e => saveDeepInfraKey(e.target.value)} className="w-full bg-black border border-gray-800 rounded-lg px-2 py-1.5 text-[10px] font-mono outline-none focus:border-cyan-500 transition-colors" />
                        </div>
                        <div>
                          <label className="text-[8px] text-gray-500 block mb-1">DeepSeek Key</label>
                          <input type="password" placeholder="sk-..." value={deepseekKey} onChange={e => saveDeepseekKey(e.target.value)} className="w-full bg-black border border-gray-800 rounded-lg px-2 py-1.5 text-[10px] font-mono outline-none focus:border-emerald-500 transition-colors" />
                        </div>
                      </div>
                    </div>

                    <p className="text-[9px] text-gray-600 bg-black/40 p-2 rounded-lg border border-gray-800/50">
                      {getAIConfig().geminiKeys.length > 0 
                        ? `✓ ${getAIConfig().geminiKeys.length} cerveau(x) Gemini actifs. Fallback auto sur la suite si quota épuisé.` 
                        : '⚠️ Aucune clé Gemini configurée.'}
                    </p>
                  </div>

              {/* Mode selector — always visible, PIN required for modes 2-6 */}
              <NarrativeModeSelector
                current={pendingMode ?? narrativeMode}
                onChange={(mode) => {
                  if (mode === 1) {
                    applyNarrativeMode(1);
                    setShowParentalModal(false);
                    setParentalCode("");
                    setParentalError(false);
                    setPendingMode(null);
                    setShowConfirm(false);
                  } else {
                    setPendingMode(mode);
                    setParentalCode("");
                    setParentalError(false);
                    setShowConfirm(false);
                  }
                }}
              />

              {/* PIN zone — appears when a locked mode is selected */}
              {pendingMode !== null && pendingMode > 1 && (
                <div className="mt-4">
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-2">
                    Code Parental pour {NARRATIVE_MODE_META[pendingMode].icon} {NARRATIVE_MODE_META[pendingMode].name}
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={parentalCode}
                    onChange={(e) => { setParentalCode(e.target.value.replace(/\D/g, '')); setParentalError(false); }}
                    placeholder="● ● ● ●"
                    className={`w-full bg-black border-2 rounded-xl px-4 py-3 text-center text-lg tracking-[0.5em] font-mono outline-none transition-colors ${parentalError ? 'border-red-500 animate-shake' : 'border-gray-700 focus:border-red-500'}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && parentalCode === PARENTAL_CODE) {
                        if (NARRATIVE_MODE_META[pendingMode].requiresConfirm && !showConfirm) {
                          setShowConfirm(true);
                        } else {
                          applyNarrativeMode(pendingMode);
                          setShowParentalModal(false);
                          setParentalCode(""); setPendingMode(null); setShowConfirm(false);
                        }
                      } else if (e.key === 'Enter') {
                        setParentalError(true);
                      }
                    }}
                  />
                  {parentalError && <p className="text-red-400 text-[10px] text-center mt-1 animate-pulse">❌ Code incorrect !</p>}

                  {showConfirm && (
                    <p className="text-orange-400 text-[10px] text-center mt-2 animate-pulse">
                      ⚠️ Mode {NARRATIVE_MODE_META[pendingMode].name} — Contenu adulte. Confirmer ?
                    </p>
                  )}

                  <button
                    onClick={() => {
                      if (parentalCode !== PARENTAL_CODE) { setParentalError(true); return; }
                      if (NARRATIVE_MODE_META[pendingMode].requiresConfirm && !showConfirm) {
                        setShowConfirm(true);
                        return;
                      }
                      applyNarrativeMode(pendingMode);
                      setShowParentalModal(false);
                      setParentalCode(""); setPendingMode(null); setShowConfirm(false);
                    }}
                    className="w-full mt-3 py-3 rounded-xl bg-red-700 hover:bg-red-600 text-white font-black uppercase text-sm tracking-wider transition-colors"
                  >
                    {showConfirm ? '⚠️ Confirmer' : `Activer ${NARRATIVE_MODE_META[pendingMode].icon} ${NARRATIVE_MODE_META[pendingMode].name}`}
                  </button>
                </div>
              )}

              {/* Batch pre-generation — visible only when PIN already unlocked (mode > 1) */}
              {narrativeMode > 1 && (
                <BatchGenerator onGenerateBattles={generateBatch} onGenerateStories={generateBatchStories} />
              )}
              </>)}

              {/* ─── VOIX TAB ─── */}
              {parentalTab === 'voix' && (
                <VoiceConfigurator
                  characters={CHARACTERS}
                  overrides={voiceOverrides}
                  stylePrompts={STYLE_PROMPTS}
                  onSave={saveVoiceOverrides}
                  onTestVoice={testVoice}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Arena Preview */}
      <div className="absolute inset-0 z-0 transition-all duration-1000 overflow-hidden">
        <motion.img
          key={arena.id}
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.7 }}
          src={arena.img}
          className="w-full h-full object-cover"
          alt="Arena"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80" />
      </div>

      <header className="relative z-10 text-center mb-2 flex-shrink-0">
        <motion.h1
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sf-title text-2xl md:text-3xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-400 to-red-600 uppercase drop-shadow-[0_5px_15px_rgba(220,38,38,0.5)]"
        >
          Ultimate Multiverse Brawler
        </motion.h1>
        <div className="flex items-center justify-center gap-4 mt-1">
          <div className="h-px flex-1 max-w-20 bg-gradient-to-r from-transparent to-yellow-600/50" />
          <p className="text-gray-500 font-mono tracking-widest text-[10px] uppercase">Choisissez votre destinée</p>
          <div className="h-px flex-1 max-w-20 bg-gradient-to-l from-transparent to-yellow-600/50" />
        </div>
      </header>

      <div className="relative z-10 flex lg:grid lg:grid-cols-[1fr_auto_1fr] gap-2 lg:gap-4 w-full max-w-7xl items-center flex-1 min-h-0 justify-center">

        {/* PLAYER 1 SELECT - hidden on mobile */}
        <div className="hidden lg:flex">
          <SelectionCard 
            player={1} 
            active={p1} 
            style={p1Style} 
            onStyleChange={setP1Style} 
            isSelecting={selectingPlayer === 1}
            onSelectMode={() => setSelectingPlayer(1)}
            onCharacterChange={setP1}
          />
        </div>

        {/* MIDDLE GRID */}
        <div className="flex flex-col items-center min-h-0 overflow-hidden bg-black/40 backdrop-blur-sm rounded-3xl p-3 lg:p-4 border border-white/5">

          {/* Mobile Player Preview */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-2 flex-shrink-0">
            <div className={`flex items-center gap-2 px-2 py-1 rounded-xl border ${selectingPlayer === 1 ? 'border-blue-500 bg-blue-950/50' : 'border-gray-800 bg-gray-900/50 opacity-60'}`} onClick={() => setSelectingPlayer(1)}>
              <img src={p1.img} className="w-8 h-8 rounded-lg object-cover border border-blue-500/50" alt={p1.name} />
              <div className="text-[9px] font-bold uppercase text-blue-400">{p1.name}</div>
            </div>
            <div className="sf-title text-red-500 text-sm">VS</div>
            <div className={`flex items-center gap-2 px-2 py-1 rounded-xl border ${selectingPlayer === 2 ? 'border-red-500 bg-red-950/50' : 'border-gray-800 bg-gray-900/50 opacity-60'}`} onClick={() => setSelectingPlayer(2)}>
              <div className="text-[9px] font-bold uppercase text-red-400">{p2.name}</div>
              <img src={p2.img} className="w-8 h-8 rounded-lg object-cover border border-red-500/50" alt={p2.name} />
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-3 flex-shrink-0">
            {[1, 2, 3].map((step) => {
              const stepLabel = step === 1 ? 'JOUEUR 1' : step === 2 ? 'JOUEUR 2' : 'ARÈNE';
              const isActive = step === 1 ? selectingPlayer === 1 : step === 2 ? selectingPlayer === 2 : false;
              const stepColor = step === 1 ? 'text-blue-500' : step === 2 ? 'text-red-500' : 'text-yellow-500';
              return (
                <div key={step} className="flex items-center gap-2">
                  <button
                    onClick={() => step < 3 && setSelectingPlayer(step as 1 | 2)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${isActive ? `${stepColor} border-current step-active bg-white/5` : 'text-gray-400 border-gray-600 hover:border-gray-500 hover:text-gray-300'}`}
                  >
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${isActive ? 'bg-current text-black' : 'bg-gray-700 text-gray-300'}`}>{step}</span>
                    <span className="hidden sm:inline">{stepLabel}</span>
                  </button>
                  {step < 3 && <ChevronRight size={10} className="text-gray-700" />}
                </div>
              );
            })}
          </div>

          {/* Character Search */}
          <div className="w-full mb-2 flex-shrink-0">
            <input
              type="text"
              value={charSearch}
              onChange={e => setCharSearch(e.target.value)}
              placeholder="Rechercher un personnage..."
              className="w-full bg-gray-900/80 border border-gray-700/60 rounded-xl px-3 py-1.5 text-[11px] text-gray-200 placeholder-gray-600 outline-none focus:border-gray-500 transition-colors"
            />
          </div>

          {/* Character Roster Grid — max 2 rows of 4 visible, scroll for more */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 p-2 sm:p-3 bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl flex-shrink-0 max-h-[120px] sm:max-h-[130px] overflow-y-auto custom-scroll">
            {CHARACTERS.filter(c => c.name.toLowerCase().includes(charSearch.toLowerCase())).map((char) => (
              <button
                key={char.id}
                onClick={() => {
                  const c = withVoiceOverride(char);
                  if (selectingPlayer === 1) { setP1(c); setSelectingPlayer(2); }
                  else { setP2(c); setSelectingPlayer(1); }
                }}
                className={`w-11 h-11 sm:w-12 sm:h-12 md:w-13 md:h-13 rounded-lg border-2 overflow-hidden transition-all duration-300 hover:scale-110 active:scale-95 group relative
                  ${p1.id === char.id ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] z-10 scale-105' : 'border-gray-700/50 opacity-50 hover:opacity-100'}
                  ${p2.id === char.id ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)] z-10 scale-105 opacity-100' : ''}`}
              >
                <img src={char.img} className="w-full h-full object-cover" alt={char.name} />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors" />
                {p1.id === char.id && <div className="absolute top-0 left-0 bg-blue-600 text-[7px] font-bold px-1 rounded-br">P1</div>}
                {p2.id === char.id && <div className="absolute bottom-0 right-0 bg-red-600 text-[7px] font-bold px-1 rounded-tl">P2</div>}
              </button>
            ))}
          </div>

          {/* Style selector - compact inline */}
          <div className="mt-2 w-full max-w-md flex-shrink-0">
            <label className="text-[10px] text-gray-300 uppercase tracking-[0.2em] block mb-1.5 text-center flex items-center justify-center gap-1.5 font-bold">
              <Sword size={10} /> Style (P{selectingPlayer})
            </label>
            <div className="grid grid-cols-2 gap-1.5 max-h-[80px] overflow-y-auto p-2 bg-gray-900/70 backdrop-blur-xl rounded-xl border border-gray-600/50 custom-scroll">
              {STYLES.map((s) => {
                 const isSelected = selectingPlayer === 1 ? p1Style.id === s.id : p2Style.id === s.id;
                 const selColor = selectingPlayer === 1 ? 'blue' : 'red';
                 return (
                   <button
                     key={s.id}
                     onClick={() => selectingPlayer === 1 ? setP1Style(s) : setP2Style(s)}
                     className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[9px] uppercase font-bold transition-all ${isSelected ? `bg-${selColor}-900/60 border-${selColor}-500 text-${selColor}-300` : 'bg-black/40 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'}`}
                   >
                     <span className="flex-shrink-0">{s.icon}</span>
                     <span className="leading-tight truncate">{s.name}</span>
                   </button>
                 );
              })}
            </div>
          </div>

          {/* Arena Selection - BIGGER & MORE VISIBLE */}
          <div className="mt-3 w-full max-w-lg flex-shrink-0">
            <label className="text-[11px] text-yellow-400 uppercase tracking-[0.3em] block mb-2 text-center sf-title flex items-center justify-center gap-2 font-bold">
              <MapPin size={12} /> Arène de Combat
            </label>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-1 max-h-[130px] overflow-y-auto custom-scroll pr-1">
              {ARENAS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setArena(a)}
                  className={`arena-card relative rounded-xl overflow-hidden border-2 aspect-[16/10] ${arena.id === a.id ? 'active border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.4)]' : 'border-gray-800 opacity-50 hover:opacity-90 hover:border-gray-600'}`}
                >
                  <img src={a.img} className="w-full h-full object-cover" alt={a.name} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <span className={`absolute bottom-1 left-1 right-1 text-[7px] font-bold uppercase tracking-wider text-center leading-tight ${arena.id === a.id ? 'text-yellow-400' : 'text-gray-400'}`}>{a.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom: Duration + API + Fight */}
          <div className="mt-2 flex flex-col items-center gap-2 flex-shrink-0 w-full max-w-md">
            {/* Duration */}
            <div className="flex bg-gray-800/80 rounded-full p-0.5 border border-gray-700 w-full max-w-xs">
              <button onClick={() => setMatchDuration(3)} className={`flex-1 py-1 text-[9px] uppercase font-bold rounded-full transition-colors ${matchDuration === 3 ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-white'}`}>3 Rnds</button>
              <button onClick={() => setMatchDuration(5)} className={`flex-1 py-1 text-[9px] uppercase font-bold rounded-full transition-colors ${matchDuration === 5 ? 'bg-yellow-600 text-white' : 'text-gray-500 hover:text-white'}`}>5 Rnds</button>
              <button onClick={() => setMatchDuration(8)} className={`flex-1 py-1 text-[9px] uppercase font-bold rounded-full transition-colors ${matchDuration === 8 ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}>8 Rnds</button>
            </div>

            {/* Démo button when no API key */}
            {!process.env.GEMINI_API_KEY && !tempApiKey && (
              <button onClick={() => generateCombat(true)} className="text-[9px] text-gray-500 hover:text-yellow-400 uppercase tracking-wider">
                ▶ Démo sans clé API
              </button>
            )}

            {/* Fight Button */}
            {gameState === 'LOADING' ? (
              <div className="flex items-center gap-3">
                <RefreshCw size={24} className="text-red-600 animate-spin" />
                <p className="text-white font-black italic text-sm animate-pulse">GÉNÉRATION...</p>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(239,68,68,0.4)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => generateCombat(false)}
                className="bg-gradient-to-r from-red-700 via-orange-600 to-red-700 px-10 py-2 rounded-full font-black text-lg uppercase italic border-3 border-yellow-400 shadow-[0_5px_20px_rgba(0,0,0,0.5)] group sf-title tracking-wider"
              >
                <span className="flex items-center gap-2">
                  <Play fill="currentColor" size={18} className="group-hover:translate-x-1 transition-transform" />
                  Fight !
                </span>
              </motion.button>
            )}
          </div>
        </div>

        {/* PLAYER 2 SELECT - hidden on mobile */}
        <div className="hidden lg:flex">
          <SelectionCard 
            player={2} 
            active={p2} 
            style={p2Style} 
            onStyleChange={setP2Style} 
            isSelecting={selectingPlayer === 2}
            onSelectMode={() => setSelectingPlayer(2)}
            onCharacterChange={setP2}
          />
        </div>

      </div>
    </div>
  );
}

function SelectionCard({ player, active, style, onStyleChange, isSelecting, onSelectMode, onCharacterChange }) {
  const isP1 = player === 1;
  const color = isP1 ? 'blue' : 'red';

  return (
    <div className={`flex flex-col ${isP1 ? 'items-start' : 'items-end'} w-full`}>
      <div 
        className={`sf-title text-lg md:text-xl mb-1 uppercase tracking-tighter cursor-pointer transition-all duration-300 ${isP1 ? 'text-blue-500' : 'text-red-500'} ${isSelecting ? 'drop-shadow-[0_0_15px_currentColor]' : 'opacity-40 hover:opacity-70'}`}
        onClick={onSelectMode}
      >
        PLAYER {player}
      </div>
      <div className="relative w-full max-w-[180px] group">
        <motion.div
          key={active.id}
          initial={{ x: isP1 ? -80 : 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className={`relative aspect-[3/4] w-full rounded-2xl overflow-hidden border-3 cursor-pointer transition-all duration-300 ${isP1 ? 'border-blue-500' : 'border-red-500'} ${isSelecting ? (isP1 ? 'shadow-[0_0_30px_rgba(59,130,246,0.5)] scale-[1.02]' : 'shadow-[0_0_30px_rgba(239,68,68,0.5)] scale-[1.02]') : 'shadow-lg opacity-60 hover:opacity-90 scale-95'}`}
          onClick={onSelectMode}
        >
          <img src={active.img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={active.name} />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />

          <div className="absolute bottom-4 left-4 right-4">
            <motion.div
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-lg font-black uppercase italic leading-none tracking-tighter mb-0.5"
            >
              {active.name}
            </motion.div>
            <div className="text-[10px] text-gray-300 uppercase tracking-[0.2em] font-bold opacity-60">{active.faction}</div>
          </div>
        </motion.div>

        {/* Navigation Arrows */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-1 z-20 pointer-events-none">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const idx = CHARACTERS.findIndex(c => c.id === active.id);
              onCharacterChange(CHARACTERS[(idx - 1 + CHARACTERS.length) % CHARACTERS.length]);
            }}
            className="p-1.5 bg-black/60 hover:bg-black/90 text-white rounded-full transition-all pointer-events-auto hover:scale-110 border border-white/20"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const idx = CHARACTERS.findIndex(c => c.id === active.id);
              onCharacterChange(CHARACTERS[(idx + 1) % CHARACTERS.length]);
            }}
            className="p-1.5 bg-black/60 hover:bg-black/90 text-white rounded-full transition-all pointer-events-auto hover:scale-110 border border-white/20"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className={`mt-2 w-full max-w-[180px] flex ${isP1 ? 'justify-start' : 'justify-end'}`}>
        <div className={`px-3 py-2 flex items-center gap-2 rounded-xl border bg-gray-900/80 backdrop-blur-md ${isP1 ? 'border-blue-500/40' : 'border-red-500/40'}`}>
          <div className={`p-1.5 rounded-full bg-black/50 ${isP1 ? 'text-blue-400' : 'text-red-400'}`}>
            {style.icon}
          </div>
          <div className="flex flex-col">
            <span className="text-[7px] text-gray-500 uppercase tracking-[0.15em]">Style</span>
            <span className={`font-bold text-[9px] uppercase tracking-wider ${isP1 ? 'text-blue-200' : 'text-red-200'}`}>{style.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CombatView({ p1, p2, arena, battleData, currentStep, activeLineIdx, activeLineDuration, bufferingIdx, revealedIdx, currentTier, storySpeed, setStorySpeed, onReset }) {
  return (
    <div className="min-h-screen bg-black text-white relative flex flex-col items-center p-3 md:p-12 overflow-x-hidden">
      <div className="fixed inset-0 z-0 opacity-40 pointer-events-none">
        <img src={arena.img} className="w-full h-full object-cover" alt="Arena" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-transparent to-black" />
      </div>

      <div className="relative z-10 w-full max-w-6xl">
        {/* Top Health Bars Style Header */}
        <div className="flex justify-between items-center mb-6 md:mb-12 gap-2 md:gap-12">
          <FighterHeader fighter={p1} side="left" color="blue" />
          <div className="text-3xl md:text-7xl font-black italic text-red-600 animate-pulse drop-shadow-[0_0_30px_rgba(239,68,68,0.8)] z-10 shrink-0">VS</div>
          <FighterHeader fighter={p2} side="right" color="red" />
        </div>

        <div className="bg-gray-900/60 backdrop-blur-xl border-2 border-gray-800/50 rounded-3xl md:rounded-[2.5rem] p-4 md:p-12 shadow-2xl min-h-[280px] md:min-h-[450px] max-h-[65vh] md:max-h-[70vh] overflow-y-auto custom-scroll relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50" />

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ type: 'spring', damping: 20 }}
              className="space-y-8"
            >
              {currentStep === 0 && <Dialogue lines={battleData.intro} p1={p1} p2={p2} activeLineIdx={activeLineIdx} activeLineDuration={activeLineDuration} bufferingIdx={bufferingIdx} revealedIdx={revealedIdx} currentTier={currentTier} />}
              {currentStep > 0 && currentStep <= (battleData.rounds?.length || 0) && (
                <Dialogue lines={[{ text: `${battleData.rounds[currentStep - 1].title} !`, speaker: "Arbitre" }, ...battleData.rounds[currentStep - 1].dialogues]} p1={p1} p2={p2} title={battleData.rounds[currentStep - 1].title} activeLineIdx={activeLineIdx} activeLineDuration={activeLineDuration} bufferingIdx={bufferingIdx} revealedIdx={revealedIdx} currentTier={currentTier} />
              )}
              {currentStep === (battleData.rounds?.length || 0) + 1 && (
                <div className="text-center py-4">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1.2, opacity: 1 }}
                    className="text-6xl md:text-8xl font-black text-red-600 italic mb-10 tracking-[0.2em] uppercase drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]"
                  >
                    {battleData.finishingMove.type} !
                  </motion.div>
                  <Dialogue lines={[battleData.finishingMove, battleData.conclusion]} p1={p1} p2={p2} activeLineIdx={activeLineIdx} activeLineDuration={activeLineDuration} bufferingIdx={bufferingIdx} revealedIdx={revealedIdx} currentTier={currentTier} />
                  <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="mt-12 text-5xl font-black text-yellow-500 uppercase italic"
                  >
                    Vainqueur : <span className="underline underline-offset-8 decoration-red-600">{battleData.winner}</span>
                  </motion.div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6 md:mt-12 mb-4 flex flex-col md:flex-row justify-center items-center gap-6">
          <button
            onClick={onReset}
            className="group flex items-center gap-2 md:gap-3 px-6 md:px-12 py-3 md:py-4 bg-white text-black font-black uppercase italic text-sm md:text-base rounded-full hover:bg-red-600 hover:text-white transition-all duration-300 transform hover:scale-105"
          >
            <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
            Nouveau Match
          </button>

          <div className="flex items-center gap-4 bg-gray-900/80 px-6 py-3 rounded-full border border-gray-700 shadow-xl">
            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Vitesse</span>
            <input 
              type="range" 
              min="0.5" max="2.0" step="0.1" 
              value={storySpeed} 
              onChange={(e) => setStorySpeed(parseFloat(e.target.value))}
              className="w-24 md:w-32 accent-yellow-500 cursor-pointer"
            />
            <span className="text-sm font-bold text-yellow-500 w-8 text-right font-mono">{storySpeed.toFixed(1)}x</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FighterHeader({ fighter, side, color }) {
  const isLeft = side === 'left';
  return (
    <div className={`flex items-center gap-2 md:gap-8 ${!isLeft ? 'flex-row-reverse' : ''} w-full min-w-0`}>
      <motion.div
        whileHover={{ scale: 1.1 }}
        className={`relative w-14 h-14 md:w-32 md:h-32 rounded-full border-4 ${isLeft ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]'} overflow-hidden flex-shrink-0`}
      >
        <img src={fighter.img} className="w-full h-full object-cover" alt={fighter.name} />
      </motion.div>
      <div className={`flex-grow min-w-0 ${!isLeft ? 'text-right' : 'text-left'}`}>
        <div className="text-sm md:text-3xl font-black uppercase italic leading-none mb-2 md:mb-3 truncate">{fighter.name}</div>
        <div className="w-full max-w-[300px] h-3 md:h-4 bg-gray-900 rounded-full overflow-hidden border border-gray-800 shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 1, delay: 0.5 }}
            className={`h-full bg-gradient-to-r ${isLeft ? 'from-blue-700 to-cyan-400 shadow-[0_0_10px_cyan]' : 'from-red-700 to-orange-400 shadow-[0_0_10px_orange]'}`}
          />
        </div>
      </div>
    </div>
  );
}

// Mapping label de tier — affiché en mini badge sur la bulle active pour que
// l'utilisateur voie en direct quel moteur TTS sert chaque ligne.
const TIER_LABELS: Record<string, string> = {
  elevenlabs: '🎭 ElevenLabs',
  gemini:     '✨ Gemini',
  edge:       '🎙️ Edge',
  gcloud:     '☁️ Google',
  hf:         '🤗 HF',
  xtts:       '🐍 XTTS',
  piper:      '🧠 Piper',
  webspeech:  '💬 Système',
  cache:      '💾 Cache',
};

function Dialogue({ lines, p1, p2, title = undefined, activeLineIdx = -1, activeLineDuration = 0, bufferingIdx = -1, revealedIdx = -1, currentTier = null }: { lines: any; p1: any; p2: any; title?: any; activeLineIdx?: number; activeLineDuration?: number; bufferingIdx?: number; revealedIdx?: number; currentTier?: string | null }) {
  const linesArray = Array.isArray(lines) ? lines : [lines];
  const activeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeLineIdx >= 0 && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (bufferingIdx >= 0 && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLineIdx, bufferingIdx]);

  // Only display lines that the voice has already reached. While a step is in
  // flight (revealedIdx >= 0) we hide upcoming lines so the text doesn't run
  // ahead of the audio. Once the step is done (revealedIdx < 0) — e.g. when
  // voice is muted — we show everything as before.
  const visibleCount = revealedIdx < 0 ? linesArray.length : revealedIdx + 1;
  const visibleLines = linesArray.slice(0, visibleCount);

  return (
    <div className="space-y-4 md:space-y-6">
      {title && (
        <div className="flex items-center justify-center gap-2 md:gap-4 mb-4 md:mb-8">
          <div className="h-[2px] flex-grow bg-gradient-to-r from-transparent to-gray-700" />
          <div className="text-lg md:text-2xl font-black text-gray-500 tracking-[0.3em] md:tracking-[0.5em] italic">{title}</div>
          <div className="h-[2px] flex-grow bg-gradient-to-l from-transparent to-gray-700" />
        </div>
      )}
      {visibleLines.map((l, i) => {
        const isP1 = l.speaker?.toLowerCase().includes(p1.name.toLowerCase());
        const isP2 = l.speaker?.toLowerCase().includes(p2.name.toLowerCase());
        const isActive = i === activeLineIdx;
        const isBuffering = i === bufferingIdx;
        const dimmed = (activeLineIdx >= 0 || bufferingIdx >= 0) && !isActive && !isBuffering;
        
        // Clé unique basée sur le texte pour forcer le remount (évite la désyncro des animations framer-motion)
        const uniqueKey = `line-${i}-${(l.text || l.description || '').substring(0, 20)}`;

        return (
          <motion.div
            key={uniqueKey}
            ref={isActive ? activeRef : isBuffering ? activeRef : undefined}
            initial={{ x: isP1 ? -20 : isP2 ? 20 : 0, opacity: 0 }}
            animate={{
              x: 0,
              opacity: dimmed ? 0.4 : 1,
              scale: isActive ? 1.02 : 1,
            }}
            transition={{ delay: activeLineIdx < 0 && bufferingIdx < 0 ? i * 0.1 : 0, type: 'spring', stiffness: 260, damping: 22 }}
            className={`flex flex-col ${isP1 ? 'items-start' : isP2 ? 'items-end' : 'items-center'}`}
          >
            <div className={`flex items-center gap-2 mb-2 ${isP2 ? 'flex-row-reverse' : ''}`}>
              <span className={`text-[10px] md:text-xs font-black uppercase tracking-widest ${isP1 ? 'text-blue-400' : isP2 ? 'text-red-400' : 'text-yellow-500'}`}>
                {l.speaker}
              </span>
              {l.action && <span className="text-[9px] md:text-[10px] text-gray-500 italic uppercase">({l.action})</span>}
              {isBuffering && (
                <span className="text-[10px] text-gray-500 animate-pulse tracking-widest">···</span>
              )}
              {/* Mini-badge "tier" sur la ligne active : indique en direct
                  quel moteur TTS lit la ligne (Gemini / Edge / Piper / …). */}
              {isActive && currentTier && TIER_LABELS[currentTier] && (
                <span className="text-[9px] text-gray-400 px-1.5 py-0.5 rounded bg-black/50 border border-gray-700/60 font-medium tracking-tight">
                  {TIER_LABELS[currentTier]}
                </span>
              )}
            </div>
            <div className={`max-w-full md:max-w-2xl p-3 md:p-5 rounded-2xl text-base md:text-xl font-medium leading-relaxed shadow-xl transition-all relative overflow-hidden
              ${isP1 ? 'bg-blue-950/40 border-l-4 border-blue-500 rounded-tl-none' :
                isP2 ? 'bg-red-950/40 border-r-4 border-red-500 rounded-tr-none text-right' :
                  'bg-gray-800/50 border-t-4 border-yellow-500 italic text-center'}
              ${isActive ? 'ring-2 ring-yellow-400/70 shadow-[0_0_25px_rgba(250,204,21,0.35)]' : ''}
              ${isBuffering ? 'ring-1 ring-gray-600/50' : ''}`}
            >
              {/* Karaoke Text Highlighting Effect */}
              {isActive && activeLineDuration > 0 ? (
                <div className="leading-relaxed">
                  {(() => {
                    const rawText = l.text || l.description || '';
                    const text = rawText.replace(/^[^:]+:\s*/, '');
                    const words = text.split(' ');
                    const totalChars = text.length;
                    // On garde 5% de marge à la fin
                    const timePerChar = (activeLineDuration * 0.95) / Math.max(totalChars, 1);
                    let runningCharCount = 0;
                    
                    return words.map((word: string, wIdx: number) => {
                      const delay = runningCharCount * timePerChar;
                      const wordDuration = Math.max(word.length * timePerChar, 0.1);
                      runningCharCount += word.length + 1; // +1 pour l'espace
                      
                      return (
                        <motion.span
                          key={wIdx}
                          initial={{ color: '#9ca3af' }}
                          animate={{ color: '#ffffff' }}
                          transition={{ delay, duration: wordDuration * 0.8 }}
                          className="inline-block mr-[0.25em]"
                        >
                          {word}
                        </motion.span>
                      );
                    });
                  })()}
                </div>
              ) : (
                <span className={dimmed ? 'text-gray-400' : 'text-white'}>{(l.text || l.description || '').replace(/^[^:]+:\s*/, '')}</span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
