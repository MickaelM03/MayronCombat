import React, { useState, useCallback } from 'react';
import { Play, Save, Download, Loader2, Check, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

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

export interface VoiceOverride {
  voice: string;
  voiceStyle: string;
  customPrompt?: string;   // Override STYLE_PROMPTS for Gemini TTS
  pitchShift?: number;     // Piper pitch shift in semitones (-8 to +8)
  playbackRate?: number;   // Piper/WebSpeech rate (0.5 to 2.0)
  webPitch?: number;       // WebSpeech pitch (0.1 to 2.0)
  volume?: number;         // Per-character volume (0.1 to 2.0)
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
  onTestVoice: (text: string, voiceName: string, voiceStyle: string, params: VoiceOverride) => Promise<void>;
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
    for (const [k, v] of Object.entries(overrides)) clone[k] = { ...v };
    return clone;
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [filter, setFilter] = useState('');

  const getOverride = (charId: string, defaults: Character): VoiceOverride => {
    const ovr = local[charId];
    return {
      voice: ovr?.voice ?? defaults.voice,
      voiceStyle: ovr?.voiceStyle ?? defaults.voiceStyle,
      customPrompt: ovr?.customPrompt ?? '',
      pitchShift: ovr?.pitchShift ?? 0,
      playbackRate: ovr?.playbackRate ?? 1.0,
      webPitch: ovr?.webPitch ?? 1.0,
      volume: ovr?.volume ?? 1.0,
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
      await onTestVoice(phrase, params.voice, params.voiceStyle, params);
    } catch { /* ignore */ }
    setTesting(null);
  }, [local, onTestVoice]);

  const handleSave = () => {
    // Clean overrides: remove entries that match defaults
    const cleaned: Record<string, VoiceOverride> = {};
    for (const [id, ovr] of Object.entries(local)) {
      const char = characters.find(c => c.id === id);
      if (!char) continue;
      const hasChanges = ovr.voice !== char.voice
        || ovr.voiceStyle !== char.voiceStyle
        || (ovr.customPrompt && ovr.customPrompt.trim())
        || (ovr.pitchShift !== undefined && ovr.pitchShift !== 0)
        || (ovr.playbackRate !== undefined && Math.abs(ovr.playbackRate - 1.0) > 0.01)
        || (ovr.webPitch !== undefined && Math.abs(ovr.webPitch - 1.0) > 0.01)
        || (ovr.volume !== undefined && Math.abs(ovr.volume - 1.0) > 0.01);
      if (hasChanges) cleaned[id] = ovr;
    }
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

                  {/* Row 1: Voice + Style dropdowns */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Voix Gemini</label>
                      <select
                        value={params.voice}
                        onChange={e => updateField(char.id, char, 'voice', e.target.value)}
                        className="w-full bg-black border border-gray-700 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none focus:border-purple-500"
                      >
                        {GEMINI_VOICES.map(v => (
                          <option key={v.name} value={v.name}>
                            {v.gender === 'F' ? '♀' : '♂'} {v.name} — {v.desc}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
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
                  </div>

                  {/* Row 2: Current style description */}
                  <div className="bg-gray-800/30 rounded-lg p-2">
                    <p className="text-[9px] text-gray-500 mb-1 uppercase tracking-wider">Persona par défaut</p>
                    <p className="text-[10px] text-gray-300 italic leading-relaxed">{currentStyleDesc || '(aucun style défini)'}</p>
                  </div>

                  {/* Row 3: Custom prompt */}
                  <div>
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

                  {/* Row 4: Sliders */}
                  <div className="space-y-1.5">
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider">Réglages audio fins</p>

                    <Slider
                      label="Pitch"
                      value={params.pitchShift ?? 0}
                      min={-8} max={8} step={1}
                      unit=" st"
                      defaultVal={0}
                      onChange={v => updateField(char.id, char, 'pitchShift', v)}
                    />

                    <Slider
                      label="Vitesse"
                      value={params.playbackRate ?? 1.0}
                      min={0.5} max={2.0} step={0.05}
                      unit="x"
                      defaultVal={1.0}
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
