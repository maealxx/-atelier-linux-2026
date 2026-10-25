---
name: pov-horreur-2d
description: Atelier des vidéos d'horreur POV « Imagine… » de Maé, en motion design 2,5D. On y retrouve le même bonhomme 2D (t-shirt corail, jean bleu), les mêmes décors de nuit, la même créature, et un montage rapide en plans courts avec sous-titres, bruitages et voix off. Le skill couvre tout le chemin, de l'idée au script audio pour ElevenLabs, puis le rendu Remotion jusqu'à la vidéo sous-titrée prête pour TikTok (9:16, ~60 s). Utilise ce skill dès que Maé veut une nouvelle histoire flippante en POV (« imagine tu… »), une partie 2 / suite du « Dernier bus », réutiliser le bonhomme ou les décors, ajouter sa voix ElevenLabs à une de ces vidéos, ou refaire « la même vidéo que le bus / le métro », même si elle ne cite ni Remotion ni le skill.
---

# POV horreur 2D — l'atelier du bonhomme

Maé fait des vidéos TikTok d'horreur en POV : « Imagine tu rates le dernier bus… ». Elles sont animées en 2,5D, avec **son** bonhomme et **ses** décors. Tout le matériel existe déjà dans son dépôt GitHub. Le but est de le **réutiliser** pour que chaque vidéo ait le même style, et non de redessiner.

- Dépôt : `maealxx/-atelier-linux-2026`, branche `claude/personnage-2d`, dossier **`personnage/video/`** (projet Remotion).
- Vidéo de référence : `personnage/dernier-bus.mp4` (« Le dernier bus », partie 1).
- La fiche de chaque personnage, décor et type de caméra est dans `references/bibliotheque.md`. Lis-la avant d'écrire une scène.
- Les pièges déjà rencontrés et leurs solutions sont dans `references/lecons.md`. Lis-la avant le premier rendu.

On travaille en français, avec un ton jeune et direct. On valide avec Maé à la fin de chaque étape importante (le script surtout) avant de lancer un rendu de 10 minutes.

## Étape 0 — Récupérer le projet et installer

1. Si le dépôt n'est pas dans la session, ajoute-le (`add_repo` du serveur claude-code-remote), puis clone-le et place-toi sur la branche `claude/personnage-2d`. S'il existe une branche plus récente pour une nouvelle vidéo, demande laquelle prendre.
2. Pour une **nouvelle histoire**, crée une branche dédiée (`claude/pov-<sujet>`) à partir de `claude/personnage-2d`. Pour une suite, reste sur la branche de l'épisode.
3. Lance `bash scripts/installer.sh <repo>/personnage/video <scratchpad>/outils`. Le script installe Remotion, Kokoro (voix guide), la police Montserrat Black et les emojis Twemoji. Il reprend là où il s'est arrêté, donc tu peux le relancer.

## Étape 1 — Le script

Propose **3 pitchs** de 2 lignes chacun (situation banale de nuit, escalade, choix final), sauf si Maé arrive avec une idée. Ensuite, écris le script selon la même mécanique que « Le dernier bus » :

