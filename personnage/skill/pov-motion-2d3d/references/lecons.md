# Pièges déjà rencontrés (à lire avant le premier rendu)

## Environnement
- **Réseau** : Hugging Face et les sites de modèles sont souvent bloqués, donc **pas de reconnaissance vocale** (ni Whisper ni Vosk). Kokoro passe par les GitHub releases ; npm et PyPI marchent. L'alignement se fait par les pauses et le texte connu : la position exacte des mots dans une phrase est estimée.
- **Rendu** : environ 10 min par minute de vidéo. Lance-le en arrière-plan (`run_in_background`) et enchaîne l'assemblage dans la même commande. Il ralentit quand la session est inactive.
- Navigateur : `--browser-executable=/opt/pw-browsers/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell` (le chemin est aussi écrit en dur dans `apercu.mjs` : adapte-le si besoin).
- `remotion still` recompile à chaque appel : utilise `apercu.mjs` (une seule compilation, 25 images max par appel, `ECH=0.6` pour une image plus grande).
- N'écris jamais `cat > fichier` sans contenu derrière dans une commande : ça bloque.
- **Pas de JSX au niveau du module** (`const X = <g/>` en dehors d'une fonction) : « React is not defined » au rendu. Mets-le dans une fonction ou un composant.
- `interpolate` exige des bornes d'entrée **croissantes**.
- Pour lire les `console.log` du navigateur, utilise `renderStill(..., onBrowserLog)` dans un petit script.

- **Reconnaissance vocale** : les modèles Whisper hors des sources officielles sont refusés par la sécurité. Quand l'alignement automatique se trompe (il a décalé « rouge, noir, rouge »), écris le rattachement **à la main** : `voix/roulette1000/caler.py` (GROUPES = bout de phrase → morceau de parole, PAUSES = blancs à garder longs, ex. 0,95 s avant le résultat).

## Géométrie et tri
- **Un billboard collé à la caméra** devient une énorme tache (jambe géante) : dans `Vue`, on ne dessine pas un perso si sa profondeur est < 0,2. On ne dessine pas non plus les persos quand la caméra plonge à plus de 60° (ils feraient plats).
- **Objets posés sur un meuble** : mets-les dans l'item du meuble, triés entre eux, après le dessus du meuble.
- **Les sols passaient devant les jambes** (« on voit que le haut ») : terrasses, perrons et bassins vont dans un item avec `z: 30` pour être dessinés en premier.
- **Trie selon la vraie distance à la caméra** : passe `cam` à `<Plan>`. C'est indispensable en contrechamp.
- **Grands aplats beiges ou noirs** : un mur latéral ou un auvent passe juste à côté de la caméra. Recule la caméra, mets le volume en retrait, ou supprime la face inutile.
- **Plaque en miroir** : choisis le sens de `ax` selon le mur (voir `moteur.md`).
- **Pièces reliées** : dessine de la pièce la plus loin vers la plus proche, selon l'endroit où est la caméra. Un objet dans une autre pièce ne doit être visible que par l'ouverture (`clipPath`).
- **Un perso derrière une vitre** : dessine l'intérieur et le perso dans un `clipPath` du polygone de la vitre.
- Le monstre 3D : la sélection des axes de `boite` se fait par index (sinon elle plante vers pose ≈ 0.5). Une tête allongée par `cou` peut arriver tout près de la caméra : recule le monstre.
- Une caméra en **orbite** dans un couloir sort des murs : garde des angles proches de 0 / 180 et un petit rayon.
- Une caméra **collée à un mur ou à une carrosserie** donne un aplat illisible : recule-la (> 600 unités) ou mets-la en diagonale.
- Un **billboard vu de haut ou de très bas** fait « plat » : remplace-le par un perso 3D (`surveillant3D` tenue `'vrai'`).
- Ne place pas un perso sur le trajet d'un meuble (le canapé…) : vérifie le chemin de marche.
- Un **halo de lampe trop proche de la caméra** remplit l'image d'une tache marron : éloigne la caméra de la lampe.

- **Trait épais près de la caméra** (tuyau, câble, nervure) : sa largeur calculée au milieu du segment explose quand ce point passe derrière la caméra → disque géant. Plafonne la profondeur (`lw` de Vaisseau.jsx : `w / max(0.35, profondeur)`).
- **Contour (stroke) d'un polygone découpé au plan proche** (hublot dans le dos de la caméra) : il dessine une forme géante. Ne dessine l'anneau que si tous ses points sont visibles.
- **Néon de plafond collé à la caméra** : grande tache blanche. Saute les néons à moins de 1,1 Z de la caméra.
- **Écran qui montre une autre vue 3D** : rends le décor avec une 2e caméra dans un `<svg viewBox>` imbriqué dans une `plaque` (voir `fluxHall` + `salleEcrans({flux})`).

## Rendu des écrans
- La notification du téléphone verrouillé cachait l'heure : elle est maintenant sous la date (translate −60).
- Pour zoomer sur une bulle, remonte `y` du téléphone (≈ 960 − echelle × 440), sinon la bulle sort du cadre.
- Les étiquettes du dilemme ne doivent cacher ni un visage ni les sous-titres (y ≈ 1325-1500).

## Son
- Une crête à −0,0 dB sature : normalise le mix à 0,85-0,95, puis vérifie avec `volumedetect`.
- Tu ne peux pas écouter : mesure (moyenne, crête, RMS par tranche) et dis-le.
