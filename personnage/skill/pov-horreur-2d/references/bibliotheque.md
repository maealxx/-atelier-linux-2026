# Bibliothèque du projet `personnage/video/`

Tout est dans `src/`. On réutilise ces briques telles quelles : c'est ce qui garantit le même style d'une vidéo à l'autre.

## Sommaire
1. Le monde 3D et la caméra (`moteur.jsx`)
2. Les personnages
3. Les décors
4. Le montage en plans courts (`DernierBus.jsx`)
5. Les fichiers de données et les scripts

---

## 1. Le monde 3D et la caméra — `src/moteur.jsx`

**Les unités du monde** :
- X va de gauche à droite et Y de haut en bas, en « unités » (1 m ≈ 370 unités).
- Z est la profondeur : **1 Z = 1000 unités**.
- Le sol des trottoirs est à `Y = 432` (`SOL`) et la chaussée à `Y = 470`.
- Le bonhomme mesure environ 720 unités. Son visage est vers `Y ≈ -150`, sa poitrine vers `Y ≈ 0`.
- Le point de fuite à l'écran est `VP = [540, 820]`, sur une image de 1080×1920.

**`makeCam({x, y, z, yaw, pitch})`**
- `yaw` en degrés : positif = regarde à droite. `yaw: 180` = regarde vers −Z, c'est-à-dire en arrière.
- `pitch` : positif = regarde vers le bas.
- Elle renvoie :
  - `proj(X,Y,Z)` pour obtenir un point à l'écran ;
  - `poly(pts)` pour un polygone, **découpé au plan proche**, ce qui permet de tourner la caméra librement ;
  - `seg(A,B)` pour une ligne, découpée elle aussi ;
  - `scale(Z, X, Y)` pour l'échelle d'un billboard et `visible(Z, X, Y)`. Passe toujours X et Y : avec du lacet, la profondeur dépend de X ;
  - `fuite`, le centre de la brume.
- Le **roulis** (image penchée) n'est pas dans la caméra : c'est la prop `roll` de `<Plan>`.

**`orbite(cx, cz, rayon, angle, y, extra)`** place la caméra sur un cercle autour d'un point et la fait regarder ce point. Angle 0 = derrière (regarde +Z), angle 180 = devant.

**Les utilitaires** :
- `flick(f, graine, de, à, bas)` : grésillement d'une lumière, toujours le même à chaque rendu.
- `marche(f, vitesse, amp)` : renvoie `{legG, legD, bob, bras}` pour la marche (vitesse 0,3) ou la course (0,55 à 0,75).
- `<Finition f />` : vignette et grain, par-dessus tout.
- `<YeuxRouges cam x y z taille ouvert />` : paire d'yeux qui brillent, à mettre dans `dessus` pour qu'elle reste visible dans le noir. Place-la **à côté** de la tête du perso, jamais pile derrière.

## 2. Les personnages

### Le bonhomme — `src/Bonhomme.jsx` (dessin) + `<Perso>` (dans le monde)
- Style flat : t-shirt corail `#FF6B5B` avec col en V et poche, jean `#2F4B7C`, cheveux `#2B2140`, peau `#F2C3A0`, baskets noires à semelle blanche.
- Dessiné dans le repère du `personnage.svg` d'origine (viewBox 600×1000, pieds en 300,922).
- `<Perso cam id x z lum teinte lift shiver sx sy … />` le pose dans le monde, avec une ombre au sol et un filtre de lumière (`lum` de 0 à 1, `teinte` = [r,g,b], par exemple `[1, .82, .68]` pour un lampadaire orange ou `[.8, .95, .88]` pour un néon). `id` doit être **unique dans l'image**, car il sert d'identifiant au filtre.
- Les props de pose, transmises à `Bonhomme` :
  - **Bras** : `epauleG/D` et `coudeG/D` en degrés, `poignetD`. Mains en l'air de peur : `epauleG 35, coudeG 130, epauleD -35, coudeD -130`.
  - **Tête** : `tilt`, `breath`, `pupilX/Y`, `eyes` (0 = fermés, 1,3 = écarquillés).
  - **Expressions** : `brows`, `worry` de 0 à 1 (sourcils inquiets), `smile`, `scream` de 0 à 1 (bouche en O), `sweat` de 0 à 1 (goutte), `blush`.
  - **Jambes** : `legG/legD` (jambe levée), `dos` (vu de dos).
- Il n'existe **que de face et de dos**. Utilise `dos={dosPour(cam, z, dir)}`, avec `dir = 1` s'il regarde vers +Z et `-1` s'il regarde vers −Z.

### La créature — `Creature` dans `src/Decors.jsx`
- Énorme, environ 2600 unités de haut, soit 3,5 fois le bonhomme.
- Corps voûté noir avec un liseré bleu-gris, deux bras griffus qui descendent de chaque côté, tête avec **7 yeux rouges** qui clignent chacun leur tour, gueule pleine de dents et de bave.
- Props : `monte` de 0 à 1 (elle surgit de l'ombre), `gueule` de 0 à 1.
- Elle se pose comme un billboard : `translate(proj(x, SOL, z)) scale(scale(z, x, -1200))`. Mets-la environ 0,9 Z derrière le perso pour qu'elle le domine.

### Les autres
- **La poussette** (`Poussette`, dans `Decors.jsx`) : les roues tournent, elle tangue et a un mobile. Pose-la avec `billboardPoussette`.
- **La silhouette longiligne** aux yeux rouges et aux bras trop longs : dans `Metro.jsx` (`Silhouette` / `Yeux`). C'est le monstre du métro.
- **Le chauffeur** : tête et épaules noires, yeux rouges, sourire à dents qui s'élargit. Il a servi dans les versions précédentes de `DernierBus.jsx` (voir l'historique git, fonction `chauffeur`).

