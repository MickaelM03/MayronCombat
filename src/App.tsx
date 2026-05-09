import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Swords, Zap, Crown, Flame, Settings, Play, Loader2, RefreshCw, Volume2 } from 'lucide-react';
import { GoogleGenAI, Type, Modality } from '@google/genai';

const LIST_A = [
  "Homer Simpson", "Bart Simpson", "Mortelle Adèle", "Ajax le Chat",
  "Steve (Minecraft)", "Franklin (GTA)", "Trevor (GTA)", 
  "Papa (Le Tank)", "Maman (La Stratégie)", "Clara (L'Agile)", "Mayron (Le Petit Guerrier)", "Le Chat (Familial)",
  "Narrateur (Encore une histoire)", "Pirate", "Chevalier", "Ninja", "Policier"
];

const LIST_B = [
  "Ménage Express", "Griefing", "Bêtise Tactique", "Lancer de Donuts",
  "Judo", "Boxe", "Karaté", "Lutte", "Kung Fu", "Catch Professionnel",
  "MMA", "Capoeira", "Taekwondo", "Muay Thai", "Krav Maga", "Armes à feu", "Magie Noire"
];

const LIST_C = [
  "Le Salon Familial", "Cuisine en plein ménage",
  "Centrale Nucléaire de Springfield", "Chambre d'Adèle", 
  "Serveur Survie Minecraft", "Quartier de Los Santos",
  "Château hanté", "Ring de boxe", "Dojo de la forêt", 
  "Vaisseau spatial", "Volcan en éruption", 
  "Colisée de Rome", "Laboratoire secret enfoui"
];

