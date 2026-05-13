# Notice complète — Voix de personnages avec XTTS v2

## Qu'est-ce que c'est ?

XTTS v2 (Coqui TTS) est un moteur de **clonage vocal zero-shot** : il génère de l'audio dans la voix d'un personnage à partir d'un court extrait audio de référence (6–15 secondes). Entièrement gratuit, entièrement offline, sans aucune API externe.

Il s'intègre dans MayronCombat comme **3e niveau** dans la chaîne TTS :

```
1. Gemini TTS      → si clé API disponible (meilleure qualité)
2. XTTS v2 local   → si serveur Python démarré + sample .wav présent ← ICI
3. Piper WASM      → fallback offline automatique (voix génériques)
4. Web Speech API  → dernier recours navigateur
```

Si le serveur Python n'est pas démarré, l'app bascule silencieusement sur Piper — aucune erreur, aucune config à changer.

---

## Configuration validée

| Élément | Valeur |
|---|---|
| OS | macOS (Intel) |
| GPU | AMD Radeon Pro 580X 8 GB |
| Python | **3.11** (obligatoire — TTS 0.22.0 exige Python 3.9–3.11) |
| Device | **CPU uniquement** — MPS (Metal) ne supporte pas ComplexFloat/STFT utilisé par XTTS v2 |
| PyTorch | 2.2.2 |
| TTS | 0.22.0 |
| transformers | `>=4.33.0,<4.50.0` — 4.50+ casse GenerationMixin dans XTTS v2 |
| Modèle | XTTS v2 multilingual (~1.9 Go, mis en cache automatiquement) |

---

## Installation (une seule fois)

### Étape 1 — Créer l'environnement Python 3.11

```bash
cd /Volumes/sauv/VPS/MayronCombat/scripts

# Vérifier que python3.11 est disponible
python3.11 --version   # doit afficher Python 3.11.x

# Créer le venv
python3.11 -m venv venv
```

### Étape 2 — Installer numba en premier (wheel précompilé requis)

```bash
venv/bin/pip install numba==0.60.0 --only-binary=:all:
```

> **Pourquoi séparé ?** `numba` dépend de `llvmlite` qui nécessite LLVM pour compiler depuis les sources. En forçant le wheel précompilé (`--only-binary`), on évite l'installation de LLVM.

### Étape 3 — Installer toutes les dépendances

```bash
venv/bin/pip install -r requirements.txt
```

Cette étape télécharge ~500 Mo de packages (torch inclus).

### Étape 4 — Télécharger le modèle XTTS v2 (~1.9 Go)

```bash
COQUI_TOS_AGREED=1 venv/bin/python -c "
from TTS.api import TTS
TTS('tts_models/multilingual/multi-dataset/xtts_v2')
print('Modèle téléchargé.')
"
```

Le modèle est mis en cache dans `~/Library/Application Support/tts/` — il ne sera jamais retéléchargé.

### Étape 5 — Générer les échantillons vocaux (31 personnages)

```bash
cd /Volumes/sauv/VPS/MayronCombat
npm run voices
```

Cette commande génère automatiquement tous les fichiers `.wav` dans `scripts/voice_samples/` en utilisant les voix françaises intégrées de macOS (`say`), avec un pitch-shift adapté à chaque personnage via librosa.

---

## Utilisation quotidienne

### Démarrer tous les serveurs d'un coup

```bash
cd /Volumes/sauv/VPS/MayronCombat
npm run dev
```

Cette commande démarre **3 serveurs simultanément** :

| Serveur | Port | Rôle |
|---|---|---|
| Vite (frontend) | `3060` | Interface React |
| Express (API) | `3061` | Gestion des batailles, proxy XTTS |
| XTTS v2 (Python) | `5500` | Synthèse vocale |

Log attendu au démarrage :
```
[xtts] Loading XTTS v2 model (~1.9 GB, downloaded once)...
[xtts] XTTS v2 loaded in 24.3s on cpu
[xtts] Starting XTTS server on http://0.0.0.0:5500
```

### Arrêter tous les serveurs

```bash
cd /Volumes/sauv/VPS/MayronCombat
npm run stop
```

### Démarrer sans XTTS (si modèle pas installé)

```bash
npm run dev:no-xtts
```

Démarre uniquement Vite (3060) + Express (3061). L'app utilise Piper en fallback.

---

