import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Book, Plus, Trash2, MapPin, Sparkles, ChevronRight, ChevronLeft, UserPlus 
} from 'lucide-react';
import { CHARACTERS, ARENAS } from '../../lib/constants';

interface StoryConfiguratorProps {
  onStart: (config: {
    characters: typeof CHARACTERS;
    arena: typeof ARENAS[0];
    theme: string;
    isInteractive: boolean;
  }) => void;
  onBack: () => void;
}

export default function StoryConfigurator({ onStart, onBack }: StoryConfiguratorProps) {
  const [selectedChars, setSelectedChars] = useState<(typeof CHARACTERS[0])[]>([
    CHARACTERS[0], CHARACTERS[1], CHARACTERS[2]
  ]);
  const [selectedArena, setSelectedArena] = useState(ARENAS[0]);
  const [theme, setTheme] = useState('Une aventure épique à travers les dimensions');
  const [isInteractive, setIsInteractive] = useState(true);
  const [showCharModal, setShowCharModal] = useState<number | null>(null);

  const addCharacter = () => {
    setSelectedChars([...selectedChars, CHARACTERS[3]]);
  };

  const removeCharacter = (index: number) => {
    if (selectedChars.length <= 3) return;
    setSelectedChars(selectedChars.filter((_, i) => i !== index));
  };

  const THEMES = [
    "Une quête mystique pour retrouver un artefact perdu",
    "Une enquête policière dans un futur cyberpunk",
    "Une comédie absurde impliquant un chat et un banquier",
    "Une évasion spectaculaire d'une prison de haute sécurité",
    "Une exploration périlleuse d'une planète hostile",
    "Un tournoi de cuisine qui tourne mal"
  ];

  return (
    <div className="min-h-screen bg-[#1a140f] text-[#e2d1b3] p-4 md:p-8 flex flex-col items-center font-serif">
      {/* Header */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl md:text-6xl font-bold mb-2 italic" style={{ fontFamily: "'Playfair Display', serif" }}>
          Chroniques du Multivers
        </h1>
        <div className="h-1 w-64 bg-gradient-to-r from-transparent via-amber-700 to-transparent mx-auto mt-4" />
      </motion.div>

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* Left Column: Characters & Settings */}
        <div className="space-y-8">
          
          {/* Character Selection */}
          <section className="bg-[#2d2419] p-6 rounded-2xl border border-amber-900/50 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <UserPlus size={24} className="text-amber-500" />
                Les Protagonistes
              </h2>
              <span className="text-sm italic text-amber-600/70">(Min. 3 personnages)</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {selectedChars.map((char, index) => (
                <motion.div
                  key={`${char.id}-${index}`}
                  layout
                  className="relative group"
                >
                  <button
                    onClick={() => setShowCharModal(index)}
                    className="w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-amber-900/30 hover:border-amber-500 transition-colors bg-black/40"
                  >
                    <img src={char.img} className="w-full h-full object-cover" alt={char.name} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                    <div className="absolute bottom-2 left-2 right-2 text-xs font-bold truncate text-white">
                      {char.name}
                    </div>
                  </button>
                  {selectedChars.length > 3 && (
                    <button 
                      onClick={() => removeCharacter(index)}
                      className="absolute -top-2 -right-2 p-1 bg-red-900 text-white rounded-full border border-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </motion.div>
              ))}
              <button
                onClick={addCharacter}
                className="w-full aspect-[3/4] rounded-xl border-2 border-dashed border-amber-900/50 flex flex-col items-center justify-center gap-2 hover:bg-amber-900/20 transition-colors text-amber-700"
              >
                <Plus size={32} />
                <span className="text-sm font-bold">Ajouter</span>
              </button>
            </div>
          </section>

          {/* Arena Selection */}
          <section className="bg-[#2d2419] p-6 rounded-2xl border border-amber-900/50 shadow-2xl">
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
              <MapPin size={24} className="text-amber-500" />
              Le Lieu du Drame
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-amber-900 scrollbar-track-transparent">
              {ARENAS.map((arena) => (
                <button
                  key={arena.id}
                  onClick={() => setSelectedArena(arena)}
                  className={`flex-shrink-0 w-48 aspect-video rounded-xl overflow-hidden border-2 transition-all ${selectedArena.id === arena.id ? 'border-amber-400 scale-105 shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <img src={arena.img} className="w-full h-full object-cover" alt={arena.name} />
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 text-[10px] font-bold">
                    {arena.name}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Theme & Mode */}
        <div className="space-y-8">
          
          {/* Theme Input */}
          <section className="bg-[#2d2419] p-6 rounded-2xl border border-amber-900/50 shadow-2xl">
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
              <Sparkles size={24} className="text-amber-500" />
              La Trame Narrative
            </h2>
            <div className="space-y-4">
              <textarea
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full bg-black/40 border-2 border-amber-900/30 rounded-xl p-4 text-[#e2d1b3] focus:border-amber-500 outline-none min-h-[120px] resize-none font-serif text-lg italic"
                placeholder="Décrivez votre histoire..."
              />
              <div className="flex flex-wrap gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className="text-xs px-3 py-1.5 rounded-full bg-amber-900/30 border border-amber-900/50 hover:bg-amber-900/50 transition-colors italic"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Mode Selection */}
          <section className="bg-[#2d2419] p-6 rounded-2xl border border-amber-900/50 shadow-2xl">
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
              <Book size={24} className="text-amber-500" />
              Style de Lecture
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => setIsInteractive(false)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${!isInteractive ? 'border-amber-400 bg-amber-900/20 shadow-[0_0_15px_rgba(251,191,36,0.2)]' : 'border-amber-900/30 bg-black/20 opacity-60 hover:opacity-100'}`}
              >
                <div className="font-bold text-lg">Chronique Linéaire</div>
                <div className="text-sm italic opacity-80">Une histoire complète générée d'un seul bloc.</div>
              </button>
              <button
                onClick={() => setIsInteractive(true)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${isInteractive ? 'border-amber-400 bg-amber-900/20 shadow-[0_0_15px_rgba(251,191,36,0.2)]' : 'border-amber-900/30 bg-black/20 opacity-60 hover:opacity-100'}`}
              >
                <div className="font-bold text-lg">Livre dont vous êtes le héros</div>
                <div className="text-sm italic opacity-80">Faites des choix cruciaux à la fin de chaque chapitre pour influencer le destin du multivers.</div>
              </button>
            </div>
          </section>

          {/* Start Action */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={onBack}
              className="flex-1 px-8 py-4 rounded-xl border-2 border-amber-900 text-amber-700 font-bold hover:bg-amber-900/10 transition-colors flex items-center justify-center gap-2 uppercase tracking-widest"
            >
              <ChevronLeft size={20} />
              Retour
            </button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onStart({ characters: selectedChars, arena: selectedArena, theme, isInteractive })}
              className="flex-[2] px-8 py-4 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 text-black font-black hover:from-amber-500 hover:to-amber-700 transition-colors flex items-center justify-center gap-2 uppercase tracking-[0.2em] shadow-xl"
            >
              Lancer l'Aventure
              <ChevronRight size={20} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Character Selection Modal */}
      <AnimatePresence>
        {showCharModal !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCharModal(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-[#2d2419] border-2 border-amber-500 rounded-3xl p-8 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
            >
              <h3 className="text-3xl font-black text-amber-500 uppercase italic mb-8 tracking-widest">Choisir un Protagoniste</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {CHARACTERS.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => {
                      const newChars = [...selectedChars];
                      newChars[showCharModal] = char;
                      setSelectedChars(newChars);
                      setShowCharModal(null);
                    }}
                    className="group relative aspect-[3/4] rounded-xl overflow-hidden border-2 border-transparent hover:border-amber-400 transition-all"
                  >
                    <img src={char.img} className="w-full h-full object-cover" alt={char.name} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
                    <div className="absolute bottom-2 left-2 right-2 text-center">
                      <div className="text-xs font-bold text-white uppercase">{char.name}</div>
                      <div className="text-[10px] text-amber-500 font-medium">{char.faction}</div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
