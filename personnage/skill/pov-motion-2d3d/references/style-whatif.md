# Style « What if » (style par défaut depuis le 30/10)

Validé par Maé sur **« Apocalypse zombie à l'hôpital »**. Elle a dit : « là c'est vraiment bien », puis « enregistre toutes les spécialités pour refaire dans le même style ». Version longue : 1 min 33, 17 scènes, voix ElevenLabs.

Fichiers modèles (dans `assets/projet/`) :

| Fichier | Rôle |
|---|---|
| `src/Hopital.jsx` | La vidéo complète. Copie-la et adapte-la : moteur 2D, décors, scènes, habillage. |
| `src/Rond.jsx` | Les persos à tête ronde. |
| `src/WhatIf.jsx` | Police Anton, `ChoixBoite`, `BulleCommentaire`, `DefsFlou`. |
| `src/PP.jsx` | Photo de profil (moitié humain, moitié zombie). |
| `voix/hopital/` | `scenes.json`, `mixage.py` (bruitages synthétisés), `assembler.sh`. |
| `voix/transcrire.py` + `voix/aligner_asr.py` | Calage des sous-titres sur la vraie voix. |

La vieille 3D à facettes (`makeCam` + `face`/`boite`) est **abandonnée** pour ce style. Maé : « la 3D est mal gérée ». Tout est maintenant dessiné en **2D illustrée, avec des dégradés lisses**.

---

## 1. Le concept et le script

