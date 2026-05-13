"""
generate_voice_samples.py
Génère les échantillons vocaux de FALLBACK pour tous les personnages MayronCombat.
Utilise macOS `say` (voix fr_FR intégrées) + afconvert.
Pitch-shift via interpolation linéaire (pas de phase vocoder = pas d'écho).

IMPORTANT : Ces samples utilisent des voix TTS macOS synthétiques.
Pour de vraies voix de personnages (Homer, Rick, Shrek...) :
  → Remplacer scripts/voice_samples/{charId}.wav par un vrai extrait audio VF
  → 10-15 secondes, parole claire, sans musique/bruit de fond, 16-24kHz
  → Sources : YouTube (extraire avec yt-dlp), BluRay, etc.
  → Les samples réels servent aussi de référence pour XTTS v2 (clonage vocal)

Usage:
  scripts/venv/bin/python scripts/generate_voice_samples.py
  # ou via npm:
  npm run voices
"""

import subprocess
import sys
import os
import tempfile
import shutil
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
OUT_DIR = SCRIPT_DIR / "voice_samples"
OUT_DIR.mkdir(exist_ok=True)

try:
    import numpy as np
    import soundfile as sf
except ImportError:
    print("Dépendances manquantes. Lance : scripts/venv/bin/pip install soundfile numpy")
    sys.exit(1)


def pitch_shift_resample(y: np.ndarray, semitones: float) -> np.ndarray:
    """Pitch shift via linear resampling — no phase vocoder, no echo artifacts.
    Changes pitch and duration proportionally (like changing vinyl speed)."""
    if semitones == 0:
        return y
    ratio = 2.0 ** (semitones / 12.0)
    old_len = len(y)
    new_len = max(1, int(old_len / ratio))
    new_indices = np.linspace(0, old_len - 1, new_len)
    return np.interp(new_indices, np.arange(old_len), y).astype(np.float32)

# ── Voix macOS disponibles (fr_FR) ───────────────────────────────────────────
# Thomas   - homme, neutre, standard
# Jacques  - homme, grave, lent
# Grandpa (Français (France)) - homme, très grave, lent
# Eddy (Français (France))    - homme, jeune, énergique
# Rocko (Français (France))   - homme, mature, dynamique
# Flo (Français (France))     - femme, jeune, dynamique
# Sandy (Français (France))   - femme, neutre, claire
# Shelley (Français (France)) - femme, douce, posée
# Grandma (Français (France)) - femme, mature, grave

