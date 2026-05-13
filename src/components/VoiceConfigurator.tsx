import React, { useState, useCallback, useEffect } from 'react';
import { Play, Save, Download, Loader2, Check, ChevronDown, ChevronUp, RotateCcw, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { isXttsAvailable, resetXttsCache } from '../lib/voice/xtts';
import { fetchElevenLabsStatus } from '../lib/voice/elevenlabs';
import { fetchEdgeStatus, EDGE_VOICES } from '../lib/voice/edgetts';
import { fetchGCloudStatus, GCLOUD_VOICES } from '../lib/voice/gcloudtts';
import { fetchHFStatus } from '../lib/voice/huggingface';


// All 30 Gemini TTS prebuilt voices with gender hints
const GEMINI_VOICES = [
  { name: 'Achernar', gender: 'M', desc: 'Grave, posé' },
  { name: 'Achird', gender: 'M', desc: 'Neutre, clair' },
  { name: 'Algenib', gender: 'M', desc: 'Profond, solennel' },
  { name: 'Algieba', gender: 'M', desc: 'Chaud, narrateur' },
  { name: 'Alnilam', gender: 'M', desc: 'Fort, dynamique' },
  { name: 'Aoede', gender: 'F', desc: 'Douce, mélodique' },
  { name: 'Autonoe', gender: 'F', desc: 'Vive, expressive' },
  { name: 'Callirrhoe', gender: 'F', desc: 'Chaude, mature' },
  { name: 'Charon', gender: 'M', desc: 'Très grave, sombre' },
  { name: 'Despina', gender: 'F', desc: 'Jeune, pétillante' },
  { name: 'Enceladus', gender: 'M', desc: 'Grave, rauque' },
  { name: 'Erinome', gender: 'F', desc: 'Claire, enfantine' },
  { name: 'Fenrir', gender: 'M', desc: 'Puissant, héroïque' },
  { name: 'Gacrux', gender: 'M', desc: 'Sec, âgé' },
  { name: 'Iapetus', gender: 'M', desc: 'Lent, lourd' },
  { name: 'Kore', gender: 'F', desc: 'Féminin, assertif' },
  { name: 'Laomedeia', gender: 'F', desc: 'Calme, posée' },
  { name: 'Leda', gender: 'F', desc: 'Maternelle, douce' },
  { name: 'Orus', gender: 'M', desc: 'Menaçant, bas' },
  { name: 'Puck', gender: 'M', desc: 'Jeune, agile' },
  { name: 'Pulcherrima', gender: 'F', desc: 'Élégante, raffinée' },
  { name: 'Rasalgethi', gender: 'M', desc: 'Éraillé, cynique' },
  { name: 'Sadachbia', gender: 'M', desc: 'Charismatique' },
  { name: 'Sadaltager', gender: 'M', desc: 'Neutre, sérieux' },
  { name: 'Schedar', gender: 'M', desc: 'Grave, autoritaire' },
  { name: 'Sulafat', gender: 'F', desc: 'Mystérieuse' },
  { name: 'Umbriel', gender: 'M', desc: 'Clair, énergique' },
  { name: 'Vindemiatrix', gender: 'F', desc: 'Froide, précise' },
  { name: 'Zephyr', gender: 'M', desc: 'Léger, vif' },
  { name: 'Zubenelgenubi', gender: 'M', desc: 'Profond, lent' },
];

// Test phrases per voice style
const TEST_PHRASES: Record<string, string> = {
  idiot:             "D'oh ! Quelqu'un a mangé mon donut ou c'est moi qui l'ai oublié ?",
  enfant:            "Ay caramba ! T'es même pas cap de me battre, gros nul !",
  enfant_diabolique: "Oh comme c'est mignon... hé hé hé... tu vas souffrir.",
  gamer:             "GG EZ ! Noob ! T'as même pas touché mon perso !",
  gangster:          "Yo mon reuf, ici c'est mon territoire, tu bouges pas.",
  papa:              "Écoute mon grand, je vais te montrer comment on fait.",
  maman:             "Combien de fois je t'ai dit de ranger ta chambre ?!",
  ado_fille:         "Genre trop pas, c'est genre abusé quoi, sérieux.",
  ado_garcon:        "Ouais bah euh... c'est cool quoi, enfin je sais pas.",
  animal:            "Miaouuu ! Pschhhh ! Grrrrr ! Miaou miaou !",
  raleur:            "Pff... De mon temps c'était mieux, maintenant c'est n'importe quoi.",
  presse:            "Vite vite vite ! J'ai une commande ! Le client attend !",
  drama_queen:       "Oh mon Dieu ! C'est la PIRE chose qui me soit arrivée !",
  autoritaire:       "Silence. J'ai dit silence. Vous allez m'obéir, c'est clair ?",
  ivre:              "Hic ! Attends... tu disais quoi ? Ah oui ! Encore un verre !",
  scientifique_fou:  "Vous êtes tous des imbéciles. Ma formule est parfaite.",
  nerveux:           "Oh j-je-jeez ! C'est pas bon du tout ça ! Oh non non non !",
  guerrier:          "KAMEHAMEHAAA ! Je vais te pulvériser ! HAAAAA !",
  creature:          "Pika pika ! Pikaaaa ! Pi-ka-CHU ! Pika pika !",
  froid:             "Tu es déjà mort. Tu ne le sais pas encore.",
  ogre:              "Dégage de mon marais ! Les ogres c'est comme les oignons !",
  aventuriere:       "La prochaine tombe est par ici ! En avant !",
  menacant:          "Je suis celui qui frappe à la porte. Tu devrais avoir peur.",
  hero_jeune:        "C'est parti ! On va sauver le monde ensemble ! Yeah !",
  monotone:          "Je suis ici. Je ne ressens rien. C'est parfaitement normal.",
};

const VOICE_RESOURCES = [
  { name: 'Piper Voices FR (HuggingFace)', url: 'https://huggingface.co/rhasspy/piper-voices/tree/main/fr/fr_FR' },
  { name: 'Coqui TTS Models', url: 'https://github.com/coqui-ai/TTS' },
  { name: 'VITS Web Voices', url: 'https://www.npmjs.com/package/@diffusionstudio/vits-web' },
];

// Provider TTS forcé par l'utilisateur pour ce personnage. 'auto' = cascade par
// défaut (comportement historique). Tout autre valeur = tenter ce provider en
// PREMIER, et tomber sur la cascade complète s'il échoue (zéro régression).
export type VoiceProvider =
  | 'auto'
  | 'gemini'
  | 'edge'
  | 'gcloud'
  | 'hf'
  | 'elevenlabs'
  | 'xtts'
  | 'piper';

export interface VoiceOverride {
  voice: string;
  voiceStyle: string;
  customPrompt?: string;   // Override STYLE_PROMPTS for Gemini TTS
  pitchShift?: number;     // Piper pitch shift in semitones (-8 to +8)
  playbackRate?: number;   // Piper/WebSpeech rate (0.5 to 2.0)
  webPitch?: number;       // WebSpeech pitch (0.1 to 2.0)
  volume?: number;         // Per-character volume (0.1 to 2.0)
  useDefaultVoice?: boolean; // If true, skip cloning (ElevenLabs/XTTS) and use the
                             // curated Gemini/Piper voice in `voice` directly. Same
                             // pipeline as the "présentatrice / Arbitre" voice.
  provider?: VoiceProvider;   // Force a TTS provider for this character. 'auto' = cascade.
  providerVoiceId?: string;   // Provider-specific voice ID (e.g. 'fr-FR-DeniseNeural' for Edge).
  bass?: number;           // Bass EQ (-20 to 20)
  mid?: number;            // Mid EQ (-20 to 20)
  treble?: number;         // Treble EQ (-20 to 20)
}

// Liste exposée à l'UI : libellé + description + indique si une voix spécifique au provider est sélectionnable.
export const PROVIDERS: Array<{ id: VoiceProvider; label: string; desc: string; voices?: typeof EDGE_VOICES | typeof GCLOUD_VOICES }> = [
  { id: 'auto',       label: 'Auto (cascade)',     desc: 'Comportement par défaut, tous providers' },
  { id: 'gemini',     label: 'Gemini',             desc: 'Voix curatées Google AI (quota 10/jour gratuit)' },
  { id: 'edge',       label: 'Edge TTS',           desc: 'Microsoft, gratuit illimité',     voices: EDGE_VOICES },
  { id: 'gcloud',     label: 'Google Cloud',       desc: 'Neural2 — 1M chars gratuit/mois', voices: GCLOUD_VOICES },
  { id: 'hf',         label: 'Hugging Face',       desc: 'Open source, gratuit, lent' },
  { id: 'elevenlabs', label: 'ElevenLabs',         desc: 'Voix clonée pro (clé + mapping requis)' },
  { id: 'xtts',       label: 'XTTS local',         desc: 'Clonage local (serveur Python requis)' },
  { id: 'piper',      label: 'Piper WASM',         desc: 'Neural offline (Firefox limité)' },
];

// Curated set of default voices that have the great intonation the user wants
// (Aoede-style). Used by VoiceConfigurator when the "voix par défaut" switch is
// on. All of them map to an offline Piper voice in piper.ts.
export const DEFAULT_VOICE_POOL = [
  // Feminine
  { name: 'Aoede',       gender: 'F' as const, desc: 'Douce, mélodique (présentatrice)' },
  { name: 'Autonoe',     gender: 'F' as const, desc: 'Vive, expressive' },
  { name: 'Callirrhoe',  gender: 'F' as const, desc: 'Chaude, mature' },
  { name: 'Pulcherrima', gender: 'F' as const, desc: 'Élégante, raffinée' },
  // Masculine
  { name: 'Algieba',     gender: 'M' as const, desc: 'Chaud, narrateur' },
  { name: 'Sadachbia',   gender: 'M' as const, desc: 'Charismatique' },
  { name: 'Alnilam',     gender: 'M' as const, desc: 'Fort, dynamique' },
  { name: 'Achernar',    gender: 'M' as const, desc: 'Grave, posé' },
];

export function getDefaultEdgeVoice(voiceName: string, voiceStyle: string): string {
  const voiceInfo = GEMINI_VOICES.find(v => v.name === voiceName);
  const isMale = voiceInfo?.gender === 'M';

  if (isMale) {
    if (['enfant', 'ado_garcon', 'gamer', 'creature', 'nerveux'].includes(voiceStyle)) return 'fr-FR-RemyMultilingualNeural';
    if (['papa', 'autoritaire', 'guerrier', 'ogre', 'menacant', 'froid', 'scientifique_fou'].includes(voiceStyle)) return 'fr-FR-HenriNeural';
    if (['raleur', 'ivre', 'gangster'].includes(voiceStyle)) return 'fr-FR-RemyMultilingualNeural';
    return 'fr-FR-HenriNeural';
  } else {
    if (['enfant', 'enfant_diabolique', 'ado_fille', 'creature'].includes(voiceStyle)) return 'fr-FR-EloiseNeural';
    if (['maman', 'drama_queen'].includes(voiceStyle)) return 'fr-FR-VivienneMultilingualNeural';
    if (['autoritaire', 'menacant', 'raleur'].includes(voiceStyle)) return 'fr-FR-DeniseNeural';
    return 'fr-FR-DeniseNeural';
  }
}

export function getDefaultAudioSettings(voiceStyle: string) {
  let bass = 0, mid = 0, treble = 0, pitchShift = 0, playbackRate = 1.0;
  switch(voiceStyle) {
    case 'ogre': case 'menacant': case 'froid':
      bass = 8; treble = -2; pitchShift = -3; playbackRate = 0.9; break;
    case 'guerrier': case 'autoritaire':
      bass = 5; mid = 2; treble = 2; pitchShift = -1; playbackRate = 1.05; break;
    case 'enfant': case 'creature': case 'nerveux': case 'ado_fille': case 'enfant_diabolique':
      bass = -4; treble = 4; pitchShift = 3; playbackRate = 1.15; break;
    case 'gamer': case 'presse':
      treble = 3; pitchShift = 1; playbackRate = 1.25; break;
    case 'ivre': case 'idiot':
      bass = 3; treble = -2; pitchShift = -2; playbackRate = 0.85; break;
    case 'gangster':
      bass = 5; treble = 2; pitchShift = -1; playbackRate = 0.95; break;
    case 'drama_queen':
      treble = 5; pitchShift = 2; playbackRate = 1.1; break;
    case 'scientifique_fou':
      mid = 5; treble = 3; pitchShift = 1; playbackRate = 1.1; break;
    case 'monotone':
      mid = -3; treble = -3; pitchShift = -1; playbackRate = 0.95; break;
    case 'raleur':
      mid = 5; bass = 2; pitchShift = -1; playbackRate = 0.9; break;
  }
  return { bass, mid, treble, pitchShift, playbackRate };
}

interface Character {
  id: string;
  name: string;
  img: string;
  voice: string;
  voiceStyle: string;
  faction: string;
  color: string;
}

interface Props {
  characters: Character[];
  overrides: Record<string, VoiceOverride>;
  stylePrompts: Record<string, string>;
  onSave: (overrides: Record<string, VoiceOverride>) => void;
  onTestVoice: (text: string, voiceName: string, voiceStyle: string, params: VoiceOverride, charId?: string) => Promise<void>;
}

// Slider component for cleaner code
function Slider({ label, value, min, max, step, unit, onChange, defaultVal }: {
  label: string; value: number; min: number; max: number; step: number;
  unit: string; onChange: (v: number) => void; defaultVal: number;
}) {
  const isDefault = Math.abs(value - defaultVal) < 0.01;
  return (
    <div className="flex items-center gap-2">
      <label className="text-[9px] text-gray-400 w-14 flex-shrink-0 text-right">{label}</label>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-purple-500 cursor-pointer"
      />
      <span className={`text-[10px] w-12 text-right font-mono ${isDefault ? 'text-gray-500' : 'text-purple-400 font-bold'}`}>
        {value.toFixed(step < 1 ? (step < 0.1 ? 2 : 1) : 0)}{unit}
      </span>
      {!isDefault && (
        <button onClick={() => onChange(defaultVal)} className="text-gray-600 hover:text-white text-[8px]" title="Reset">↺</button>
      )}
    </div>
  );
}

export default function VoiceConfigurator({ characters, overrides, stylePrompts, onSave, onTestVoice }: Props) {
  const [local, setLocal] = useState<Record<string, VoiceOverride>>(() => {
    // Deep clone so we don't mutate parent
    const clone: Record<string, VoiceOverride> = {};
    (Object.entries(overrides) as [string, VoiceOverride][]).forEach(([k, v]) => {
      clone[k] = { ...v };
    });
    return clone;
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [filter, setFilter] = useState('');
  const [xttsOk, setXttsOk] = useState<boolean>(isXttsAvailable());
  const [retrying, setRetrying] = useState(false);
  const [elStatus, setElStatus] = useState<{ enabled: boolean; voiceCount: number }>({ enabled: false, voiceCount: 0 });
  const [edgeStatus, setEdgeStatus] = useState<{ enabled: boolean; voiceCount: number }>({ enabled: false, voiceCount: 0 });
  const [gcloudStatus, setGcloudStatus] = useState<{ enabled: boolean; voiceCount: number }>({ enabled: false, voiceCount: 0 });
  const [hfStatus, setHfStatus] = useState<{ enabled: boolean; model?: string }>({ enabled: false });

  // Refresh XTTS status after each voice test
  useEffect(() => {
    if (!testing) setXttsOk(isXttsAvailable());
  }, [testing]);

  // Fetch ElevenLabs status on mount + after each test (catches quota exhaustion)
  useEffect(() => {
    fetchElevenLabsStatus()
      .then(setElStatus)
      .catch(() => setElStatus({ enabled: false, voiceCount: 0 }));
    fetchEdgeStatus()
      .then(setEdgeStatus)
      .catch(() => setEdgeStatus({ enabled: false, voiceCount: 0 }));
    fetchGCloudStatus()
      .then(setGcloudStatus)
      .catch(() => setGcloudStatus({ enabled: false, voiceCount: 0 }));
    fetchHFStatus()
      .then(setHfStatus)
      .catch(() => setHfStatus({ enabled: false }));
  }, [testing]);

  const getOverride = (charId: string, defaults: Character): VoiceOverride => {
    const ovr = local[charId];
    const defaultAudio = getDefaultAudioSettings(defaults.voiceStyle);
    const defaultEdge = getDefaultEdgeVoice(defaults.voice, defaults.voiceStyle);

    return {
      voice: ovr?.voice ?? defaults.voice,
      voiceStyle: ovr?.voiceStyle ?? defaults.voiceStyle,
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
    };
  };

  const updateField = (charId: string, defaults: Character, field: string, value: any) => {
    setLocal(prev => {
      const current = getOverride(charId, defaults);
      return { ...prev, [charId]: { ...current, [field]: value } };
    });
    setSaved(false);
  };

  const handleTest = useCallback(async (char: Character) => {
    const params = getOverride(char.id, char);
    const phrase = TEST_PHRASES[params.voiceStyle] || `Bonjour, je suis ${char.name} et je suis prêt à combattre !`;
    setTesting(char.id);
    try {
      await onTestVoice(phrase, params.voice, params.voiceStyle, params, char.id);
    } catch { /* ignore */ }
    setTesting(null);
  }, [local, onTestVoice]);

  const handleSave = () => {
    // Clean overrides: remove entries that match defaults
    const cleaned: Record<string, VoiceOverride> = {};
    (Object.entries(local) as [string, VoiceOverride][]).forEach(([id, ovr]) => {
      const char = characters.find(c => c.id === id);
      if (!char) return;
      const defaultAudio = getDefaultAudioSettings(char.voiceStyle);
      const defaultEdge = getDefaultEdgeVoice(char.voice, char.voiceStyle);

      const hasChanges = ovr.voice !== char.voice
        || ovr.voiceStyle !== char.voiceStyle
        || (ovr.customPrompt && ovr.customPrompt.trim())
        || (ovr.pitchShift !== undefined && ovr.pitchShift !== defaultAudio.pitchShift)
        || (ovr.playbackRate !== undefined && Math.abs(ovr.playbackRate - defaultAudio.playbackRate) > 0.01)
        || (ovr.webPitch !== undefined && Math.abs(ovr.webPitch - 1.0) > 0.01)
        || (ovr.volume !== undefined && Math.abs(ovr.volume - 1.0) > 0.01)
        || (ovr.bass !== undefined && ovr.bass !== defaultAudio.bass)
        || (ovr.mid !== undefined && ovr.mid !== defaultAudio.mid)
        || (ovr.treble !== undefined && ovr.treble !== defaultAudio.treble)
        || ovr.useDefaultVoice === true
        || (ovr.provider && ovr.provider !== 'edge')
        || (ovr.providerVoiceId && ovr.providerVoiceId !== defaultEdge);
      if (hasChanges) cleaned[id] = ovr;
    });
    onSave(cleaned);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = (charId: string) => {
    setLocal(prev => {
      const next = { ...prev };
      delete next[charId];
      return next;
    });
    setSaved(false);
  };

  const filtered = filter
    ? characters.filter(c =>
        c.name.toLowerCase().includes(filter.toLowerCase()) ||
        c.faction.toLowerCase().includes(filter.toLowerCase())
      )
    : characters;

  const styles = Object.keys(TEST_PHRASES);

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="🔍 Rechercher..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="flex-1 bg-black border border-gray-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-purple-500 transition-colors"
        />
        <button
          onClick={handleSave}
          className={`flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            saved ? 'bg-green-700 text-white' : 'bg-purple-700 hover:bg-purple-600 text-white'
          }`}
        >
          {saved ? <Check size={12} /> : <Save size={12} />}
          {saved ? 'Sauvé !' : 'Sauver tout'}
        </button>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* ElevenLabs — priorité 1, qualité top, ~1-2s */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium border ${
          elStatus.enabled
            ? 'bg-emerald-900/30 border-emerald-600/50 text-emerald-300'
            : 'bg-gray-800/50 border-gray-700/40 text-gray-500'
        }`}>
          {elStatus.enabled ? <Wifi size={10} /> : <WifiOff size={10} />}
          ElevenLabs {elStatus.enabled ? `prêt — ${elStatus.voiceCount} voix` : 'non configuré'}
        </div>

        {/* XTTS — priorité 2, fallback local */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium border ${
          xttsOk
            ? 'bg-green-900/30 border-green-700/40 text-green-400'
            : 'bg-gray-800/50 border-gray-700/40 text-gray-500'
        }`}>
          {xttsOk ? <Wifi size={10} /> : <WifiOff size={10} />}
          XTTS {xttsOk ? 'actif (fallback)' : 'inactif'}
        </div>
        {!xttsOk && (
          <button
            onClick={async () => {
              setRetrying(true);
              resetXttsCache();
              // Brief delay then recheck after a test ping
              await new Promise(r => setTimeout(r, 500));
              setXttsOk(isXttsAvailable());
              setRetrying(false);
            }}
            disabled={retrying}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-[10px] transition-all"
            title="Réessayer la connexion XTTS"
          >
            <RefreshCw size={10} className={retrying ? 'animate-spin' : ''} />
            Réessayer
          </button>
        )}

        {/* Edge TTS — gratuit illimité, toujours dispo si serveur joignable */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium border ${
          edgeStatus.enabled
            ? 'bg-cyan-900/30 border-cyan-600/50 text-cyan-300'
            : 'bg-gray-800/50 border-gray-700/40 text-gray-500'
        }`}>
          {edgeStatus.enabled ? <Wifi size={10} /> : <WifiOff size={10} />}
          🎙️ Edge {edgeStatus.enabled ? `(${edgeStatus.voiceCount} voix)` : 'indisponible'}
        </div>

        {/* Google Cloud TTS */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium border ${
          gcloudStatus.enabled
            ? 'bg-blue-900/30 border-blue-600/50 text-blue-300'
            : 'bg-gray-800/50 border-gray-700/40 text-gray-500'
        }`}>
          {gcloudStatus.enabled ? <Wifi size={10} /> : <WifiOff size={10} />}
          ☁️ Google Cloud {gcloudStatus.enabled ? `(${gcloudStatus.voiceCount} voix)` : 'non configuré'}
        </div>

        {/* Hugging Face */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium border ${
          hfStatus.enabled
            ? 'bg-yellow-900/30 border-yellow-600/50 text-yellow-300'
            : 'bg-gray-800/50 border-gray-700/40 text-gray-500'
        }`}>
          {hfStatus.enabled ? <Wifi size={10} /> : <WifiOff size={10} />}
          🤗 HF {hfStatus.enabled ? (hfStatus.model || 'prêt') : 'non configuré'}
        </div>
      </div>

      {/* Download links */}
      <button
        onClick={() => setShowDownloads(!showDownloads)}
        className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
      >
        <Download size={10} /> Télécharger des voix TTS supplémentaires
      </button>
      {showDownloads && (
        <div className="bg-gray-800/50 rounded-xl p-2 space-y-1">
          {VOICE_RESOURCES.map(r => (
            <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-[10px] text-blue-300 hover:text-white transition-colors py-1">
              <Download size={10} className="flex-shrink-0" /> {r.name}
            </a>
          ))}
        </div>
      )}

      {/* Character list */}
      <div className="space-y-1 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar">
        {filtered.map(char => {
          const params = getOverride(char.id, char);
          const isExpanded = expanded === char.id;
          const isModified = local[char.id] !== undefined;
          const isTesting = testing === char.id;
          const currentStyleDesc = stylePrompts[params.voiceStyle] || '';
          const voiceInfo = GEMINI_VOICES.find(v => v.name === params.voice);

          return (
            <div
              key={char.id}
              className={`rounded-xl border transition-all ${
                isModified
                  ? 'bg-purple-900/20 border-purple-700/40'
                  : 'bg-gray-900/50 border-gray-800'
              }`}
            >
              {/* Compact row — always visible */}
              <div
                className="flex items-center gap-2 p-2 cursor-pointer hover:bg-white/5 rounded-xl transition-colors"
                onClick={() => setExpanded(isExpanded ? null : char.id)}
              >
                <img src={char.img} alt={char.name}
                  className="w-8 h-8 rounded-full object-cover border border-gray-700 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-white truncate">{char.name}</p>
                  <p className="text-[8px] text-gray-500">
                    {voiceInfo ? `${voiceInfo.gender === 'F' ? '♀' : '♂'} ${params.voice}` : params.voice}
                    {' · '}
                    {params.voiceStyle.replace(/_/g, ' ')}
                    {params.customPrompt ? ' · ✏️' : ''}
                  </p>
                </div>

                {/* Quick test */}
                <button
                  onClick={e => { e.stopPropagation(); handleTest(char); }}
                  disabled={isTesting}
                  className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
                    isTesting ? 'bg-purple-600 text-white animate-pulse' : 'bg-gray-800 hover:bg-purple-700 text-gray-300 hover:text-white'
                  }`}
                >
                  {isTesting ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                </button>

                {isExpanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
              </div>

              {/* Expanded detail panel */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-gray-800/50 pt-3">

                  {/* Default-voice switch — bypasses ElevenLabs/XTTS cloning and
                      uses a curated, expressive Gemini/Piper voice (like the
                      Arbitre's intonation-rich voice). */}
                  <div className="flex items-center justify-between gap-2 bg-gray-800/40 border border-gray-700/50 rounded-lg p-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-white">
                        {params.useDefaultVoice ? '🎙️ Voix par défaut' : '🎭 Vraie voix (clonée)'}
                      </p>
                      <p className="text-[9px] text-gray-500 leading-tight">
                        {params.useDefaultVoice
                          ? 'Voix expressive (style présentatrice), ignore le clonage ElevenLabs/XTTS.'
                          : 'Voix clonée du perso via ElevenLabs/XTTS quand dispo.'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const enabling = !params.useDefaultVoice;
                        updateField(char.id, char, 'useDefaultVoice', enabling);
                        // When switching to default mode, snap the voice to the
                        // pool if the current one isn't already in it. Default = Aoede.
                        if (enabling && !DEFAULT_VOICE_POOL.some(v => v.name === params.voice)) {
                          updateField(char.id, char, 'voice', 'Aoede');
                        }
                      }}
                      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                        params.useDefaultVoice ? 'bg-emerald-500' : 'bg-gray-600'
                      }`}
                      aria-label="Basculer voix par défaut / clonée"
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                          params.useDefaultVoice ? 'left-[22px]' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Provider TTS — force le provider pour ce personnage.
                      'Auto' = cascade par défaut. Tout autre = essayer en priorité,
                      fallback sur la cascade en cas d'échec. */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Provider TTS</label>
                      <select
                        value={params.provider ?? 'auto'}
                        onChange={e => {
                          const newProvider = e.target.value as VoiceProvider;
                          updateField(char.id, char, 'provider', newProvider);
                          // Si on bascule vers un provider qui a sa propre liste de voix,
                          // pré-sélectionner la première voix disponible si rien n'est défini.
                          const p = PROVIDERS.find(pp => pp.id === newProvider);
                          if (p?.voices && p.voices.length > 0 && !params.providerVoiceId) {
                            updateField(char.id, char, 'providerVoiceId', p.voices[0].id);
                          }
                        }}
                        className="w-full bg-black border border-gray-700 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none focus:border-purple-500"
                      >
                        {PROVIDERS.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.label} — {p.desc}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sélecteur de voix spécifique au provider (Edge/GCloud) */}
                    {(() => {
                      const currentProvider = PROVIDERS.find(p => p.id === params.provider);
                      if (!currentProvider?.voices) return <div />;
                      return (
                        <div>
                          <label className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">
                            Voix {currentProvider.label}
                          </label>
                          <select
                            value={params.providerVoiceId || currentProvider.voices[0].id}
                            onChange={e => updateField(char.id, char, 'providerVoiceId', e.target.value)}
                            className="w-full bg-black border border-gray-700 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none focus:border-purple-500"
                          >
                            {currentProvider.voices.map(v => {
                              // Pour Edge : afficher le dernier segment du nom (DeniseNeural → "Denise").
                              const shortLabel = v.id.includes('-')
                                ? v.id.split('-').pop()!.replace(/Neural$|MultilingualNeural$/i, '')
                                : v.id;
                              return (
                                <option key={v.id} value={v.id}>
                                  {v.gender === 'F' ? '♀' : '♂'} {shortLabel} — {v.desc}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Gemini Settings - Only visible when Gemini/Auto/Piper/XTTS/ElevenLabs is selected?
                      Actually, hide them if Edge or GCloud are explicitly selected since they don't use Gemini text prompts.
                      Wait, the user wants to see only what is linked to the chosen provider. */}
                  {params.provider !== 'edge' && params.provider !== 'gcloud' && (
                    <>
                      {/* Row 1: Voice dropdown */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">
                            {params.useDefaultVoice ? 'Voix par défaut' : 'Voix Gemini'}
                          </label>
                          <select
                            value={params.voice}
                            onChange={e => updateField(char.id, char, 'voice', e.target.value)}
                            className="w-full bg-black border border-gray-700 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none focus:border-purple-500"
                          >
                            {(params.useDefaultVoice ? DEFAULT_VOICE_POOL : GEMINI_VOICES).map(v => (
                              <option key={v.name} value={v.name}>
                                {v.gender === 'F' ? '♀' : '♂'} {v.name} — {v.desc}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Row 2: Current style description */}
                      <div className="bg-gray-800/30 rounded-lg p-2 mt-2">
                        <p className="text-[9px] text-gray-500 mb-1 uppercase tracking-wider">Persona par défaut</p>
                        <p className="text-[10px] text-gray-300 italic leading-relaxed">{currentStyleDesc || '(aucun style défini)'}</p>
                      </div>

                      {/* Row 3: Custom prompt */}
                      <div className="mt-2">
                        <label className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">
                          Prompt personnalisé <span className="text-gray-600">(remplace la persona par défaut)</span>
                        </label>
                        <textarea
                          value={params.customPrompt || ''}
                          onChange={e => updateField(char.id, char, 'customPrompt', e.target.value)}
                          placeholder="Ex: comme un vieux pirate bourru avec un accent breton, voix rauque et grasseyante..."
                          rows={2}
                          className="w-full bg-black border border-gray-700 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none focus:border-purple-500 resize-none placeholder:text-gray-600"
                        />
                      </div>
                    </>
                  )}

                  {/* Style vocal - visible for all providers as requested */}
                  <div className="mt-2">
                    <label className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Style vocal</label>
                    <select
                      value={params.voiceStyle}
                      onChange={e => updateField(char.id, char, 'voiceStyle', e.target.value)}
                      className="w-full bg-black border border-gray-700 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none focus:border-purple-500"
                    >
                      {styles.map(s => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>

                  {/* Row 4: Sliders */}
                  <div className="space-y-1.5">
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider">Réglages audio fins</p>

                    <Slider
                      label="Pitch"
                      value={params.pitchShift ?? getDefaultAudioSettings(char.voiceStyle).pitchShift}
                      min={-8} max={8} step={1}
                      unit=" st"
                      defaultVal={getDefaultAudioSettings(char.voiceStyle).pitchShift}
                      onChange={v => updateField(char.id, char, 'pitchShift', v)}
                    />

                    <Slider
                      label="Vitesse"
                      value={params.playbackRate ?? getDefaultAudioSettings(char.voiceStyle).playbackRate}
                      min={0.5} max={2.0} step={0.05}
                      unit="x"
                      defaultVal={getDefaultAudioSettings(char.voiceStyle).playbackRate}
                      onChange={v => updateField(char.id, char, 'playbackRate', v)}
                    />

                    <Slider
                      label="Web Pitch"
                      value={params.webPitch ?? 1.0}
                      min={0.1} max={2.0} step={0.05}
                      unit=""
                      defaultVal={1.0}
                      onChange={v => updateField(char.id, char, 'webPitch', v)}
                    />

                    <Slider
                      label="Volume"
                      value={params.volume ?? 1.0}
                      min={0.1} max={2.0} step={0.05}
                      unit="x"
                      defaultVal={1.0}
                      onChange={v => updateField(char.id, char, 'volume', v)}
                    />

                    <Slider
                      label="Grave"
                      value={params.bass ?? getDefaultAudioSettings(char.voiceStyle).bass}
                      min={-20} max={20} step={1}
                      unit=" dB"
                      defaultVal={getDefaultAudioSettings(char.voiceStyle).bass}
                      onChange={v => updateField(char.id, char, 'bass', v)}
                    />

                    <Slider
                      label="Médium"
                      value={params.mid ?? getDefaultAudioSettings(char.voiceStyle).mid}
                      min={-20} max={20} step={1}
                      unit=" dB"
                      defaultVal={getDefaultAudioSettings(char.voiceStyle).mid}
                      onChange={v => updateField(char.id, char, 'mid', v)}
                    />

                    <Slider
                      label="Aigu"
                      value={params.treble ?? getDefaultAudioSettings(char.voiceStyle).treble}
                      min={-20} max={20} step={1}
                      unit=" dB"
                      defaultVal={getDefaultAudioSettings(char.voiceStyle).treble}
                      onChange={v => updateField(char.id, char, 'treble', v)}
                    />
                  </div>

                  {/* Row 5: Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleTest(char)}
                      disabled={isTesting}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-bold transition-all ${
                        isTesting ? 'bg-purple-700 text-white animate-pulse' : 'bg-purple-600 hover:bg-purple-500 text-white'
                      }`}
                    >
                      {isTesting ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                      {isTesting ? 'Lecture...' : '▶ Tester cette voix'}
                    </button>
                    {isModified && (
                      <button
                        onClick={() => handleReset(char.id)}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-800 hover:bg-red-900/50 text-gray-400 hover:text-red-400 text-[10px] transition-all"
                      >
                        <RotateCcw size={10} /> Reset
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer legend */}
      <div className="flex items-center gap-3 text-[9px] text-gray-600 pt-1 border-t border-gray-800">
        <span>♂ masculin · ♀ féminin</span>
        <span className="text-purple-500">● modifié</span>
        <span>✏️ prompt custom</span>
        <span className="ml-auto">{characters.length} persos</span>
      </div>
    </div>
  );
}
