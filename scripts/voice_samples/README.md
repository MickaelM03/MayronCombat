# Voice Samples pour XTTS v2

Chaque fichier `.wav` ici correspond à un `characterId` du roster MayronCombat.
XTTS v2 utilise ces échantillons pour cloner la voix du personnage (zero-shot).

## Format requis

| Critère | Valeur idéale |
|---|---|
| Format | WAV (PCM 16-bit) |
| Durée | 6 à 15 secondes |
| Fréquence | 22 050 ou 24 000 Hz |
| Canaux | Mono ou Stéréo |
| Qualité | Sans musique de fond, sans écho, voix claire |

## Nommage des fichiers

Le nom du fichier = `id` du personnage dans CHARACTERS (App.tsx) :

| Fichier | Personnage |
|---|---|
| `homer.wav` | Homer Simpson VF (Philippe Peythieu) |
| `bart.wav` | Bart Simpson VF |
| `rick.wav` | Rick Sanchez VF |
| `morty.wav` | Morty Smith VF |
| `shrek.wav` | Shrek VF |
| `walter.wav` | Walter White VF |
| `john_wick.wav` | John Wick VF |
| `goku.wav` | Son Goku VF |
| `lara.wav` | Lara Croft VF |
| `mercredi.wav` | Mercredi Addams VF |
| `spiderman.wav` | Spider-Man VF |
| `franklin.wav` | Franklin (GTA) VF |
| `papa.wav` | Papa |
| `maman.wav` | Maman |
| `neutral.wav` | Voix neutre (fallback si aucun fichier trouvé) |

Si un fichier est absent pour un personnage, XTTS renvoie 404 et
l'app bascule automatiquement sur **Piper** (offline WASM) sans erreur.

## Comment obtenir les échantillons

### Option A : Extraire depuis YouTube (légal pour usage personnel)
1. Trouver un extrait VF de l'émission sur YouTube (scène de dialogue claire)
2. Télécharger l'audio : `yt-dlp -x --audio-format wav "URL_VIDEO"`
3. Couper 10s propres avec Audacity ou ffmpeg :
   ```
   ffmpeg -i source.wav -ss 00:01:23 -t 10 -ac 1 -ar 24000 homer.wav
   ```

### Option B : Enregistrer ta propre imitation
1. Ouvrir QuickTime → Nouvelle enregistrement audio
2. Imiter la voix 10-15 secondes
3. Exporter en WAV

### Option C : Utiliser un clip de film/série
- Chercher les "voice acting reels" sur YouTube (souvent sans fond sonore)
- Extraire le passage souhaité avec ffmpeg

## Améliorer la qualité

Si la voix clonée ne ressemble pas assez au personnage :
- Essayer un échantillon plus long (15s mieux que 6s)
- Choisir un extrait sans musique ni bruits de fond
- Normaliser le volume : `ffmpeg -i input.wav -filter:a loudnorm output.wav`
- Retirer le bruit de fond : utiliser Audacity (Noise Reduction)