export default function App() {
  const [gameState, setGameState] = useState<'SETUP' | 'LOADING' | 'COMBAT' | 'ERROR'>('SETUP');
  
  const [f1Name, setF1Name] = useState(LIST_A[0]);
  const [f1Style, setF1Style] = useState(LIST_B[0]);
  
  const [f2Name, setF2Name] = useState(LIST_A[1]);
  const [f2Style, setF2Style] = useState(LIST_B[1]);
  
  const [arena, setArena] = useState(LIST_C[0]);
  
  const [battleData, setBattleData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const generateCombat = async () => {
    setGameState('LOADING');
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Clé API Gemini manquante. Veuillez vérifier vos paramètres secrets.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `Tu es "L'Arbitre Suprême du Multivers", un moteur de narration de combat ultra-dynamique inspiré par Mortal Kombat. Ton rôle est de générer un script de combat épique, drôle et technique entre deux combattants issus d'univers totalement différents.

### LES RÈGLES DE NARRATION :
1. RESPECT DES PERSONNAGES : Utilise le vocabulaire, les tics de langage et les références spécifiques à chaque univers (ex: Homer parle de donuts, Mortelle Adèle de bêtises, Steve de blocs).
2. STYLES DE COMBAT : Applique strictement le style choisi. Si le style est "Griefing", utilise des mécaniques de Minecraft. Si c'est "Ménage Express", utilise des balais ou des aspirateurs comme des armes.
3. STRUCTURE THÉÂTRALE : Le texte doit avoir le format "Nom: Paroles" ou "Arbitre: Paroles".
4. AMBIANCE MK : Inclus des termes iconiques comme "FINISH HIM!", "TOASTY!", ou "FATALITY!". L'Arbitre doit commenter de manière féroce.
5. RELATIONS FAMILIALES : Si les combattants sont "Papa", "Maman", "Clara" ou "Mayron", ajoute des piques sur la vie quotidienne (vaisselle, devoirs, rangement) avec beaucoup d'humour.

Voici le combat :
- Combattant 1 : ${f1Name} combattant avec le style ${f1Style}
- Combattant 2 : ${f2Name} combattant avec le style ${f2Style}
- Arène : ${arena}

### FORMAT DE SORTIE (JSON STRICT) :
Génère un récit narratif avec des dialogues précis. Termine par le "vainqueur" et un "finishingMove".`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intro: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, speaker: { type: Type.STRING } }, required: ["text", "speaker"] },
              round1: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { speaker: { type: Type.STRING }, text: { type: Type.STRING } }, required: ["speaker", "text"] } },
              round2: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { speaker: { type: Type.STRING }, text: { type: Type.STRING } }, required: ["speaker", "text"] } },
              round3: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { speaker: { type: Type.STRING }, text: { type: Type.STRING } }, required: ["speaker", "text"] } },
              vainqueur: { type: Type.STRING },
              finishingMove: { type: Type.OBJECT, properties: { type: { type: Type.STRING, description: "FATALITY ou BRUTALITY" }, description: { type: Type.STRING }, speaker: { type: Type.STRING } }, required: ["type", "description", "speaker"] },
              conclusion: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, speaker: { type: Type.STRING } }, required: ["text", "speaker"] }
            },
            required: ["intro", "round1", "round2", "round3", "vainqueur", "finishingMove", "conclusion"]
          }
        }
      });
      
      const data = JSON.parse(response.text?.trim() || "{}");
      setBattleData(data);
      setCurrentStep(0);
      setGameState('COMBAT');
      
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Une erreur inconnue est survenue.");
      setGameState('ERROR');
    }
  };

  const [isSpeaking, setIsSpeaking] = useState(false);
  const currentAudioSource = useRef<AudioBufferSourceNode | null>(null);

  // Auto-advance through the steps playing audio
  useEffect(() => {
    let isActive = true;

    const runStep = async () => {
      if (gameState !== 'COMBAT' || !battleData) return;
      if (currentStep > 4) return; // Finished
      
      setIsSpeaking(true);
      
      try {
        let linesToSpeak: any[] = [];
        if (currentStep === 0) linesToSpeak = [battleData.intro];
        else if (currentStep === 1) linesToSpeak = battleData.round1;
        else if (currentStep === 2) linesToSpeak = battleData.round2;
        else if (currentStep === 3) linesToSpeak = battleData.round3;
        else if (currentStep === 4) linesToSpeak = [
           { speaker: 'Arbitre', text: battleData.finishingMove?.type + '!' },
           battleData.finishingMove,
           battleData.conclusion
        ];

        if (!linesToSpeak || linesToSpeak.length === 0) {
           await new Promise(r => setTimeout(r, 3000));
        } else {
            for (const lineObj of linesToSpeak) {
                if (!isActive) break;
                if (!lineObj || !lineObj.text) continue;
                
                let speechText = lineObj.text;
                let speaker = lineObj.speaker || 'Arbitre';
                let voiceName = 'Zephyr'; // Default pour l'Arbitre
                
                if (speaker.toLowerCase().includes(f1Name.toLowerCase()) || f1Name.toLowerCase().split(' ').some((w: string) => w.length > 2 && speaker.toLowerCase().includes(w))) {
                    voiceName = 'Fenrir';
                } else if (speaker.toLowerCase().includes(f2Name.toLowerCase()) || f2Name.toLowerCase().split(' ').some((w: string) => w.length > 2 && speaker.toLowerCase().includes(w))) {
                    voiceName = 'Kore';
                }
                
                const apiKey = process.env.GEMINI_API_KEY;
                if (!apiKey) throw new Error("No API key");
                const ai = new GoogleGenAI({ apiKey });
                
                const response = await ai.models.generateContent({
                  model: "gemini-3.1-flash-tts-preview",
                  contents: [{ parts: [{ text: speechText }] }],
                  config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName } }
                    }
                  }
                });
                
                if (!isActive) break;
    
                const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                if (base64Audio) {
                  const binaryString = atob(base64Audio);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  const int16Array = new Int16Array(bytes.buffer);
                  const float32Array = new Float32Array(int16Array.length);
                  for (let i = 0; i < int16Array.length; i++) {
                    float32Array[i] = int16Array[i] / 32768.0;
                  }
                  
                  const audioContext = (window as any).audioCtx || new (window.AudioContext || (window as any).webkitAudioContext)();
                  (window as any).audioCtx = audioContext;
                  
                  const audioBuffer = audioContext.createBuffer(1, float32Array.length, 24000);
                  audioBuffer.getChannelData(0).set(float32Array);
                  const source = audioContext.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(audioContext.destination);
                  
                  currentAudioSource.current = source;
                  
                  await new Promise<void>((resolve) => {
                    source.onended = () => resolve();
                    source.start();
                  });
                } else {
                   await new Promise(r => setTimeout(r, 2000));
                }
            }
        }
      } catch (err) {
        console.error("Audio generation failed", err);
        if (isActive) {
           await new Promise(r => setTimeout(r, 6000));
        }
      }
      
      setIsSpeaking(false);

      if (isActive && currentStep < 4) {
        setCurrentStep(prev => prev + 1);
      }
    };

    runStep();

    return () => {
      isActive = false;
      if (currentAudioSource.current) {
        currentAudioSource.current.stop();
        currentAudioSource.current.disconnect();
        currentAudioSource.current = null;
      }
    };
  }, [currentStep, gameState, battleData, f1Name, f2Name]);

  const renderDialogue = (lines: any) => {
    if (!lines) return null;
    const linesArray = Array.isArray(lines) ? lines : [lines];
    
    return linesArray.map((line, i) => {
      if (!line || (!line.text && !line.description)) return null;
      
      const speaker = line.speaker || 'Arbitre';
      const speech = line.text || line.description;

      let colorClass = "text-violet-400"; // default Arbitre
      let bgClass = "bg-violet-950/30 border-violet-900/50";
      let glowClass = "shadow-[inset_0_0_15px_rgba(139,92,246,0.1)]";
        
      const sLower = speaker.toLowerCase();
      if (sLower.includes(f1Name.toLowerCase()) || f1Name.toLowerCase().split(' ').some((w: string) => w.length > 2 && sLower.includes(w))) {
        colorClass = "text-emerald-400";
        bgClass = "bg-emerald-950/30 border-emerald-900/50";
        glowClass = "shadow-[inset_0_0_15px_rgba(16,185,129,0.1)]";
      } else if (sLower.includes(f2Name.toLowerCase()) || f2Name.toLowerCase().split(' ').some((w: string) => w.length > 2 && sLower.includes(w))) {
        colorClass = "text-rose-400";
        bgClass = "bg-rose-950/30 border-rose-900/50";
        glowClass = "shadow-[inset_0_0_15px_rgba(244,63,94,0.1)]";
      }
      
      return (
        <div key={i} className={`mb-3 p-4 rounded-xl border ${bgClass} ${glowClass} text-left relative overflow-hidden`}>
           {isSpeaking && <Volume2 className={`absolute right-4 top-4 w-4 h-4 opacity-30 animate-pulse ${colorClass}`} />}
          <span className={`font-black ${colorClass} uppercase tracking-widest text-[10px] mr-2 block mb-2 opacity-80`}>
            {speaker}
          </span>
          <span className="text-zinc-100 text-base md:text-lg">{speech}</span>
        </div>
      );
    });
  };

  const handleStopAndReplay = () => {
    if (currentAudioSource.current) {
       currentAudioSource.current.stop();
       currentAudioSource.current.disconnect();
       currentAudioSource.current = null;
    }
    setCurrentStep(0);
  }

  const handleStopAndNew = () => {
    if (currentAudioSource.current) {
       currentAudioSource.current.stop();
       currentAudioSource.current.disconnect();
       currentAudioSource.current = null;
    }
    setGameState('SETUP');
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-emerald-50 font-sans selection:bg-emerald-900 selection:text-emerald-100 overflow-x-hidden p-6 md:p-12">
      <div className="max-w-5xl mx-auto flex flex-col items-center">
        
        {/* Header (Always visible) */}
        <motion.div 
          layout
          className="text-center mb-12 flex flex-col items-center"
        >
          <div className="flex items-center justify-center space-x-4 mb-2">
            <Swords className="w-6 h-6 md:w-8 md:h-8 text-emerald-500" strokeWidth={1.5} />
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-zinc-100 uppercase drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              L'Arène Playmobil
            </h1>
            <Swords className="w-6 h-6 md:w-8 md:h-8 text-emerald-500" strokeWidth={1.5} />
          </div>
          <p className="text-md md:text-lg text-emerald-400/80 italic tracking-wide">
            Le Maître des Plastiques a soif de combat
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {gameState === 'SETUP' && (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
              className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {/* Fighter 1 Configuration */}
              <div className="bg-zinc-900/80 border border-emerald-900/30 rounded-2xl p-6 shadow-xl backdrop-blur-md">
                <h2 className="text-xl font-bold text-emerald-400 mb-6 flex items-center border-b border-emerald-900/50 pb-2">
                  <span className="bg-emerald-950 text-emerald-400 px-3 py-1 rounded text-sm mr-3">JOUEUR 1</span>
                  Coin Bleu
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-zinc-400 uppercase tracking-widest mb-1">Guerrier</label>
                    <select 
                      value={f1Name} 
                      onChange={e => setF1Name(e.target.value)}
                      className="w-full bg-zinc-950 border border-emerald-900/50 rounded-lg p-3 text-emerald-50 focus:outline-none focus:border-emerald-500 appearance-none"
                    >
                      {LIST_A.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 uppercase tracking-widest mb-1">Style</label>
                    <select 
                      value={f1Style} 
                      onChange={e => setF1Style(e.target.value)}
                      className="w-full bg-zinc-950 border border-emerald-900/50 rounded-lg p-3 text-emerald-50 focus:outline-none focus:border-emerald-500 appearance-none"
                    >
                      {LIST_B.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Fighter 2 Configuration */}
              <div className="bg-zinc-900/80 border border-rose-900/30 rounded-2xl p-6 shadow-xl backdrop-blur-md">
                <h2 className="text-xl font-bold text-rose-400 mb-6 flex items-center border-b border-rose-900/50 pb-2">
                  <span className="bg-rose-950 text-rose-400 px-3 py-1 rounded text-sm mr-3">JOUEUR 2</span>
                  Coin Rouge
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-zinc-400 uppercase tracking-widest mb-1">Guerrier</label>
                    <select 
                      value={f2Name} 
                      onChange={e => setF2Name(e.target.value)}
                      className="w-full bg-zinc-950 border border-rose-900/50 rounded-lg p-3 text-rose-50 focus:outline-none focus:border-rose-500 appearance-none"
                    >
                      {LIST_A.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 uppercase tracking-widest mb-1">Style</label>
                    <select 
                      value={f2Style} 
                      onChange={e => setF2Style(e.target.value)}
                      className="w-full bg-zinc-950 border border-rose-900/50 rounded-lg p-3 text-rose-50 focus:outline-none focus:border-rose-500 appearance-none"
                    >
                      {LIST_B.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Arena Configuration */}
              <div className="md:col-span-2 flex flex-col items-center mt-4">
                <div className="bg-zinc-900/80 border border-amber-900/30 rounded-2xl p-6 shadow-xl backdrop-blur-md w-full max-w-2xl">
                  <h2 className="text-xl font-bold text-amber-400 mb-4 text-center">Choix de l'Arène</h2>
                  <select 
                    value={arena} 
                    onChange={e => setArena(e.target.value)}
                    className="w-full bg-zinc-950 border border-amber-900/50 rounded-lg p-3 text-amber-50 focus:outline-none focus:border-amber-500 appearance-none text-center text-lg"
                  >
                    {LIST_C.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                
                <button 
                  onClick={generateCombat}
                  className="mt-12 group relative px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-black tracking-widest uppercase rounded-full shadow-[0_0_30px_-5px_rgba(16,185,129,0.5)] hover:shadow-[0_0_50px_-5px_rgba(16,185,129,0.8)] transition-all cursor-pointer flex items-center"
                >
                  <Play className="w-6 h-6 mr-3 text-zinc-950 fill-zinc-950 group-hover:scale-110 transition-transform" />
                  Générer le Combat
                </button>
              </div>
            </motion.div>
          )}

          {gameState === 'LOADING' && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center mt-20"
            >
              <div className="relative w-32 h-32 mb-8">
                <div className="absolute inset-0 border-t-4 border-emerald-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 border-r-4 border-rose-500 rounded-full animate-[spin_1.5s_linear_reverse_infinite]"></div>
                <div className="absolute inset-4 flex items-center justify-center">
                  <Swords className="w-10 h-10 text-amber-500 animate-pulse" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-zinc-200 uppercase tracking-widest animate-pulse">
                Consultation de l'Arbitre Suprême...
              </h2>
              <p className="mt-4 text-zinc-500 italic">Préparation du plastique et des décors en cours</p>
            </motion.div>
          )}

          {gameState === 'ERROR' && (
            <motion.div 
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center mt-20 bg-rose-950/30 p-8 rounded-2xl border border-rose-900"
            >
              <h2 className="text-2xl font-bold text-rose-500 mb-4">Malaise dans l'Arène</h2>
              <p className="text-rose-200 text-center mb-8">{errorMsg}</p>
              <button 
                onClick={() => setGameState('SETUP')}
                className="px-6 py-3 border border-rose-500 text-rose-500 rounded-full hover:bg-rose-950 transition-colors"
              >
                Retour aux vestiaires
              </button>
            </motion.div>
          )}

          {gameState === 'COMBAT' && battleData && (
            <motion.div 
              key="combat"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-4xl flex flex-col items-center"
            >
              {/* Introduction */}
              <AnimatePresence mode="wait">
                {currentStep >= 0 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full bg-zinc-900/60 border border-emerald-900/40 rounded-2xl p-6 md:p-8 mb-6 shadow-2xl relative overflow-hidden"
                  >
                    <h2 className="text-2xl font-bold text-amber-400 mb-6 flex items-center">
                      <Flame className="w-6 h-6 mr-2" />
                      L'Arène : {arena}
                    </h2>
                    <div className="text-lg leading-relaxed text-zinc-300">
                      {renderDialogue(battleData.intro)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Round 1 */}
              <AnimatePresence>
                {currentStep >= 1 && (
                  <motion.div 
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-full bg-gradient-to-r from-emerald-900/30 to-transparent border-l-4 border-emerald-500 rounded-r-xl p-6 mb-6 shadow-lg"
                  >
                    <h3 className="text-xl font-bold text-emerald-400 mb-4 flex items-center">
                      <span className="bg-emerald-950/80 px-3 py-1 rounded text-emerald-300 mr-3 text-sm tracking-widest">ROUND 1</span>
                    </h3>
                    <div className="text-zinc-200 leading-relaxed text-lg">
                      {renderDialogue(battleData.round1)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Round 2 */}
              <AnimatePresence>
                {currentStep >= 2 && (
                  <motion.div 
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-full bg-gradient-to-l from-rose-900/30 to-transparent border-r-4 border-rose-500 rounded-l-xl p-6 mb-6 shadow-lg text-right"
                  >
                    <h3 className="text-xl font-bold text-rose-400 mb-4 flex justify-end items-center">
                      <span className="bg-rose-950/80 px-3 py-1 rounded text-rose-300 ml-3 text-sm tracking-widest">ROUND 2</span>
                    </h3>
                    <div className="text-zinc-200 leading-relaxed text-lg flex flex-col items-end">
                      {renderDialogue(battleData.round2)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Round 3 */}
              <AnimatePresence>
                {currentStep >= 3 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full bg-zinc-900/80 border border-purple-900/60 rounded-2xl p-6 mb-8 shadow-2xl relative"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
                    <h3 className="text-xl font-bold text-purple-400 mb-6 flex justify-center items-center">
                      <Zap className="w-5 h-5 mr-2 text-purple-500" />
                      ROUND 3 : L'Assaut Final
                      <Zap className="w-5 h-5 ml-2 text-purple-500" />
                    </h3>
                    <div className="text-zinc-200 leading-relaxed text-lg">
                      {renderDialogue(battleData.round3)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Winner */}
              <AnimatePresence>
                {currentStep >= 4 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8, rotateX: 90 }}
                    animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 15 }}
                    className="w-full max-w-2xl bg-gradient-to-b from-amber-950/80 to-zinc-900 border-2 border-amber-500 rounded-3xl p-8 shadow-[0_0_60px_-10px_rgba(245,158,11,0.5)] text-center relative overflow-hidden mt-4"
                  >
                    <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[conic-gradient(at_center,_transparent_45%,_rgba(245,158,11,0.15)_50%,_transparent_55%)] animate-spin" style={{ animationDuration: '6s' }}></div>
                    <div className="relative z-10">
                      <Crown className="w-16 h-16 text-yellow-400 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                      <h2 className="text-2xl font-bold text-zinc-300 tracking-widest uppercase mb-1">
                        Vainqueur
                      </h2>
                      <div className="text-4xl md:text-5xl font-black text-amber-500 uppercase tracking-tighter mb-8 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                        {battleData.vainqueur || battleData.winner}
                      </div>
                      
                      <div className="mb-6 border-y border-red-900/30 py-4 text-center">
                        <div className="text-red-500 font-black text-3xl animate-pulse tracking-widest uppercase mb-4 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
                           {battleData.finishingMove?.type || "FATALITY"}
                        </div>
                        <div className="text-left">
                           {renderDialogue(battleData.finishingMove)}
                        </div>
                      </div>

                      <div className="text-amber-200/90 font-medium text-lg leading-relaxed bg-zinc-950/50 p-6 rounded-xl text-left">
                        {renderDialogue(battleData.conclusion)}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Actions */}
              <AnimatePresence>
                {currentStep >= 0 && (
                   <motion.div
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: 1 }}
                     className="mt-12 flex gap-4"
                   >
                     <button
                       onClick={handleStopAndReplay}
                       className="px-6 py-3 rounded-full border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800 transition-colors flex items-center"
                     >
                       <RefreshCw className="w-4 h-4 mr-2" />
                       Rejouer l'animation
                     </button>
                     <button
                       onClick={handleStopAndNew}
                       className="px-8 py-3 rounded-full bg-emerald-600/20 border border-emerald-500 text-emerald-400 hover:bg-emerald-600 hover:text-emerald-50 transition-colors uppercase tracking-widest font-bold"
                     >
                       Nouveau Combat
                     </button>
                   </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

