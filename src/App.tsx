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
  Clock,
  Lock,
  X,
  AlertTriangle,
  Settings2
} from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import NarrativeModeSelector from './components/NarrativeModeSelector';
import BattleLibrary from './components/BattleLibrary';
import BatchGenerator from './components/BatchGenerator';
import { NarrativeMode, NARRATIVE_MODE_META, getNarrativeDirectives, getNarrativeModeLabel } from './lib/battles/prompts';
import { saveBattle, saveAudioBlob, getAudioBlob, SavedBattle } from './lib/battles/store';
import { playWebSpeechEnhanced } from './lib/voice/webspeech';
import { playPiperTTS, warmUpPiper } from './lib/voice/piper';

// --- CONFIGURATION DU ROSTER (Le Multivers) ---

const CHARACTERS = [
  // VOIX GEMINI TTS: Charon (grave, menaçant), Fenrir (puissant, héroïque), Puck (jeune, agile), Kore (féminin assertif), Aoede (féminin doux)
  { id: 'homer', name: 'Homer Simpson', faction: 'Simpsons', img: '/images/homer_generic_sf_1778417069953.png', color: 'from-yellow-400 to-orange-500', voice: 'Charon', voiceStyle: 'idiot' },
  { id: 'bart', name: 'Bart Simpson', faction: 'Simpsons', img: '/images/bart_generic_sf_1778417084932.png', color: 'from-orange-500 to-red-500', voice: 'Puck', voiceStyle: 'enfant' },
  { id: 'adele', name: 'Mortelle Adèle', faction: 'Cartoon', img: '/images/adele_generic_sf_1778417097290.png', color: 'from-red-600 to-purple-800', voice: 'Kore', voiceStyle: 'enfant_diabolique' },
  { id: 'steve', name: 'Steve', faction: 'Minecraft', img: '/images/steve_sf_1778417051770.png', color: 'from-green-700 to-emerald-900', voice: 'Puck', voiceStyle: 'gamer' },
  { id: 'franklin', name: 'Franklin', faction: 'GTA', img: '/images/franklin_sf_1778417110721.png', color: 'from-emerald-800 to-black', voice: 'Fenrir', voiceStyle: 'gangster' },
  { id: 'papa', name: 'Papa', faction: 'Family', img: '/images/papa_sf_1778417131723.png', color: 'from-blue-800 to-indigo-900', voice: 'Fenrir', voiceStyle: 'papa' },
  { id: 'maman', name: 'Maman', faction: 'Family', img: '/images/maman_sf_1778417144541.png', color: 'from-pink-600 to-purple-600', voice: 'Kore', voiceStyle: 'maman' },
  { id: 'clara', name: 'Clara', faction: 'Family', img: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&h=600&fit=crop', color: 'from-purple-500 to-fuchsia-700', voice: 'Aoede', voiceStyle: 'ado_fille' },
  { id: 'mayron', name: 'Mayron', faction: 'Family', img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=600&fit=crop', color: 'from-cyan-500 to-blue-700', voice: 'Puck', voiceStyle: 'ado_garcon' },
  { id: 'chat', name: 'Le Chat', faction: 'Animals', img: '/images/le_chat_sf_1778416951561.png', color: 'from-gray-800 to-black', voice: 'Puck', voiceStyle: 'animal' },
  { id: 'voisin', name: 'Le Voisin Relou', faction: 'Banlieue', img: '/images/voisin_relou_street_fighter_1778416835801.png', color: 'from-gray-400 to-gray-600', voice: 'Charon', voiceStyle: 'raleur' },
  { id: 'livreur', name: 'Livreur UberEats', faction: 'Précaire', img: '/images/livreur_ubereats_sf_1778416904964.png', color: 'from-green-500 to-green-700', voice: 'Puck', voiceStyle: 'presse' },
  { id: 'influenceuse', name: 'Influenceuse Drama', faction: 'Réseaux', img: '/images/influenceuse_drama_sf_1778416919814.png', color: 'from-pink-400 to-pink-600', voice: 'Kore', voiceStyle: 'drama_queen' },
  { id: 'banquier', name: 'Le Banquier', faction: 'Capitalisme', img: '/images/le_banquier_sf_1778416934105.png', color: 'from-slate-700 to-slate-900', voice: 'Fenrir', voiceStyle: 'autoritaire' },
  { id: 'tonton', name: 'Tonton Bourré', faction: 'Family', img: '/images/tonton_bourre_sf_1778416951155.png', color: 'from-amber-600 to-orange-800', voice: 'Charon', voiceStyle: 'ivre' },
  { id: 'rick', name: 'Rick Sanchez', faction: 'Sci-Fi', img: '/images/rick_sf.png', color: 'from-cyan-400 to-blue-600', voice: 'Charon', voiceStyle: 'scientifique_fou' },
  { id: 'morty', name: 'Morty Smith', faction: 'Sci-Fi', img: '/images/morty_sf.png', color: 'from-yellow-300 to-yellow-500', voice: 'Puck', voiceStyle: 'nerveux' },
  { id: 'goku', name: 'Son Goku', faction: 'Anime', img: '/images/goku_sf.png', color: 'from-orange-400 to-blue-600', voice: 'Fenrir', voiceStyle: 'guerrier' },
  { id: 'pikachu', name: 'Pikachu', faction: 'Pokemon', img: '/images/pikachu_sf.png', color: 'from-yellow-400 to-yellow-600', voice: 'Puck', voiceStyle: 'creature' },
  { id: 'john_wick', name: 'John Wick', faction: 'Action', img: '/images/johnwick_sf.png', color: 'from-gray-700 to-black', voice: 'Charon', voiceStyle: 'froid' },
  { id: 'shrek', name: 'Shrek', faction: 'Fantasy', img: '/images/shrek_sf.png', color: 'from-green-500 to-lime-700', voice: 'Fenrir', voiceStyle: 'ogre' },
  { id: 'lara', name: 'Lara Croft', faction: 'Adventure', img: '/images/lara_sf.png', color: 'from-brown-500 to-gray-800', voice: 'Kore', voiceStyle: 'aventuriere' },
  { id: 'walter', name: 'Walter White', faction: 'Drama', img: '/images/walter_sf.png', color: 'from-yellow-600 to-slate-900', voice: 'Fenrir', voiceStyle: 'menacant' },
  { id: 'spiderman', name: 'Spider-Man', faction: 'Marvel', img: '/images/spiderman_sf.png', color: 'from-red-600 to-blue-800', voice: 'Puck', voiceStyle: 'hero_jeune' },
  { id: 'mercredi', name: 'Mercredi Addams', faction: 'Gothic', img: '/images/mercredi_sf.png', color: 'from-gray-900 to-black', voice: 'Aoede', voiceStyle: 'monotone' },
  { id: 'denis_survivor', name: 'Denis le Survivant', faction: 'TV', img: '/images/denis_survivor_sf.png', color: 'from-orange-500 to-red-700', voice: 'Fenrir', voiceStyle: 'autoritaire' },
  { id: 'mme_monique', name: 'Mme Monique', faction: 'Éducation', img: '/images/mme_monique_sf.png', color: 'from-blue-600 to-indigo-900', voice: 'Kore', voiceStyle: 'raleur' },
  { id: 'luffy_gear5', name: 'Luffy Gear 5', faction: 'Anime', img: '/images/luffy_gear5_sf.png', color: 'from-yellow-200 to-slate-100', voice: 'Puck', voiceStyle: 'hero_jeune' },
  { id: 'gilet_jaune', name: 'Didier la Manif', faction: 'Politique', img: '/images/gilet_jaune_sf.png', color: 'from-yellow-400 to-yellow-600', voice: 'Charon', voiceStyle: 'raleur' },
  { id: 'jul_alien', name: 'L\'Alien de Marseille', faction: 'Musique', img: '/images/jul_alien_sf.png', color: 'from-blue-400 to-cyan-600', voice: 'Fenrir', voiceStyle: 'gangster' },
  { id: 'rat_gouttiere', name: 'Rat d\'Égout', faction: 'Cuisine', img: '/images/rat_gouttiere_sf.png', color: 'from-gray-600 to-gray-800', voice: 'Puck', voiceStyle: 'creature' },
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
  { id: 'kamehameha', name: 'Kamehameha', icon: <Zap size={16} /> },
  { id: 'portal_gun', name: 'Pistolet à Portails', icon: <MapPin size={16} /> },
  { id: 'pencil', name: 'Le Crayon (John Wick)', icon: <Sword size={16} /> },
  { id: 'thunderbolt', name: 'Tonnerre (Électrique)', icon: <Zap size={16} /> },
  { id: 'dance_battle', name: 'Danse de Combat', icon: <Music size={16} /> },
  { id: 'baguette_style', name: 'Art de la Baguette', icon: <Sword size={16} /> },
  { id: 'scooter_clash', name: 'Trottinette Fury', icon: <Zap size={16} /> },
  { id: 'keyboard_bash', name: 'Guerrier du Clavier', icon: <Target size={16} /> },
  { id: 'flip_flop_fury', name: 'Lancer de Savate', icon: <Flame size={16} /> },
  { id: 'cerfa_attack', name: 'Bureaucratie Fatale', icon: <Skull size={16} /> },
];

// Persona riches transmises à Gemini TTS au format documenté Google :
// "Lis à voix haute <persona descriptive>: \"<texte>\""
// La persona + l'émotion guident Gemini pour produire une voix naturelle et incarnée
// plutôt qu'une simple lecture neutre.
const STYLE_PROMPTS: Record<string, string> = {
  idiot:             "comme un homme adulte gros et stupide, voix grasse et traînante, mâchouille les mots, intonation lente et un peu ridicule",
  enfant:            "comme un jeune garçon insolent de 10 ans, voix aiguë et taquine, ton provocateur et espiègle",
  enfant_diabolique: "comme une petite fille de 8 ans à la voix mignonne mais inquiétante, avec un ricanement diabolique sous-jacent",
  gamer:             "comme un jeune gamer enthousiaste, débit rapide et nasillard, voix énergique et excitée",
  gangster:          "comme un gangster de quartier au charisme tranquille, voix grave et nonchalante, argot relâché et menace contenue",
  papa:              "comme un père de famille protecteur, voix grave, chaleureuse mais ferme, articulation solide",
  maman:             "comme une mère agacée mais aimante, voix féminine chaleureuse mais autoritaire, pressée",
  ado_fille:         "comme une adolescente de 15 ans, voix chantante et ironique, légèrement traînante, intonation montante",
  ado_garcon:        "comme un adolescent de 14 ans dont la voix mue, un peu hésitant et frondeur, ton désinvolte",
  animal:            "comme un chat agressif qui essaie de parler entre des miaulements et grognements féroces, voix gutturale",
  raleur:            "comme un vieux râleur français de 60 ans, voix sèche et traînarde, soupirs agacés en début de phrase",
  presse:            "comme un livreur essoufflé en train de courir, voix saccadée et précipitée, respiration courte",
  drama_queen:       "comme une influenceuse hystérique au bord des larmes, voix très théâtrale, exagère chaque émotion, soupirs dramatiques",
  autoritaire:       "comme un patron sévère, voix grave articulée et sèche, ton de commandement qui n'admet pas de réplique",
  ivre:              "comme un homme complètement ivre qui bafouille, élocution pâteuse, hoquets, mots qui dérapent",
  scientifique_fou:  "comme un scientifique cynique et condescendant à la voix légèrement éraillée, ton sarcastique, occasionnellement rote en parlant",
  nerveux:           "comme un jeune homme paniqué qui bégaie, voix tremblante et aiguë, débit haché et stressé",
  guerrier:          "comme un guerrier au combat qui crie chaque mot avec rage et puissance, voix saturée d'effort et de détermination",
  creature:          "comme un petit pokémon mignon qui couine et piaille, voix très aiguë et stridente, sons d'animal cute",
  froid:             "comme un tueur professionnel froid et calme, voix très basse presque chuchotée, glaçante et posée",
  ogre:              "comme un ogre rustique grand et lourd, voix très grave et rauque, accent campagnard, articulation lourde",
  aventuriere:       "comme une exploratrice anglaise déterminée, voix féminine assurée et légèrement essoufflée par l'action",
  menacant:          "comme un homme dangereux qui parle très lentement, articule chaque syllabe, menace pesante et calme",
  hero_jeune:        "comme un jeune super-héros optimiste, voix énergique enthousiaste et brave, ton positif",
  monotone:          "comme une jeune femme gothique au ton parfaitement plat et glaçant, aucune émotion perceptible, légèrement inquiétante",
};

const ARENAS = [
  { id: 'living_room', name: 'Le Salon de la Maison', img: 'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=1200' },
  { id: 'springfield', name: 'Springfield Centrale', img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200' },
  { id: 'los_santos', name: 'Rues de Los Santos', img: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=1200' },
  { id: 'nether', name: 'Le Nether', img: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200' },
  { id: 'pmu', name: 'Le PMU du Coin', img: '/images/pmu_du_coin_sf_1778416966206.png' },
  { id: 'parking', name: 'Parking du Supermarché', img: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=1200' },
  { id: 'caf', name: 'File d\'Attente de la CAF', img: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200' },
  { id: 'space', name: 'Station Spatiale Alpha', img: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200' },
  { id: 'cyberpunk', name: 'Neo-Tokyo 2077', img: '/images/neotokyo_sf.png' },
  { id: 'hogwarts', name: 'Poudlard', img: '/images/hogwarts_sf.png' },
  { id: 'colosseum', name: 'Colisée de Rome', img: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200' },
  { id: 'forest', name: 'Forêt Mystique', img: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200' },
  { id: 'beach', name: 'Plage de Copacabana', img: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1200' },
  { id: 'boulangerie', name: 'Boulangerie Tradition', img: '/images/boulangerie_arena.png' },
  { id: 'metro_paris', name: 'Ligne 13', img: '/images/metro_paris_arena.png' },
  { id: 'plateau_tv', name: 'Le 20 Heures', img: '/images/plateau_tv_arena.png' },
  { id: 'gaulois_village', name: 'Village des Résistants', img: '/images/gaulois_village_arena.png' },
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
  const [activeLineIdx, setActiveLineIdx] = useState<number>(-1);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [tempApiKey, setTempApiKey] = useState<string>(() =>
    localStorage.getItem('mayron.apiKey') ?? ''
  );
  const saveApiKey = (key: string) => {
    setTempApiKey(key);
    if (key) localStorage.setItem('mayron.apiKey', key);
    else localStorage.removeItem('mayron.apiKey');
  };
  const [selectingPlayer, setSelectingPlayer] = useState<1 | 2>(1);
  const [matchDuration, setMatchDuration] = useState(3);
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
  const PARENTAL_CODE = "0001";

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
      // Warm up Piper models in background on first user interaction
      warmUpPiper();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const getVoiceForSpeaker = (speaker: string): { voiceName: string; voiceStyle: string } => {
    const speakerLower = speaker.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Check P1
    const p1NameLower = p1.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (speakerLower.includes(p1NameLower) || p1NameLower.includes(speakerLower)) {
      return { voiceName: p1.voice, voiceStyle: p1.voiceStyle };
    }
    // Check P2
    const p2NameLower = p2.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (speakerLower.includes(p2NameLower) || p2NameLower.includes(speakerLower)) {
      return { voiceName: p2.voice, voiceStyle: p2.voiceStyle };
    }
    // Also check partial names (first word) for composite names like "Spider-Man" or "Le Chat"
    const p1FirstWord = p1NameLower.split(/[\s-]/)[0];
    const p2FirstWord = p2NameLower.split(/[\s-]/)[0];
    if (p1FirstWord.length > 2 && speakerLower.includes(p1FirstWord)) {
      return { voiceName: p1.voice, voiceStyle: p1.voiceStyle };
    }
    if (p2FirstWord.length > 2 && speakerLower.includes(p2FirstWord)) {
      return { voiceName: p2.voice, voiceStyle: p2.voiceStyle };
    }
    // Default: Arbitre voice
    return { voiceName: 'Aoede', voiceStyle: '' };
  };

  // Fallback offline : Web Speech API avec profils de voix distinctifs par personnage

  const playPcmBlob = (blob: Blob, format: 'pcm' | 'wav' = 'pcm'): Promise<void> => {
    return new Promise(async (resolve) => {
      const audioCtx = getAudioCtx();
      const arrayBuffer = await blob.arrayBuffer();

      let audioBuffer: AudioBuffer;
      if (format === 'wav') {
        audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
      } else {
        const int16Array = new Int16Array(arrayBuffer);
        audioBuffer = audioCtx.createBuffer(1, int16Array.length, 24000);
        const channelData = audioBuffer.getChannelData(0);
        for (let i = 0; i < int16Array.length; i++) {
          channelData[i] = int16Array[i] / 32768.0;
        }
      }

      try { currentAudioSource.current?.stop(); } catch { /* déjà arrêtée */ }
      // Gain 1.0 (unity) : Gemini PCM est déjà à pleine échelle, tout boost > 1.0
      // produit du soft-clipping qui sonne "métallique/robotique" sur les pics.
      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(1.0, audioCtx.currentTime);
      gainNode.connect(audioCtx.destination);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(gainNode);
      source.start();
      currentAudioSource.current = source;
      source.onended = () => {
        try { source.disconnect(); gainNode.disconnect(); } catch {}
        resolve();
      };
    });
  };

  // Récupère un Blob audio Gemini avec retry court (429, network transitoires)
  const fetchGeminiAudio = async (
    cleanText: string,
    voiceName: string,
    voiceStyle: string,
    apiKey: string,
  ): Promise<Blob | null> => {
    const persona = STYLE_PROMPTS[voiceStyle];
    // Format documenté Gemini TTS : guillemets pour délimiter le texte à lire
    // de la directive de style (sinon la directive peut être prononcée).
    const prompted = persona
      ? `Lis à voix haute en parlant ${persona}: "${cleanText}"`
      : cleanText;

    const ai = new GoogleGenAI({ apiKey });
    const delays = [0, 500, 1500];

    for (let attempt = 0; attempt < delays.length; attempt++) {
      if (delays[attempt] > 0) await new Promise(r => setTimeout(r, delays[attempt]));
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
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
        if (!audioPart?.inlineData?.data) {
          if (attempt < delays.length - 1) continue;
          return null;
        }
        const binaryString = window.atob(audioPart.inlineData.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        return new Blob([bytes.buffer], { type: 'audio/pcm' });
      } catch (e: any) {
        const msg = String(e?.message || e);
        const retriable = /429|rate|timeout|fetch|network|502|503|504/i.test(msg);
        if (!retriable) {
          console.warn(`Gemini TTS échec non récupérable:`, msg);
          return null;
        }
        if (attempt === delays.length - 1) {
          console.warn(`Gemini TTS échec après ${delays.length} tentatives:`, msg);
          return null;
        }
      }
    }
    return null;
  };

  type PreparedAudio =
    | { kind: 'blob'; blob: Blob; format: 'pcm' | 'wav' }
    | { kind: 'piper'; text: string; voiceName: string; voiceStyle: string }
    | { kind: 'webspeech'; text: string; voiceName: string; voiceStyle: string }
    | { kind: 'silent' };

  // Phase fetch (non bloquante pour le playback) — peut être lancée en parallèle pour plusieurs lignes
  const prepareLineAudio = async (
    text: string,
    voiceName: string,
    voiceStyle: string,
    lineIdx: number,
  ): Promise<PreparedAudio> => {
    if (!voiceEnabled) return { kind: 'silent' };

    const battleId = currentBattleId.current;
    if (battleId && lineIdx >= 0) {
      const cached = await getAudioBlob(battleId, lineIdx, voiceName);
      if (cached) return { kind: 'blob', blob: cached.blob, format: cached.format };
    }

    const apiKey = process.env.GEMINI_API_KEY || tempApiKey;
    const cleanText = text.replace(/^[^:]+:\s*/, '');

    // On tente Gemini dès qu'on a une clé API, sans dépendre de navigator.onLine
    // (faux négatif sur certains Safari → forçait à passer en Piper "robotique").
    if (apiKey) {
      const blob = await fetchGeminiAudio(cleanText, voiceName, voiceStyle, apiKey);
      if (blob) {
        console.info(`[voice] tier=gemini line=${lineIdx} voice=${voiceName} style=${voiceStyle}`);
        if (battleId && lineIdx >= 0) {
          saveAudioBlob(battleId, lineIdx, voiceName, blob, 'pcm').catch(() => {});
        }
        return { kind: 'blob', blob, format: 'pcm' };
      }
      console.warn(`[voice] tier=piper-fallback (Gemini KO) line=${lineIdx} voice=${voiceName}`);
    } else {
      console.info(`[voice] tier=piper (no API key) line=${lineIdx} voice=${voiceName}`);
    }

    return { kind: 'piper', text: cleanText, voiceName, voiceStyle };
  };

  // Phase playback (séquentielle) — joue ce qui a déjà été préparé
  const playPreparedAudio = async (prepared: PreparedAudio): Promise<void> => {
    if (prepared.kind === 'silent') {
      await new Promise(r => setTimeout(r, 600));
      return;
    }
    if (prepared.kind === 'blob') {
      await playPcmBlob(prepared.blob, prepared.format);
      return;
    }
    // Piper / Web Speech : exécution à la lecture (déterministes en line-à-line)
    const audioCtx = getAudioCtx();
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(1.0, audioCtx.currentTime);
    gainNode.connect(audioCtx.destination);
    try {
      if (prepared.kind === 'piper') {
        try {
          await playPiperTTS(prepared.text, prepared.voiceName, prepared.voiceStyle, audioCtx, gainNode);
          return;
        } catch {
          console.warn(`[voice] Piper KO → Web Speech (voix système, peu naturelle).`);
          await playWebSpeechEnhanced(prepared.text, prepared.voiceName, prepared.voiceStyle);
        }
      } else {
        console.warn(`[voice] Web Speech utilisé (voix système, peu naturelle).`);
        await playWebSpeechEnhanced(prepared.text, prepared.voiceName, prepared.voiceStyle);
      }
    } finally {
      try { gainNode.disconnect(); } catch {}
    }
  };

  const generateBatch = async (count: number): Promise<{ ok: number; fail: number }> => {
    let ok = 0;
    let fail = 0;
    const apiKey = process.env.GEMINI_API_KEY || tempApiKey;
    if (!apiKey) return { ok: 0, fail: count };
    const ai = new GoogleGenAI({ apiKey });

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

        const response = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                intro: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, speaker: { type: Type.STRING } }, required: ['text', 'speaker'] },
                rounds: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, dialogues: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { speaker: { type: Type.STRING }, text: { type: Type.STRING }, action: { type: Type.STRING } }, required: ['speaker', 'text'] } } }, required: ['title', 'dialogues'] } },
                winner: { type: Type.STRING },
                finishingMove: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, description: { type: Type.STRING }, speaker: { type: Type.STRING } }, required: ['type', 'description', 'speaker'] },
                conclusion: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, speaker: { type: Type.STRING } }, required: ['text', 'speaker'] },
              },
              required: ['intro', 'rounds', 'winner', 'finishingMove', 'conclusion'],
            },
          },
        });

        const data = JSON.parse(response.text?.trim() || '{}');
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
    setGameState('COMBAT');
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
        throw new Error("Clé API manquante. Entre-la dans le menu 🔒 Contrôle Parental, ou lance la Démo.");
      }

      const ai = new GoogleGenAI({ apiKey });

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

      // PREFETCH PARALLÈLE : on lance le fetch des N lignes en même temps,
      // puis on joue séquentiellement → lignes 2..N déjà prêtes pendant que la 1 joue.
      const baseIdx = currentLineIndex.current;
      currentLineIndex.current += lines.length;

      const preparedPromises = lines.map((line, i) => {
        const textToSpeak = line.text || line.description;
        const { voiceName, voiceStyle } = getVoiceForSpeaker(line.speaker || 'Arbitre');
        return prepareLineAudio(textToSpeak, voiceName, voiceStyle, baseIdx + i);
      });

      for (let i = 0; i < lines.length; i++) {
        if (!isActive) break;
        setActiveLineIdx(i);
        const prepared = await preparedPromises[i];
        if (!isActive) break;
        await playPreparedAudio(prepared);
      }

      if (isActive) setActiveLineIdx(-1);
      setIsSpeaking(false);
      if (isActive && currentStep < totalSteps - 1) {
        await new Promise(r => setTimeout(r, 500));
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

  if (gameState === 'COMBAT') {
    return (
      <div className="relative">
        <CombatView p1={p1} p2={p2} arena={arena} battleData={battleData} currentStep={currentStep} activeLineIdx={activeLineIdx} onReset={() => setGameState('SETUP')} />
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
        {/* Bibliothèque de combats sauvegardés */}
        <BattleLibrary onReplay={handleReplay} />

        {/* Bouton Parental / Mode Narratif */}
        <button
          onClick={() => setShowParentalModal(true)}
          className={`p-3 bg-gray-900/80 rounded-full border text-white transition-colors shadow-lg ${narrativeMode >= 5 ? 'border-red-500 hover:bg-red-900/60' : narrativeMode >= 4 ? 'border-orange-500 hover:bg-orange-900/60' : narrativeMode >= 2 ? 'border-blue-500 hover:bg-blue-900/60' : 'border-gray-700 hover:bg-gray-700'}`}
          title={`Mode: ${NARRATIVE_MODE_META[narrativeMode].name}`}
        >
          {narrativeMode >= 5
            ? <AlertTriangle size={22} className="text-red-500 animate-pulse" />
            : narrativeMode >= 2
              ? <Settings2 size={22} className="text-blue-400" />
              : <Lock size={22} className="opacity-40" />
          }
        </button>

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
              className="bg-gray-900 border-2 border-red-600/60 rounded-3xl p-6 w-full max-w-sm shadow-[0_0_60px_rgba(220,38,38,0.3)] relative max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => { setShowParentalModal(false); setParentalCode(""); setParentalError(false); setPendingMode(null); setShowConfirm(false); }}
                className="absolute top-3 right-3 p-1 text-gray-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-4">
                <AlertTriangle size={40} className="text-red-500 mx-auto mb-2" />
                <h3 className="sf-title text-xl text-red-500 uppercase">Contrôle Parental</h3>
                <p className="text-gray-400 text-xs mt-1">Choisissez le mode narratif du combat</p>
              </div>

              {/* Current mode badge */}
              <div className="text-center mb-4 px-4 py-2 rounded-xl bg-gray-800 border border-gray-700">
                <span className="text-xs uppercase tracking-wider font-bold text-gray-400">Mode actuel : </span>
                <span className="font-black text-sm text-white">{NARRATIVE_MODE_META[narrativeMode].icon} {NARRATIVE_MODE_META[narrativeMode].name}</span>
              </div>

              {/* API Key — behind PIN, stored in localStorage only */}
              {!process.env.GEMINI_API_KEY && (
                <div className="mb-4">
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">
                    Clé API Gemini
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="AIza…"
                      value={tempApiKey}
                      onChange={e => saveApiKey(e.target.value)}
                      className="flex-1 bg-black border border-gray-700 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-blue-500 transition-colors"
                    />
                    {tempApiKey && (
                      <button
                        onClick={() => saveApiKey('')}
                        className="px-2 py-1 rounded-lg text-[10px] text-gray-500 hover:text-red-400 border border-gray-700 hover:border-red-700 transition-colors"
                        title="Supprimer la clé"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <p className="text-[9px] text-gray-600 mt-1">
                    {tempApiKey
                      ? '✓ Clé sauvegardée localement (jamais sur GitHub)'
                      : 'Sauvegardée dans le navigateur uniquement'}
                  </p>
                </div>
              )}

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
                <BatchGenerator onGenerate={generateBatch} />
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

          {/* Character Roster Grid — max 2 rows of 4 visible, scroll for more */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 p-2 sm:p-3 bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl flex-shrink-0 max-h-[120px] sm:max-h-[130px] overflow-y-auto custom-scroll">
            {CHARACTERS.map((char) => (
              <button
                key={char.id}
                onClick={() => {
                  if (selectingPlayer === 1) { setP1(char); setSelectingPlayer(2); }
                  else { setP2(char); setSelectingPlayer(1); }
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

function CombatView({ p1, p2, arena, battleData, currentStep, activeLineIdx, onReset }) {
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
              {currentStep === 0 && <Dialogue lines={battleData.intro} p1={p1} p2={p2} activeLineIdx={activeLineIdx} />}
              {currentStep > 0 && currentStep <= (battleData.rounds?.length || 0) && (
                <Dialogue lines={battleData.rounds[currentStep - 1].dialogues} p1={p1} p2={p2} title={battleData.rounds[currentStep - 1].title} activeLineIdx={activeLineIdx} />
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
                  <Dialogue lines={[battleData.finishingMove, battleData.conclusion]} p1={p1} p2={p2} activeLineIdx={activeLineIdx} />
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

        <div className="mt-6 md:mt-12 mb-4 flex justify-center">
          <button
            onClick={onReset}
            className="group flex items-center gap-2 md:gap-3 px-6 md:px-12 py-3 md:py-4 bg-white text-black font-black uppercase italic text-sm md:text-base rounded-full hover:bg-red-600 hover:text-white transition-all duration-300 transform hover:scale-105"
          >
            <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
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

function Dialogue({ lines, p1, p2, title = undefined, activeLineIdx = -1 }: { lines: any; p1: any; p2: any; title?: any; activeLineIdx?: number }) {
  const linesArray = Array.isArray(lines) ? lines : [lines];
  const activeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeLineIdx >= 0 && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLineIdx]);

  return (
    <div className="space-y-4 md:space-y-6">
      {title && (
        <div className="flex items-center justify-center gap-2 md:gap-4 mb-4 md:mb-8">
          <div className="h-[2px] flex-grow bg-gradient-to-r from-transparent to-gray-700" />
          <div className="text-lg md:text-2xl font-black text-gray-500 tracking-[0.3em] md:tracking-[0.5em] italic">{title}</div>
          <div className="h-[2px] flex-grow bg-gradient-to-l from-transparent to-gray-700" />
        </div>
      )}
      {linesArray.map((l, i) => {
        const isP1 = l.speaker?.toLowerCase().includes(p1.name.toLowerCase());
        const isP2 = l.speaker?.toLowerCase().includes(p2.name.toLowerCase());
        const isActive = i === activeLineIdx;
        const dimmed = activeLineIdx >= 0 && !isActive;

        return (
          <motion.div
            key={i}
            ref={isActive ? activeRef : undefined}
            initial={{ x: isP1 ? -20 : isP2 ? 20 : 0, opacity: 0 }}
            animate={{
              x: 0,
              opacity: dimmed ? 0.4 : 1,
              scale: isActive ? 1.02 : 1,
            }}
            transition={{ delay: activeLineIdx < 0 ? i * 0.1 : 0, type: 'spring', stiffness: 260, damping: 22 }}
            className={`flex flex-col ${isP1 ? 'items-start' : isP2 ? 'items-end' : 'items-center'}`}
          >
            <div className={`flex items-center gap-2 mb-2 ${isP2 ? 'flex-row-reverse' : ''}`}>
              <span className={`text-[10px] md:text-xs font-black uppercase tracking-widest ${isP1 ? 'text-blue-400' : isP2 ? 'text-red-400' : 'text-yellow-500'}`}>
                {l.speaker}
              </span>
              {l.action && <span className="text-[9px] md:text-[10px] text-gray-500 italic uppercase">({l.action})</span>}
            </div>
            <div className={`max-w-full md:max-w-2xl p-3 md:p-5 rounded-2xl text-base md:text-xl font-medium leading-relaxed shadow-xl transition-all
              ${isP1 ? 'bg-blue-950/40 border-l-4 border-blue-500 rounded-tl-none' :
                isP2 ? 'bg-red-950/40 border-r-4 border-red-500 rounded-tr-none text-right' :
                  'bg-gray-800/50 border-t-4 border-yellow-500 italic text-center'}
              ${isActive ? 'ring-2 ring-yellow-400/70 shadow-[0_0_25px_rgba(250,204,21,0.35)]' : ''}`}
            >
              {l.text || l.description}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
