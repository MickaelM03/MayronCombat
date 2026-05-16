import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronRight, RefreshCw, Volume2, Save, ArrowLeft, History, Play, Pause, UserPlus, ChevronDown
} from 'lucide-react';
import { StoryLine, SavedStory, getStoryAudio, saveStoryAudio, updateStory } from '../../lib/story/store';
import { CHARACTERS } from '../../lib/constants';

interface StoryViewerProps {
  story: SavedStory;
  onChoice: (choiceText: string, choiceAction: string, inventoryUpdate?: { type: 'ITEM' | 'ALLY', name: string }) => Promise<void>;
  onBack: () => void;
  playVoice: (line: StoryLine, index: number, storyId: string, onStart?: (duration: number) => void) => Promise<void>;
  stopVoice: () => void;
  isGenerating: boolean;
}

export default function StoryViewer({ story, onChoice, onBack, playVoice, stopVoice, isGenerating }: StoryViewerProps) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [themeExpanded, setThemeExpanded] = useState(false);
  const isAutoPlayingRef = useRef(true);
  const lastPlayedIdx = useRef<number>(-1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lineDuration, setLineDuration] = useState(0);
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
    setLineDuration(0);
  }, [currentLineIndex]);

  useEffect(() => {
    if (currentLine && !isSpeaking && !isGenerating && lastPlayedIdx.current !== currentLineIndex) {
      lastPlayedIdx.current = currentLineIndex;
      setIsSpeaking(true);
      playVoice(currentLine, currentLineIndex, story.id, setLineDuration).then(() => {
        setIsSpeaking(false);
        if (isAutoPlayingRef.current) {
          setTimeout(nextLine, 1000);
        }
      });
    }
  // isAutoPlaying intentionally excluded — we read it via isAutoPlayingRef to avoid stale closure
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLineIndex, story.id, playVoice, isGenerating, currentLine, nextLine]);

  const getCharacterImg = (name: string) => {
    const char = CHARACTERS.find(c => name.toLowerCase().includes(c.name.toLowerCase()));
    return char?.img;
  };

  const isLastLine = currentLineIndex === lines.length - 1;
  const showChoices = isLastLine && story.isInteractive && currentLine?.choices && currentLine.choices.length > 0 && !isGenerating;
  const disableChoices = isSpeaking || isGenerating;
  
  const shouldHideNavButton = isSpeaking || isGenerating || (isAutoPlaying && !isLastLine);

  return (
    <div className="h-screen bg-black text-[#e2d1b3] flex flex-col relative overflow-hidden font-serif">
      {/* Background Arena */}
      <div className="absolute inset-0 z-0">
        <img src={story.arenaImg} className="w-full h-full object-cover opacity-40" alt={story.arenaName} />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60" />
      </div>

      {/* Inventory Bubbles in Corners */}
      {isMPA && inventory.hero && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          {/* Top-Left: Hero */}
          <div className="absolute top-32 left-6 md:left-12 pointer-events-auto flex flex-col items-center gap-2 group">
            <div className="w-20 h-20 md:w-28 md:h-28 rounded-full border-4 border-amber-500 bg-black/60 overflow-hidden shadow-[0_0_20px_rgba(251,191,36,0.3)] flex items-center justify-center transition-all hover:scale-110">
              <img src={inventory.hero.img} className="w-full h-full object-cover" alt="Héros" />
            </div>
            <div className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-amber-500 bg-black/80 px-2 py-0.5 rounded-full border border-amber-500/30">Héros</div>
          </div>

          {/* Top-Right: Item 1 */}
          {inventory.items[0] && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute top-32 right-6 md:right-12 pointer-events-auto flex flex-col items-center gap-2 group"
            >
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-full border-4 border-amber-700 bg-black/60 overflow-hidden shadow-lg flex items-center justify-center transition-transform hover:scale-110">
                <div className="text-2xl md:text-3xl">📦</div>
              </div>
              <div className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-amber-700 bg-black/80 px-2 py-0.5 rounded border border-amber-700/30">Objet 1</div>
            </motion.div>
          )}

          {/* Bottom-Left: Item 2 (Clearly Above Narrator) */}
          {inventory.items[1] && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute bottom-80 left-6 md:left-12 pointer-events-auto flex flex-col items-center gap-2 group"
            >
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-full border-4 border-amber-700 bg-black/60 overflow-hidden shadow-lg flex items-center justify-center transition-transform hover:scale-110">
                <div className="text-2xl md:text-3xl">🗝️</div>
              </div>
              <div className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-amber-700 bg-black/80 px-2 py-0.5 rounded border border-amber-700/30">Objet 2</div>
            </motion.div>
          )}

          {/* Bottom-Right: Ally (Clearly Above Narrator) */}
          {inventory.allies[0] && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute bottom-80 right-6 md:right-12 pointer-events-auto flex flex-col items-center gap-2 group"
            >
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-full border-4 border-blue-500/50 bg-black/60 overflow-hidden shadow-lg flex items-center justify-center transition-transform hover:scale-110">
                <div className="text-2xl md:text-3xl">🤝</div>
              </div>
              <div className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-blue-500 bg-black/80 px-2 py-0.5 rounded border border-blue-500/30">Allié</div>
            </motion.div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="z-10 p-4 md:p-6 flex items-center justify-between bg-black/40 backdrop-blur-md border-b border-amber-900/30">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-amber-900/30 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-bold italic truncate">{story.title}</h1>
            <button
              type="button"
              onClick={() => setThemeExpanded(v => !v)}
              className="text-[10px] uppercase tracking-[0.2em] text-amber-500 font-bold flex items-center gap-1 hover:text-amber-300 transition-colors text-left max-w-full"
              title={themeExpanded ? 'Réduire le thème' : 'Voir le thème complet'}
            >
              <span className={themeExpanded ? 'whitespace-normal break-words' : 'truncate max-w-[180px] md:max-w-[280px]'}>
                {story.theme}
              </span>
              <ChevronDown size={12} className={`flex-shrink-0 transition-transform ${themeExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const next = !isAutoPlaying;
              isAutoPlayingRef.current = next;
              setIsAutoPlaying(next);
              if (!next) {
                stopVoice();
              } else {
                lastPlayedIdx.current = -1;
              }
            }}
            className={`p-2 rounded-full border transition-all ${isAutoPlaying ? 'bg-amber-500 text-black border-amber-400' : 'bg-black/40 text-amber-500 border-amber-900/50'}`}
          >
            {isGenerating ? <RefreshCw size={20} className="animate-spin" /> : (isAutoPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="none" />)}
          </button>
        </div>
      </div>

      {/* Character Sprites (Visual Novel Style) */}
      <div className="flex-grow z-10 flex items-end justify-center px-8 relative mb-64 md:mb-80">
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
      <div className="absolute bottom-0 left-0 right-0 z-20 px-6 md:px-12 pb-8 flex flex-col-reverse items-center gap-12 pointer-events-none">
        
        {/* 1. Dialogue Box */}
        <div className="w-full max-w-4xl bg-[#1a140f]/95 border-2 border-amber-900/50 rounded-2xl p-4 md:p-6 shadow-2xl backdrop-blur-lg relative pointer-events-auto">
          {/* Speaker Name Tag */}
          <div className="absolute -top-5 left-6 bg-amber-800 text-black px-4 py-1 rounded-lg font-black italic uppercase tracking-widest shadow-lg border-2 border-amber-500 text-sm">
            {currentLine?.speaker || "Narrateur"}
          </div>

          <div className="min-h-[80px] flex flex-col justify-center">
            <div key={currentLineIndex} className="text-xl md:text-3xl leading-relaxed italic">
              {(() => {
                const cleanText = currentLine?.text.replace(/^[^:]+:\s*/, '') || '';
                if (lineDuration > 0) {
                  const words = cleanText.split(' ');
                  const totalChars = cleanText.length;
                  const timePerChar = (lineDuration * 0.95) / Math.max(totalChars, 1);
                  let runningChars = 0;
                  return (
                    <>
                      {words.map((word, wIdx) => {
                        const delay = runningChars * timePerChar;
                        const wordDuration = Math.max(word.length * timePerChar, 0.1);
                        runningChars += word.length + 1;
                        return (
                          <motion.span
                            key={wIdx}
                            initial={{ color: '#6b5240' }}
                            animate={{ color: '#e2d1b3' }}
                            transition={{ delay, duration: wordDuration * 0.8 }}
                            className="inline-block mr-[0.25em]"
                          >
                            {word}
                          </motion.span>
                        );
                      })}
                      {currentLine?.action && (
                        <span className="block text-sm md:text-base text-amber-600/70 mt-4 uppercase tracking-[0.3em] font-bold">
                          ({currentLine.action})
                        </span>
                      )}
                    </>
                  );
                }
                // lineDuration=0 : audio pas encore démarré (buffering) ou voix désactivée
                // On montre le texte sombre si on est en train de parler (buffering), clair sinon
                return (
                  <span className={isSpeaking ? 'text-[#6b5240]' : 'text-[#e2d1b3]'}>
                    {cleanText}
                    {currentLine?.action && (
                      <span className="block text-sm md:text-base text-amber-600/70 mt-4 uppercase tracking-[0.3em] font-bold">
                        ({currentLine.action})
                      </span>
                    )}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Controls / Next Button */}
          <div className="mt-8 flex justify-end items-center gap-4">
            {!showChoices && !shouldHideNavButton && (
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
        {showChoices && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl flex flex-col gap-3 pointer-events-auto z-[60] mb-4"
          >
            <div className={`bg-black/80 backdrop-blur-xl border-2 border-amber-500/30 rounded-2xl p-4 shadow-[0_0_40px_rgba(0,0,0,0.6)] flex flex-col max-h-[35vh] transition-opacity ${disableChoices ? 'opacity-50' : 'opacity-100'}`}>
              <h4 className="text-sm md:text-base font-black text-amber-400 uppercase tracking-[0.2em] text-center italic mb-4 flex-shrink-0">
                {isSpeaking ? "Écoutez la fin de l'histoire..." : "Que décidez-vous ?"}
              </h4>
              
              <div className="flex flex-col gap-2 overflow-y-auto custom-scroll pr-1">
                {currentLine.choices?.map((choice, i) => {
                  const isHeroChoice = choice.text.toLowerCase().includes('incarner');
                  
                  if (isHeroChoice) {
                    const hero = CHARACTERS.find(c => choice.text.includes(c.name));
                    return (
                      <button
                        key={i}
                        disabled={disableChoices}
                        onClick={async () => {
                          const nextIdx = story.script.length;
                          await onChoice(choice.text, choice.action, choice.inventoryUpdate);
                          setCurrentLineIndex(nextIdx);
                          setIsAutoPlaying(true);
                        }}
                        className="flex items-center gap-3 bg-amber-900/30 hover:bg-amber-800/50 border border-amber-500/20 hover:border-amber-400 rounded-xl p-2.5 transition-all group flex-shrink-0 disabled:cursor-not-allowed"
                      >
                        {hero && <img src={hero.img} className="w-10 h-10 rounded-full border border-amber-500/40" alt={hero.name} />}
                        <span className="text-sm font-bold text-amber-100">{choice.text}</span>
                        <ChevronRight size={16} className="ml-auto text-amber-500 group-hover:translate-x-1 transition-transform" />
                      </button>
                    );
                  }

                  return (
                    <button
                      key={i}
                      disabled={disableChoices}
                      onClick={async () => {
                        const nextIdx = story.script.length;
                        await onChoice(choice.text, choice.action, choice.inventoryUpdate);
                        setCurrentLineIndex(nextIdx);
                        setIsAutoPlaying(true);
                      }}
                      className="w-full bg-[#1a140f]/90 hover:bg-amber-900/50 border border-amber-500/20 hover:border-amber-400 rounded-xl p-3.5 text-amber-100 text-xs md:text-sm font-bold transition-all flex items-center justify-between group backdrop-blur-md flex-shrink-0 disabled:cursor-not-allowed"
                    >
                      <span className="text-left leading-snug">{choice.text}</span>
                      <ChevronRight size={16} className="flex-shrink-0 text-amber-500 group-hover:translate-x-1 transition-transform ml-3" />
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
