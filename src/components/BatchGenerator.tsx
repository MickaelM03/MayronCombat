import { useState } from 'react';
import { Zap, CheckCircle, XCircle, Loader, BookOpen, Swords } from 'lucide-react';

type BatchType = 'battle' | 'story';

interface BattleConfig {
  type: 'battle';
  count: number;
}

interface StoryConfig {
  type: 'story';
  count: number;
  mode: 'linear' | 'interactive';
  chapters: number;
}

type Config = BattleConfig | StoryConfig;

interface Props {
  onGenerateBattles: (count: number) => Promise<{ ok: number; fail: number }>;
  onGenerateStories: (count: number, mode: 'linear' | 'interactive', chapters: number) => Promise<{ ok: number; fail: number }>;
}

type Status = 'idle' | 'running' | 'done';

export default function BatchGenerator({ onGenerateBattles, onGenerateStories }: Props) {
  const [batchType, setBatchType] = useState<BatchType>('battle');
  const [count, setCount] = useState(5);
  const [storyMode, setStoryMode] = useState<'linear' | 'interactive'>('linear');
  const [storyChapters, setStoryChapters] = useState(3);
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<{ ok: number; fail: number } | null>(null);

  const run = async () => {
    setStatus('running');
    setResult(null);
    if (batchType === 'battle') {
      const res = await onGenerateBattles(count);
      setResult(res);
    } else {
      const res = await onGenerateStories(count, storyMode, storyChapters);
      setResult(res);
    }
    setStatus('done');
  };

  const label = batchType === 'battle' ? 'combats' : 'histoires';

  return (
    <div className="mt-4 border-t border-gray-800 pt-4">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
        Pré-génération hors-ligne
      </p>
      <p className="text-[10px] text-gray-600 mb-3">
        {batchType === 'battle'
          ? 'Génère des combats aléatoires pendant que tu es en ligne. Tes enfants pourront les rejouer sans connexion.'
          : 'Génère des histoires aléatoires lues hors-ligne. Parfait pour les trajets sans Internet.'
        }
      </p>

      {/* Type selector */}
      <div className="flex gap-1 mb-3 bg-gray-800 rounded-xl p-1">
        <button
          onClick={() => setBatchType('battle')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            batchType === 'battle'
              ? 'bg-blue-700 text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Swords size={14} /> Combats
        </button>
        <button
          onClick={() => setBatchType('story')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            batchType === 'story'
              ? 'bg-amber-700 text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <BookOpen size={14} /> Histoires
        </button>
      </div>

      {/* Count selector */}
      <div className="flex items-center gap-2 mb-3">
        <label className="text-[10px] text-gray-500">Nombre :</label>
        {[3, 5, 10, 20].map(n => (
          <button
            key={n}
            onClick={() => setCount(n)}
            className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${count === n ? 'bg-purple-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Story-specific options */}
      {batchType === 'story' && (
        <>
          {/* Story mode selector */}
          <div className="flex gap-1 mb-3 bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => setStoryMode('linear')}
              className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                storyMode === 'linear'
                  ? 'bg-amber-700 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              📖 Lecture seule
            </button>
            <button
              onClick={() => setStoryMode('interactive')}
              className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                storyMode === 'interactive'
                  ? 'bg-amber-700 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ❓ Avec questions
            </button>
          </div>

          {/* Chapters selector */}
          <div className="flex items-center gap-2 mb-3">
            <label className="text-[10px] text-gray-500">Chapitres :</label>
            {[
              { value: 3, label: 'Court' },
              { value: 5, label: 'Moyen' },
              { value: 8, label: 'Long' },
            ].map(({ value, label: lbl }) => (
              <button
                key={value}
                onClick={() => setStoryChapters(value)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                  storyChapters === value ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </>
      )}

      <button
        onClick={run}
        disabled={status === 'running'}
        className="w-full mt-3 py-2.5 rounded-xl bg-purple-800 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase text-xs tracking-wider transition-colors flex items-center justify-center gap-2"
      >
        {status === 'running'
          ? <><Loader size={14} className="animate-spin" /> Génération en cours…</>
          : <><Zap size={14} /> Pré-générer {count} {label}</>
        }
      </button>

      {status === 'done' && result && (
        <div className="mt-2 flex gap-3 justify-center text-xs">
          <span className="flex items-center gap-1 text-green-400">
            <CheckCircle size={12} /> {result.ok} réussis
          </span>
          {result.fail > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <XCircle size={12} /> {result.fail} échoués
            </span>
          )}
        </div>
      )}
    </div>
  );
}