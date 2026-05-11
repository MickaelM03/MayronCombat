// Enhanced Web Speech API — selects the best available French voice per Gemini voice profile.
// Priority: Premium/Enhanced/Neural system voices > Google/Microsoft neural > any FR voice.

type VoiceProfile = { pitch: number; rate: number };

// Maps Gemini voice names to Web Speech pitch/rate adjustments
const BASE_PROFILES: Record<string, VoiceProfile> = {
  Charon: { pitch: 0.5, rate: 0.8 },
  Fenrir: { pitch: 0.7, rate: 0.9 },
  Puck:   { pitch: 1.3, rate: 1.1 },
  Kore:   { pitch: 1.5, rate: 1.0 },
  Aoede:  { pitch: 1.7, rate: 0.85 },
};

const STYLE_OVERRIDES: Record<string, VoiceProfile> = {
  idiot:             { pitch: 0.6,  rate: 0.75 },
  enfant:            { pitch: 1.8,  rate: 1.3  },
  enfant_diabolique: { pitch: 1.6,  rate: 1.15 },
  gamer:             { pitch: 1.2,  rate: 1.05 },
  gangster:          { pitch: 0.7,  rate: 0.95 },
  papa:              { pitch: 0.8,  rate: 0.9  },
  maman:             { pitch: 1.4,  rate: 0.95 },
  ado_fille:         { pitch: 1.6,  rate: 1.15 },
  ado_garcon:        { pitch: 1.1,  rate: 1.2  },
  animal:            { pitch: 2.0,  rate: 1.5  },
  raleur:            { pitch: 0.6,  rate: 0.7  },
  presse:            { pitch: 1.3,  rate: 1.4  },
  drama_queen:       { pitch: 1.7,  rate: 1.2  },
  autoritaire:       { pitch: 0.5,  rate: 0.8  },
  ivre:              { pitch: 0.7,  rate: 0.65 },
  scientifique_fou:  { pitch: 0.55, rate: 1.1  },
  nerveux:           { pitch: 1.5,  rate: 1.35 },
  guerrier:          { pitch: 0.6,  rate: 1.0  },
  creature:          { pitch: 2.0,  rate: 1.6  },
  froid:             { pitch: 0.4,  rate: 0.7  },
  ogre:              { pitch: 0.3,  rate: 0.75 },
  aventuriere:       { pitch: 1.3,  rate: 1.0  },
  menacant:          { pitch: 0.5,  rate: 0.75 },
  hero_jeune:        { pitch: 1.4,  rate: 1.25 },
  monotone:          { pitch: 1.0,  rate: 0.7  },
};

// Score a SpeechSynthesisVoice for quality. Higher = better.
function scoreVoice(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase();
  if (n.includes('premium'))  return 100;
  if (n.includes('enhanced')) return 90;
  if (n.includes('neural'))   return 85;
  if (n.includes('google'))   return 70;
  if (n.includes('microsoft') || n.includes('edge')) return 65;
  if (!v.localService)        return 50; // online = usually better
  return 10;
}

// Whether this voice sounds more masculine or feminine based on name
function isFeminine(v: SpeechSynthesisVoice): boolean {
  const femaleNames = ['audrey', 'amelie', 'marie', 'claire', 'céline', 'celine', 'virginie',
    'alice', 'camille', 'florence', 'manon', 'sarah', 'sophie', 'julie', 'female', 'femme', 'f '];
  const n = v.name.toLowerCase();
  return femaleNames.some(f => n.includes(f));
}

// Cache best-per-profile result after first voice list load
const voiceCache: Map<string, SpeechSynthesisVoice | null> = new Map();

function pickBestFrenchVoice(wantFeminine: boolean): SpeechSynthesisVoice | null {
  const cacheKey = wantFeminine ? 'f' : 'm';
  if (voiceCache.has(cacheKey)) return voiceCache.get(cacheKey)!;

  const all = window.speechSynthesis.getVoices();
  const fr  = all.filter(v => v.lang.startsWith('fr'));
  if (!fr.length) {
    voiceCache.set(cacheKey, null);
    return null;
  }

  // Separate by gender heuristic, then pick highest scored
  const typed = wantFeminine
    ? fr.filter(isFeminine)
    : fr.filter(v => !isFeminine(v));

  const pool = typed.length ? typed : fr;
  pool.sort((a, b) => scoreVoice(b) - scoreVoice(a));

  const best = pool[0];
  voiceCache.set(cacheKey, best);
  return best;
}

// Invalidate cache if voices reload (e.g. Chrome loads them async)
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => voiceCache.clear();
}

const FEMININE_PROFILES = new Set(['Kore', 'Aoede']);

export function playWebSpeechEnhanced(
  text: string,
  voiceName: string,
  voiceStyle: string = '',
): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) { setTimeout(resolve, 1500); return; }
    window.speechSynthesis.cancel();

    const cleanText = text.replace(/^[^:]+:\s*/, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);

    const styleProfile = voiceStyle ? STYLE_OVERRIDES[voiceStyle] : null;
    const baseProfile  = BASE_PROFILES[voiceName] ?? BASE_PROFILES['Fenrir'];

    utterance.lang   = 'fr-FR';
    utterance.pitch  = styleProfile ? styleProfile.pitch : baseProfile.pitch;
    utterance.rate   = styleProfile ? styleProfile.rate  : baseProfile.rate;
    utterance.volume = 1.0;

    const wantFeminine = FEMININE_PROFILES.has(voiceName);
    const best = pickBestFrenchVoice(wantFeminine);
    if (best) utterance.voice = best;

    utterance.onend   = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}
