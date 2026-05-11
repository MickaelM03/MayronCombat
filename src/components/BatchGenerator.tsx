import { useState } from 'react';
import { Zap, CheckCircle, XCircle, Loader } from 'lucide-react';

interface Props {
  onGenerate: (count: number) => Promise<{ ok: number; fail: number }>;
}

type Status = 'idle' | 'running' | 'done';

export default function BatchGenerator({ onGenerate }: Props) {
  const [count, setCount] = useState(5);
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<{ ok: number; fail: number } | null>(null);

  const run = async () => {
    setStatus('running');
    setResult(null);
    const res = await onGenerate(count);
    setResult(res);
    setStatus('done');
  };

  return (
    <div className="mt-4 border-t border-gray-800 pt-4">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
        Pré-génération hors-ligne
      </p>
      <p className="text-[10px] text-gray-600 mb-3">
        Génère des combats aléatoires pendant que tu es en ligne. Tes enfants pourront les rejouer sans connexion.
      </p>

      <div className="flex items-center gap-2">
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

      <button
        onClick={run}
        disabled={status === 'running'}
        className="w-full mt-3 py-2.5 rounded-xl bg-purple-800 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase text-xs tracking-wider transition-colors flex items-center justify-center gap-2"
      >
        {status === 'running'
          ? <><Loader size={14} className="animate-spin" /> Génération en cours…</>
          : <><Zap size={14} /> Pré-générer {count} combats</>
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
