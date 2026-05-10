import { useState, useEffect, useRef } from 'react';
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
  Clock
} from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

// --- CONFIGURATION DU ROSTER (Le Multivers) ---

const CHARACTERS = [
  { id: 'homer', name: 'Homer Simpson', faction: 'Simpsons', img: '/images/homer_generic_sf_1778417069953.png', color: 'from-yellow-400 to-orange-500', voice: 'Charon' },
  { id: 'bart', name: 'Bart Simpson', faction: 'Simpsons', img: '/images/bart_generic_sf_1778417084932.png', color: 'from-orange-500 to-red-500', voice: 'Puck' },
  { id: 'adele', name: 'Mortelle Adèle', faction: 'Cartoon', img: '/images/adele_generic_sf_1778417097290.png', color: 'from-red-600 to-purple-800', voice: 'Kore' },
  { id: 'steve', name: 'Steve', faction: 'Minecraft', img: '/images/steve_sf_1778417051770.png', color: 'from-green-700 to-emerald-900', voice: 'Fenrir' },
  { id: 'franklin', name: 'Franklin', faction: 'GTA', img: '/images/franklin_sf_1778417110721.png', color: 'from-emerald-800 to-black', voice: 'Charon' },
  { id: 'papa', name: 'Papa', faction: 'Family', img: '/images/papa_sf_1778417131723.png', color: 'from-blue-800 to-indigo-900', voice: 'Fenrir' },
  { id: 'maman', name: 'Maman', faction: 'Family', img: '/images/maman_sf_1778417144541.png', color: 'from-pink-600 to-purple-600', voice: 'Kore' },
  { id: 'clara', name: 'Clara', faction: 'Family', img: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&h=600&fit=crop', color: 'from-purple-500 to-fuchsia-700', voice: 'Aoede' },
  { id: 'mayron', name: 'Mayron', faction: 'Family', img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=600&fit=crop', color: 'from-cyan-500 to-blue-700', voice: 'Puck' },
  { id: 'chat', name: 'Le Chat', faction: 'Animals', img: '/images/le_chat_sf_1778416951561.png', color: 'from-gray-800 to-black', voice: 'Charon' },
  { id: 'voisin', name: 'Le Voisin Relou', faction: 'Banlieue', img: '/images/voisin_relou_street_fighter_1778416835801.png', color: 'from-gray-400 to-gray-600', voice: 'Charon' },
  { id: 'livreur', name: 'Livreur UberEats', faction: 'Précaire', img: '/images/livreur_ubereats_sf_1778416904964.png', color: 'from-green-500 to-green-700', voice: 'Puck' },
  { id: 'influenceuse', name: 'Influenceuse Drama', faction: 'Réseaux', img: '/images/influenceuse_drama_sf_1778416919814.png', color: 'from-pink-400 to-pink-600', voice: 'Kore' },
  { id: 'banquier', name: 'Le Banquier', faction: 'Capitalisme', img: '/images/le_banquier_sf_1778416934105.png', color: 'from-slate-700 to-slate-900', voice: 'Fenrir' },
  { id: 'tonton', name: 'Tonton Bourré', faction: 'Family', img: '/images/tonton_bourre_sf_1778416951155.png', color: 'from-amber-600 to-orange-800', voice: 'Charon' },
];

const STYLES = [
  { id: 'boxing', name: 'Boxe Anglaise', icon: <Zap size={16} /> },
  { id: 'griefing', name: 'Minecraft Griefing (TNT)', icon: <Trash2 size={16} /> },
  { id: 'cleaning', name: 'Ménage Express (Balai)', icon: <Sword size={16} /> },
  { id: 'brawl', name: 'GTA Brawl (Batte)', icon: <User size={16} /> },
  { id: 'sarcasm', name: 'Sarcasme Mortel', icon: <Shield size={16} /> },
  { id: 'krav_maga', name: 'Krav Maga de Comptoir', icon: <Target size={16} /> },
  { id: 'capoeira', name: 'Capoeira Foirée', icon: <Swords size={16} /> },
  { id: 'catch', name: 'Catch PMU', icon: <Flame size={16} /> },
  { id: 'bac_sable', name: 'Arts Martiaux de Bac à Sable', icon: <User size={16} /> },
  { id: 'judo_soiree', name: 'Judo de Fin de Soirée', icon: <Zap size={16} /> },
  { id: 'lutte_crocs', name: 'Lutte en Crocs', icon: <Zap size={16} /> },
  { id: 'fuite', name: 'Technique "J\'ai pas le temps"', icon: <Clock size={16} /> },
  { id: 'nerf', name: 'Tir au Pigeon (Nerf)', icon: <Target size={16} /> },
  { id: 'magie_noire', name: 'Magie Noire de Wish', icon: <Skull size={16} /> },
];

const ARENAS = [
  { id: 'living_room', name: 'Le Salon de la Maison', img: 'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=1200' },
  { id: 'springfield', name: 'Springfield Centrale', img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200' },
  { id: 'los_santos', name: 'Rues de Los Santos', img: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=1200' },
  { id: 'nether', name: 'Le Nether', img: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200' },
  { id: 'pmu', name: 'Le PMU du Coin', img: '/images/pmu_du_coin_sf_1778416966206.png' },
  { id: 'parking', name: 'Parking du Supermarché', img: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=1200' },
  { id: 'caf', name: 'File d\'Attente de la CAF', img: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200' },
  { id: 'space', name: 'Station Spatiale Alpha', img: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200' },
];

const MOCK_BATTLE = {
  intro: { text: "Arbitre: Bienvenue dans l'arène pour ce combat de DÉMONSTRATION ! Préparez-vous, ça va chier !", speaker: "Arbitre" },
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
        { speaker: "Arbitre", text: "Arbitre: ROUND 2... BASTON !", action: "Gong" },
        { speaker: "Joueur 1", text: "Joueur 1: COMBO D'IMAGES ! PRENDS ÇA DANS TES DENTS !", action: "Attaque Spéciale" },
        { speaker: "Joueur 2", text: "Joueur 2: Aïe ! Putain ça pique !", action: "Encaisse" }
      ]
    }
  ],
  winner: "Le Joueur de Démo",
  finishingMove: { type: "FATALITY", description: "Arbitre: DEMO-TALITY! Le combat se termine dans un bain de sang pixelisé !", speaker: "Arbitre" },
  conclusion: { text: "Arbitre: Mettez une clé API si vous voulez la vraie violence !", speaker: "Arbitre" }
};

// --- COMPOSANT PRINCIPAL ---

export default function App() {
  const [gameState, setGameState] = useState<'SETUP' | 'LOADING' | 'COMBAT' | 'ERROR'>('SETUP');

  const [p1, setP1] = useState(CHARACTERS[0]);
  const [p2, setP2] = useState(CHARACTERS[1]);
  const [p1Style, setP1Style] = useState(STYLES[0]);
  const [p2Style, setP2Style] = useState(STYLES[0]);
  const [arena, setArena] = useState(ARENAS[0]);
  const [arenaOffset, setArenaOffset] = useState(0);

  const [battleData, setBattleData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");
  const [selectingPlayer, setSelectingPlayer] = useState<1 | 2>(1);
  const [matchDuration, setMatchDuration] = useState(3);
  const audioBgRef = useRef<HTMLAudioElement | null>(null);

  // Musique: online = fichier audio, offline = génération Web Audio
  useEffect(() => {
    if (!audioContextRef.current && musicEnabled) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (musicEnabled && gameState === 'SETUP') {
      if (navigator.onLine) {
        stopBgMusicOffline();
        audioBgRef.current?.play().catch(() => {
          // Si l'URL échoue, utiliser la musique offline
          getAudioCtx();
          startBgMusicOffline();
        });
      } else {
        audioBgRef.current?.pause();
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

  // Profils de voix Web Speech API (fallback offline) mappés aux voix Gemini
  const VOICE_PROFILES: Record<string, { pitch: number; rate: number; lang: string }> = {
    'Charon':  { pitch: 0.6, rate: 0.85, lang: 'fr-FR' },  // Grave, lent
    'Fenrir':  { pitch: 0.8, rate: 0.95, lang: 'fr-FR' },  // Puissant
    'Puck':    { pitch: 1.4, rate: 1.15, lang: 'fr-FR' },  // Jeune, dynamique
    'Kore':    { pitch: 1.6, rate: 1.0,  lang: 'fr-FR' },  // Féminin
    'Aoede':   { pitch: 1.8, rate: 0.9,  lang: 'fr-FR' },  // Féminin doux
  };

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

  const getVoiceForSpeaker = (speaker: string) => {
    if (speaker.toLowerCase().includes(p1.name.toLowerCase())) return p1.voice;
    if (speaker.toLowerCase().includes(p2.name.toLowerCase())) return p2.voice;
    return 'Aoede'; // Voix par défaut (Arbitre)
  };

  // Fallback offline : Web Speech API avec profils de voix distinctifs
  const playWebSpeech = (text: string, voiceName: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) { setTimeout(resolve, 1500); return; }
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/^[^:]+:\s*/, ''); // Enlève le préfixe "Nom: "
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const profile = VOICE_PROFILES[voiceName] || VOICE_PROFILES['Fenrir'];
      utterance.lang = profile.lang;
      utterance.pitch = profile.pitch;
      utterance.rate = profile.rate;
      utterance.volume = 1.0;
      // Essayer de trouver une voix française
      const voices = window.speechSynthesis.getVoices();
      const frVoice = voices.find(v => v.lang.startsWith('fr'));
      if (frVoice) utterance.voice = frVoice;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  };

  const playGeminiAudio = async (text: string, voiceName: string) => {
    if (!voiceEnabled) {
      await new Promise(r => setTimeout(r, 800));
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY || tempApiKey;

    // Mode hors-ligne ou sans clé API : utiliser Web Speech API
    if (!apiKey || !navigator.onLine) {
      await playWebSpeech(text, voiceName);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: text,
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName
              }
            }
          }
        }
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts) { await playWebSpeech(text, voiceName); return; }

      const audioPart = parts.find(p => p.inlineData && p.inlineData.mimeType.includes("audio"));
      if (!audioPart) { await playWebSpeech(text, voiceName); return; }

      const base64Audio = audioPart.inlineData.data;
      const audioCtx = getAudioCtx();
      const binaryString = window.atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Decode PCM 16-bit 24kHz Mono (standard Gemini audio format)
      const int16Array = new Int16Array(bytes.buffer);
      const audioBuffer = audioCtx.createBuffer(1, int16Array.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < int16Array.length; i++) {
        channelData[i] = int16Array[i] / 32768.0;
      }

      if (currentAudioSource.current) {
        currentAudioSource.current.stop();
      }

      // Gain node pour amplifier le son
      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(2.0, audioCtx.currentTime); // x2 volume
      gainNode.connect(audioCtx.destination);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(gainNode);
      source.start();
      currentAudioSource.current = source;

      return new Promise<void>((resolve) => {
        source.onended = () => resolve();
      });

    } catch (e) {
      console.warn("Gemini TTS échoué, fallback Web Speech:", e);
      // Fallback automatique sur Web Speech en cas d'erreur réseau
      await playWebSpeech(text, voiceName);
    }
  };

  const generateCombat = async (isDemo = false) => {
    // Activation du contexte audio lors d'une interaction utilisateur
    getAudioCtx();
    setGameState('LOADING');

    if (isDemo) {
      await new Promise(r => setTimeout(r, 1500));
      setBattleData(MOCK_BATTLE);
      setCurrentStep(0);
      setGameState('COMBAT');
      return;
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY || tempApiKey;
      if (!apiKey) {
        setGameState('SETUP');
        throw new Error("Clé API manquante. Veuillez l'entrer ou lancer la démo.");
      }

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Tu es le "Grand Maître du Multivers", le narrateur officiel d'un tournoi de combat ultime. Génère un script de combat en JSON.

PARAMÈTRES D'ENTRÉE :
- Combattant 1 : ${p1.name} (Style : ${p1Style.name})
- Combattant 2 : ${p2.name} (Style : ${p2Style.name})
- Arène : ${arena.name}
- Nombre de rounds requis : EXACTEMENT ${matchDuration} rounds.

DIRECTIVES DE RÉDACTION :
1. TON TRASH ET HUMOUR NOIR : Lâche-toi ! C'est un jeu pour adultes. Utilise des gros mots (putain, merde, bâtard, salaud, bordel...), du trashtalk violent, cynique et humoristique. Les insultes doivent fuser et être créatives.
2. INTONATIONS ET ÉMOTIONS : Ajoute beaucoup d'expressions sonores, de cris (Aaaargh, D'oh, Grrr), d'onomatopées. Utilise une ponctuation forte (!, ?, ...) pour la synthèse vocale.
3. PERSONNAGES : Respecte les personnalités à 100% mais en version énervée et trash.
4. STRUCTURE TTS : Chaque valeur du champ "text" DOIT commencer par "Nom: ". Exemple: "${p1.name}: Prends ça dans ta gueule ! Boom !".
5. DYNAMISME : Fais EXACTEMENT ${matchDuration} rounds. Chaque round doit comporter plusieurs échanges de coups.
6. FINITION : Termine par une FATALITY épique, absurde et violente.

FORMAT JSON REQUIS :
{
  "intro": { "text": "Arbitre: Bienvenue dans l'arène de ${arena.name} ! Que le combat commence ! Ding ding !", "speaker": "Arbitre" },
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
  "finishingMove": { "type": "FATALITY", "description": "Arbitre: FATALITY! ${p1.name} détruit son adversaire ! K.O. !", "speaker": "Arbitre" },
  "conclusion": { "text": "Arbitre: La victoire est absolue pour ${p1.name} ! Mwahaha !", "speaker": "Arbitre" }
}`;

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
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
          }
        }
      });

      const data = JSON.parse(response.text?.trim() || "{}");
      setBattleData(data);
      setCurrentStep(0);
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

      let lines = [];
      if (currentStep === 0) {
        lines = [battleData.intro];
      } else if (currentStep > 0 && currentStep <= battleData.rounds.length) {
        const round = battleData.rounds[currentStep - 1];
        lines = [{ text: `Arbitre: ${round.title} !`, speaker: "Arbitre" }, ...round.dialogues];
      } else {
        lines = [battleData.finishingMove, battleData.conclusion];
      }

      for (const line of lines) {
        if (!isActive) break;
        const textToSpeak = line.text || line.description;
        const voiceName = getVoiceForSpeaker(line.speaker || 'Arbitre');

        await playGeminiAudio(textToSpeak, voiceName);
      }

      setIsSpeaking(false);
      if (isActive && currentStep < totalSteps - 1) {
        await new Promise(r => setTimeout(r, 500));
        setCurrentStep(prev => prev + 1);
      }
    };
    runStep();
    return () => {
      isActive = false;
      if (currentAudioSource.current) {
        currentAudioSource.current.stop();
      }
    };
  }, [currentStep, gameState, battleData, voiceEnabled]);

  if (gameState === 'COMBAT') {
    return (
      <div className="relative">
        <CombatView p1={p1} p2={p2} arena={arena} battleData={battleData} currentStep={currentStep} onReset={() => setGameState('SETUP')} />
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
    <div className="min-h-screen bg-black text-white font-sans overflow-hidden p-4 md:p-8 flex flex-col items-center selection:bg-red-500/30">
      {/* Street Fighter Audio */}
      <audio ref={audioBgRef} src="https://archive.org/download/StreetFighterIIMusic/SF2_Guile.mp3" loop />
      
      {/* Bouton Musique */}
      <button
        onClick={() => setMusicEnabled(!musicEnabled)}
        className="fixed top-4 right-4 z-50 p-3 bg-gray-900/80 rounded-full border border-gray-700 text-white hover:bg-yellow-600 transition-colors shadow-lg"
      >
        {musicEnabled ? <Music size={24} className="text-yellow-500 animate-pulse" /> : <Music size={24} className="opacity-40" />}
      </button>

      {/* Background Arena Preview */}
      <div className="absolute inset-0 z-0 opacity-40 transition-all duration-1000 overflow-hidden">
        <motion.img
          key={arena.id}
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.4 }}
          src={arena.img}
          className="w-full h-full object-cover grayscale-[30%] blur-sm"
          alt="Arena"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black" />
      </div>

      <header className="relative z-10 text-center mb-6">
        <motion.h1
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-4xl md:text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-400 to-red-600 uppercase drop-shadow-[0_5px_15px_rgba(220,38,38,0.5)]"
        >
          Ultimate Multiverse Brawler
        </motion.h1>
        <p className="text-gray-400 mt-2 font-mono tracking-widest text-sm animate-pulse">CHOISISSEZ VOTRE DESTINÉE</p>
      </header>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8 w-full max-w-7xl items-start">

        {/* PLAYER 1 SELECT */}
        <SelectionCard 
          player={1} 
          active={p1} 
          style={p1Style} 
          onStyleChange={setP1Style} 
          isSelecting={selectingPlayer === 1}
          onSelectMode={() => setSelectingPlayer(1)}
          onCharacterChange={setP1}
        />

        {/* MIDDLE GRID */}
        <div className="flex flex-col items-center">

          <div className="mb-4">
            <button
              onClick={() => setSelectingPlayer(selectingPlayer === 1 ? 2 : 1)}
              className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-colors ${selectingPlayer === 1 ? 'bg-blue-600 text-white shadow-[0_0_15px_blue]' : 'bg-red-600 text-white shadow-[0_0_15px_red]'}`}
            >
              Sélection : Joueur {selectingPlayer}
            </button>
          </div>

          <div className="grid grid-cols-5 gap-3 p-6 bg-gray-900/60 backdrop-blur-xl rounded-3xl border-2 border-gray-700/50 shadow-2xl">
            {CHARACTERS.map((char) => (
              <button
                key={char.id}
                onClick={() => {
                  if (selectingPlayer === 1) {
                    setP1(char);
                    setSelectingPlayer(2);
                  } else {
                    setP2(char);
                    setSelectingPlayer(1);
                  }
                }}
                className={`w-12 h-12 md:w-14 md:h-14 rounded-xl border-2 overflow-hidden transition-all duration-300 hover:scale-110 active:scale-95 group relative
                  ${p1.id === char.id ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.6)] z-10 scale-110' : 'border-gray-700 opacity-60 hover:opacity-100'}
                  ${p2.id === char.id ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)] z-10 scale-110 opacity-100' : ''}`}
              >
                <img src={char.img} className="w-full h-full object-cover" alt={char.name} />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors" />
                {p1.id === char.id && <div className="absolute top-0 left-0 bg-blue-600 text-[8px] font-bold px-1 rounded-br-md">P1</div>}
                {p2.id === char.id && <div className="absolute bottom-0 right-0 bg-red-600 text-[8px] font-bold px-1 rounded-tl-md">P2</div>}
              </button>
            ))}
          </div>

          <div className="mt-6 w-full max-w-sm">
            <label className="text-[10px] text-gray-500 uppercase tracking-[0.3em] block mb-3 text-center flex items-center justify-center gap-2">
              <Sword size={12} /> Style de Combat (P{selectingPlayer})
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto p-3 bg-gray-900/60 backdrop-blur-xl rounded-2xl border-2 border-gray-700/50 shadow-inner custom-scrollbar">
              {STYLES.map((s) => {
                 const isSelected = selectingPlayer === 1 ? p1Style.id === s.id : p2Style.id === s.id;
                 return (
                   <button
                     key={s.id}
                     onClick={() => selectingPlayer === 1 ? setP1Style(s) : setP2Style(s)}
                     className={`flex items-center gap-2 p-2 rounded-xl border text-[9px] uppercase font-bold text-left transition-all ${isSelected ? (selectingPlayer === 1 ? 'bg-blue-900/60 border-blue-500 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-red-900/60 border-red-500 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.3)]') : 'bg-black/50 border-gray-700/50 text-gray-400 hover:border-gray-500 hover:text-white'}`}
                   >
                     <span className={isSelected ? (selectingPlayer === 1 ? 'text-blue-400' : 'text-red-400') : 'text-gray-500'}>{s.icon}</span>
                     <span className="leading-tight">{s.name}</span>
                   </button>
                 );
              })}
            </div>
          </div>

          <div className="mt-6 w-full max-w-sm">
            <label className="text-[10px] text-gray-500 uppercase tracking-[0.3em] block mb-3 text-center">Arène de Combat</label>
            <div className="flex items-center justify-center gap-4 mb-4">
              <button 
                onClick={() => {
                  setArenaOffset((prev) => (prev - 1 + ARENAS.length) % ARENAS.length);
                }}
                className="p-1 hover:text-yellow-500 transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="flex justify-center gap-2 overflow-hidden">
                {[...Array(6)].map((_, i) => {
                  const a = ARENAS[(arenaOffset + i) % ARENAS.length];
                  return (
                    <button
                      key={a.id}
                      onClick={() => setArena(a)}
                      className={`w-14 h-10 md:w-16 md:h-10 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${arena.id === a.id ? 'border-yellow-500 scale-110 z-10' : 'border-transparent opacity-40 hover:opacity-100'}`}
                    >
                      <img src={a.img} className="w-full h-full object-cover" alt={a.name} />
                    </button>
                  );
                })}
              </div>
              <button 
                onClick={() => {
                  setArenaOffset((prev) => (prev + 1) % ARENAS.length);
                }}
                className="p-1 hover:text-yellow-500 transition-colors"
              >
                <ChevronRight size={24} />
              </button>
            </div>
            <div className="text-center text-yellow-500 font-bold text-xs uppercase tracking-widest italic mb-6 h-4">{arena.name}</div>
            
            {/* Duration Selector */}
            <div className="mb-6 w-full">
               <label className="text-[10px] text-gray-500 uppercase tracking-[0.3em] block mb-2 text-center flex items-center justify-center gap-2">
                 <Clock size={12} /> Durée du Combat
               </label>
               <div className="flex bg-gray-800/80 rounded-full p-1 border border-gray-700">
                  <button onClick={() => setMatchDuration(3)} className={`flex-1 py-1 text-[10px] uppercase font-bold rounded-full transition-colors ${matchDuration === 3 ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}>Rapide (3 Rnds)</button>
                  <button onClick={() => setMatchDuration(5)} className={`flex-1 py-1 text-[10px] uppercase font-bold rounded-full transition-colors ${matchDuration === 5 ? 'bg-yellow-600 text-white' : 'text-gray-400 hover:text-white'}`}>Normal (5 Rnds)</button>
                  <button onClick={() => setMatchDuration(8)} className={`flex-1 py-1 text-[10px] uppercase font-bold rounded-full transition-colors ${matchDuration === 8 ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>Épique (8 Rnds)</button>
               </div>
            </div>
          </div>

          {!process.env.GEMINI_API_KEY && (
            <div className="w-full max-w-sm mb-6 flex flex-col items-center">
              <label className="text-[10px] text-red-500 uppercase tracking-[0.3em] block mb-2 text-center">Configuration Requise</label>
              <input
                type="password"
                placeholder="Entrez votre Clé API Gemini"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                className="w-full bg-gray-900/80 border border-gray-700 rounded-xl px-4 py-3 text-sm text-center focus:border-red-500 outline-none transition-colors mb-3"
              />
              <button
                onClick={() => generateCombat(true)}
                className="text-[10px] text-gray-400 hover:text-white uppercase tracking-widest border-b border-gray-700 hover:border-white transition-all pb-1"
              >
                Lancer une Démo sans clé API
              </button>
            </div>
          )}

          {gameState === 'LOADING' ? (
            <div className="mt-12 flex flex-col items-center">
              <RefreshCw size={48} className="text-red-600 animate-spin mb-4" />
              <p className="text-white font-black italic animate-pulse">GÉNÉRATION DU COMBAT...</p>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(239,68,68,0.4)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => generateCombat(false)}
              className="mt-6 bg-gradient-to-r from-red-700 via-orange-600 to-red-700 px-12 py-3 rounded-full font-black text-xl md:text-2xl uppercase italic border-4 border-yellow-400 shadow-[0_10px_30px_rgba(0,0,0,0.5)] group"
            >
              <span className="flex items-center gap-3">
                <Play fill="currentColor" size={24} className="group-hover:translate-x-1 transition-transform" />
                Fight !
              </span>
            </motion.button>
          )}
        </div>

        {/* PLAYER 2 SELECT */}
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
  );
}

function SelectionCard({ player, active, style, onStyleChange, isSelecting, onSelectMode, onCharacterChange }) {
  const isP1 = player === 1;
  const color = isP1 ? 'blue' : 'red';

  return (
    <div className={`flex flex-col ${isP1 ? 'items-start' : 'items-end'} w-full`}>
      <div 
        className={`text-2xl md:text-3xl font-black italic mb-2 uppercase tracking-tighter cursor-pointer transition-all duration-300 ${isP1 ? 'text-blue-500' : 'text-red-500'} ${isSelecting ? 'scale-105 drop-shadow-[0_0_15px_currentColor]' : 'opacity-50 hover:opacity-80'}`}
        onClick={onSelectMode}
      >
        PLAYER {player}
      </div>
      <div className="relative w-full max-w-[200px] group">
        <motion.div
          key={active.id}
          initial={{ x: isP1 ? -100 : 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className={`relative aspect-[3/4] w-full rounded-[2rem] overflow-hidden border-4 cursor-pointer transition-all duration-300 ${isP1 ? 'border-blue-500' : 'border-red-500'} ${isSelecting ? (isP1 ? 'shadow-[0_0_40px_rgba(59,130,246,0.5)] scale-105' : 'shadow-[0_0_40px_rgba(239,68,68,0.5)] scale-105') : 'shadow-xl opacity-70 hover:opacity-100 hover:scale-100 scale-95'}`}
          onClick={onSelectMode}
        >
          <img src={active.img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={active.name} />
          <div className={`absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80`} />
          <div className={`absolute inset-0 bg-gradient-to-b from-${color}-900/20 via-transparent to-transparent`} />

          <div className="absolute bottom-8 left-8 right-8">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-2xl font-black uppercase italic leading-none tracking-tighter mb-1"
            >
              {active.name}
            </motion.div>
            <div className="text-xs text-gray-300 uppercase tracking-[0.3em] font-bold opacity-70">{active.faction}</div>
          </div>
        </motion.div>

        {/* Navigation Arrows for Characters */}
        <div className={`absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-2 z-20 pointer-events-none`}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const idx = CHARACTERS.findIndex(c => c.id === active.id);
              const next = CHARACTERS[(idx - 1 + CHARACTERS.length) % CHARACTERS.length];
              // This is a hack because I didn't change the props signature in App.tsx yet
              // But I will do it in the same multi-replace
              onCharacterChange(next);
            }}
            className="p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-all pointer-events-auto hover:scale-120 border border-white/20 backdrop-blur-sm"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const idx = CHARACTERS.findIndex(c => c.id === active.id);
              const next = CHARACTERS[(idx + 1) % CHARACTERS.length];
              onCharacterChange(next);
            }}
            className="p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-all pointer-events-auto hover:scale-120 border border-white/20 backdrop-blur-sm"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      <div className={`mt-6 w-full max-w-[200px] flex ${isP1 ? 'justify-start' : 'justify-end'}`}>
        <div className={`px-4 py-3 flex items-center gap-3 rounded-2xl border-2 bg-gray-900/80 backdrop-blur-md shadow-2xl ${isP1 ? 'border-blue-500/50' : 'border-red-500/50'}`}>
          <div className={`p-2 rounded-full bg-black/50 ${isP1 ? 'text-blue-400' : 'text-red-400'}`}>
            {style.icon}
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] text-gray-400 uppercase tracking-[0.2em]">Style Actuel</span>
            <span className={`font-black text-[10px] uppercase tracking-wider ${isP1 ? 'text-blue-100' : 'text-red-100'}`}>{style.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CombatView({ p1, p2, arena, battleData, currentStep, onReset }) {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col items-center p-4 md:p-12">
      <div className="absolute inset-0 z-0 opacity-40">
        <img src={arena.img} className="w-full h-full object-cover" alt="Arena" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-transparent to-black" />
      </div>

      <div className="relative z-10 w-full max-w-6xl">
        {/* Top Health Bars Style Header */}
        <div className="flex justify-between items-center mb-16 gap-4 md:gap-12">
          <FighterHeader fighter={p1} side="left" color="blue" />
          <div className="text-5xl md:text-7xl font-black italic text-red-600 animate-pulse drop-shadow-[0_0_30px_rgba(239,68,68,0.8)] z-10">VS</div>
          <FighterHeader fighter={p2} side="right" color="red" />
        </div>

        <div className="bg-gray-900/60 backdrop-blur-xl border-2 border-gray-800/50 rounded-[2.5rem] p-6 md:p-12 shadow-2xl min-h-[450px] relative overflow-hidden">
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
              {currentStep === 0 && <Dialogue lines={battleData.intro} p1={p1} p2={p2} />}
              {currentStep > 0 && currentStep <= (battleData.rounds?.length || 0) && (
                <Dialogue lines={battleData.rounds[currentStep - 1].dialogues} p1={p1} p2={p2} title={battleData.rounds[currentStep - 1].title} />
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
                  <Dialogue lines={[battleData.finishingMove, battleData.conclusion]} p1={p1} p2={p2} />
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

        <div className="mt-12 flex justify-center">
          <button
            onClick={onReset}
            className="group flex items-center gap-3 px-12 py-4 bg-white text-black font-black uppercase italic rounded-full hover:bg-red-600 hover:text-white transition-all duration-300 transform hover:scale-105"
          >
            <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
            Nouveau Match
          </button>
        </div>
      </div>
    </div>
  );
}

function FighterHeader({ fighter, side, color }) {
  const isLeft = side === 'left';
  return (
    <div className={`flex items-center gap-4 md:gap-8 ${!isLeft ? 'flex-row-reverse' : ''} w-full`}>
      <motion.div
        whileHover={{ scale: 1.1 }}
        className={`relative w-20 h-20 md:w-32 md:h-32 rounded-full border-4 ${isLeft ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]'} overflow-hidden flex-shrink-0`}
      >
        <img src={fighter.img} className="w-full h-full object-cover" alt={fighter.name} />
      </motion.div>
      <div className={`flex-grow ${!isLeft ? 'text-right' : 'text-left'}`}>
        <div className="text-xl md:text-3xl font-black uppercase italic leading-none mb-3">{fighter.name}</div>
        <div className="w-full max-w-[300px] h-4 bg-gray-900 rounded-full overflow-hidden border border-gray-800 shadow-inner">
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

function Dialogue({ lines, p1, p2, title }) {
  const linesArray = Array.isArray(lines) ? lines : [lines];
  return (
    <div className="space-y-6">
      {title && (
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="h-[2px] flex-grow bg-gradient-to-r from-transparent to-gray-700" />
          <div className="text-2xl font-black text-gray-500 tracking-[0.5em] italic">{title}</div>
          <div className="h-[2px] flex-grow bg-gradient-to-l from-transparent to-gray-700" />
        </div>
      )}
      {linesArray.map((l, i) => {
        const isP1 = l.speaker?.toLowerCase().includes(p1.name.toLowerCase());
        const isP2 = l.speaker?.toLowerCase().includes(p2.name.toLowerCase());
        const isArbitre = l.speaker?.toLowerCase().includes('arbitre');

        return (
          <motion.div
            key={i}
            initial={{ x: isP1 ? -20 : isP2 ? 20 : 0, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`flex flex-col ${isP1 ? 'items-start' : isP2 ? 'items-end' : 'items-center'}`}
          >
            <div className={`flex items-center gap-2 mb-2 ${isP2 ? 'flex-row-reverse' : ''}`}>
              <span className={`text-xs font-black uppercase tracking-widest ${isP1 ? 'text-blue-400' : isP2 ? 'text-red-400' : 'text-yellow-500'}`}>
                {l.speaker}
              </span>
              {l.action && <span className="text-[10px] text-gray-500 italic uppercase">({l.action})</span>}
            </div>
            <div className={`max-w-2xl p-5 rounded-2xl text-lg md:text-xl font-medium leading-relaxed shadow-xl
              ${isP1 ? 'bg-blue-950/40 border-l-4 border-blue-500 rounded-tl-none' :
                isP2 ? 'bg-red-950/40 border-r-4 border-red-500 rounded-tr-none text-right' :
                  'bg-gray-800/50 border-t-4 border-yellow-500 italic text-center'}`}
            >
              {l.text || l.description}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
