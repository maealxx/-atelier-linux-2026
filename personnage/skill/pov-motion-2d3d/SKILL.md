---
name: pov-motion-2d3d
description: Moteur de motion design 2,5D / 3D de Maé pour ses vidéos TikTok verticales (9:16) en POV : le bonhomme 2D (t-shirt corail, jean bleu), les personnages et monstres en vraie 3D (dont l'alien), les décors déjà construits (rue, ruelle, métro, lycée, manoir, appart, palier, quartier vu d'en haut, casino et roulette 3D, vaisseau alien), le téléphone avec messages, la vue judas, et le montage dynamique en plans courts avec zooms, roulis et sous-titres. Utilise ce skill dès que Maé veut une nouvelle vidéo animée « dans le même style » que ses vidéos POV (Le dernier bus, Salle zéro, La soirée, Le livreur, La roulette, Le vaisseau), quel que soit le thème : horreur, humour, histoire vraie, quotidien, faits divers, motivation, explication… Aussi pour réutiliser le bonhomme ou un décor, poser sa voix ElevenLabs sur une animation, refaire une partie 2, ou quand elle dit « fais comme d'hab », même si elle ne cite ni Remotion ni le skill.
---

# Motion 2D/3D POV : le moteur des vidéos de Maé

Maé fait des vidéos TikTok en POV (« Imagine… ») animées en 2,5D, avec **son** bonhomme, **ses** décors et **son** montage. Ce skill contient tout le moteur graphique prêt à l'emploi dans `assets/projet/`, un projet Remotion complet. On **réutilise** au lieu de redessiner. Le moteur n'est pas réservé à l'horreur : tous les décors et persos marchent pour n'importe quel thème (on change la lumière, la teinte, l'histoire).

À lire avant d'écrire du code :
- `references/preferences.md` contient **tout ce que Maé a demandé ou corrigé** : style, rythme, caméra, décor, son, textes. C'est la référence n° 1 ; relis-la avant chaque vidéo.
- `references/moteur.md` décrit l'API : caméra 3D, polygones, plaques, boîtes, montage, `Plan`, finitions.
- `references/personnages.md` présente le bonhomme 2D, la version livreur et les persos/monstres 3D avec toutes leurs options.
- `references/decors.md` liste chaque décor existant : coordonnées, options, quels plans y marchent.
- `references/son-voix.md` décrit la voix ElevenLabs, le calage, les sous-titres, les bruitages et l'assemblage.
- `references/lecons.md` recense les pièges déjà rencontrés. Lis-le avant le premier rendu.

Travaille en français, ton jeune et direct. Fais valider le script avant de lancer un rendu (~10 min par minute de vidéo).

## Étape 0 : le projet

1. Si Maé a déjà le dépôt `maealxx/-atelier-linux-2026`, travaille dans `personnage/video/` et crée une branche `claude/<sujet>` à partir de la plus récente. Sinon, crée un projet neuf à partir du moteur.
2. Lance `bash scripts/installer.sh <dossier_projet> <scratchpad>/outils`. Le script copie le moteur si le dossier est vide, puis installe Remotion, Kokoro (voix guide), la police et les emojis. Tu peux le relancer sans risque.
3. Pour une nouvelle vidéo, copie `src/Gabarit.jsx` en `src/<MaVideo>.jsx` et ajoute une `<Composition>` dans `src/Root.jsx`. Crée aussi `src/<projet>/plans.json` et `voix/<projet>/scenes.json`. Les vidéos d'exemple (`DernierBus`, `SalleZero`, `Soiree`, `Livreur`, `Roulette1000`, `LeVaisseau`) servent de modèles complets : copie leurs plans plutôt que de repartir de zéro.

## Étape 1 : le script

- Si Maé n'a pas d'idée, propose 3 pitchs de 2 lignes. Sinon, écris directement.
- La **première phrase commence par « Imagine »**, et on entre **tout de suite** dans l'intrigue (Maé a fait raccourcir les débuts trop lents).
- **Les 5 premières secondes sont les plus importantes** (retour du 26/10) : prévois dès la première image quelque chose de visuellement fort et en mouvement (action, lumière qui claque, danger visible, objet qui bouge), jamais un plan d'ambiance calme.
- **Écris de l'action au « tu », pas de la description** : « tu pousses… », « tu cours… », « tu te retournes… », « tu ouvres… ». Limite les phrases qui décrivent le décor (« l'air est glacé », « des dizaines de capsules alignées ») : une demi-phrase maximum, collée à une action. Le décor se montre à l'image, la voix raconte ce que tu fais et ce que tu ressens.
- Prévois environ 12-13 scènes pour **60 s minimum** (plus long accepté si l'histoire le demande). Chaque scène fait 2 à 4 phrases courtes au « tu ». Il ne doit **jamais y avoir de blanc** : le texte remplit toute la vidéo.
- Une montée en tension (ou en drôlerie), une révélation, puis une fin en **dilemme pour le spectateur** : deux étiquettes avec emoji, puis la bulle « DIS-LE EN COMMENTAIRE ».
- Présente le script en tableau : n°, identifiant de scène (sans accent), texte, ce qu'on voit à l'écran (plans, décor, objets, textes). Maé corrige souvent l'histoire à cette étape : intègre ses demandes telles quelles.
- **Arrête-toi et fais valider.**

## Étape 2 : le prompt voix (ElevenLabs)

- Donne une description de voix, puis le texte à coller avec des balises v3 : `[whispers]`, `[pause]`, `[long pause]`, `[nervous]`, `[scared]`. Il faut un paragraphe par scène.
- Précise **pas de souffle au début**, très peu ensuite, et des chuchotements légers seulement là où c'est indiqué.
- Voix utilisée : « Paul K – Deep French Narrator », Stability 40-50 %.

## Méthode de travail : par parties de ~15-25 s

Pour une vidéo neuve (nouveau décor, nouveau perso), Maé préfère valider **la partie 1 d'abord** (4 scènes environ), puis les suivantes. Garde **un seul projet / une seule composition** : rends seulement la partie avec `--frames=0-<fin>` et donne la fin à `assembler.sh` (sous-titres coupés). Sans voix, fais une **voix guide Kokoro** (`voix/vaisseau/guide.py`) passée dans `caler_voix.py` à la vitesse 1.15 pour avoir des durées réalistes ; la vraie voix recale tout à la fin (`assembler.sh … "" --voix`). Quand elle dit « fais le reste directement », enchaîne toutes les parties restantes.

## Étape 3 : construire les scènes

Une scène est un composant React. La scène est découpée en **plans de 1 à 2 s** (poids dans `plans.json`). `decoupe(nom, f)` donne `{i, t, d, bornes}`, et `cams[i]()` renvoie une caméra différente par plan. Chaque plan est un `<Plan>` qui contient un décor (`{fond, items, brume}`), des persos triés en profondeur, un `zoom={punch(t)}` et un `roll` qui change à chaque coupe. Tout le détail est dans `references/moteur.md`.

Règles de mise en scène, que Maé a toutes demandées :
- **Varier les points de vue à chaque plan** : plan large, gros plan visage (`camFace`), vue subjective, ras du sol, plongée, contre-plongée, par-dessus l'épaule, orbite (`orbite`), descente « drone », insert sur un objet. Ne mets jamais deux plans de suite du même type.
- **Vraie 3D dès que la perspective compte.** Un billboard 2D vu d'en haut ou de très bas « fait plat ». Dans ces cas-là, utilise un perso 3D (`surveillant3D`, tenue `'vrai'` pour un humain) et des objets en boîtes (`boite`).
- **Beaucoup de décor, jamais de grande zone vide** (noire, grise ou marron). Ajoute des couleurs sur les murs, des cadres, des plantes, des lumières, des détails au plafond et au sol.
- **Lumière vivante** : néons ou lampes qui grésillent, halos chauds, lueur de TV ou de téléphone, pluie.
- **Lumières d'ambiance pour le réalisme** (retour du 26/10) : en plus de la lumière principale, ajoute toujours plusieurs petites sources : diodes, écrans, reflets sur le sol, liserés lumineux, taches de lumière sous les lampes, rim light colorée sur les persos (teinte qui change avec un gyrophare), lueur qui déborde d'une porte. Un décor éclairé par une seule source paraît plat.
- **Secousses douces.** Quand un objet vibre, seul l'objet tremble (le téléphone), pas toute la caméra. Les gros chocs restent rares et courts.
- **Téléphone** : notification sur l'écran verrouillé, puis « écrit… », puis la bulle. Laisse le temps de lire (2 s minimum par message). Les messages déjà reçus restent affichés.
- Les éléments graphiques apparaissent **sur le mot** prononcé (`repere(scene, mot, défaut)`).

Contrôle avec `node apercu.mjs <Composition> out/planche.png <images…>` (25 images max par appel, `ECH=0.6` pour zoomer). Prends l'image du milieu de chaque plan, regarde la planche et corrige avant le rendu complet.

## Étape 4 : voix, bruitages, sous-titres

Voir `references/son-voix.md`. En résumé :
1. `python3 voix/caler_voix.py <voix.mp3> 1.05 <projet> 0.24 0` : coupe les blancs, accélère de 5 %, **ne remonte pas les chuchotements** (dernier argument à 0), normalise, aligne les phrases sur les pauses. Le script écrit `src/<projet>/timeline.json` (avec les repères de mots) et `voix/<projet>/mots.json`.
2. `voix/<projet>/mixage.py`, copié de `voix/exemple/mixage.py`, synthétise les bruitages calés sur les scènes et les mots. Prévois une ambiance forte au début si une coupure suit (pour le contraste). Les sons du téléphone sont la notification, les clics de frappe et un pop par bulle. Les sons baissent sous la voix.
3. `voix/<projet>/assembler.sh` fait le mixage, les sous-titres (Montserrat Black, ligne active en rouge, 7 à 9 emojis) et la compression à environ 3,2 Mb/s (moins de 30 Mo).

## Étape 5 : rendu et livraison

1. Lance le rendu en arrière-plan : `npx remotion render <Comp> out/<x>_brut.mp4 --concurrency=$(nproc) --browser-executable=<chrome-headless-shell>`, puis `assembler.sh` dans la même commande.
2. Vérifie avec une planche ffmpeg (`fps=1/4,tile=8x2`) et `volumedetect` (moyenne autour de −16 dB, crête sous −0,5 dB). Tu ne peux pas écouter : dis ce que tu as mesuré.
3. Commit et push, puis envoie la vidéo (SendUserFile) avec un résumé de ce qui a changé.
4. Si Maé la demande, donne la **description** : titre + « | Partie 1 », 2 lignes d'accroche, la question du dilemme, « Le choix le plus liké décide de la partie 2. », puis 5 ou 6 hashtags adaptés au thème.

## Itérations

Maé renvoie presque toujours une liste de retours précis. Traite **chaque point**, vérifie-le sur une planche, puis re-rends. Ensuite, résume point par point ce qui a été fait. Ajoute ses nouveaux retours à `references/preferences.md` (et les nouveaux pièges à `lecons.md`) pour que la vidéo suivante en profite.