- **Titre** : « Et si … ? » (ex. « Et si l'apocalypse zombie commençait pendant que t'es à l'hôpital ? »). Inspiré des vidéos « What if » : narration au « tu », situation extrême, une décision à prendre.
- **Le début va droit au choc.** La 1re scène, c'est l'événement déclencheur en 3 à 5 s (la morsure derrière le rideau). On ne met pas d'introduction, et la 1re phrase n'a pas besoin de « Imagine ».
- Ensuite on fait une **carte d'identité du perso** : « TOI · 19 ANS / APPENDICITE OPÉRÉE HIER SOIR ».
- Phrases très courtes, souvent nominales : « Code rouge. » « Quatre étages. Pieds nus. » On ajoute des **petites touches d'humour** dans l'horreur (« Et oui, ta blouse est ouverte derrière. »).
- Il faut des **chiffres et des détails concrets** : 152 BPM, chambre 412, 4 étages, « puis dix, puis vingt ».
- La structure montre en escalade, avec des fausses solutions qui échouent : l'ascenseur est plein, la porte du RDC est bloquée, les tiroirs de la morgue sont vides.
- Il y a **un twist final** : l'infirmière qui te sauve a une morsure au bras.
- La fin est un **dilemme** : deux `ChoixBoite`, puis `BulleCommentaire`.
- Le format est d'environ 45 s (version courte) ou d'environ 1 min 30 (version longue, environ 17 scènes). Pour la version longue, Maé demande d'abord **le script audio**, puis **la version ElevenLabs**.

### Le prompt ElevenLabs (format validé)

Un paragraphe par scène. Les balises v3 en anglais ne sont pas lues : `[serious]`, `[casual]`, `[urgent]`, `[nervous]`, `[whispers]`, `[fast]`, `[tense]`, `[breathing heavily]`, `[deadpan]`, `[relieved]`, `[panicked]`, `[calm]`, `[ominous]`, `[direct]`, `[short pause]`, `[long pause]`.

Le « ding », les portes et les autres sons ne sont pas dans la voix : ils sont faits au mixage. Voix utilisée par Maé : « Ilan – Friendly, professional » (modèle v3/v4). Sans balises (Multilingual v2), on les enlève.

## 2. Les persos : `Rond`

- **Grosse tête ronde** (r 175) avec un **dégradé de modelé** (`rd-modele` : reflet en haut à gauche, ombre en bas à droite) et un **ombrage du corps** (`rd-corps`).
- Gros yeux noirs ovales avec un reflet blanc, sourcils épais, oreilles et cou.
- Corps simple, et bras ou jambes épais aux bouts ronds.
- Repère : pieds en (0, 0), tête au centre en (0, -800).

| Option | Effet |
|---|---|
| `tenue` | `'blouse'` (blouse d'hôpital à pois, dos ouvert avec caleçon à carreaux), `'scrubs'` (infirmière bleue + badge), `'chirurgien'` |
| `cheveux` | `'pointes'` (le héros, noir en pointes), `'chignon'` |
| `peau` | ex. `INF = {tenue:'scrubs', cheveux:'chignon', peau:'#b07a52'}` |
| `profil` | **vue de 3/4** de -1 à 1 : les yeux et la bouche glissent, l'œil lointain rétrécit, l'oreille du côté opposé reste visible |
| `cou` | allonge le cou (16 à 20 pour les gros plans) |
| `penche` | inclinaison de la tête |
| `assis` | sans jambes (dans un lit, une voiture) |
| `brasDevant` | bras dessinés **devant** le corps (mains sur le ventre, doigt sur la bouche, mains sur la tête) |
| `bracelet`, `oxymetre` | bracelet d'hôpital, pince au doigt avec sa lumière rouge et son câble |
| `yeux` | 0.1 = fermés, 0.55 = plissés, 1.35 = écarquillés |
| `pupX`, `pupY` | direction du regard |
| `bouche` | `'neutre'`, `'o'`, `'cri'`, `'sourire'`, `'serre'`, `'chut'` |
| `sourcils` | + inquiet, − fâché |
| `sueur`, `larmes` | 0 → 1 en boucle avec `(f / 15) % 1` pour que la goutte coule |
| `souffle`, `rougeur` | respiration, joues rouges |
| `zombie` | **silhouette noire #0b0d16 avec des yeux blancs qui brillent** (halo radial). `sansYeux` les éteint, pour les ombres ou avant le réveil. |
| `dos` | vue de dos |

Placer une main exactement :
- `ikBras(cote, cible, vers)` : cinématique inverse. `cote` vaut -1 (gauche) ou 1 (droite). `cible` se donne dans le repère du perso, par exemple `[14, -712]` pour la bouche. `vers` vaut 1 pour un coude vers l'extérieur, -1 vers l'intérieur.
- `mainRond(cote, angles)` donne la position de la main.

Autres poses :
- Démarche de zombie : `ZOMBIE(phase, k)` (bras tendus, jambes qui traînent).
- Course : `course(phase)`.

## 3. Le moteur 2D : `Vue`, `Calque`, `Ecran`

- `<Vue x y z r>` : la caméra **vise le point (x, y) du monde** avec un zoom `z` et un roulis `r`. Chaque décor est dessiné une seule fois dans un « monde » 1080×1920 (souvent plus large). Chaque plan est une autre `Vue` sur ce monde : large, gros plan visage, insert sur un détail, panoramique.
- `<Calque p>` : parallaxe à l'intérieur d'une `Vue`. `p < 1` donne l'arrière-plan (fenêtre), `p > 1` le premier plan (rideau).
- `<Ecran fg rouge teinte flou vignette dessus>` : l'image finale.

| Prop d'`Ecran` | Rôle |
|---|---|
| `rouge` | étalonnage alarme : multiply rouge + pulsation |
| `teinte` | `[couleur, opacité]` en multiply pour l'ambiance du lieu |
| `flou` | `[h, v]` flou de bougé, pour les panoramiques éclair |
| `dessus` | habillage écran (cartes, BPM, choix) |
| (toujours) | grain + vignette (`Finition`) |

Ambiances :
- **Rouge** pour l'alarme.
- **Bleu froid** `['#7aa8ff', 0.35]` pour la morgue.
- **Orange sodium** `['#ffb070', 0.25]` pour le garage.
- **Bleu nuit** `['#6a8aff', 0.3]` pour la route.

Petits outils :
- `punchZ(t, fort)` : petit coup de zoom à l'entrée du plan ou sur un mot.
- `tremble(fg, k, graine)` : secousse sur un choc, à garder courte (8 images).
- `ease`, `pop`, `lisse`.

## 4. Les décors illustrés (à copier ou adapter)

Les règles sont toujours les mêmes :
- Dégradés verticaux sur les murs (clair en haut, plus foncé en bas).
- Plinthe et soubassement plus foncés.
- Main courante en bois avec un liseré clair.
- Sol en dégradé, avec une ombre floue sous les objets.
- **Halos de lumière flous** (`hp-flou`, `hp-flou2`) sous chaque lampe.
- **Beaucoup de détails réalistes** : prises, oxygène, appel infirmière, poche de perfusion avec gouttes qui tombent, stores, numéros de chambre, panneaux.

| Décor | Composant | Détails |
|---|---|---|
| Chambre d'hôpital | `ChambreMonde` | Lit au dossier relevé, oreiller, couverture avec drap replié, barrière, roues. Rampe murale, **moniteur sur bras articulé** (`Moniteur` : ECG réaliste, pléthysmographie, HR, SpO2, alarme qui clignote, ligne plate), pied à perfusion, fenêtre de nuit avec lune et stores, rideau au premier plan (`Calque` 1.25). Le patient se pose avec la prop `patient`. |
| Couloir | `CouloirMonde` | **Perspective dessinée** à un point de fuite (`proj`, `camC(z, {...})`). Plafond, sol et murs en **un seul polygone dégradé chacun**, fondus vers la brume au fond. Panneaux lumineux du plafond, flaques de lumière sur les murs et reflets au sol. Portes en bois avec vitre étroite et plaque, numéro en vraie perspective (`TexteMur`). Mains courantes, panneau suspendu, gyrophares en mode alarme. Fond : ascenseur + SORTIE ; `envers` donne le BLOC. Persos placés par `persos: [{X, Z, ...props}]`. Caméra : `x`, `y` (hauteur de l'œil : 250 = ras du sol), `z` (travelling), `vx`, `vy` (point de fuite). |
| Mur avec porte (vue de face) | `MurPorte` | Battant qui s'ouvre vers nous, plaque colorée, couloir rouge derrière. Pour la tête qui dépasse, une sortie en trombe, une porte qui claque. |
| Porte d'ascenseur / sortie de secours | `AscenseurMonde` | Portes inox qui coulissent, intérieur plein de zombies, voyant d'étage. |
| Porte avec vitre | `PorteMonde` | 1, 10 ou 20 zombies derrière, mains collées, poignée qui s'agite. |
| Cage d'escalier | `CageVue` (vue de haut, vertige qui tourne), `Marches` (de côté, gros numéro d'étage vert), `PalierRdc` | |
| Morgue | `MorgueMonde` | Mur de 12 tiroirs inox qui s'ouvrent en cascade, néon qui grésille, `Vapeur` (buée). |
| Garage | `GarageMonde` | Béton, lampes sodium, lignes jaunes, grand portail ouvert sur la nuit. |
| Ambulance | `Ambulance` (de côté, cabine avec conducteur dans la vitre, gyrophares, phares, roues qui tournent), `AmbuArriere` (portes qui s'ouvrent sur la cabine éclairée), `AmbuInterieur` (vue de dedans par les portes arrière) | |
| Rue de nuit | `Rue` | Parallaxe immeubles / lampadaires / lignes au sol qui défilent. |
| Autres | `Facade` (immeuble de nuit, montée d'étage), `Gyrophare` (plafond + faisceaux tournants + bandeau LED), `BlocMonde` (ombres derrière le rideau du bloc + sang), `Cabine` (rétroviseur, volant) | |

## 5. Le montage (le plus important pour Maé)

- **Une coupe toutes les 1 à 1,5 s**, 3 à 5 plans par phrase (`plans.json`). Maé l'a demandé : « pas assez de plans dynamiques ».
- **Ne jamais enchaîner deux plans du même type.** On alterne :
  - plan large ;
  - **gros plan visage de 3/4** (perso à l'échelle 1.6 en bas de l'écran, fond flouté `flou8`) ;
  - **insert sur un détail** (main avec bracelet, moniteur, verrou, pansement, poignée, rétroviseur, morsure) ;
  - vue subjective dans le couloir ;
  - contre-plongée au ras du sol ;
  - vue de haut ;
  - de dos / de face pendant la course.
- Chaque plan bouge : léger travelling ou zoom (`lerp(1.0, 1.08, k)`) + `punchZ` à l'entrée.
- **Les actions tombent sur le mot** : `R('mot', défaut)` (porte qui claque sur « sors », yeux qui s'allument sur « plein », zoom sur « oui » et « derrière », gyrophare sur « rouge »).
- **Panoramique éclair** pour relier deux choses : `Vue x` de A à B en 8 images avec `flou={[90 * vitesse, 0]}`.
- Révélation : **noir + yeux blancs** qui apparaissent (fin du twist), tiroirs qui s'ouvrent en cascade, ascenseur dont les yeux s'allument d'un coup.

## 6. L'habillage

- `Carte` : carte blanche en haut à gauche, barre rouge, nom en Anton (« TOI · 19 ANS ») et sous-titre gris. Elle glisse depuis la gauche avec un rebond.
- `Puce` : pastille texte (« BLOC 3 · 03:00 » avec les deux points qui clignotent, « CHAMBRE 412 »).
- `BPM` : compteur cardiaque (cœur qui bat au rythme, ECG).
- Fin : `ChoixBoite` ×2 (emoji + texte) puis `BulleCommentaire`.
- **Vérifie que chaque emoji utilisé existe dans `public/emoji/`**, sinon l'image est cassée (c'est arrivé avec 🤝 `1f91d`). Copie-le depuis `<outils>/st/emo/package/dist/svg/`.

## 7. Son et sous-titres

- **Avec la voix ElevenLabs** :
  1. `ffmpeg -i voix.mp3 -ar 48000 -ac 1 voix/<projet>/voix_finale.wav`
  2. `python3 voix/transcrire.py voix_finale.wav <outils>/wm/model asr.json`
  3. `python3 voix/aligner_asr.py <projet> asr.json`, qui écrit `timeline.json` + `mots.json`.
  4. `assembler.sh <outils>/st <sortie.mp4> --voix`
  
  Les poids de `plans.json` sont relatifs, ils s'adaptent aux nouvelles durées. Vérifie que chaque mot-repère tombe dans le bon plan.
- **Sans voix** (version courte) : voix guide Kokoro (`guide.py`, vitesse 1.22), puis whisper + aligner. On ne garde que les sous-titres et les bruitages (pas de musique).
- **Bruitages tous synthétisés** dans `mixage.py` :
  - `whoosh` à chaque coupe ;
  - bip du moniteur, grognements, croque, cri, ligne plate ;
  - sirène, cœur qui accélère, coups de porte, verrou ;
  - pas, ding d'ascenseur, néon, tiroirs, moteur, barrière qui explose, drone grave pour le twist.
  
  Ils sont calés par `rep(scène, mot)` et `bornes(scène)`. La voix fait baisser les bruitages automatiquement (`--voix`).
- **Sous-titres** : police **Anton**, taille 116, contour 5, ombre 3, mot actif en **jaune** `&H3AC8FF&`, environ 12 emojis sur les mots-clés. Shader `postfx.sh` à 0.45.

## 8. Photo de profil et nom

- `PP.jsx` (composition `PP`, 1080×1080) : le héros coupé en deux, à gauche humain terrifié, à droite zombie noir avec un œil qui brille et des dents. Halo rouge et mains de zombies sur les bords. **Sans sang** (Maé l'a fait enlever).
- Nom de compte conseillé : « T'aurais survécu ? » (@tauraissurvecu).