## 3. Les décors

Chaque décor est une fonction `(cam, f, options) → {fond, items, brume}` :
- `fond` contient le ciel, les murs et le sol, qui ne se trient pas ;
- `items` est une liste `{z, el}` triée du plus loin au plus près, avec les personnages ;
- `brume` est un voile de profondeur.

| Décor | Fichier | Contenu | Options |
|---|---|---|---|
| `rue()` | `Rue.jsx` | rue de nuit en perspective : immeubles et fenêtres, lampadaires orangés, trottoirs, chaussée, abribus « LIGNE 42 / 05:42 », parc avec balançoire | `lampe(l)` → intensité, `fenetre(cle, d)` → allumée, `balancoire: [a1, a2]`, `panneau` |
| `bus()` | `Rue.jsx` | bus en 3D (face avant ou arrière, flanc, portes coulissantes, phares, girouette) | `zp` (face proche), `sens`, `numero`, `interieur` (couleur), `porte` 0→1, `phares`, `led`, `chauffeur(z)`, **`vieux: true`** (rouille, pare-brise fissuré, un seul phare qui grésille) |
| `ruelle()` | `Decors.jsx` | ruelle en briques étroite (X ±430), câbles qui pendent, fenêtres à barreaux, bennes, sacs, flaques, 3 ampoules sur potence, gouttes | `ampoule(i)` → intensité |
| `vague()` | `Decors.jsx` | terrain vague : ville au loin, arbres morts, route fissurée, **vieil arrêt abandonné** (toit cassé, néon qui pend, vitre fêlée, poteau « ARR T » tordu, **post-it** jaune), feuilles mortes | `neon` → intensité |
| métro | `Metro.jsx` | quai de métro carrelé, néons, voies, piliers | (scène autonome) |

Pour un **nouveau lieu** (forêt, parking, couloir d'immeuble, hôpital…), copie la structure de `ruelle()` : murs et sol en `poly`, détails en `ligne`, objets en billboards, lumières qui grésillent avec halo (`radialGradient`), brume centrée sur `cam.fuite`. Garde la palette sombre et désaturée, avec une seule source de lumière colorée par lieu.

## 4. Le montage en plans courts — `src/DernierBus.jsx`

- `<Plan f decor items noir dessus roll zoom flou />` assemble une image : décor, puis items triés, puis voile noir (`noir`), puis `dessus` (yeux, textes, flashs), puis finition.
- `decoupe(nom, f)` renvoie `{i, t, d, bornes}` : le n° du plan dans la scène, l'image dans ce plan, la durée du plan et le début de chaque plan. Les poids viennent de `src/plans.json`.
- `punch(t, fort)` donne le coup de zoom à la coupe. `camFace(x, z, dir, dist, t, d, {dx, dy, push})` donne un gros plan visage qui se rapproche doucement. `dosPour(cam, z, dir)` dit si on voit le perso de dos.
- `repere(scene, mot, defaut)` donne l'image où un mot est prononcé, d'après `timeline.json`.
- Le catalogue des plans qui ont marché :
  - **Caméra au sol derrière les talons** : `{y: 385, z: z - 0.6, pitch: -10}`.
  - **Gros plan visage** : `camFace(…, 0.5)`, et `0.27` pour un très gros plan sur les yeux.
  - **Vue subjective** : caméra à la place de ses yeux, il disparaît du cadre.
  - **Plongée drone** : `{y: -1800, z: z - 2.7, pitch: 34}`.
  - **Plongée verticale dans une ruelle** : `pitch: 52`.
  - **Contrechamp depuis un objet**, comme la poussette : caméra basse, `yaw: 180`.
  - **Insert sur l'objet fil rouge** : très près, image penchée de −9, zoom fort.
  - **Caméra posée sur la route** devant le véhicule qui arrive.
  - **Détail de la carrosserie rouillée**.
  - **Orbite** autour du perso qui hésite.
  - **Créature filmée d'en bas**, caméra qui bascule vers le haut : `pitch: -12 → -30`.
  - **Tête de la créature à sa hauteur** : `y: -1900`.
  - **Griffes au ras du sol**.
- Les étiquettes du dilemme : composant `Choix` (cadre sombre, emoji `public/emoji/<code>.svg`, texte blanc), plus la bulle « DIS-LE EN COMMENTAIRE » en bas, vers y = 1680. Les sous-titres sont vers y = 1325.

## 5. Les fichiers de données et les scripts

| Fichier | Rôle |
|---|---|
| `voix/generer.py` | **texte des scènes** (`SCENES`) + voix guide Kokoro → `src/timeline.json` et `voix/mots.json` |
| `voix/caler_voix.py` | voix ElevenLabs → blancs raccourcis, chuchotements remontés, accélération, −15 LUFS, alignement → mêmes fichiers + `voix/voix_finale.wav` |
| `src/timeline.json` | durée de chaque scène, texte, repères de mots, fichier de voix |
| `src/plans.json` | poids des plans courts de chaque scène |
| `voix/mixage.py` | bruitages synthétisés et voix → `out/audio.wav` |
| `voix/soustitres.py` | sous-titres incrustés (style TikTok de Maé, ligne active en rouge, emojis) |
| `voix/assembler.sh` | mixage + image + sous-titres + compression < 30 Mo |
| `apercu.mjs` | planche d'images de contrôle (une seule compilation) |
| `public/emoji/` | emojis Twemoji pour les étiquettes à l'écran |
