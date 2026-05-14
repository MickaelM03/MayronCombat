import React from 'react';
import { motion } from 'motion/react';
import { Swords, BookOpen, Lock, AlertTriangle, Settings2 } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-black w-full flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 opacity-30">
        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-blue-900 to-transparent mix-blend-screen" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-amber-900 to-transparent mix-blend-screen" />
      </div>

      <div className="z-10 text-center mb-16">
        <h1 className="text-5xl md:text-7xl font-black text-white uppercase italic tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
          MAYRON<span className="text-red-500">MULTIVERSE</span>
        </h1>
        <p className="text-gray-400 mt-4 text-xl tracking-widest">Sélectionnez votre expérience</p>
      </div>

      <div className="z-10 flex flex-col md:flex-row gap-8 md:gap-16 w-full max-w-6xl px-4">
        
        {/* Card: Intimate Multiverse Brawler */}
        <motion.button
          whileHover={{ scale: 1.05, y: -10 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelectMode('BRAWLER')}
          className="group relative flex-1 h-[400px] md:h-[500px] rounded-3xl overflow-hidden border-4 border-blue-900 hover:border-blue-400 transition-colors shadow-[0_0_30px_rgba(30,58,138,0.5)] hover:shadow-[0_0_50px_rgba(96,165,250,0.8)] focus:outline-none"
        >
          {/* Card BG Image (mockup with gradient) */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800')] bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity grayscale group-hover:grayscale-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          
          <div className="absolute inset-0 p-8 flex flex-col items-center justify-end text-center">
            <Swords size={64} className="text-blue-500 mb-6 group-hover:text-blue-300 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
            <h2 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-wider mb-4">
              Multiverse Brawler
            </h2>
            <p className="text-blue-200 text-lg font-medium opacity-80 group-hover:opacity-100 transition-opacity">
              Combats d'arcade générés par IA. Règle tes comptes dans l'arène.
            </p>
          </div>
        </motion.button>

        {/* Card: Chroniques du Multivers */}
        <motion.button
          whileHover={{ scale: 1.05, y: -10 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelectMode('STORY_CONFIG')}
          className="group relative flex-1 h-[400px] md:h-[500px] rounded-3xl overflow-hidden border-4 border-amber-900 hover:border-amber-400 transition-colors shadow-[0_0_30px_rgba(120,53,15,0.5)] hover:shadow-[0_0_50px_rgba(251,191,36,0.8)] focus:outline-none"
        >
          {/* Card BG Image */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1455390582262-044cdead27d8?w=800')] bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity grayscale group-hover:grayscale-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          
          <div className="absolute inset-0 p-8 flex flex-col items-center justify-end text-center">
            <BookOpen size={64} className="text-amber-500 mb-6 group-hover:text-amber-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
            <h2 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-wider mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Chroniques du Multivers
            </h2>
            <p className="text-amber-200 text-lg font-medium opacity-80 group-hover:opacity-100 transition-opacity">
              Livre interactif et Visual Novel. Écrivez votre propre légende.
            </p>
          </div>
        </motion.button>

      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={() => onSelectMode('STORY_LIBRARY')}
        className="mt-12 text-amber-500 hover:text-amber-300 font-bold uppercase tracking-widest flex items-center gap-2 border-b border-amber-900/50 pb-1 group"
      >
        <BookOpen size={18} className="group-hover:animate-bounce" />
        Consulter la Bibliothèque des Chroniques
      </motion.button>

      {/* Parental Control Button — bottom center */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={onOpenParentalControl}
        className="mt-8 flex items-center gap-2 px-4 py-2 rounded-full border border-gray-700 bg-gray-900/60 backdrop-blur-sm hover:bg-gray-800 hover:border-gray-500 transition-all group"
        title={`Contrôle Parental — Mode actuel : ${meta.icon} ${meta.name}`}
      >
        {tier >= 3 ? (
          <AlertTriangle size={16} className="text-red-500 animate-pulse" />
        ) : tier >= 1 ? (
          <Settings2 size={16} className="text-blue-400" />
        ) : (
          <Lock size={16} className="text-gray-500" />
        )}
        <span className={`text-xs font-bold uppercase tracking-wider ${
          tier >= 3 ? 'text-red-400' : tier >= 1 ? 'text-blue-300' : 'text-gray-400'
        }`}>
          {meta.icon} {meta.name}
        </span>
      </motion.button>
    </div>
  );
}