- **~12 scènes et ~60-66 s.** Chaque scène correspond à un paragraphe de 2 à 4 phrases courtes. **Il ne faut aucun blanc** : le texte remplit toute la vidéo, sinon c'est mou. Maé l'a demandé explicitement.
- **Une narration au « tu »**, au présent, avec un détail précis dans la première phrase (« Minuit quarante-sept. »).
- **Une montée en 3 temps** : on installe la situation banale, puis trois ou quatre trucs flippants de plus en plus forts, puis la révélation avec la créature ou la vérité.
- **Une fin en dilemme pour le spectateur** : « Tu montes ou tu restes ? Dis-le en commentaire ! ». À l'écran, deux étiquettes de choix apparaissent avec un emoji, puis une bulle « DIS-LE EN COMMENTAIRE ». Pour une série, le choix le plus liké décide de la partie suivante.
- **Un objet fil rouge** qui revient, comme le post-it « SURTOUT NE PAS MONTER DANS LE BUS », et qu'on voit en insert plusieurs fois.
- Ton direct, phrases sèches, quelques mots familiers (« dégueulasse », « t'as »). Pas de gros mots ni de gore explicite : la peur passe par la suggestion.

Présente-le en tableau : n°, nom court de la scène (identifiant sans accent), texte, puis ce qu'on voit à l'écran.

**Arrête-toi et fais valider le script.**

## Étape 2 — Le script audio pour ElevenLabs

Une fois le script validé, donne-le prêt à coller dans ElevenLabs (modèle v3). Ajoute des balises d'intention entre crochets : `[whispers]`, `[nervous]`, `[fast]`, `[sighs]`, `[scared]`, `[disgusted]`, `[slow]`, `[very quiet]`, `[normal voice, fast]`, `[excited]` pour la question finale. Mets un paragraphe par scène.

Réglages conseillés : une voix de narrateur grave et posée (Maé a utilisé « Paul K – Deep French Narrator »), Stability à 30-40 %, vitesse 1,05-1,1. Si un passage sort mal, elle régénère ce paragraphe seulement.

Tant qu'elle n'a pas envoyé sa voix, le minutage vient de la **voix guide** (Kokoro, étape 4). Cette voix guide ne va pas dans la vidéo : Maé n'en veut pas.

## Étape 3 — Construire les scènes

Duplique `src/DernierBus.jsx` en `src/<Histoire>.jsx` et ajoute une `<Composition>` dans `src/Root.jsx`. Garde l'architecture suivante, c'est elle qui donne le style :

- **Le monde 3D** : `makeCam` (caméra avec lacet, tangage et roulis, découpe au plan proche), avec les décors `rue()`, `ruelle()` et `vague()`, plus le `bus()`. Pour un nouveau lieu, écris une fonction décor qui suit le même contrat : `{fond, items, brume}`. Les `items` sont triés en profondeur. Le détail est dans `references/bibliotheque.md`.
- **Les personnages** sont des *billboards*, c'est-à-dire des dessins plats posés dans le monde 3D. Le bonhomme passe par `<Perso … dos={dosPour(cam, z, dir)} />`. Il n'existe que de face et de dos, donc on ne le filme jamais vraiment de profil.
- **Le montage en plans courts** est ce qu'elle a préféré. Chaque scène est découpée en 3 à 5 plans de 1 à 2 s, avec des poids dans `src/plans.json`. Dans le composant, `decoupe(nom, f)` donne le plan en cours, et un tableau `cams[i]()` donne une caméra différente par plan. Il y a un coup de zoom à chaque coupe (`zoom={punch(t)}`) et un `roll` (image penchée) qui change à chaque plan. Varie les points de vue : gros plan visage (`camFace`), pieds au ras du sol, vue subjective, plongée, contrechamp, insert sur l'objet fil rouge, orbite (`orbite`), caméra sur la route devant un véhicule. Évite deux plans de suite de même type.
- **L'éclairage** : les lampes, ampoules et néons grésillent (`flick`). Le perso est éclairé selon la source proche (`lum`, `teinte`). Il y a de la brume au loin, la vignette et le grain viennent de `<Finition>`.
- Les **repères de mots** (`repere('scene', 'mot', defaut)`) font apparaître les éléments graphiques (étiquettes du dilemme, flash) au moment où la voix dit le mot.

Contrôle **avant** le rendu complet avec `node apercu.mjs <Composition> out/planche.png <images…>`. Le script recompile une seule fois et colle une planche. Prends l'image du milieu de chaque plan, environ 25 images par appel pour rester sous 10 minutes, puis regarde la planche. Corrige ce que tu vois : un plan collé à un mur, un perso hors cadre ou trop petit, un texte coupé, une étiquette qui cache un visage, des yeux rouges qui passent devant une tête…

## Étape 4 — Minutage, voix et sous-titres

Le texte des scènes est dans la liste `SCENES` de `voix/generer.py`. C'est la seule source de vérité : `caler_voix.py` la relit.

- **Sans voix de Maé** : lance `python3 voix/generer.py <outils>/tts`. Il lit le texte avec la voix guide à un débit rapide (speed 1,12, pauses courtes) et écrit `src/timeline.json` (durée de chaque scène) et `voix/mots.json` (les mots horodatés). La voix guide ne sert qu'au calage.
- **Avec sa voix ElevenLabs** (le cas normal pour la version finale) : copie le fichier dans `voix/eleven/`, puis lance `python3 voix/caler_voix.py voix/eleven/<fichier> 1.05`. Le script :
  - ramène les blancs à environ 0,15 s ;
  - remonte les chuchotements (+12 dB au maximum) ;
  - accélère sans changer la hauteur ;
  - normalise à −15 LUFS ;
  - retrouve chaque bout de phrase grâce aux pauses ;
  - réécrit `timeline.json` et `mots.json`.

  Lis la liste qu'il affiche : chaque ligne doit montrer le bon texte sur la bonne plage de temps. Garde la vidéo **au-dessus de 60 s** : si l'accélération la fait descendre en dessous, baisse la vitesse (1,05 au lieu de 1,1).
- Les **bruitages** sont synthétisés par `voix/mixage.py` (ambiance, pas, swoosh à chaque coupe, pulsation qui accélère, impacts, montée avant la créature, battements de cœur). Ils sont discrets et baissent d'eux-mêmes sous la voix. Pour une nouvelle histoire, adapte les blocs qui visent des scènes par leur nom (`tps("busVieux", 120)`…).
- **Assemblage** : `bash voix/assembler.sh <outils>/st ../<nom>.mp4`. Il mixe les bruitages et la voix, incruste les sous-titres (Montserrat Black, majuscules, 1 à 3 mots, ligne active en **rouge**, pop, quelques emojis Twemoji), puis compresse à environ 3,2 Mb/s pour rester sous 30 Mo. Change la liste `emojis` du JSON dans le script : 7 à 9 moments forts, avec un mot-clé assez long pour ne pas tomber à l'intérieur d'un autre mot.

## Étape 5 — Rendu et livraison

1. Lance le rendu complet **en arrière-plan** (`run_in_background`), il prend environ 10 minutes pour une minute de vidéo : `npx remotion render <Composition> out/brut.mp4 --concurrency=$(nproc) --browser-executable=<chrome-headless-shell>`. Enchaîne ensuite avec `assembler.sh` dans la même commande.
2. Vérifie le résultat :
   - une planche d'une image toutes les 3 s (`ffmpeg … fps=1/3,tile=11x2`), où les sous-titres doivent tomber sur les bons plans ;
   - `volumedetect`, avec une moyenne autour de −15 dB et des crêtes sous −0,5 dB.

   Tu ne peux pas écouter : dis-le à Maé et décris ce que tu as vérifié.
3. Commit et push sur la branche. Ne versionne pas `out/` (déjà ignoré) ni les WAV temporaires. Envoie la vidéo avec SendUserFile.
4. Donne la **description TikTok** : titre + « | Partie N », 2 lignes d'accroche, la question du dilemme, « Le choix le plus liké décide de la partie N+1 », puis 5 à 6 hashtags (#horreur #pov #creepy #histoireflippante #animation #partieN).

## Pour une suite (partie 2, 3…)

Reprends la fin exacte de l'épisode précédent : le même lieu, la même créature, le même objet fil rouge. Suis aussi le choix le plus liké, que Maé te donne. Réutilise les plans et les décors existants et n'ajoute que ce qui est nouveau. Le premier plan doit raccrocher en moins de 2 s (« Tu as choisi de monter… »).
