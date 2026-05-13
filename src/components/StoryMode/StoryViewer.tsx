import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, RefreshCw, Volume2, Save, ArrowLeft, History, Play 
} from 'lucide-react';
import { StoryLine, SavedStory, getStoryAudio, saveStoryAudio, updateStory } from '../../lib/story/store';
import { CHARACTERS } from '../../lib/constants';

interface StoryViewerProps {
  story: SavedStory;
  onChoice: (choiceText: string, choiceAction: string) => void;
  onBack: () => void;
  playVoice: (line: StoryLine, index: number, storyId: string) => Promise<void>;
  isGenerating: boolean;
}

export default function StoryViewer({ story, onChoice, onBack, playVoice, isGenerating }: StoryViewerProps) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lines = story.script;
  const currentLine = lines[currentLineIndex];
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const nextLine = useCallback(async () => {
    if (currentLineIndex < lines.length - 1) {
      setCurrentLineIndex(prev => prev + 1);
    } else if (story.isInteractive && !isGenerating && currentLine?.choices) {
      // Stay at choices
    }
  }, [currentLineIndex, lines.length, story.isInteractive, isGenerating, currentLine?.choices]);

  useEffect(() => {
    if (currentLine && !isSpeaking) {
      playVoice(currentLine, currentLineIndex, story.id).then(() => {
        if (isAutoPlaying) {
          setTimeout(nextLine, 1000);
        }
      });
    }
  }, [currentLineIndex, story.id, playVoice]);

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
            <Play size={20} fill={isAutoPlaying ? "currentColor" : "none"} />
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

      {/* Dialogue Box */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 md:p-8">
        <div className="max-w-5xl mx-auto bg-[#1a140f]/90 border-2 border-amber-900/50 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-lg relative">
          
          {/* Speaker Name Tag */}
          <div className="absolute -top-6 left-8 bg-amber-800 text-black px-6 py-2 rounded-xl font-black italic uppercase tracking-widest shadow-lg border-2 border-amber-500">
            {currentLine?.speaker || "Narrateur"}
          </div>

          <div className="min-h-[120px] flex flex-col justify-center">
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
                onClick={isLastLine ? onBack : nextLine}
                className="px-8 py-3 bg-amber-800 text-black font-black uppercase tracking-widest rounded-xl hover:bg-amber-600 transition-colors flex items-center gap-2"
              >
                {isLastLine ? 'Terminer' : 'Suivant'}
                {isLastLine ? <Save size={20} /> : <ChevronRight size={20} />}
              </button>
            )}
          </div>

          {/* Interactive Choices */}
          <AnimatePresence>
            {showChoices && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="absolute left-0 right-0 -top-48 flex flex-col items-center gap-4 px-4"
              >
                {currentLine.choices?.map((choice, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.02, x: 10 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onChoice(choice.text, choice.action)}
                    className="w-full max-w-2xl bg-amber-900/90 hover:bg-amber-800 border-2 border-amber-500 rounded-2xl p-4 md:p-6 text-white text-lg md:text-xl font-bold shadow-2xl transition-all flex items-center justify-between group"
                  >
                    <span>{choice.text}</span>
                    <ChevronRight size={24} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

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
      </div>
    </div>
  );
}