## Échantillons vocaux des 31 personnages

Tous les échantillons sont **générés automatiquement** via `npm run voices`. Ils utilisent les voix françaises natives de macOS avec pitch-shift :

| id | Personnage | Voix macOS | Pitch |
|---|---|---|---|
| `homer` | Homer Simpson | Thomas | -3 st |
| `bart` | Bart Simpson | Eddy (fr_FR) | +5 st |
| `adele` | Mortelle Adèle | Flo (fr_FR) | +4 st |
| `steve` | Steve (Minecraft) | Jacques | 0 st |
| `franklin` | Franklin (GTA) | Rocko (fr_FR) | -2 st |
| `papa` | Papa | Grandpa (fr_FR) | -1 st |
| `maman` | Maman | Grandma (fr_FR) | +1 st |
| `clara` | Clara (ado) | Sandy (fr_FR) | +4 st |
| `mayron` | Mayron | Eddy (fr_FR) | +1 st |
| `chat` | Chat | Thomas | +8 st |
| `voisin` | Le voisin | Grandpa (fr_FR) | -3 st |
| `livreur` | Livreur | Eddy (fr_FR) | 0 st |
| `influenceuse` | Influenceuse | Flo (fr_FR) | +5 st |
| `banquier` | Banquier | Rocko (fr_FR) | -5 st |
| `tonton` | Tonton | Grandpa (fr_FR) | -2 st |
| `rick` | Rick Sanchez | Thomas | -4 st |
| `morty` | Morty Smith | Eddy (fr_FR) | +3 st |
| `goku` | Goku | Rocko (fr_FR) | -3 st |
| `pikachu` | Pikachu | Thomas | +9 st |
| `john_wick` | John Wick | Thomas | -6 st |
| `shrek` | Shrek | Grandpa (fr_FR) | -8 st |
| `lara` | Lara Croft | Sandy (fr_FR) | +1 st |
| `walter` | Walter White | Thomas | -5 st |
| `spiderman` | Spider-Man | Eddy (fr_FR) | +3 st |
| `mercredi` | Mercredi Addams | Shelley (fr_FR) | 0 st |
| `denis_survivor` | Denis Survivor | Rocko (fr_FR) | -1 st |
| `mme_monique` | Mme Monique | Grandma (fr_FR) | +2 st |
| `luffy_gear5` | Luffy Gear 5 | Eddy (fr_FR) | +4 st |
| `gilet_jaune` | Gilet Jaune | Grandpa (fr_FR) | -3 st |
| `jul_alien` | Jul Alien | Rocko (fr_FR) | -1 st |
| `rat_gouttiere` | Rat Gourmet | Thomas | +7 st |

Si un fichier `.wav` est absent pour un personnage → fallback Piper automatique.

### Pour ajouter des vrais samples (voix authentiques)

Remplacez le `.wav` auto-généré par un extrait audio réel du personnage :

```bash
# Format idéal : WAV mono 24kHz, 10-15s, voix seule sans musique
ffmpeg -i source.wav -ss 00:01:23 -t 12 -ac 1 -ar 24000 scripts/voice_samples/homer.wav
```

---

## Tester la synthèse

### Test rapide via curl (serveur doit être démarré)

```bash
# Santé du serveur
curl http://localhost:5500/health
# → {"status":"ok","device":"cpu"}

# Test synthèse
curl -X POST http://localhost:5500/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text":"Mmm, des donuts...", "characterId":"homer", "language":"fr"}' \
  --output test_homer.wav

# Écouter
afplay test_homer.wav
```

### Test via l'interface MayronCombat

1. `npm run dev` (démarre tous les serveurs)
2. Lancer un combat avec Homer — la console affichera `[voice] tier=xtts char=homer`
3. Sans serveur XTTS → `[voice] XTTS unreachable → Piper fallback`

---

## Performances

| Scénario | Temps par réplique |
|---|---|
| CPU (macOS Intel, AMD GPU) | **15–60 secondes** |
| CUDA (NVIDIA GPU) | 5–10 secondes |

> **Pourquoi pas MPS (Metal) ?** XTTS v2 utilise des opérations STFT (FFT) qui créent des tenseurs `ComplexFloat`. PyTorch MPS ne supporte pas ce dtype. Le serveur force donc le CPU même si un GPU Apple/AMD est disponible. L'inference XTTS reste fonctionnelle en CPU.

