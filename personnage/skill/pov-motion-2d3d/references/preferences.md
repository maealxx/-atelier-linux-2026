# Les préférences de Maé (tout ce qu'elle a demandé, validé ou corrigé)

## Format
- TikTok vertical 1080×1920, 30 i/s, **au moins 60 s** (un peu plus long accepté).
- Première phrase : **« Imagine… »**. L'intrigue commence **tout de suite**, sans longue mise en place.
- Narration au « tu », phrases courtes. Le texte remplit toute la vidéo : **pas de blanc**.
- Fin en **dilemme** : deux étiquettes (emoji + question courte) apparaissent sur les mots, puis une bulle « DIS-LE EN COMMENTAIRE ».
- Description : « <Titre> | Partie 1 », 2 lignes d'accroche, la question, « Le choix le plus liké décide de la partie 2. », puis des hashtags.

## Personnage et style
- **Toujours le même bonhomme 2D** (t-shirt corail, jean bleu, cheveux violets), même style d'animation, jamais redessiné.
- Il doit être **bien animé et visible en entier** quand on le voit en pied. « On voit que le haut » est un défaut à corriger : il ne doit jamais être coupé par un sol ou un meuble mal trié.
- Monstres et créatures en **vraie 3D** (`surveillant3D`), pas en dessin plat. Les humains vus en plongée ou contre-plongée aussi (tenue `'vrai'`).
- **Plus de 3D et de perspective** dans les décors : volumes, balcons, meubles en boîtes, bâtiments immenses, manoir « salle des fêtes » très grand.

## Accroche et texte (retour du 26/10, « Le vaisseau »)
- **Les 5 premières secondes** doivent être visuellement stimulantes : action, mouvement, lumière forte dès la 1re image. Le réveil dans la capsule (buée, plafond) était trop calme pour une ouverture.
- **Plus de « tu fais ça »** (actions du spectateur), **moins de description du décor**, qui peut ennuyer. Ex. à éviter : « L'air est glacé, et ça sent le métal brûlé », « Autour de toi, des dizaines de capsules alignées ». À préférer : « Tu arraches les tuyaux de ton bras », « Tu poses un pied par terre ».
- Ce qu'elle a aimé : le décor 3D du vaisseau, les capsules, le hublot avec la Terre, les deux screamers, la salle des écrans avec la caméra de surveillance en direct, l'alien en 3D.

## Rythme et caméra (son retour le plus positif : « c'est pile ce que je voulais »)
- **Correction du 26/10 (roulette)** : « certains plans sont trop dynamiques, ça fait mal à la tête ». Garde des plans de **2 à 3 s**, un coup de zoom léger (`punch(t, 0.04)`), un roulis faible et fixe (±2°), des mouvements de caméra lents. Évite les caméras qui suivent un objet qui tourne vite (la bille) : fige-les et laisse l'objet traverser le cadre. Cette consigne passe avant les « plans de 1 à 2 s » ci-dessous.
- Des **plans de 1 à 2 s**, avec un point de vue différent à chaque plan : large, visage, subjectif, ras du sol, plongée, contre-plongée, par-dessus l'épaule, orbite, drone, insert.
- Un **coup de zoom** (`punch`) à chaque coupe et un **roulis** (image penchée) qui change.
- Quand l'action se répète (une marche, une attente), on change de point de vue ou de décor.
- Il faut du **mouvement** : la caméra avance, tourne, descend. Des voitures passent, il pleut, les lumières grésillent.
- **Secousses** : jamais violentes. Un téléphone qui sonne fait trembler **le téléphone seulement**. Les coups et les chocs ne bougent la caméra que légèrement.

## Décor et lumière
- **Beaucoup de décor**, aucune grande zone vide : pas de bande noire, grise ou marron continue en haut ou au sol. Le sombre est accepté, mais il doit toujours y avoir quelque chose : poutres, moulures, cadres, néons, fenêtres, plantes.
- **Lumière qui bug** : néons et lampes qui grésillent en haut de l'image, ça donne de l'ambiance.
- Intérieurs : lumière du soir **pas trop forte** mais **colorée**. Murs de couleurs différentes (bleu canard, papier peint, vert sauge), lambris, plinthes blanches, appliques, guirlandes, tapis colorés. Elle a trouvé « trop fade » un appart tout marron.
- Les couloirs ne doivent pas être répétitifs : varie les portes, affiches, casiers, éclairages.
- Une rue de nuit doit être **vivante** : vitrines éclairées (laverie, snack), enseignes qui clignotent, voitures, arbres, flaques, pluie, colonne Morris.
- Les ombres et silhouettes « horreur » doivent être **crédibles** : floues, bras ballants, tête qui se tord, révélées une par une avec un son. Les photos sont prises au flash, avec du grain et une silhouette de trop.

