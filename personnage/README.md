# Personnage — bibliothèque des vidéos POV horreur 2,5D

Ce dossier contient tout le matériel pour refaire des vidéos dans le même style. Le skill `pov-horreur-2d` (dans `skill/`) explique la méthode étape par étape.

## Les vidéos
| Fichier | Contenu |
|---|---|
| `personnage.svg` / `apercu.png` | le bonhomme d'origine, en calques séparés (pour After Effects, Rive, Figma…) |
| `personnage.mp4` | 5 s : il tombe, salue, saute (fond clair) |
| `metro.mp4` | 5 s : seul dans le métro de nuit, la silhouette aux yeux rouges |
| `dernier-bus.mp4` | **« Le dernier bus » partie 1**, 61 s, voix ElevenLabs, sous-titres, bruitages |
| `dernier-bus-voix.md` | le script audio de « Le dernier bus » |

## Les personnages (`video/src/`)
- **Le bonhomme** (`Bonhomme.jsx`) : t-shirt corail, jean bleu, de face ou de dos, entièrement articulé (bras, coudes, jambes, tête, yeux, sourcils, bouche, sueur).
- **La créature** (`Decors.jsx` → `Creature`) : géante, 7 yeux rouges, gueule à dents, bras griffus.
- **La silhouette du métro** (`Metro.jsx`) : longiligne, bras trop longs, yeux rouges.
- **La poussette vide** (`Decors.jsx` → `Poussette`).
- **Le bus** (`Rue.jsx` → `bus`) : normal (ligne 42) ou **vieux** (rouillé, un seul phare).

## Les décors (`video/src/`)
- **La rue de nuit** (`Rue.jsx` → `rue`) : immeubles, lampadaires, abribus, parc avec balançoire.
- **La ruelle** (`Decors.jsx` → `ruelle`) : briques, câbles, bennes, ampoules qui grésillent.
- **Le terrain vague et le vieil arrêt** (`Decors.jsx` → `vague`) : néon qui pend, post-it.
- **Le quai du métro** (`Metro.jsx`).

## Refaire une vidéo
1. Installer : `bash skill/pov-horreur-2d/scripts/installer.sh video <dossier_outils>`
2. Écrire le texte des scènes dans `video/voix/generer.py`, puis lancer `python3 video/voix/generer.py <outils>/tts`
3. Avec la voix ElevenLabs : `python3 video/voix/caler_voix.py <voix.mp3> 1.05`
4. Aperçu : `cd video && node apercu.mjs DernierBus out/planche.png 100 400 800`
5. Rendu : `npx remotion render DernierBus out/brut.mp4`, puis `bash voix/assembler.sh <outils>/st ../ma-video.mp4`
6. Pour voir et régler en direct : `cd video && npm run studio`
