# Les personnages

## Le bonhomme 2D : `<Perso cam id x z y lum teinte … />` (src/moteur.jsx → Bonhomme.jsx)
C'est un billboard : il est dessiné face à la caméra (ou de dos), avec des pieds au sol en `y` (par défaut `SOL`).
- `id` : identifiant **unique** dans l'image (il sert au filtre de couleur).
- `lum` (0.3 à 1) et `teinte` [r, g, b] donnent la lumière de la scène. Exemples : chaud `[1.05, 0.9, 0.78]`, lune `[0.7, 0.8, 1.08]`, écran `[0.75, 0.88, 1.15]`. Garde `lum ≥ 0.3`.
- `dos` (souvent `dosPour(cam, z, dir)`), `sx`, `sy` (étirer), `lift` (sauter / bob), `shiver` (tremblement en px), `ombre`.
- Pose : `epauleG/D`, `coudeG/D` (degrés), `poignetD`, `tilt` (tête), `breath`, `legG/legD` (0 → 1, jambe levée).
- Visage : `eyes` (0 fermé, >1 écarquillés), `pupilX/Y`, `brows`, `worry` (0 → 1), `smile` (0 → 1), `scream` (0 → 1, bouche en O), `blush`, `sweat` (goutte).
- `couleurs` : remplace la palette (`{haut, hautO, pant, chaus, peau, peauO, chev}`), par exemple pour une veste, un uniforme ou un costume.
- Gestes utiles :
  - taper sur une vitre : `epauleD -70, coudeD -60` ;
  - mains au visage (peur) : `epauleG 35, coudeG 130, epauleD -35, coudeD -130` ;
  - bras écartés : `±30 / ±110` ;
  - faire coucou : `epauleD -150`, `coudeD` qui oscille.
- Le bonhomme n'existe que de face ou de dos. **Ne le filme pas de profil ni de très haut** (il paraît plat) : passe alors au 3D.

## Le livreur 2D : `<LivreurPerso … visiere casque sac />` (src/Appart.jsx)
C'est le bonhomme avec une veste sombre, un casque (`visiere: 'ouverte' | 'noire'`) et un sac isotherme. Il accepte les mêmes props de pose. C'est la base d'un perso « avec accessoire » : copie-le pour faire un pompier, un policier, un serveur, etc.

## Le croupier 2D : `<Croupier … />` (src/Casino.jsx)
Le bonhomme en chemise blanche, gilet noir à boutons dorés et nœud papillon rouge, mêmes props de pose. Même principe que `LivreurPerso` pour faire un serveur, un barman, un vigile…

## Persos et monstres en vraie 3D : `surveillant3D(cam, {...}) → {z, el}` (src/Monstre3D.jsx)
Ce sont des squelettes en volume (os épais + boîtes orientées, faces cachées éliminées), justes sous tous les angles. Ajoute `{z: res.z, x, y, el: res.el}` aux items.
- `x, z, y` (sol sous les pieds, ou plafond si `plafond`), `angle` (0 = regarde vers +Z, 180 = vers −Z), `echelle` (1 ≈ 1060 unités de haut ; 0.7 pour un humain normal), `f`.
- `tenue` :
  - `'surveillant'` (lycée) ;
  - `'hote'` (costume, nœud papillon, chapeau de fête + `masque` 0 → 1 qui tombe) ;
  - `'livreur'` (faux livreur : casque à visière noire, sac) ;
  - `'vrai'` (**humain** : peau, yeux, casque vert, chaussures, sans griffes).
- `pose` : 0 debout → 1 à quatre pattes (araignée, pattes qui bougent avec `f`).
- `ouvre` : la tête se fend en deux (dents, yeux rouges, bave). `ventre` : la bouche se déchire jusqu'au ventre.
- `cou` (allongement en unités), `penche` (tête penchée en degrés), `plafond: true` (accroché au plafond la tête en bas, `y = hauteur du plafond`).
- `bras` : remplace des articulations (`{coudeD: [x,y,z], mainD: […]}` dans le repère du perso). Exemple pour faire coucou : `coudeD [270,-900,30]`, `mainD [290±70,-1170,40]`.
- Pour un nouveau monstre ou perso : ajoute une palette (`const MA_TENUE = {jambe, bras, main, gilet, gilet2, peau, peau2, cheveux, rouge}`) et ses accessoires dans `surveillant3D`, en suivant le modèle de `'hote'` ou `'vrai'`.

## Autres créatures 2D
- `Creature` (src/Decors.jsx) : la grosse créature du « Dernier bus ».
- `Surveillant` (src/Lycee.jsx) : l'ancien surveillant en 2D.
- `Silhouette` (src/Maison.jsx, non exportée) : ombre derrière une vitre, floue, qui danse ou reste immobile, avec un `sourire` et une tête qui se `tord`.
- `YeuxRouges` (src/moteur.jsx).

## Le téléphone : `<Telephone f messages notif verrouille nom echelle x y vibre />` (src/Maison.jsx)
- Il se dessine en coordonnées écran, à mettre dans `dessus` du `Plan`, avec un voile noir derrière (opacité 0.3 à 0.6).
- `verrouille` : grande heure + `notif: {debut, texte}`, qui glisse sous l'heure.
- `messages: [{debut, texte, gras?, photo?, alerte?}]` :
  - « écrit… » s'affiche 32 images avant chaque bulle ;
  - `photo` ajoute une photo de groupe au flash ;
  - `alerte` donne une bulle rouge qui apparaît lentement.
- `vibre` (0 → 1) fait trembler **le téléphone seul**. Pour zoomer sur une bulle, prends `echelle` 1.7 à 2.3, avec `y` qui remonte (≈ 960 − echelle × 440).
