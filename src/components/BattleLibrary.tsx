import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Play, Trash2, X, Trophy } from 'lucide-react';
import { listBattles, deleteBattle, SavedBattle } from '../lib/battles/store';
import { NARRATIVE_MODE_META } from '../lib/battles/prompts';

interface Props {
  onReplay: (battle: SavedBattle) => void;
}

export default function BattleLibrary({ onReplay }: Props) {
  const [open, setOpen] = useState(false);
  const [battles, setBattles] = useState<SavedBattle[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setBattles(await listBattles());
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteBattle(id);
    setBattles(prev => prev.filter(b => b.id !== id));
  };

  const fmt = (ts: number) =>
    new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-3 bg-gray-900/80 rounded-full border border-gray-700 text-white hover:bg-purple-700 transition-colors shadow-lg"
        title="Mes combats sauvegardés"
      >
        <BookOpen size={22} className="text-purple-400" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              onClick={e => e.stopPropagation()}
              className="bg-gray-950 border border-gray-800 rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <BookOpen size={20} className="text-purple-400" />
                  <h2 className="sf-title text-lg text-purple-400 uppercase">Mes Combats</h2>
                  <span className="text-xs text-gray-600 ml-1">({battles.length})</span>
                </div>
                <button onClick={() => setOpen(false)} className="p-1 text-gray-600 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              {/* List */}
              <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
                {loading && <p className="text-gray-500 text-sm text-center py-8">Chargement…</p>}
                {!loading && battles.length === 0 && (
                  <div className="text-center py-12">
                    <BookOpen size={40} className="text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Aucun combat sauvegardé.</p>
                    <p className="text-gray-600 text-xs mt-1">Génère un combat pour le retrouver ici.</p>
                  </div>
                )}
                {battles.map(b => {
                  const meta = NARRATIVE_MODE_META[b.narrativeMode] ?? NARRATIVE_MODE_META[1];
                  return (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-2xl p-3 hover:border-purple-700/50 transition-colors group cursor-pointer"
                      onClick={() => { onReplay(b); setOpen(false); }}
                    >
                      {/* Avatars */}
                      <div className="flex -space-x-3 flex-shrink-0">
                        <img src={b.p1Img} alt={b.p1Name} className="w-10 h-10 rounded-full object-cover border-2 border-gray-800" />
                        <img src={b.p2Img} alt={b.p2Name} className="w-10 h-10 rounded-full object-cover border-2 border-gray-800" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-bold truncate">
                          {b.p1Name} <span className="text-gray-500">vs</span> {b.p2Name}
                        </p>
                        <p className="text-gray-500 text-[10px] truncate">{b.arenaName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-gray-600">{fmt(b.createdAt)}</span>
                          <span className="text-[9px]">{meta.icon} {meta.name}</span>
                          {b.winner && (
                            <span className="flex items-center gap-0.5 text-[9px] text-yellow-500">
                              <Trophy size={9} /> {b.winner}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); onReplay(b); setOpen(false); }}
                          className="p-2 rounded-xl bg-purple-800/40 hover:bg-purple-700 text-purple-300 transition-colors"
                          title="Rejouer"
                        >
                          <Play size={14} />
                        </button>
                        <button
                          onClick={e => handleDelete(b.id, e)}
                          className="p-2 rounded-xl hover:bg-red-900/40 text-gray-600 hover:text-red-400 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
