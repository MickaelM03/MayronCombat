"""
MayronCombat XTTS v2 TTS Server
Local voice cloning server using Coqui TTS (XTTS v2).

Usage:
  pip install -r requirements.txt
  python tts_server.py

Then place voice samples in scripts/voice_samples/<character_id>.wav
The server listens on http://localhost:5500
"""

import io
import os
import sys
import time
import logging
from pathlib import Path

# MPS fallback: aten::_fft_r2c not yet implemented in MPS — fall back to CPU for that op
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")

import torch
import soundfile as sf
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

# ── Compatibility patch ───────────────────────────────────────────────────────
# transformers 4.44+ removed BeamSearchScorer from the top-level namespace.
# TTS 0.22.0 still imports it from there — patch it back before TTS loads.
try:
    import transformers
    if not hasattr(transformers, "BeamSearchScorer"):
        from transformers.generation.beam_search import (
            BeamSearchScorer,
            ConstrainedBeamSearchScorer,
        )
        transformers.BeamSearchScorer = BeamSearchScorer
        transformers.ConstrainedBeamSearchScorer = ConstrainedBeamSearchScorer
        log.info("Applied transformers compatibility patch (BeamSearchScorer)")
except Exception as _patch_err:
    log.warning(f"Could not apply transformers patch: {_patch_err}")

# ── Device selection ──────────────────────────────────────────────────────────
# XTTS v2 uses ComplexFloat (STFT) which MPS doesn't support yet (PyTorch 2.2).
# Force CPU for inference; MPS would crash on synthesis even if it loads.
# On CUDA, ComplexFloat is supported — use it when available.
if torch.cuda.is_available():
    DEVICE = "cuda"
else:
    DEVICE = "cpu"

log.info(f"PyTorch device: {DEVICE}")

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
SAMPLES_DIR = SCRIPT_DIR / "voice_samples"
SAMPLES_DIR.mkdir(exist_ok=True)

# ── Load XTTS v2 ──────────────────────────────────────────────────────────────
log.info("Loading XTTS v2 model (~1.9 GB, downloaded once to ~/.local/share/tts)...")
t0 = time.time()

try:
    from TTS.api import TTS as CoquiTTS
    # Accept license non-interactively
    os.environ["COQUI_TOS_AGREED"] = "1"
    tts_model = CoquiTTS("tts_models/multilingual/multi-dataset/xtts_v2").to(DEVICE)
    log.info(f"XTTS v2 loaded in {time.time() - t0:.1f}s on {DEVICE}")
except Exception as exc:
    log.error(f"Failed to load XTTS v2: {exc}")
    log.error("Run: pip install -r requirements.txt")
    sys.exit(1)

# ── Fallback voice (used when no character sample exists) ─────────────────────
# A neutral French voice sample shipped with the package, or None to raise 404.
FALLBACK_SAMPLE: Path | None = None
for name in ("neutral.wav", "default.wav"):
    candidate = SAMPLES_DIR / name
    if candidate.exists():
        FALLBACK_SAMPLE = candidate
        break

# ── API ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="MayronCombat XTTS Server", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


class SynthRequest(BaseModel):
    text: str
    characterId: str = "default"
    language: str = "fr"


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "device": DEVICE}


@app.post("/synthesize")
async def synthesize(req: SynthRequest) -> Response:
    if not req.text.strip():
        raise HTTPException(400, "Empty text")

    # Resolve voice sample
    sample_path = SAMPLES_DIR / f"{req.characterId}.wav"
    if not sample_path.exists():
        if FALLBACK_SAMPLE:
            sample_path = FALLBACK_SAMPLE
            log.warning(f"No sample for '{req.characterId}', using fallback")
        else:
            raise HTTPException(
                404,
                f"No voice sample for character '{req.characterId}'. "
                f"Add scripts/voice_samples/{req.characterId}.wav (10-15s clean audio)."
            )

    log.info(f"Synthesizing [{req.characterId}] lang={req.language}: {req.text[:60]}…")
    t0 = time.time()

    try:
        # XTTS v2 zero-shot voice cloning
        audio = tts_model.tts(
            text=req.text,
            speaker_wav=str(sample_path),
            language=req.language,
        )
        elapsed = time.time() - t0
        log.info(f"Synthesized in {elapsed:.2f}s")
    except Exception as exc:
        log.error(f"XTTS inference error: {exc}")
        raise HTTPException(500, f"Synthesis failed: {exc}")

    # Encode to WAV in memory
    buf = io.BytesIO()
    sf.write(buf, audio, samplerate=24000, format="WAV", subtype="PCM_16")
    buf.seek(0)

    return Response(
        content=buf.read(),
        media_type="audio/wav",
        headers={"X-Elapsed": f"{time.time() - t0:.2f}s"},
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("XTTS_PORT", "5500"))
    log.info(f"Starting XTTS server on http://0.0.0.0:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
