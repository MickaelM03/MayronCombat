import { NARRATIVE_MODE_META, NarrativeMode } from '../lib/battles/prompts';

interface Props {
  current: NarrativeMode;
  onChange: (mode: NarrativeMode) => void;
}

export default function NarrativeModeSelector({ current, onChange }: Props) {
  const modes = Object.entries(NARRATIVE_MODE_META) as [string, typeof NARRATIVE_MODE_META[1]][];

  return (
    <div className="mt-4">
      <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-2">
        Mode Narratif
      </label>
      <div className="grid grid-cols-3 gap-2">
        {modes.map(([key, meta]) => {
          const mode = Number(key) as NarrativeMode;
          const isActive = current === mode;
          return (
            <button
              key={mode}
              onClick={() => onChange(mode)}
              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                isActive
                  ? `bg-gradient-to-br ${meta.color} border-white/30 text-white shadow-lg scale-105`
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
              }`}
            >
              <span className="text-xl">{meta.icon}</span>
              <span className="text-[9px] leading-tight text-center">{meta.name}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[9px] text-gray-600 mt-2 text-center">
        Modes 2–6 nécessitent le code parental
      </p>
    </div>
  );
}
