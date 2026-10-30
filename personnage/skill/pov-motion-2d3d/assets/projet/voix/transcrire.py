"""Transcrit une voix avec horodatage par mot (faster-whisper, modèle small int8 local).
Usage : python3 voix/transcrire.py <voix.wav|mp3> <modele_whisper> <sortie_asr.json>
Sortie : [[début, fin, mot], …] — à donner ensuite à voix/aligner_asr.py.
Pas d'initial_prompt (il fait halluciner), condition_on_previous_text=False."""
import json, subprocess, sys
import numpy as np
from faster_whisper import WhisperModel

src, modele, sortie = sys.argv[1:4]
# décodage par ffmpeg en 16 kHz mono (le chemin de fichier direct plante avec la version de PyAV installée)
pcm = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", src, "-ar", "16000", "-ac", "1", "-f", "f32le", "-"], capture_output=True, check=True).stdout
audio = np.frombuffer(pcm, dtype=np.float32)
m = WhisperModel(modele, device="cpu", compute_type="int8")
segs, _ = m.transcribe(audio, language="fr", word_timestamps=True, condition_on_previous_text=False)
mots = []
for s in segs:
    print(f"{s.start:6.1f}  {s.text.strip()}")
    mots += [[w.start, w.end, w.word.strip()] for w in s.words]
json.dump(mots, open(sortie, "w"), ensure_ascii=False)
print("ok", len(mots), "mots")