# ── Définition des personnages ────────────────────────────────────────────────
# (id, voix_macos, rate_wpm, pitch_semitones, phrase)
CHARACTERS = [
    # ── Simpsons ──────────────────────────────────────────────────────────────
    ("homer",
     "Thomas", 72, -3,
     "D'oh ! Je suis Homer Simpson ! Mmmm les donuts... et la bière Duff... et le canapé... "
     "Eh mais qu'est-ce que je faisais déjà ? Peu importe, marge m'a dit de pas toucher à ça."),

    ("bart",
     "Eddy (Français (France))", 148, +5,
     "Ay caramba ! Je suis Bart Simpson et je suis le pire cauchemar de ce bahut ! "
     "Mange les shorts, l'arbitre ! T'es nul, nuuul ! Je vais gagner ce combat les doigts dans le nez !"),

    # ── Cartoon ───────────────────────────────────────────────────────────────
    ("adele",
     "Flo (Français (France))", 118, +4,
     "Oh comme c'est mignon... hé hé hé... tu crois vraiment que tu peux me battre ? "
     "C'est adorable. Je vais te faire regretter d'être né. Hé hé hé hé hé."),

    # ── Minecraft ─────────────────────────────────────────────────────────────
    ("steve",
     "Jacques", 108, 0,
     "Je dois miner. J'ai besoin de bois. Et de pierre. Et d'obsidienne. "
     "Le Nether peut attendre. D'abord je construis une maison. Une très très grande maison."),

    # ── GTA ───────────────────────────────────────────────────────────────────
    ("franklin",
     "Rocko (Français (France))", 132, -2,
     "Yo mon reuf, ici c'est mon territoire, tu bouges pas d'accord ? "
     "J'ai fait des trucs que t'imagines même pas. Alors t'as intérêt à te calmer."),

    # ── Famille ───────────────────────────────────────────────────────────────
    ("papa",
     "Grandpa (Français (France))", 83, -1,
     "Écoute bien mon grand, je vais te donner un conseil de père. "
     "Dans la vie, il faut du courage et de la persévérance. C'est comme ça qu'on réussit."),

    ("maman",
     "Grandma (Français (France))", 88, +1,
     "Combien de fois je t'ai dit de ranger ta chambre ? Et te laver les mains avant de manger ! "
     "Et tu as fait tes devoirs au moins ? Non ? Alors tu n'as pas la télé ce soir."),

    ("clara",
     "Sandy (Français (France))", 122, +4,
     "Genre trop pas, c'est genre abusé quoi, sérieux. Il m'a pas texté depuis deux heures. "
     "C'est la catastrophe. Ma vie est ruinée. Quelqu'un peut me dire ce qui se passe ?"),

    ("mayron",
     "Eddy (Français (France))", 125, +1,
     "Ouais bah euh... c'est cool quoi, enfin je sais pas. C'est pas mal. "
     "Enfin si tu veux. J'ai rien dit. Bref. On y va ou quoi ?"),

    # ── Animaux ───────────────────────────────────────────────────────────────
    ("chat",
     "Thomas", 100, +8,
     "Miaou ! Miaou miaou miaou ! Pschhhh ! Grrrr ! Miaou ! "
     "Je fais ce que je veux. Je suis un chat. Dégagez de mon canapé."),

    # ── Banlieue ──────────────────────────────────────────────────────────────
    ("voisin",
     "Grandpa (Français (France))", 78, -3,
     "Pff... De mon temps c'était mieux, maintenant c'est n'importe quoi. "
     "Vous faites trop de bruit ! Il est vingt heures passées ! Je vais appeler la mairie !"),

    ("livreur",
     "Eddy (Français (France))", 165, 0,
     "Vite vite vite ! J'ai une commande pour vous ! Le client attend ! "
     "Signez là s'il vous plaît ! Non non j'ai pas le temps ! Suivant !"),

    # ── Réseaux ───────────────────────────────────────────────────────────────
    ("influenceuse",
     "Flo (Français (France))", 132, +5,
     "Oh mon Dieu ! C'est littéralement la PIRE chose qui me soit jamais arrivée ! "
     "Je suis dévastée. Totalement dévastée. Abonnez-vous pour la suite du drama !"),

    # ── Capitalisme ───────────────────────────────────────────────────────────
    ("banquier",
     "Rocko (Français (France))", 78, -5,
     "Silence. J'ai dit silence. Vous allez m'obéir, c'est parfaitement clair ? "
     "Votre dossier de prêt est refusé. Passez une bonne journée."),

    # ── Famille (Tonton) ──────────────────────────────────────────────────────
    ("tonton",
     "Grandpa (Français (France))", 68, -2,
     "Hic ! Attends... tu disais quoi ? Ah oui ! Encore un verre s'il te plaît ! "
     "Non non je suis pas bourré. Je suis juste... joyeux. Tchin tchin !"),

    # ── Sci-Fi ────────────────────────────────────────────────────────────────
    ("rick",
     "Thomas", 118, -4,
     "Écoute Morty, je vais t'expliquer quelque chose. Vous êtes tous des imbéciles. "
     "Ma formule est parfaite. Le portail est calibré. Et j'ai besoin d'un Szmithlick maintenant !"),

    ("morty",
     "Eddy (Français (France))", 143, +3,
     "Oh j-je-jeez ! C'est pas bon du tout ça Rick ! On va mourir ! "
     "Pourquoi t'écoutes jamais ? Oh non non non ! Aw geez man !"),

    # ── Anime ─────────────────────────────────────────────────────────────────
    ("goku",
     "Rocko (Français (France))", 125, -3,
     "KAMEHAMEHAAA ! Je vais dépasser mes propres limites encore une fois ! "
     "Je suis Son Goku et je suis là pour protéger la Terre ! HAAAAA !"),

    # ── Pokémon ───────────────────────────────────────────────────────────────
    ("pikachu",
     "Thomas", 155, +9,
     "Pika pika ! Pikaaaa ! Pi-ka-CHU ! Pika pika pika ! "
     "Pikaaa ! Chu chu chu ! Pikachu pikachu ! Pika pika !"),

    # ── Action ────────────────────────────────────────────────────────────────
    ("john_wick",
     "Thomas", 65, -6,
     "Je suis de retour. Tu savais ce que tu faisais. "
     "Tu devrais partir maintenant. Je te le conseille fortement."),

    # ── Fantasy ───────────────────────────────────────────────────────────────
    ("shrek",
     "Grandpa (Français (France))", 88, -8,
     "Dégage de mon marais ! Les ogres c'est comme les oignons, on a des couches ! "
     "Personne veut d'un ogre pour ami. Tout le monde me chasse. C'est pas juste !"),

    # ── Adventure ─────────────────────────────────────────────────────────────
    ("lara",
     "Sandy (Français (France))", 115, +1,
     "La prochaine tombe est par ici. Restez en alerte. "
     "Je sens un piège. Suivez-moi et ne touchez à rien sans mon signal."),

    # ── Drama ─────────────────────────────────────────────────────────────────
    ("walter",
     "Thomas", 78, -5,
     "Tu sais qui je suis vraiment ? Je suis celui qui frappe à la porte. "
     "Dis bien mon nom. Je ne suis pas en danger. Je suis le danger."),

    # ── Marvel ────────────────────────────────────────────────────────────────
    ("spiderman",
     "Eddy (Français (France))", 138, +3,
     "Mon sens d'araignée s'emballe ! On va sauver la ville ensemble ! "
     "C'est parti ! Avec un grand pouvoir vient une grande responsabilité !"),

    # ── Gothic ────────────────────────────────────────────────────────────────
    ("mercredi",
     "Shelley (Français (France))", 68, 0,
     "Je suis ici. Je ne ressens rien. C'est parfaitement normal pour moi. "
     "La mort ne me fait pas peur. C'est la vie des autres qui me lasse."),

    # ── TV ────────────────────────────────────────────────────────────────────
    ("denis_survivor",
     "Rocko (Français (France))", 88, -1,
     "Vous allez obéir. Je suis le chef de cette tribu et ce que je dis est loi. "
     "Qui vote contre moi ce soir ? Personne ? Parfait. Je reste le chef."),

    # ── Éducation ─────────────────────────────────────────────────────────────
    ("mme_monique",
     "Grandma (Français (France))", 82, +2,
     "Je vous ai dit cent fois de faire vos devoirs ! Et de ne pas parler en classe ! "
     "Monsieur Dupont, rangez ce téléphone immédiatement ou c'est un zéro !"),

    # ── Anime 2 ───────────────────────────────────────────────────────────────
    ("luffy_gear5",
     "Eddy (Français (France))", 148, +4,
     "Je vais être le roi des pirates ! Gomu Gomu no mi ! "
     "Je suis libre ! Rien ne peut m'arrêter ! HAHAHA ! Je vais tout casser !"),

    # ── Politique ─────────────────────────────────────────────────────────────
    ("gilet_jaune",
     "Grandpa (Français (France))", 92, -3,
     "On veut la justice ! On en a marre ! À bas les privilèges ! "
     "Le gouvernement nous entend pas ! On va bloquer le rond-point jusqu'à la victoire !"),

    # ── Musique ───────────────────────────────────────────────────────────────
    ("jul_alien",
     "Rocko (Français (France))", 122, -1,
     "Trop frère, c'est oklm ici, on est en mode street. "
     "J'viens de Marseille et je porte les couleurs. C'est la famille avant tout."),

    # ── Cuisine ───────────────────────────────────────────────────────────────
    ("rat_gouttiere",
     "Thomas", 132, +7,
     "Je suis un rat mais je cuisine mieux que n'importe quel chef étoilé ! "
     "La gastronomie française n'a aucun secret pour moi. Sentez ce bouillon !"),
]


