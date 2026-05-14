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
        className="z-10 w-full max-w-6xl flex flex-col items-center gap-8 md:gap-12 py-8 md:py-16"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="text-center px-4 relative group cursor-default">
          <div className="relative inline-block">
            <h1 className="text-4xl sm:text-5xl md:text-8xl font-black text-white uppercase italic tracking-tighter leading-none mb-2 relative z-10 select-none">
              MAYRON<span className="text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]">MULTIVERSE</span>
            </h1>
            {/* Subtle Glitch Shadow */}
            <h1 className="absolute inset-0 text-4xl sm:text-5xl md:text-8xl font-black text-blue-500/30 uppercase italic tracking-tighter leading-none mb-2 z-0 translate-x-1 opacity-0 group-hover:opacity-100 transition-opacity blur-[2px]">
              MAYRON<span className="text-red-500/30">MULTIVERSE</span>
            </h1>
            <div className="absolute -inset-4 bg-white/5 blur-2xl -z-10 opacity-30 group-hover:opacity-50 transition-opacity" />
          </div>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="h-[1px] w-8 md:w-16 bg-gradient-to-r from-transparent to-gray-500" />
            <p className="text-gray-400 text-[10px] md:text-sm tracking-[0.3em] uppercase font-medium">Sélectionnez votre expérience</p>
            <div className="h-[1px] w-8 md:w-16 bg-gradient-to-l from-transparent to-gray-500" />
          </div>
        </motion.div>

        {/* Main Selection Cards */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 px-2 md:px-0">
          
          {/* Card: Multiverse Brawler */}
          <motion.div variants={itemVariants} className="w-full">
            <motion.button
              whileHover={{ scale: 1.02, y: -8 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectMode('BRAWLER')}
              className="group relative w-full h-[180px] sm:h-[220px] md:h-[480px] rounded-2xl md:rounded-[2.5rem] overflow-hidden border border-blue-500/30 hover:border-blue-400 transition-all duration-500 shadow-2xl focus:outline-none"
            >
              {/* Background with parallax effect simulation */}
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070')] bg-cover bg-center opacity-30 group-hover:opacity-50 transition-all duration-700 scale-110 group-hover:scale-100" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="absolute inset-0 p-6 md:p-12 flex flex-col items-start justify-end text-left">
                <div className="p-3 md:p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-4 md:mb-8 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all">
                  <Swords size={24} className="text-blue-400 md:w-10 md:h-10 text-glow-blue" />
                </div>
                <h2 className="text-2xl md:text-5xl font-black text-white uppercase italic tracking-tight mb-2 md:mb-4 group-hover:translate-x-2 transition-transform">
                  Multiverse <span className="text-blue-500">Brawler</span>
                </h2>
                <p className="text-blue-100/70 text-xs md:text-lg font-medium max-w-[260px] md:max-w-md leading-relaxed">
                  Combats d'arcade générés par IA. Forgez votre destin dans l'arène ultime.
                </p>
                
                {/* Visual Indicator */}
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Sparkles className="text-blue-400 animate-pulse" size={20} />
                </div>
              </div>
              
              {/* Animated Border Glow */}
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
            </motion.button>
          </motion.div>

          {/* Card: Chroniques du Multivers */}
          <motion.div variants={itemVariants} className="w-full">
            <motion.button
              whileHover={{ scale: 1.02, y: -8 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectMode('STORY_CONFIG')}
              className="group relative w-full h-[180px] sm:h-[220px] md:h-[480px] rounded-2xl md:rounded-[2.5rem] overflow-hidden border border-amber-500/30 hover:border-amber-400 transition-all duration-500 shadow-2xl focus:outline-none"
            >
              {/* Background */}
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519074063912-ad2fe3f51b3d?q=80&w=1974')] bg-cover bg-center opacity-30 group-hover:opacity-50 transition-all duration-700 scale-110 group-hover:scale-100" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-amber-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="absolute inset-0 p-6 md:p-12 flex flex-col items-start justify-end text-left">
                <div className="p-3 md:p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4 md:mb-8 group-hover:bg-amber-500/20 group-hover:scale-110 transition-all">
                  <BookOpen size={24} className="text-amber-400 md:w-10 md:h-10 text-glow-amber" />
                </div>
                <h2 className="text-2xl md:text-5xl font-black text-white uppercase italic tracking-tight mb-2 md:mb-4 group-hover:translate-x-2 transition-transform">
                  Chroniques <span className="text-amber-500">du Multivers</span>
                </h2>
                <p className="text-amber-100/70 text-xs md:text-lg font-medium max-w-[260px] md:max-w-md leading-relaxed">
                  Livre interactif et Visual Novel. Chaque choix modifie la réalité.
                </p>

                {/* Visual Indicator */}
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Sparkles className="text-amber-400 animate-pulse" size={20} />
                </div>
              </div>
              
              {/* Animated Border Glow */}
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
            </motion.button>
          </motion.div>
        </div>

        {/* Footer Actions */}
        <motion.div variants={itemVariants} className="flex flex-col items-center gap-6 mt-4 w-full px-4">
          <button
            onClick={() => onSelectMode('STORY_LIBRARY')}
            className="group flex items-center gap-3 px-8 py-4 rounded-2xl glass-card text-amber-400 hover:text-amber-300 font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95 border-amber-500/20 hover:border-amber-500/50"
          >
            <BookOpen size={18} className="group-hover:rotate-12 transition-transform" />
            <span>Bibliothèque</span>
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse ml-1" />
          </button>

          <button
            onClick={onOpenParentalControl}
            className={`flex items-center gap-3 px-6 py-3 rounded-full border transition-all duration-300 backdrop-blur-md group ${
              tier >= 3 
                ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50' 
                : tier >= 1 
                ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50' 
                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            {tier >= 3 ? (
              <AlertTriangle size={16} className="text-red-500 animate-pulse" />
            ) : tier >= 1 ? (
              <Settings2 size={16} className="text-blue-400" />
            ) : (
              <Lock size={16} className="text-gray-400" />
            )}
            <span className={`text-[10px] md:text-xs font-black uppercase tracking-[0.2em] ${
              tier >= 3 ? 'text-red-400' : tier >= 1 ? 'text-blue-300' : 'text-gray-400'
            }`}>
              Mode {meta.name}
            </span>
            <span className="text-base md:text-lg">{meta.icon}</span>
          </button>
        </motion.div>
      </motion.div>

      {/* Decorative Scanlines */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[100] scanlines" />
    </div>
  );
}