- **Lumières d'ambiance** pour le réalisme : plusieurs petites sources en plus de la principale (diodes, écrans, liserés au sol, reflets, taches de lumière, lueur de porte, rim light colorée sur les persos).

## Téléphone et messages
- Notification sur l'écran verrouillé, puis la conversation, avec « écrit… » avant chaque bulle.
- **Prendre le temps de montrer les messages** (au moins 2 s lisibles, zoom sur la bulle).
- Sons : vibreur, notification, clics de frappe, pop de bulle. Une alerte peut être rouge, avec une bulle qui apparaît lentement.

## Tension et stress (« Et si tu misais 1 000 € ? »)
- Maé a demandé un **chrono avec millisecondes** (centièmes) qui décompte le tour de roulette : grand, en haut, rouge sous 3 s, « RIEN NE VA PLUS » sous 2 s, clignote à 00:00.00.
- Pour **ressentir le stress du perso** : compteur de BPM avec tracé ECG, vignette rouge qui bat au rythme du cœur, battements audibles au même BPM, sueur, tremblement, yeux qui suivent la bille, silence total au moment clé (avec ses yeux fermés plutôt que la case visible).
- Quand un objet est la star (la roue), on le montre **sous tous les angles** : dessus, ras, macro qui suit la bille, orbite, case en gros plan.
- La première image doit déjà être en pleine action (bille lancée, chrono qui tourne) avec la question en haut.

## Rendu propre et « shaders » (retour du 27/10, « La tente »)
- Maé veut un rendu **plus propre, moins brouillon, avec des shaders**. Toujours :
  - **lumière en dégradés lisses** plutôt qu'en facettes (un `radialGradient` en `userSpaceOnUse` centré sur la source, posé sur chaque pan : voir `tenteInt`) ;
  - **moins de petits détails parasites** (herbe, lucioles, étoiles qui clignotent fort), grain du SVG faible (`<Plan grain={0.025}>`) ;
  - halo doux (copie floutée) derrière les sources vives (flammes) ;
  - la **passe de post-traitement** `voix/postfx.sh` (bloom, étalonnage ciné ombres bleues / lumières chaudes, légère aberration chromatique, vignette, grain fin) entre le rendu et le mixage, dans `assembler.sh`.
- Pas de GPU dans l'environnement : les « shaders » sont faits par ffmpeg (CPU). Le dire si elle demande du GLSL.

## Son
- **Pas de crépitement de feu** (demande du 27/10).
- La **voix ElevenLabs** de Maé, légèrement accélérée (environ 5 %), avec les blancs raccourcis sans les supprimer. Elle doit rester agréable.
- **Pas de pause dans le script audio** (26/10) : pas de `[pause]` / `[long pause]`, presque pas de « … ». Sinon on perd du temps de parole et la vidéo est trop longue.
- **Ne pas remonter le volume des chuchotements** (elle l'a demandé). Si un premier jet de voix contient trop de souffles, elle refait la voix : dis-le-lui.
- Bruitages discrets qui ne couvrent pas la voix. Une **ambiance forte au début** quand il y a une coupure (ex. musique de fête), pour le contraste. Utilise des silences totaux aux moments clés.
- **Pas de « TAP TAP »** ni d'onomatopées écrites à l'écran.

## Textes à l'écran
- **Aucun texte ajouté en plus des sous-titres** (demande du 26/10) : pas de titre, pas de chiffres qui claquent, pas de pastille de résultat, pas d'emojis qui pop. On garde seulement les éléments d'interface demandés (chrono, cœur/BPM) et le dilemme final.

## Sous-titres
- Montserrat Black, majuscules, 1 à 3 mots, ligne active en **rouge**, pop d'apparition, quelques emojis Twemoji (7 à 9) sur les moments forts.
