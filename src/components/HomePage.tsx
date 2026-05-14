import React from 'react';
import { motion } from 'motion/react';
import { Swords, BookOpen, Lock, AlertTriangle, Settings2, Sparkles } from 'lucide-react';
import { NarrativeMode } from '../lib/battles/prompts';

const NARRATIVE_MODE_META: Record<NarrativeMode, { name: string; icon: string }> = {
  1: { name: 'Familial', icon: '👶' },
  2: { name: 'Ado', icon: '🧑' },
  3: { name: 'Adulte', icon: '🧔' },
  4: { name: 'NSFW', icon: '🔞' },
  5: { name: 'Gore', icon: '💀' },
  6: { name: 'Extrême', icon: '☠️' },
};

const getTier = (mode: NarrativeMode): number => {
  if (mode >= 5) return 3; // red
  if (mode >= 3) return 2; // orange/blue
  if (mode >= 2) return 1; // blue
  return 0; // safe
};

interface HomePageProps {
  onSelectMode: (mode: 'BRAWLER' | 'STORY_CONFIG' | 'STORY_LIBRARY') => void;
  narrativeMode: NarrativeMode;
  onOpenParentalControl: () => void;
}

export default function HomePage({ onSelectMode, narrativeMode, onOpenParentalControl }: HomePageProps) {
  const tier = getTier(narrativeMode);
  const meta = NARRATIVE_MODE_META[narrativeMode];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
    }
  };

  return (
    <div className="min-h-screen bg-mesh w-full flex flex-col items-center justify-start md:justify-center p-4 relative overflow-x-hidden overflow-y-auto">
      {/* Background Floating Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-amber-600/10 blur-[120px] rounded-full animate-pulse" />
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="z-10 w-full max-w-6xl flex flex-col items-center gap-6 md:gap-12 py-6 md:py-16"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="text-center px-4 relative group cursor-default mt-4 md:mt-0">
          <div className="relative inline-block">
            <h1 className="text-3xl sm:text-5xl md:text-8xl font-black text-white uppercase italic tracking-tighter leading-tight mb-1 relative z-10 select-none">
              MAYRON<span className="text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]">MULTIVERSE</span>
            </h1>
            <div className="absolute -inset-4 bg-white/5 blur-2xl -z-10 opacity-30 group-hover:opacity-50 transition-opacity" />
          </div>
          <div className="flex items-center justify-center gap-3 mt-2 md:mt-4">
            <div className="h-[1px] w-6 md:w-16 bg-gradient-to-r from-transparent to-gray-500" />
            <p className="text-gray-400 text-[8px] md:text-sm tracking-[0.3em] uppercase font-medium">Sélectionnez votre expérience</p>
            <div className="h-[1px] w-6 md:w-16 bg-gradient-to-l from-transparent to-gray-500" />
          </div>
        </motion.div>

        {/* Main Selection Cards */}
        <div className="w-full flex flex-col md:grid md:grid-cols-2 gap-4 md:gap-8 px-1 md:px-0">
          
          {/* Card: Multiverse Brawler */}
          <motion.div variants={itemVariants} className="w-full">
            <motion.button
              whileHover={{ scale: 1.02, y: -8 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectMode('BRAWLER')}
              className="group relative w-full h-[150px] sm:h-[180px] md:h-[480px] rounded-2xl md:rounded-[2.5rem] overflow-hidden border border-blue-500/30 hover:border-blue-400 transition-all duration-500 shadow-2xl focus:outline-none"
            >
              <div className="absolute inset-0 bg-[url('/images/neotokyo_sf.png')] bg-cover bg-center opacity-30 group-hover:opacity-50 transition-all duration-700 scale-110 group-hover:scale-100" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              
              <div className="absolute inset-0 p-4 md:p-12 flex flex-col items-start justify-end text-left">
                <div className="p-2 md:p-4 rounded-lg md:rounded-xl bg-blue-500/10 border border-blue-500/20 mb-2 md:mb-8 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all">
                  <Swords size={18} className="text-blue-400 md:w-10 md:h-10 text-glow-blue" />
                </div>
                <h2 className="text-xl md:text-5xl font-black text-white uppercase italic tracking-tight mb-1 md:mb-4 group-hover:translate-x-2 transition-transform">
                  Multiverse <span className="text-blue-500">Brawler</span>
                </h2>
                <p className="text-blue-100/70 text-[10px] md:text-lg font-medium max-w-[240px] md:max-w-md leading-tight md:leading-relaxed">
                  Combats d'arcade générés par IA. Forgez votre destin dans l'arène ultime.
                </p>
              </div>
            </motion.button>
          </motion.div>

          {/* Card: Chroniques du Multivers */}
          <motion.div variants={itemVariants} className="w-full">
            <motion.button
              whileHover={{ scale: 1.02, y: -8 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectMode('STORY_CONFIG')}
              className="group relative w-full h-[150px] sm:h-[180px] md:h-[480px] rounded-2xl md:rounded-[2.5rem] overflow-hidden border border-amber-500/30 hover:border-amber-400 transition-all duration-500 shadow-2xl focus:outline-none"
            >
              <div className="absolute inset-0 bg-[url('/images/foret_dragon_arena_1778750742162.png')] bg-cover bg-center opacity-30 group-hover:opacity-50 transition-all duration-700 scale-110 group-hover:scale-100" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              
              <div className="absolute inset-0 p-4 md:p-12 flex flex-col items-start justify-end text-left">
                <div className="p-2 md:p-4 rounded-lg md:rounded-xl bg-amber-500/10 border border-amber-500/20 mb-2 md:mb-8 group-hover:bg-amber-500/20 group-hover:scale-110 transition-all">
                  <BookOpen size={18} className="text-amber-400 md:w-10 md:h-10 text-glow-amber" />
                </div>
                <h2 className="text-xl md:text-5xl font-black text-white uppercase italic tracking-tight mb-1 md:mb-4 group-hover:translate-x-2 transition-transform">
                  Chroniques <span className="text-amber-500">du Multivers</span>
                </h2>
                <p className="text-amber-100/70 text-[10px] md:text-lg font-medium max-w-[240px] md:max-w-md leading-tight md:leading-relaxed">
                  Livre interactif et Visual Novel. Chaque choix modifie la réalité.
                </p>
              </div>
            </motion.button>
          </motion.div>
        </div>

        {/* Footer Actions */}
        <motion.div variants={itemVariants} className="flex flex-col items-center gap-4 mt-2 w-full px-4 mb-8 md:mb-0">
          <button
            onClick={() => onSelectMode('STORY_LIBRARY')}
            className="group flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl glass-card text-amber-400 hover:text-amber-300 font-bold uppercase tracking-widest text-[10px] md:text-sm transition-all hover:scale-105 active:scale-95 border-amber-500/20 hover:border-amber-500/50"
          >
            <BookOpen size={16} className="group-hover:rotate-12 transition-transform" />
            <span>Bibliothèque</span>
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse ml-1" />
          </button>

          <button
            onClick={onOpenParentalControl}
            className={`flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 rounded-full border transition-all duration-300 backdrop-blur-md group ${
              tier >= 3 
                ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50' 
                : tier >= 1 
                ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50' 
                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            {tier >= 3 ? (
              <AlertTriangle size={14} className="text-red-500 animate-pulse" />
            ) : tier >= 1 ? (
              <Settings2 size={14} className="text-blue-400" />
            ) : (
              <Lock size={14} className="text-gray-400" />
            )}
            <span className={`text-[8px] md:text-xs font-black uppercase tracking-[0.2em] ${
              tier >= 3 ? 'text-red-400' : tier >= 1 ? 'text-blue-300' : 'text-gray-400'
            }`}>
              Mode {meta.name}
            </span>
            <span className="text-sm md:text-lg">{meta.icon}</span>
          </button>
        </motion.div>
      </motion.div>

      {/* Decorative Scanlines */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[100] scanlines" />
    </div>
  );
}