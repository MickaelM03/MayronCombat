import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Book, Plus, Trash2, MapPin, Sparkles, ChevronRight, ChevronLeft, UserPlus, Star
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
  const [selectedChars, setSelectedChars] = useState<(typeof CHARACTERS[0])[]>([]);
  const [selectedArena, setSelectedArena] = useState(ARENAS[0]);
  const [theme, setTheme] = useState('Une aventure épique à travers les dimensions');
  const [isInteractive, setIsInteractive] = useState(true);
  const [showCharModal, setShowCharModal] = useState<number | null>(null);

  const addCharacter = () => {
    setSelectedChars([...selectedChars, CHARACTERS[3]]);
  };

  const removeCharacter = (index: number) => {
    if (selectedChars.length <= 1) return;
    setSelectedChars(selectedChars.filter((_, i) => i !== index));
  };

  const THEME_PRESETS: Record<string, { characterIds: string[], arenaId: string }> = {
    "Ma Première Aventure : En quête du Dragon": { characterIds: ['lina', 'sachat', 'timon'], arenaId: 'foret_dragon' },
    "Ma Première Aventure : La découverte de l’Atlantide": { characterIds: ['manta', 'behemoth', 'espadon'], arenaId: 'atlantide' },
    "Ma Première Aventure : L’Odyssée du Phobos": { characterIds: ['gloub', 'eclipse', 'toby'], arenaId: 'phobos_station' },
    "Ma Première Aventure : Voyage en Terre Ocre": { characterIds: ['sumai', 'mailune', 'issa'], arenaId: 'vallee_ocre' },
    "Ma Première Aventure : La Course des Casse-Tout": { characterIds: ['bipbop', 'ambrose', 'haru'], arenaId: 'circuit_casse_tout' },
    "Ma Première Aventure : La Reine de Champ-Fleuri": { characterIds: ['bizzcotte', 'bizzou'], arenaId: 'ruche_champ_fleuri' },
    "Ma Première Aventure : Au Vol-Oeuf !": { characterIds: ['zoe', 'jeppy', 'nouky'], arenaId: 'ville_superopolis' },
    "Ma Première Aventure : Sur la Piste du Dahu": { characterIds: ['aivy', 'will'], arenaId: 'montagne_dahu' },
    "Ma Première Aventure : La Bibliothèque Infinie": { characterIds: ['lilon', 'camille', 'lucien'], arenaId: 'bibliotheque_infinie' },
    "Ma Première Aventure : Pattie et l’Épreuve des Dieux": { characterIds: ['sam_matou', 'pattie'], arenaId: 'gaulois_village' },
    "Ma Première Aventure : Au Cœur de la Jungle": { characterIds: ['lalo', 'atu'], arenaId: 'jungle_ruines' },
    "Ma Première Aventure : Le Château de P’tit-Bouh": { characterIds: ['ptit_bouh'], arenaId: 'chateau_ptit_bouh' },
    "Ma Première Aventure : Grabuge à Superopolis": { characterIds: ['lepine', 'boombox'], arenaId: 'ville_superopolis' },
  };

  const handleThemeSelect = (t: string) => {
    setTheme(t);
    const preset = THEME_PRESETS[t];
    if (preset) {
      const presetChars = preset.characterIds
        .map(id => CHARACTERS.find(c => c.id === id))
        .filter((c): c is typeof CHARACTERS[0] => !!c);
      
      if (presetChars.length > 0) {
        setSelectedChars(presetChars);
      }
      
      const presetArena = ARENAS.find(a => a.id === preset.arenaId);
      if (presetArena) {
        setSelectedArena(presetArena);
        const element = document.getElementById(`arena-${preset.arenaId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    }
  };

  const THEMES = [
    "Une quête mystique pour retrouver un artefact perdu",
    "Une enquête policière dans un futur cyberpunk",
    "Une comédie absurde impliquant un chat et un banquier",
    "Une évasion spectaculaire d'une prison de haute sécurité",
    "Une exploration périlleuse d'une planète hostile",
    "Un tournoi de cuisine qui tourne mal",
    "Mayron et la licorne magique",
    "L'équipe de choc contre les pirates de l'espace",
    "Sam le chat astronaute et le mystère de la lune en fromage",
    "Le chevalier courageux et le dragon qui bave du chocolat",
    "La princesse hacker et le château enchanté",
    "Ma Première Aventure : En quête du Dragon",
    "Ma Première Aventure : La découverte de l’Atlantide",
    "Ma Première Aventure : L’Odyssée du Phobos",
    "Ma Première Aventure : Voyage en Terre Ocre",
    "Ma Première Aventure : La Course des Casse-Tout",
    "Ma Première Aventure : La Reine de Champ-Fleuri",
    "Ma Première Aventure : Au Vol-Oeuf !",
    "Ma Première Aventure : Sur la Piste du Dahu",
    "Ma Première Aventure : La Bibliothèque Infinie",
    "Ma Première Aventure : Pattie et l’Épreuve des Dieux",
    "Ma Première Aventure : Au Cœur de la Jungle",
    "Ma Première Aventure : Le Château de P’tit-Bouh",
    "Ma Première Aventure : Grabuge à Superopolis"
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  return (
    <div className="min-h-screen bg-mesh text-[#e2d1b3] p-4 md:p-8 flex flex-col items-center font-serif overflow-x-hidden relative">
      {/* Header */}
      <motion.div 
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-12 mt-8 md:mt-0"
      >
        <h1 className="text-4xl md:text-7xl font-black italic tracking-tighter text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
          Chroniques du <span className="text-amber-500">Multivers</span>
        </h1>
        <div className="h-0.5 w-48 bg-gradient-to-r from-transparent via-amber-600 to-transparent mx-auto mt-4 opacity-50" />
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 pb-32"
      >
        
        {/* Left Column: Characters & Settings */}
        <div className="space-y-8">
          
          {/* Character Selection */}
          <motion.section variants={itemVariants} className="glass-card p-6 md:p-8 rounded-[2rem] border-amber-900/30 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <UserPlus size={80} className="text-amber-500" />
            </div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-black flex items-center gap-3 italic">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <UserPlus size={24} className="text-amber-400" />
                </div>
                Les Protagonistes
              </h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6">
              {selectedChars.map((char, index) => (
                <motion.div
                  key={`${char.id}-${index}`}
                  layout
                  className="relative group"
                >
                  <button
                    onClick={() => setShowCharModal(index)}
                    className="w-full aspect-[3/4] rounded-2xl overflow-hidden border-2 border-amber-900/30 hover:border-amber-400 transition-all bg-black/60 shadow-lg group-hover:shadow-amber-500/20"
                  >
                    <img src={char.img} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" alt={char.name} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="text-[10px] text-amber-500 font-black uppercase tracking-widest mb-0.5">{char.faction}</div>
                      <div className="text-sm font-bold truncate text-white uppercase italic">
                        {char.name}
                      </div>
                    </div>
                  </button>
                  {selectedChars.length > 1 && (
                    <button 
                      onClick={() => removeCharacter(index)}
                      className="absolute -top-2 -right-2 p-1.5 bg-red-600 text-white rounded-full border-2 border-red-900 shadow-lg transition-all z-20 hover:scale-110 active:scale-95"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </motion.div>
              ))}
              {selectedChars.length < 6 && (
                <button
                  onClick={addCharacter}
                  className="w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-amber-900/40 flex flex-col items-center justify-center gap-3 hover:bg-amber-900/20 transition-all text-amber-700/60 hover:text-amber-500 hover:border-amber-500/50 group"
                >
                  <div className="p-3 bg-amber-900/20 rounded-full group-hover:scale-110 transition-transform">
                    <Plus size={28} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">Ajouter</span>
                </button>
              )}
            </div>
          </motion.section>

          {/* Arena Selection */}
          <motion.section variants={itemVariants} className="glass-card p-6 md:p-8 rounded-[2rem] border-amber-900/30 shadow-2xl relative overflow-hidden">
            <h2 className="text-2xl md:text-3xl font-black flex items-center gap-3 mb-8 italic">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <MapPin size={24} className="text-amber-400" />
              </div>
              Le Lieu de l'aventure
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[350px] overflow-y-auto pr-3 custom-scroll">
              {ARENAS.map((arena) => (
                <button
                  key={arena.id}
                  id={`arena-${arena.id}`}
                  onClick={() => setSelectedArena(arena)}
                  className={`relative aspect-video rounded-2xl overflow-hidden border-2 transition-all group ${selectedArena.id === arena.id ? 'border-amber-400 scale-105 shadow-[0_0_20px_rgba(251,191,36,0.3)] z-10' : 'border-transparent opacity-50 hover:opacity-100'}`}
                >
                  <img src={arena.img} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" alt={arena.name} />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors" />
                  <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black to-transparent text-[10px] font-black uppercase tracking-widest text-center">
                    {arena.name}
                  </div>
                </button>
              ))}
            </div>
          </motion.section>
        </div>

        {/* Right Column: Theme & Mode */}
        <div className="space-y-8">
          
          {/* Theme Input */}
          <motion.section variants={itemVariants} className="glass-card p-6 md:p-8 rounded-[2rem] border-amber-900/30 shadow-2xl">
            <h2 className="text-2xl md:text-3xl font-black flex items-center gap-3 mb-8 italic">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Sparkles size={24} className="text-amber-400" />
              </div>
              La Trame Narrative
            </h2>
            <div className="space-y-6">
              <div className="relative">
                <textarea
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full bg-black/40 border-2 border-amber-900/30 rounded-2xl p-5 text-[#e2d1b3] focus:border-amber-500 outline-none min-h-[120px] resize-none font-serif text-lg md:text-xl italic shadow-inner"
                  placeholder="Décrivez votre histoire..."
                />
                <div className="absolute bottom-4 right-4 opacity-20">
                  <Star size={20} className="text-amber-500 animate-pulse" />
                </div>
              </div>
              
              <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-3 custom-scroll">
                {THEMES.map((t) => (
                  <button
                    key={t}
                    onClick={() => handleThemeSelect(t)}
                    className={`w-full text-left px-5 py-4 rounded-2xl border-2 transition-all flex items-center gap-4 group ${theme === t ? 'bg-amber-600 text-black border-amber-400 font-black shadow-[0_0_25px_rgba(251,191,36,0.3)]' : 'bg-black/40 text-amber-200/70 border-amber-900/20 hover:border-amber-700/50 hover:bg-black/60'}`}
                  >
                    <Sparkles size={16} className={`${theme === t ? 'text-black' : 'text-amber-600'} flex-shrink-0 group-hover:rotate-12 transition-transform`} />
                    <span className="text-sm md:text-base leading-snug">{t}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.section>

          {/* Mode Selection */}
          <motion.section variants={itemVariants} className="glass-card p-6 md:p-8 rounded-[2rem] border-amber-900/30 shadow-2xl">
            <h2 className="text-2xl md:text-3xl font-black flex items-center gap-3 mb-8 italic">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Book size={24} className="text-amber-400" />
              </div>
              Style de Lecture
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => setIsInteractive(false)}
                className={`group p-5 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${!isInteractive ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_20px_rgba(251,191,36,0.2)]' : 'border-amber-900/20 bg-black/20 opacity-60 hover:opacity-100'}`}
              >
                {!isInteractive && <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />}
                <div className="font-black text-lg md:text-xl uppercase italic mb-1">Chronique Linéaire</div>
                <div className="text-xs md:text-sm italic text-amber-200/60">Une histoire complète générée d'un seul bloc, idéale pour une lecture continue.</div>
              </button>
              <button
                onClick={() => setIsInteractive(true)}
                className={`group p-5 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${isInteractive ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_20px_rgba(251,191,36,0.2)]' : 'border-amber-900/20 bg-black/20 opacity-60 hover:opacity-100'}`}
              >
                {isInteractive && <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />}
                <div className="font-black text-lg md:text-xl uppercase italic mb-1">Livre dont vous êtes le héros</div>
                <div className="text-xs md:text-sm italic text-amber-200/60">Prenez le contrôle ! Faites des choix cruciaux à la fin de chaque chapitre.</div>
              </button>
            </div>
          </motion.section>

          {/* Start Action */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              onClick={onBack}
              className="flex-1 px-8 py-5 rounded-2xl border-2 border-amber-900/50 text-amber-700 font-black hover:bg-amber-900/20 hover:text-amber-500 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] italic text-xs"
            >
              <ChevronLeft size={18} />
              Retour
            </button>
            <motion.button
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onStart({ characters: selectedChars, arena: selectedArena, theme, isInteractive })}
              className="flex-[2] px-8 py-5 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-black font-black hover:from-amber-400 hover:to-amber-600 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.3em] shadow-[0_15px_30px_rgba(251,191,36,0.2)] italic"
            >
              Lancer l'Aventure
              <ChevronRight size={22} />
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* Character Selection Modal */}
      <AnimatePresence>
        {showCharModal !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCharModal(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative glass-card border-2 border-amber-500/40 rounded-[2rem] md:rounded-[3rem] p-4 md:p-10 max-w-5xl w-[95%] md:w-full max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)]"
            >
              <h3 className="text-2xl md:text-5xl font-black text-amber-500 uppercase italic mb-6 md:mb-10 tracking-tighter text-center leading-none">
                Choisir un <span className="text-white">Protagoniste</span>
              </h3>
              
              <div className="flex flex-wrap gap-3 overflow-y-auto pr-2 custom-scroll pb-6 justify-center content-start">
                {CHARACTERS.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => {
                      const newChars = [...selectedChars];
                      newChars[showCharModal] = char;
                      setSelectedChars(newChars);
                      setShowCharModal(null);
                    }}
                    className="group relative w-[calc(50%-8px)] sm:w-[calc(33.33%-8px)] md:w-[160px] aspect-[3/4] min-h-[160px] md:min-h-[220px] rounded-xl md:rounded-2xl overflow-hidden border-2 border-amber-900/30 hover:border-amber-400 transition-all shadow-lg bg-black/40 flex-shrink-0 flex flex-col"
                  >
                    <img 
                      src={char.img} 
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" 
                      alt={char.name} 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
                    <div className="absolute bottom-2 left-2 right-2 md:bottom-4 md:left-4 md:right-4 text-center">
                      <div className="text-[8px] md:text-[10px] font-black text-amber-500 uppercase tracking-widest mb-0.5">{char.faction}</div>
                      <div className="text-xs md:text-base font-bold text-white uppercase italic truncate">{char.name}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Close Button for better UX on mobile */}
              <button 
                onClick={() => setShowCharModal(null)}
                className="mt-4 py-3 bg-amber-900/20 border border-amber-500/30 rounded-xl text-amber-500 text-xs font-black uppercase tracking-widest hover:bg-amber-500 hover:text-black transition-all md:hidden"
              >
                Fermer
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
