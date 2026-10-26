# Voix, bruitages, sous-titres, assemblage

## 1. Le texte de référence
Le fichier `voix/<projet>/scenes.json` contient `[["nomScene", "texte de la scène"], …]`. Le texte doit correspondre **mot pour mot** à ce que la voix dit (sans les balises ElevenLabs). Les noms de scène sont les mêmes que dans `plans.json` et dans le composant.

## 2. Caler la voix d'ElevenLabs
`python3 voix/caler_voix.py voix/<projet>/brut.mp3 <vitesse> <projet> <blanc_max> <boost_max>`

Réglages habituels : `1.05 <projet> 0.24 0`.
- `vitesse` : 1.05 (+5 %). Garde la vidéo à 60 s minimum.
- `blanc_max` : 0.24 s, durée maximale d'un blanc (avant accélération).
- `boost_max` : **0** pour ne pas remonter les chuchotements (demande de Maé). Mets 12 si elle veut qu'on les remonte.

Le script normalise à −15 LUFS, puis retrouve les phrases grâce aux pauses (alignement par programmation dynamique, sans reconnaissance vocale). Il écrit :
- `src/<projet>/timeline.json` : frames par scène + `reperes` (image de chaque mot dans sa scène) ;
- `voix/<projet>/mots.json` : mots horodatés, pour les sous-titres ;
- `voix/<projet>/voix_finale.wav`.

Lis la liste affichée : chaque ligne doit être sur la bonne plage de temps. Sans voix (avant qu'elle l'envoie), `voix/generer.py` fait une voix guide Kokoro, qui sert seulement au calage.

## 3. Les bruitages : `voix/<projet>/mixage.py`
Copie `voix/exemple/mixage.py` (celui du « Livreur ») et adapte les blocs. Tout est synthétisé (numpy/scipy), calé sur `timeline.json`, `plans.json` et `mots.json` :
- `repere(scene, mot, défaut)` → secondes, `mot(m, après)`, `bornes(scene)` (début de chaque plan) ;
- briques déjà prêtes : `clic`, `metal`, `pas` / `cycle_pas`, `boom`, `coup` (porte), `vibre`, `notif`, `frappe`, `bulle`, swoosh à chaque coupe, pulsation qui accélère, battements de cœur, grognement, grésillement de néon, vent et rue, grincement de porte, verre brisé, musique de fête, TV étouffée.

Règles :
- Les bruitages **baissent sous la voix** (ducking 0,45).
- Prévois une ambiance plus forte au début quand une coupure suit, et des silences totaux sur les moments clés.
- Le mix est normalisé avec une crête à 0,85-0,95.

## 4. Les sous-titres et l'assemblage : `voix/<projet>/assembler.sh`
Copie `voix/exemple/assembler.sh` et change les noms (`out/<x>_…`, `voix/<projet>`) et la liste `emojis` : 7 à 9 couples `[mot-clé, code Twemoji]`, avec un mot-clé assez long pour ne pas tomber dans un autre mot.

Usage : `bash voix/<projet>/assembler.sh <outils>/st ../<nom>.mp4`. Le script :
1. lance le mixage ;
2. fait le mux avec l'image (`out/<x>_brut.mp4`) ;
3. incruste les sous-titres avec `voix/soustitres.py` : Montserrat Black, majuscules, 1 à 3 mots, ligne active rouge `&H2A2AFF&`, pop, emojis ;
4. compresse en x264 à 3,2 Mb/s (environ 26 Mo par minute).

## 5. Vérifier
- `ffmpeg -i x.mp4 -af volumedetect -f null -` : moyenne autour de −16 dB, crête sous −0,5 dB.
- Planche d'images : `ffmpeg -i x.mp4 -vf "fps=1/4,scale=216:-1,tile=8x2" -frames:v 1 planche.png`. Les sous-titres doivent tomber sur les bons plans.
- Tu ne peux pas écouter : dis-le et décris ce que tu as mesuré.