def generate_sample(char_id: str, voice: str, rate: int, pitch_semitones: int, phrase: str) -> bool:
    output_path = OUT_DIR / f"{char_id}.wav"
    if output_path.exists():
        print(f"  ⏭  {char_id}.wav existe déjà — ignoré (supprimer pour régénérer)")
        return True

    with tempfile.TemporaryDirectory() as tmp:
        aiff_path = os.path.join(tmp, "raw.aiff")
        wav_raw = os.path.join(tmp, "raw.wav")

        # Step 1: macOS say → AIFF
        result = subprocess.run(
            ["say", "-v", voice, "-r", str(rate), "--output-file", aiff_path, phrase],
            capture_output=True,
        )
        if result.returncode != 0:
            print(f"  ✗  {char_id}: say échoué ({voice}) — {result.stderr.decode()}")
            return False

        # Step 2: AIFF → WAV 24kHz via afconvert
        result = subprocess.run(
            ["afconvert", "-f", "WAVE", "-d", "LEI16@24000", aiff_path, wav_raw],
            capture_output=True,
        )
        if result.returncode != 0:
            print(f"  ✗  {char_id}: afconvert échoué — {result.stderr.decode()}")
            return False

        # Step 3: load WAV then apply pitch shift if needed
        y, sr = sf.read(wav_raw, dtype='float32')
        if y.ndim > 1:
            y = y.mean(axis=1)  # mono

        if pitch_semitones != 0:
            y = pitch_shift_resample(y, pitch_semitones)

        sf.write(str(output_path), y, sr, subtype="PCM_16")

    duration = len(y) / sr
    print(f"  ✓  {char_id}.wav — voix={voice!r} rate={rate} pitch={pitch_semitones:+d}st — {duration:.1f}s")
    return True


def main():
    print(f"\n🎙  Génération des échantillons vocaux → {OUT_DIR}\n")
    ok = 0
    fail = 0
    skip = 0

    for char_id, voice, rate, pitch, phrase in CHARACTERS:
        out = OUT_DIR / f"{char_id}.wav"
        if out.exists():
            skip += 1
            print(f"  ⏭  {char_id}.wav déjà présent")
            continue
        if generate_sample(char_id, voice, rate, pitch, phrase):
            ok += 1
        else:
            fail += 1

    print(f"\n{'─'*50}")
    print(f"  ✓ Générés : {ok}")
    print(f"  ⏭ Ignorés : {skip}")
    if fail:
        print(f"  ✗ Échoués : {fail}")
    print(f"\nLes fichiers sont dans scripts/voice_samples/")
    print("Démarre le serveur XTTS puis lance npm run dev pour utiliser ces voix.\n")


if __name__ == "__main__":
    main()