Le système absorbe cette latence : les répliques d'un round sont **générées en parallèle** pendant que la première se joue. L'audio XTTS est mis en cache dans IndexedDB — les relectures sont instantanées.

---

## Dépannage

### `GPT2InferenceModel has no attribute 'generate'`

```
AttributeError: 'GPT2InferenceModel' object has no attribute 'generate'
```
→ Version de transformers incompatible. Utiliser exactement :
```bash
venv/bin/pip install "transformers>=4.33.0,<4.50.0"
```
transformers 4.50+ a retiré `GenerationMixin` de `PreTrainedModel`, ce qui casse XTTS v2.

### `ImportError: cannot import name 'BeamSearchScorer' from 'transformers'`

→ `tts_server.py` applique automatiquement le patch au démarrage. Si l'erreur persiste, reinstaller transformers dans la plage correcte (voir ci-dessus).

### `numba / llvmlite` ne compile pas

```
ERROR: Failed building wheel for llvmlite
```
→ Toujours installer numba en premier avec le wheel précompilé :
```bash
venv/bin/pip install numba==0.60.0 --only-binary=:all:
```

### `command not found: pip`

→ Sur macOS avec Homebrew, `pip` n'est pas dans le PATH. Utiliser :
```bash
venv/bin/pip install ...   # depuis scripts/
```

### Le serveur Python ne démarre pas avec `npm run dev`

→ `npm run dev` affiche `[xtts] serveur Python non dispo, fallback Piper actif` et l'app continue. Vérifier :
1. `scripts/venv/` existe (sinon : faire l'installation complète)
2. `python3.11 --version` fonctionne
3. `scripts/venv/bin/python scripts/tts_server.py` lance sans erreur

### Port 5500 déjà occupé

```bash
XTTS_PORT=5501 COQUI_TOS_AGREED=1 scripts/venv/bin/python scripts/tts_server.py
```

### Erreur 503 dans l'app (XTTS unavailable)

→ Normal si le serveur Python n'est pas démarré. L'app bascule automatiquement sur Piper.

### Voix peu ressemblante

- Utiliser un sample plus long (**15s > 6s**)
- Supprimer la musique de fond (Audacity)
- Normaliser le volume : `ffmpeg -i input.wav -filter:a loudnorm output.wav`
- Essayer un autre extrait (passage calme, voix seule)

---

## Pourquoi pas RVC ?

| | RVC | XTTS v2 |
|---|---|---|
| GPU requis | CUDA (NVIDIA) uniquement | **CPU, CUDA** (MPS partiel) |
| Pipeline | 2 étapes (Piper → conversion) | **1 étape** (texte → voix clonée) |
| Temps (CPU) | 30–90s/réplique | 15–60s/réplique |
| Modèles VF | Sur AI Hub Discord | Samples YouTube suffisent |
| Complexité install | Élevée | **Moyenne** |
| Qualité | Excellente avec bon modèle | Très bonne avec bon sample |

RVC reste une excellente option pour de la **pré-génération batch** (générer toutes les répliques d'avance), mais XTTS v2 est plus adapté à l'usage temps réel de MayronCombat sur cette machine.

---

## Structure des fichiers

```
scripts/
├── tts_server.py              ← Serveur FastAPI + XTTS v2
├── generate_voice_samples.py  ← Génère les 31 .wav via macOS say + librosa
├── requirements.txt           ← Dépendances Python
├── venv/                      ← Environnement Python 3.11 (ne pas versionner)
└── voice_samples/
    ├── homer.wav
    ├── bart.wav
    └── ... (31 fichiers au total)
```

---

## Commandes de référence rapide

```bash
# Installation complète (une seule fois)
cd /Volumes/sauv/VPS/MayronCombat/scripts
python3.11 -m venv venv
venv/bin/pip install numba==0.60.0 --only-binary=:all:
venv/bin/pip install -r requirements.txt
COQUI_TOS_AGREED=1 venv/bin/python -c "from TTS.api import TTS; TTS('tts_models/multilingual/multi-dataset/xtts_v2')"

# Générer les échantillons vocaux
cd /Volumes/sauv/VPS/MayronCombat
npm run voices

# Démarrer tous les serveurs
npm run dev

# Arrêter tous les serveurs
npm run stop

# Tester le serveur XTTS
curl http://localhost:5500/health
```
