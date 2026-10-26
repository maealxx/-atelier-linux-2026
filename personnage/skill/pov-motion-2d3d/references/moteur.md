# Le moteur 2,5D / 3D (src/moteur.jsx, src/montage.jsx)

## Repère du monde
- X : gauche / droite (unités). Y : haut / bas, **+ vers le bas**. Le sol est à `SOL = 432` (export de `Rue.jsx`). Z : profondeur, **1 Z = 1000 unités** (1 m ≈ 370 unités).
- Écran 1080×1920. Le point de fuite est `VP = [540, 820]` et la focale vaut 1000 px. Le bonhomme mesure environ 720 unités.

## Caméra : `makeCam({x, y, z, yaw, pitch})`
- `yaw` : + regarde à droite (0 = vers +Z, 90 = vers +X, 180 = vers −Z). `pitch` : + regarde vers le bas.
- Elle renvoie `cam` avec :
  - `poly(pts)` : chaîne de points SVG, découpée au plan proche (vide si tout est derrière) ;
  - `seg(A, B)` : segment écran ou `null` ;
  - `proj(X, Y, Z)` : point écran ;
  - `scale(Z, X, Y)` : taille apparente ;
  - `visible(Z, X, Y)` : le point est devant la caméra ;
  - `profondeur(Z, X, Y)` : distance le long du regard ;
  - `fuite` : point écran au loin, pour centrer une brume.
- Passe toujours X et Y à `visible` et `scale` quand la caméra tourne.
- `orbite(cx, cz, rayon(Z), angle, y, {pitch})` : caméra en cercle qui garde le point au centre. L'angle 180 place la caméra côté +Z, qui regarde vers −Z.

## Formes
- **Polygone** : `<polygon points={cam.poly([[x,y,z], …])} />`. Pour un rectangle sur un mur, utilise `rz` (Z constant), `rx` (X constant) ou `ry` (sol / plafond), définis dans `Appart.jsx`.
- **Boîte** : `boite(cam, x0, x1, y0, y1, z0, z1, [dessus, face, côté, dessous], key)` (export de `Appart.jsx`). Seules les faces tournées vers la caméra sont dessinées. Utilise-la pour les meubles, voitures, balcons, poutres, jetons…
- **Plaque** : `plaque(cam, P0, ax, ay, w, h, <contenu2D/>, key)` (export de `Lycee.jsx`) colle un dessin SVG 2D sur un plan 3D : affiche, écran de TV, tableau, enseigne, texte au sol.
  - `P0` est le coin haut-gauche, `ax` la direction de la largeur, `ay` celle de la hauteur (Z en Z).
  - Pour que le texte ne soit pas en miroir : mur du fond vu de face `ax = [1,0,0]` ; mur gauche (X−) `ax = [0,0,1]` ; mur droit (X+) `ax = [0,0,-1]` ; mur avant (Z−) `ax = [-1,0,0]`.
- **Billboard** : un dessin 2D toujours face caméra (arbres, plantes, scooter). Tu en trouveras des exemples dans `Appart.jsx` et `Maison.jsx`.
- **Halo** : un cercle avec dégradé radial projeté (lampes, néons, phares). Pour une flaque de lumière au sol, utilise `disqueSol(…)`.

## Montage : `montage(timeline, PLANS)`
- `timeline.json` (écrit par `caler_voix.py`) contient `{fps, voix, scenes: [{nom, frames, reperes: {mot: frame}}]}`. `plans.json` contient `{nomScene: [poids des plans]}`.
- La fonction renvoie `{DUREES, decoupe, repere, SCENES}` :
  - `decoupe(nom, f)` donne `{i: n° du plan, t: image dans le plan, d: durée du plan, bornes, D: durée de la scène}` ;
  - `repere(nom, mot, défaut)` donne l'image où le mot est prononcé dans la scène (mots sans accent ni ponctuation, apostrophes collées : « lhôte », « cest »).
- `punch(t, fort=0.12)` : coup de zoom en début de plan. `dosPour(cam, z, dir)` : le perso est-il vu de dos (dir = sens où il regarde sur Z).
- `camFace(x, z, dir, dist, t, d, {dx, dy, push, pitch})` : gros plan du visage d'un perso qui regarde vers `dir`.
- `<Plan f cam decor items noir dessus roll zoom />` : le décor, puis les éléments **triés selon leur vraie distance à la caméra** (passe toujours `cam`), puis un voile noir, puis `dessus` (interface, téléphone, flash), puis la `Finition` (vignette et grain).
  - Un élément de `items` s'écrit `{z, x?, y?, el}`. Donne x et y pour les objets loin de l'axe.
- Le composant final reprend le même schéma : `<Series>` + `SCENES.map(...)` (voir `Gabarit.jsx`).

## Autres outils
- `flick(f, graine, de, à, bas)` : lumière qui grésille. On trouve aussi `bug(f, graine)` et `gresille(f, graine)` dans les scènes d'exemple.
- `marche(f, vitesse, amp)` → `{legG, legD, bob, bras}` pour faire marcher le bonhomme.
- `<Finition f vignette />` : vignette + grain (déjà dans `Plan`).
- `<YeuxRouges cam x y z />` : yeux qui brillent dans le noir.
- `Judas` (export de `Livreur.jsx`) : vue « fish-eye » ronde par le judas d'une porte. Elle s'utilise comme `Plan` (décor + items).
- `Choix` (export de `Livreur.jsx`) : étiquette du dilemme (emoji SVG dans `public/emoji/<code>.svg`, largeur auto).
- `Telephone` (export de `Maison.jsx`) : voir `personnages.md`.

## Ordre de dessin
- **Le fond** se dessine du plus loin au plus proche : sol, plafond, murs, puis décor plaqué.
- **Pièces reliées** (portes, couloirs) : dessine d'abord la pièce la plus éloignée de la caméra, puis le mur percé, puis la pièce où est la caméra. `appart()` le fait selon la position de la caméra.
- Un élément 3D dans une autre pièce ne doit apparaître que par l'ouverture : enveloppe-le dans un `clipPath` du polygone de l'ouverture (`parOuverture` dans `Livreur.jsx`).
- **Les sols et grandes surfaces au ras du sol** (terrasse, perron) vont dans un item avec un `z` très grand (30) pour être dessinés en premier. Sinon, ils passent devant les jambes du perso.
