import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Book, History as HistoryIcon, Trash2, Play, Calendar, Users, MapPin, ArrowLeft, Search, RefreshCw
} from 'lucide-react';
import { listStories, SavedStory, updateStory } from '../../lib/story/store';
import { CHARACTERS } from '../../lib/constants';

interface StoryLibraryProps {
  onReplay: (story: SavedStory) => void;
  onBack: () => void;
}

export default function StoryLibrary({ onReplay, onBack }: StoryLibraryProps) {
  const [stories, setStories] = useState<SavedStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    setIsLoading(true);
    const data = await listStories();
    setStories(data);
    setIsLoading(false);
  };

  const filtered = stories.filter(s => 
    s.title.toLowerCase().includes(filter.toLowerCase()) ||
    s.theme.toLowerCase().includes(filter.toLowerCase()) ||
    s.characterIds.some(id => id.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#1a140f] text-[#e2d1b3] p-4 md:p-8 font-serif">
      {/* Header */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-amber-900/30 rounded-full transition-colors text-amber-500">
            <ArrowLeft size={32} />
          </button>
          <div>
            <h1 className="text-4xl md:text-5xl font-bold italic" style={{ fontFamily: "'Playfair Display', serif" }}>
              Bibliothèque du Multivers
            </h1>
            <p className="text-amber-600/70 italic">Retrouvez toutes vos chroniques passées</p>
          </div>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-900/50" size={18} />
          <input
            type="text"
            placeholder="Rechercher une histoire..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-black/40 border-2 border-amber-900/30 rounded-xl py-3 pl-10 pr-4 text-amber-100 outline-none focus:border-amber-500 transition-colors"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw size={48} className="animate-spin text-amber-600 mb-4" />
          <p className="italic text-amber-700">Ouverture des grimoires...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-black/20 rounded-3xl border-2 border-dashed border-amber-900/30">
          <Book size={64} className="mx-auto text-amber-900/30 mb-4" />
          <h3 className="text-2xl font-bold mb-2">Aucune chronique trouvée</h3>
          <p className="text-amber-700 italic">Il est temps d'écrire une nouvelle aventure !</p>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((story) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="group relative bg-[#2d2419] rounded-2xl border border-amber-900/50 overflow-hidden shadow-xl hover:border-amber-500 transition-all"
            >
              {/* Card Image (Arena) */}
              <div className="h-40 relative">
                <img src={story.arenaImg} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt={story.arenaName} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2d2419] to-transparent" />
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-amber-900/30 text-[10px] uppercase font-bold tracking-widest">
                  {story.isInteractive ? 'Interactif' : 'Linéaire'}
                </div>
              </div>

              {/* Card Content */}
              <div className="p-6 pt-0">
                <h3 className="text-2xl font-bold italic mb-2 line-clamp-1">{story.title}</h3>
                <p className="text-xs text-amber-600/70 mb-4 line-clamp-2 italic">"{story.theme}"</p>
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-[11px] text-amber-100/60">
                    <Calendar size={12} className="text-amber-600" />
                    {new Date(story.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-amber-100/60">
                    <Users size={12} className="text-amber-600" />
                    {story.characterIds.length} personnages
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-amber-100/60">
                    <MapPin size={12} className="text-amber-600" />
                    {story.arenaName}
                  </div>
                </div>

                <button
                  onClick={() => onReplay(story)}
                  className="w-full py-3 bg-amber-800 text-black font-black uppercase tracking-widest rounded-xl hover:bg-amber-500 transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  <Play size={18} fill="currentColor" />
                  Réécouter
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
