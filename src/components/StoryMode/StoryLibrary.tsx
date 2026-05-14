import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Book, History as HistoryIcon, Trash2, Play, Calendar, Users, MapPin, ArrowLeft, Search, RefreshCw, Pencil, Edit2
} from 'lucide-react';
import { listStories, SavedStory, updateStory, deleteStory } from '../../lib/story/store';
import { CHARACTERS } from '../../lib/constants';

interface StoryLibraryProps {
  onReplay: (story: SavedStory) => void;
  onBack: () => void;
}

export default function StoryLibrary({ onReplay, onBack }: StoryLibraryProps) {
  const [stories, setStories] = useState<SavedStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    setIsLoading(true);
    const data = await listStories();
    setStories(data);
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette chronique des archives ?')) return;
    await deleteStory(id);
    setStories(stories.filter(s => s.id !== id));
  };

  const startEdit = (story: SavedStory) => {
    setEditingId(story.id);
    setEditTitle(story.title);
  };

  const saveRename = async (story: SavedStory) => {
    if (!editTitle.trim()) return;
    const updated = { ...story, title: editTitle.trim() };
    await updateStory(updated);
    setStories(stories.map(s => s.id === story.id ? updated : s));
    setEditingId(null);
  };

  const filtered = stories.filter(s => 
    s.title.toLowerCase().includes(filter.toLowerCase()) ||
    s.theme.toLowerCase().includes(filter.toLowerCase()) ||
    s.characterIds.some(id => id.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-mesh text-[#e2d1b3] p-4 md:p-8 font-serif overflow-x-hidden">
      {/* Header */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-10 pt-16 md:pt-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-black/40 backdrop-blur-md rounded-2xl border border-amber-900/30 hover:bg-amber-600 transition-all text-amber-500 shadow-xl">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-4xl md:text-6xl font-black italic text-white tracking-tighter" style={{ fontFamily: "'Playfair Display', serif" }}>
              Bibliothèque <span className="text-amber-500">Multivers</span>
            </h1>
            <p className="text-amber-600/70 italic text-sm">Retrouvez toutes vos chroniques passées</p>
          </div>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-900/50" size={20} />
          <input
            type="text"
            placeholder="Rechercher une histoire..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-black/40 backdrop-blur-md border-2 border-amber-900/30 rounded-2xl py-4 pl-12 pr-4 text-amber-100 outline-none focus:border-amber-500 transition-all shadow-xl"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 relative z-10">
          <RefreshCw size={56} className="animate-spin text-amber-500 mb-6" />
          <p className="italic text-amber-600 text-xl animate-pulse">Ouverture des grimoires ancestraux...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="max-w-4xl mx-auto text-center py-24 glass-card rounded-[3rem] border-2 border-dashed border-amber-900/30 relative z-10">
          <Book size={80} className="mx-auto text-amber-900/20 mb-6" />
          <h3 className="text-3xl font-black text-amber-500 uppercase italic mb-4">Archives désertes</h3>
          <p className="text-amber-700/60 italic text-lg">Il est temps d'écrire une nouvelle légende !</p>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10 pb-20">
          {filtered.map((story) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative glass-card rounded-[2.5rem] border border-amber-900/30 overflow-hidden shadow-2xl hover:border-amber-500/50 transition-all flex flex-col"
            >
              {/* Card Image (Arena) */}
              <div className="h-44 relative overflow-hidden">
                <img src={story.arenaImg} className="w-full h-full object-cover opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" alt={story.arenaName} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a140f] via-transparent to-transparent" />
                <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-amber-900/30 text-[10px] uppercase font-black tracking-[0.2em] text-amber-500 shadow-xl">
                  {story.isInteractive ? 'Interactif' : 'Linéaire'}
                </div>
                
                {/* Delete Button - Always visible on mobile */}
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(story.id); }}
                  className="absolute top-4 left-4 p-2 bg-black/60 hover:bg-red-600 backdrop-blur-md text-red-500 hover:text-white rounded-xl border border-red-500/30 transition-all shadow-xl z-20"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {/* Card Content */}
              <div className="p-8 pt-0 flex-grow flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-3">
                  {editingId === story.id ? (
                    <div className="flex-grow flex gap-2">
                      <input 
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => saveRename(story)}
                        onKeyDown={(e) => e.key === 'Enter' && saveRename(story)}
                        className="w-full bg-black/60 border border-amber-500 rounded-lg px-3 py-1 text-white outline-none"
                      />
                    </div>
                  ) : (
                    <h3 className="text-2xl font-black italic text-white line-clamp-1 group-hover:text-amber-400 transition-colors">{story.title}</h3>
                  )}
                  <button 
                    onClick={() => startEdit(story)}
                    className="p-1.5 text-amber-500/60 hover:text-amber-400 transition-colors"
                  >
                    <Pencil size={18} />
                  </button>
                </div>
                
                <p className="text-sm text-amber-600/70 mb-6 line-clamp-2 italic leading-relaxed">"{story.theme}"</p>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="flex items-center gap-2 text-[10px] text-amber-100/40 uppercase font-bold tracking-widest">
                    <Calendar size={14} className="text-amber-700" />
                    {new Date(story.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-amber-100/40 uppercase font-bold tracking-widest">
                    <MapPin size={14} className="text-amber-700" />
                    {story.arenaName.split(' ')[0]}
                  </div>
                </div>

                <button
                  onClick={() => onReplay(story)}
                  className="w-full py-4 bg-amber-600 hover:bg-amber-400 text-black font-black uppercase tracking-[0.2em] rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl italic text-xs mt-auto group/btn"
                >
                  <Play size={18} fill="currentColor" className="group-hover/btn:scale-110 transition-transform" />
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
