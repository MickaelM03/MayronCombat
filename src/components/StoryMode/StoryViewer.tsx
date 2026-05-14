import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, RefreshCw, Volume2, Save, ArrowLeft, History, Play, UserPlus 
} from 'lucide-react';
import { StoryLine, SavedStory, getStoryAudio, saveStoryAudio, updateStory } from '../../lib/story/store';
import { CHARACTERS } from '../../lib/constants';

interface StoryViewerProps {
  story: SavedStory;
  onChoice: (choiceText: string, choiceAction: string, inventoryUpdate?: { type: 'ITEM' | 'ALLY', name: string }) => Promise<void>;
  onBack: () => void;
  playVoice: (line: StoryLine, index: number, storyId: string) => Promise<void>;
  isGenerating: boolean;
}

export default function StoryViewer({ story, onChoice, onBack, playVoice, isGenerating }: StoryViewerProps) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const lastPlayedIdx = useRef<number>(-1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showCharModal, setShowCharModal] = useState<number | null>(null);
  const [showHeroSelection, setShowHeroSelection] = useState(false);
  const lines = story.script;
  const currentLine = lines[currentLineIndex];
  
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Ma Première Aventure - Système de Roues
  const isMPA = story.theme.includes('Ma Première Aventure');
  const [inventory, setInventory] = useState({
    hero: CHARACTERS.find(c => c.id === story.inventory?.heroId) || null,
    items: story.inventory?.items || [],
    allies: story.inventory?.allies || []
  });

  // Mise à jour de l'inventaire si la story change
  useEffect(() => {
    if (story.inventory) {
      setInventory({
        hero: CHARACTERS.find(c => c.id === story.inventory.heroId) || null,
        items: story.inventory.items || [],
        allies: story.inventory.allies || []
      });
    }
  }, [story.inventory]);


  const nextLine = useCallback(async () => {
    if (currentLineIndex < lines.length - 1) {
      setCurrentLineIndex(prev => prev + 1);
    } else if (story.isInteractive && !isGenerating && currentLine?.choices) {
      // Stay at choices
    }
  }, [currentLineIndex, lines.length, story.isInteractive, isGenerating, currentLine?.choices]);

  useEffect(() => {
    if (currentLine && !isSpeaking && !isGenerating && lastPlayedIdx.current !== currentLineIndex) {
      lastPlayedIdx.current = currentLineIndex;
      playVoice(currentLine, currentLineIndex, story.id).then(() => {
        if (isAutoPlaying) {
          setTimeout(nextLine, 1000);
        }
      });
    }
  }, [currentLineIndex, story.id, playVoice, isAutoPlaying, isGenerating, currentLine]);

  const getCharacterImg = (name: string) => {
    const char = CHARACTERS.find(c => name.toLowerCase().includes(c.name.toLowerCase()));
    return char?.img;
  };

  const isLastLine = currentLineIndex === lines.length - 1;
  const showChoices = isLastLine && story.isInteractive && currentLine?.choices && !isGenerating;

  return (
    <div className="h-screen bg-black text-[#e2d1b3] flex flex-col relative overflow-hidden font-serif">
      {/* Background Arena */}
      <div className="absolute inset-0 z-0">
        <img src={story.arenaImg} className="w-full h-full object-cover opacity-40" alt={story.arenaName} />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60" />
      </div>

      {/* MPA Wheels - Progressive Display */}
      {isMPA && inventory.hero && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          {/* Wheel Top-Left: Hero Selection (Only visible once chosen) */}
          <div className="absolute top-24 left-12 pointer-events-auto flex flex-col items-center gap-3 group">
            <div className={`w-32 h-32 rounded-full border-4 ${inventory.hero ? 'border-amber-500' : 'border-dashed border-amber-500 animate-pulse'} bg-black/60 overflow-hidden shadow-[0_0_30px_rgba(251,191,36,0.4)] flex items-center justify-center transition-all hover:scale-110 hover:rotate-6`}>
              {inventory.hero ? (
                <img src={inventory.hero.img} className="w-full h-full object-cover" alt="Héros" />
              ) : (
                <UserPlus size={40} className="text-amber-500" />
              )}
            </div>
            <div className="text-xs font-black uppercase tracking-widest text-amber-500 bg-black/80 px-3 py-1 rounded-full border border-amber-500/30">Héros</div>
          </div>

          {/* Wheel Top-Right: Item 1 (Visible only if found) */}
          {inventory.items[0] && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute top-24 right-12 pointer-events-auto flex flex-col items-center gap-2 group"
            >
              <div className="w-24 h-24 rounded-full border-4 border-amber-700 bg-black/60 overflow-hidden shadow-lg flex items-center justify-center transition-transform hover:scale-110">
                <div className="text-3xl">📦</div>
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-black/80 px-2 py-0.5 rounded border border-amber-700/30">Objet</div>
            </motion.div>
          )}

          {/* Wheel Bottom-Left: Item 2 (Visible only if found) */}
          {inventory.items[1] && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute bottom-64 left-12 pointer-events-auto flex flex-col items-center gap-2 group"
            >
              <div className="w-24 h-24 rounded-full border-4 border-amber-700 bg-black/60 overflow-hidden shadow-lg flex items-center justify-center transition-transform hover:scale-110">
                <div className="text-3xl">🗝️</div>
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-black/80 px-2 py-0.5 rounded border border-amber-700/30">Objet</div>
            </motion.div>
          )}

          {/* Wheel Bottom-Right: Ally (Visible only if found) */}
          {inventory.allies[0] && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute bottom-64 right-12 pointer-events-auto flex flex-col items-center gap-2 group"
            >
              <div className="w-24 h-24 rounded-full border-4 border-blue-500/50 bg-black/60 overflow-hidden shadow-lg flex items-center justify-center transition-transform hover:scale-110">
                <div className="text-3xl">🤝</div>
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-black/80 px-2 py-0.5 rounded border border-blue-500/30">Allié</div>
            </motion.div>
          )}
        </div>
      )}

      {/* Hero Selection Modal Overlay */}
      <AnimatePresence>
        {showHeroSelection && !inventory.hero && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8"
          >
            <h2 className="text-4xl font-black italic text-amber-500 mb-12 text-center">Choisis ton Héros</h2>
            <div className="flex flex-wrap justify-center gap-8 max-w-6xl">
              {story.characterIds.map(id => {
                const char = CHARACTERS.find(c => c.id === id);
                if (!char) return null;
                return (
                  <motion.button
                    key={char.id}
                    whileHover={{ scale: 1.05, y: -10 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      // Chercher le choix correspondant au héros dans toute l'histoire
                      let foundChoice = null;
                      for (const line of story.script) {
                        if (line.choices) {
                          foundChoice = line.choices.find(c => c.text.includes(char.name));
                          if (foundChoice) break;
                        }
                      }

                      if (foundChoice) {
                        onChoice(foundChoice.text, foundChoice.action, foundChoice.inventoryUpdate);
                        setShowHeroSelection(false);
                        // On force le passage à la dernière ligne pour voir la suite
                        setCurrentLineIndex(story.script.length - 1);
                      }
                    }}
                    className="flex flex-col items-center gap-4 group"
                  >
                    <div className="w-48 aspect-[3/4] rounded-2xl overflow-hidden border-4 border-amber-900 group-hover:border-amber-500 transition-colors shadow-2xl">
                      <img src={char.img} className="w-full h-full object-cover" alt={char.name} />
                    </div>
                    <span className="text-2xl font-bold text-amber-200 group-hover:text-amber-500 transition-colors">{char.name}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="z-10 p-4 md:p-6 flex items-center justify-between bg-black/40 backdrop-blur-md border-b border-amber-900/30">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-amber-900/30 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold italic">{story.title}</h1>
            <div className="text-[10px] uppercase tracking-[0.2em] text-amber-500 font-bold">{story.theme}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isGenerating && (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-900/50 rounded-full border border-amber-500/50">
              <RefreshCw size={14} className="animate-spin text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Inspiration...</span>
            </div>
          )}
          <button 
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className={`p-2 rounded-full border transition-all ${isAutoPlaying ? 'bg-amber-500 text-black border-amber-400' : 'bg-black/40 text-amber-500 border-amber-900/50'}`}
          >
            {isGenerating ? <RefreshCw size={20} className="animate-spin" /> : <Play size={20} fill={isAutoPlaying ? "currentColor" : "none"} />}
          </button>
        </div>
      </div>

      {/* Character Sprites (Visual Novel Style) */}
      <div className="flex-grow z-10 flex items-end justify-center px-8 relative mb-48">
        <AnimatePresence mode="popLayout">
          {currentLine && (
            <motion.div
              key={currentLine.speaker}
              initial={{ y: 50, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.9 }}
              className="relative w-64 md:w-96 aspect-[3/4]"
            >
              {getCharacterImg(currentLine.speaker) && (
                <img 
                  src={getCharacterImg(currentLine.speaker)} 
                  className="w-full h-full object-cover rounded-3xl border-4 border-amber-900/50 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
                  alt={currentLine.speaker}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Interface (Choices + Dialogue) */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 md:p-6 pb-8 flex flex-col-reverse items-center gap-12 pointer-events-none">
        
        {/* 1. Dialogue Box */}
        <div className="w-full max-w-4xl bg-[#1a140f]/95 border-2 border-amber-900/50 rounded-2xl p-4 md:p-6 shadow-2xl backdrop-blur-lg relative pointer-events-auto">
          {/* Speaker Name Tag */}
          <div className="absolute -top-5 left-6 bg-amber-800 text-black px-4 py-1 rounded-lg font-black italic uppercase tracking-widest shadow-lg border-2 border-amber-500 text-sm">
            {currentLine?.speaker || "Narrateur"}
          </div>

          <div className="min-h-[80px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={currentLineIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-xl md:text-3xl leading-relaxed italic text-[#e2d1b3]"
              >
                {currentLine?.text.replace(/^[^:]+:\s*/, '')}
                {currentLine?.action && (
                  <span className="block text-sm md:text-base text-amber-600/70 mt-4 uppercase tracking-[0.3em] font-bold">
                    ({currentLine.action})
                  </span>
                )}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Controls / Next Button */}
          <div className="mt-8 flex justify-end items-center gap-4">
            {!showChoices && (
              <button
                onClick={isLastLine ? (story.isInteractive && !story.isFinished ? () => onChoice("Continuer", "Continuer l'aventure") : onBack) : nextLine}
                className="px-8 py-3 bg-amber-800 text-black font-black uppercase tracking-widest rounded-xl hover:bg-amber-600 transition-colors flex items-center gap-2"
              >
                {isLastLine ? (story.isInteractive && !story.isFinished ? 'Continuer' : 'Terminer') : 'Suivant'}
                {isLastLine ? (story.isInteractive && !story.isFinished ? <ChevronRight size={20} /> : <Save size={20} />) : <ChevronRight size={20} />}
              </button>
            )}
          </div>

          {/* End of Story Overlay */}
          {isLastLine && story.isFinished && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-3xl z-30 p-8 text-center"
            >
              <h2 className="text-6xl font-black italic text-amber-500 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                FIN
              </h2>
              <p className="text-xl italic text-amber-100 mb-8">Cette chronique rejoint les grimoires du Multivers.</p>
              <button
                onClick={onBack}
                className="px-12 py-4 bg-amber-600 text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-amber-400 transition-all shadow-[0_0_30px_rgba(251,191,36,0.4)]"
              >
                Fermer le Livre
              </button>
            </motion.div>
          )}
        </div>

        {/* 2. Interactive Choices */}
        <AnimatePresence>
          {showChoices && (
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              className="w-full flex flex-col items-center p-6 pointer-events-auto"
            >
              {/* Background Glow for Choices Area */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent -z-10 backdrop-blur-[2px]" />
              
              <div className="flex flex-wrap justify-center gap-6 md:gap-10 max-w-7xl items-end">
                {currentLine.choices?.map((choice, i) => {
                  const heroName = choice.text.replace("Incarner ", "").split(' ')[0];
                  const char = CHARACTERS.find(c => c.name.includes(heroName));
                  
                  if (char && choice.text.includes("Incarner")) {
                    return (
                      <motion.button
                        key={i}
                        whileHover={{ scale: 1.08, y: -15 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={async () => {
                          const nextIdx = story.script.length;
                          // On avance l'index immédiatement pour éviter de re-lire la ligne 0
                          setCurrentLineIndex(nextIdx);
                          await onChoice(choice.text, choice.action, choice.inventoryUpdate);
                        }}
                        className="flex flex-col items-center gap-5 group"
                      >
                        <div className="relative">
                          <div className="absolute inset-0 bg-amber-500/20 blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full" />
                          <div className="w-36 md:w-56 aspect-[3/4] rounded-[2rem] overflow-hidden border-4 border-amber-900/80 group-hover:border-amber-400 transition-all duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.8)] group-hover:shadow-[0_0_60px_rgba(251,191,36,0.4)] bg-[#1a140f] relative z-10">
                            <img src={char.img} className="w-full h-full object-contain p-4 transform group-hover:scale-110 transition-transform duration-500" alt={char.name} />
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/10 pointer-events-none" />
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1 relative z-10">
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600/80 mb-[-4px]">Héros</span>
                          <span className="text-base md:text-xl font-black italic text-amber-100 group-hover:text-amber-400 transition-colors bg-black/60 px-5 py-1.5 rounded-xl border border-amber-900/50 backdrop-blur-md shadow-xl">
                            {char.name}
                          </span>
                        </div>
                      </motion.button>
                    );
                  }

                  return (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.05, x: 5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={async () => {
                        const nextIdx = story.script.length;
                        setCurrentLineIndex(nextIdx);
                        await onChoice(choice.text, choice.action, choice.inventoryUpdate);
                      }}
                      className="w-full max-w-xl bg-[#1a140f]/90 hover:bg-amber-900/40 border-2 border-amber-900/50 hover:border-amber-500 rounded-2xl p-5 text-amber-100 text-lg font-bold shadow-2xl transition-all flex items-center justify-between group backdrop-blur-md"
                    >
                      <span className="flex-grow text-center group-hover:text-amber-400 transition-colors">{choice.text}</span>
                      <ChevronRight size={24} className="text-amber-700 group-hover:text-amber-400 transition-all group-hover:translate-x-1" />
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
