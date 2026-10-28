# Les décors déjà construits

Chaque décor est une fonction `(cam, f, options) → {fond, items, brume}`. Tu passes ensuite le résultat à `<Plan decor={…} />`. Tous les décors marchent pour n'importe quel thème : change la lumière (`lampes`, `neon`, `lampe`…), le voile `noir` de `Plan` et la teinte des persos.

Pour un **nouveau lieu**, copie le décor le plus proche et garde le même contrat :
- les murs, le sol et le plafond en `ry`, `rx`, `rz` dans `fond` ;
- les meubles en `boite` dans `items` ;
- les affiches en `plaque` ;
- les lumières en halos ;
- une brume centrée sur `cam.fuite`.

Remplis les murs (couleurs, cadres, lambris, fenêtres) pour éviter les zones vides.

## Extérieurs
| Décor | Fichier | Contenu | Options utiles |
|---|---|---|---|
| `rue()` | Rue.jsx | Rue de nuit qui file vers +Z : immeubles et fenêtres, lampadaires orangés, trottoirs (`SOL` 432) et chaussée (`ROUTE` 470), abribus « LIGNE 42 », parc avec balançoire. Caméra autour de X ≈ 0 à 400, Z −60 → 60. | `lampe(l)`, `fenetre(cle, défaut)`, `balancoire`, `panneau` |
| `bus()` | Rue.jsx | Bus en 3D : face, flanc, portes, phares, girouette. | `zp`, `sens`, `numero`, `interieur`, `porte` (0 → 1), `phares`, `chauffeur`, `vieux` (rouillé) |
| `ruelle()` | Decors.jsx | Ruelle en briques étroite (X ±430), câbles, bennes, flaques, ampoules sur potence. | `ampoule(i)` |
| `vague()` | Decors.jsx | Terrain vague, ville au loin, vieil arrêt de bus abandonné avec un post-it. | `neon` |
| `jardin()` | Maison.jsx | **Manoir géant** (salle des fêtes) : façade Z 10 (X ±4000, 2 étages + combles + ailes), 20 fenêtres, porche à colonnes et perron, terrasse, baie vitrée, parc, fontaine, haies, grille + portail cadenassé (Z −3), lampadaire de rue, guirlande, enceinte. | `fete`, `fenetre(k)`, `rouge(k)` (silhouettes rouges), `gens` ('danse' \| 'immobile'), `sourire`, `tord`, `porte`, `lampadaire`, `cadenas`, `vitre` |
| `quartier()` | Appart.jsx | **Rue vue du 4e étage** : notre immeuble (façade Z 10, 6 étages de 1100, balcons 3D, laverie, snack « TACOS », hall), immeubles d'en face (pharmacie), chaussée Z 0.4 → 6.6, trottoir Z 6.6 → 10, voitures garées, arbres, colonne Morris, banc, poubelles, scooter, lampadaire (−900, Z 7), pluie 3D. | `livreur: {x, z, coucou, angle}` (humain 3D), `passage` (X d'une voiture qui roule phares allumés), `forme` (chose accrochée à la façade), `dansFenetre` (élément derrière notre vitre : `NOTRE` = fenêtre du 4e), `lampe`, `pluie` |

## Intérieurs
| Décor | Fichier | Contenu | Options utiles |
|---|---|---|---|
| métro (ancien) | Metro.jsx | Ancienne scène autonome (vieux mini-moteur). Pour un métro, utilise plutôt `quai()` de Gare.jsx. | — |
| `classe()` | Lycee.jsx | Salle de classe (X ±950, Z −1.5 → 7) : tables, tableau, fenêtres, frise, étagères. | `neon`, `craie` (texte qui s'écrit), `horloge`, `lune` |
| `couloir()` | Lycee.jsx | Long couloir de lycée (X ±520, Z → 30) : casiers colorés, portes, affiches, néons, flèches. | `neon(k)`, `casier(z)`, `fleche`, `porteRouge`, `ouvreRouge`, `eclats` |
| `escalier()` / `volee()` | Lycee.jsx | Cage d'escalier vue d'en haut (vertige), volée de marches. `marcheY(z)` donne la hauteur des marches. | `lumiere`, `ampoule` |
| `appart()` | Appart.jsx | **Appartement** : salon (X ±1500, Z 0 → 6, plafond −620) en couleurs (bleu canard, papier peint, vert sauge), poutres. Porte d'entrée (X 650 → 1050, judas), canapé, table basse, TV, bibliothèque + guirlande, cuisine, fenêtre sur la ville, monstera, appliques, galerie de cadres, horloge, guitare, tapis. Couloir (X 1500 → 3600) et **chambre** au bout (lit, armoire, fenêtre ouverte, rideaux au vent). | `tv`, `lampes`, `choc` (porte qui tremble), `fente` (ombre sous la porte), `cadre` (le cadre tombe), `fenteChambre`, `porteChambre` (0 → 1), `monstre` (élément 3D dans la chambre), `rideau`, `lumiereChambre` |
| `palier()` | Appart.jsx | Couloir d'immeuble (X ±3500, Z 6 → 7.6) : portes 41/43/45, ascenseur, sortie de secours, néons, extincteur, panneau d'affichage. À filmer depuis le judas : `JU = {x: 850, y: -160, z: 6.02}` avec `<Judas>`. | `neon(k)`, `faux: {x, z, tilt, sy}` (quelqu'un devant la porte), `sac` |

## La station de métro (Gare.jsx)
| Décor | Contenu | Options utiles |
|---|---|---|
| `quai()` | **Station de métro** (Z 0 → 28) : quai à gauche (X −1500 → 0, `SOL`), voies à droite (fosse X 0 → 1800, ballast `FOSSE` = 852, rails, traverses, rail de traction, niches), **voûte elliptique carrelée** (naissance −420, sommet −1320), bandeau bleu canard, plaques bleues « SAINT-OUBLI », plan du réseau, 5 pubs rétroéclairées sur le mur d'en face, 4 piliers carrelés (`PILIERS`) dont un avec **haut-parleur** (`HP`) et une caméra de surveillance, bancs orange, distributeur lumineux, **panneau horaire** suspendu LED orange (`HORAIRE`), passage vers la sortie avec panneau vert « SORTIE », **tunnels** aux deux bouts (Z −20 → 0 et 28 → 48) avec lampes orange et signaux. Lumière d'ambiance : diodes au bord du quai, reflets des néons sur le sol mouillé, flaques. Renvoie aussi `L(z)` (lumière reçue à la profondeur z, pour `lum` du perso). | `neon(n)` (néons `NEONS_Z`, tous les 2 Z, on les éteint un par un), `pubs(z)`, `horaire` (texte), `hp` (0 → 1 : le haut-parleur parle), `signal` ('rouge' \| 'vert'), `leds` |
| `rame()` | **Métro en 3D** (4 voitures de 3,7 Z, flanc côté quai en X 60) : vitres éclairées avec têtes des passagers, portes à deux vantaux qui coulissent, bandes de couleur, toit et clim, face avant (pare-brise, girouette, phares + faisceau sur les rails), feux rouges arrière, lumière des fenêtres sur le quai. `voitures(tete)` et `portesDe(v)` donnent les positions. | `tete` (Z de l'avant, roule vers +Z), `portes` (0 → 1), `lumiere`, `phares`, `feux`, `fantome` (vieux, sale, lumière verte, girouette vide), `bip` (voyants rouges qui clignotent), `dedans: {k, rendu}` (intérieur détaillé d'une voiture vu par ses ouvertures) |
| `wagon()` | **Intérieur d'une voiture** (X 80 → 1040, plafond −700) : tube lumineux, sol, banquettes bleues, barres jaunes, fenêtres sur le tunnel, pubs, portes d'intercirculation, passagers (`passagers: [{x, z, id, ...props du Perso}]`). Sert de décor quand la caméra est dedans, ou de `rendu` pour `rame({dedans})`. | `cz` (centre), `lumiere`, `fantome`, `passagers` |
| `escalators()` | **Galerie d'escalators** en pente à 30° (`solEsc(z)` : SOL au palier du bas Z < 1,5, `HAUT` au palier du haut Z > 9,5) : deux escalators avec marches qui défilent, balustrades et mains courantes, séparation centrale à **lampadaires** chauds, affiches inclinées, néons, paliers dallés avec plaques peignes, **grille de sortie** en treillis (`GRILLE_Z`) qui descend, hall orange et panneau « SORTIE » derrière. | `grille` (0 ouverte → 1 fermée), `marche` (vitesse des marches), `lumiere` |

## La maison du baby-sitting (Enfant.jsx)
| Décor | Contenu | Options utiles |
|---|---|---|
| `chambreEnfant()` | **Chambre d'enfant de nuit** (X ±1300, Z 0 → 5,2, plafond −1000) : lit (`LIT_E`) avec couette rose à pois, oreiller, Léna couchée (`Tete`), **veilleuse** qui projette des **étoiles colorées qui tournent** sur les murs et le plafond (lumière en dégradé lisse), **trappe du grenier** au plafond (`TRAPPE`, charnière côté fond) avec poutre et **yeux qui brillent**, fenêtre sous la pluie (gouttes, éclairs), porte sur le palier (lumière chaude), étagère avec la caméra du babyphone (`CAMERA_B`, diode rouge), armoire, commode, tipi, cubes, lapin, tapis rond, poster, lune murale, lettres « LÉNA », étoiles phosphorescentes, clair de lune au sol. | `veilleuse`, `trappe` (0 → 1), `yeux`, `porte`, `lena: {visible, yeux, regard, tourne}`, `couette: {respire, bosse, leve}` (le drap se lève comme un fantôme), `main` (main grise aux longs doigts) |
| `escalierMaison()` | Escalier en bois (14 marches, `ySolEsc(z)`), rampe à barreaux, papier peint rayé, cadres qui montent, applique chaude, palier et **porte de Léna** (lettres, étoiles derrière, lueur sous la porte). | `porte` (0 → 1), `applique` |
| outils | `eclair(fg)` (flashs d'orage aux images `ECLAIRS`), `<Pluie f force />` (pluie en deux couches, par-dessus l'image). | — |

## La forêt de nuit (Foret.jsx)
| Décor | Contenu | Options utiles |
|---|---|---|
| `clairiere()` | **Clairière de nuit** centrée en (0, Z 8) : ciel étoilé, **lune** (`LUNE`), collines, ~140 sapins en billboards (bord éclairé par la lune, bas éclairé par le feu), herbe, brume au ras du sol, lucioles, bûche, sac à dos, glacière. Le **feu de camp** (`FEU`) éclaire le sol en orange, vacille (`vacille(f)`), projette les **ombres des arbres** ; flammes animées, étincelles, braises, fumée après extinction. La **tente** (`TENTE`, arête selon Z, porte en Z 8) en volume, toile qui s'éclaire de l'intérieur avec les **ombres chinoises** des occupants. Lampe torche au loin. Renvoie `v` (lumière du feu). Aucun arbre côté caméras (Z < 5,5). | `feu` (0 → 1), `fumee`, `braises`, `lumiereTente`, `silhouettes: [{x, y, z}]`, `porte`, `torche: {x, z}`, `lucioles` |
| `tenteInt()` | **Intérieur de la tente** : toile découpée en petits pans éclairés par la **lanterne** (`LANTERNE`, la lumière décroît avec la distance, renvoie `L(p)`), tapis de sol, porte en arche avec **fermeture éclair qui s'ouvre** sur la nuit, **ombre de quelqu'un dehors** projetée sur la porte (plus visible quand la lanterne faiblit), torche au loin par la fente. | `lampe` (0 → 1, grésille), `porte` (0 → 1), `ombre` (0 → 1), `torche` |
| outils | `ombrePortee(cam, x, z, lx, lz, {long, large, op})` : ombre au sol à l'opposé d'une lumière. `Tete` : tête couchée vue d'au-dessus (`yeux`, `ronfle`, `grin` = sourire beaucoup trop large, `regard`, `tourne`), à poser en `plaque` horizontale sur un oreiller (voir `sacs` dans LaTente.jsx). | — |

## La forêt du crépuscule à la nuit (ForetNuit.jsx) — style épuré, contre-jour, brume
| Décor | Contenu | Options utiles |
|---|---|---|
| `foret(cam, f, opts)` | **Forêt de grands troncs** autour d'un sentier droit selon Z (X ±300, sinueux) : ~550 troncs générés (la canopée sort du cadre), toujours tournés vers la caméra (on peut faire des demi-tours), **liseré clair côté lumière** (contre-jour), branches, écorce de près, buissons, feuilles mortes au sol (sensation d'avancer), **bandes de brume** entre les plans qui suivent le regard, **halo** de la lumière (soleil couchant ou lune) avec **rayons** au-dessus de l'horizon, poussière dans la lumière. Le **gros chêne** `CHENE` (cachette), les deux arbres `DEUX` (face-à-face), la lampe `LAMPE` au loin. Renvoie `{fond, brume, items, poussiere, L, P}` : mets `poussiere` et `<Voile L P />` (diffusion douce de la lumière) dans `dessus`. | `nuit` (0 crépuscule orange-rose → 1 nuit bleu-violet), `lumYaw` (direction de la lumière en degrés : 180 = derrière quand on regarde vers +Z), `lumY`, `rim`, `portee` (distance de brume), `brume`, `rayons`, `degage: [[x0, z0, x1, z1, demi-largeur]]` (couloirs sans arbres : ligne de vue vers la lampe, la créature) |
| repères | `SOL` 432, `OEIL` −150 (debout), `ACCROUPI` 170. Caméra portée : `main(f)` (dérive), `pas(f, v, amp)` (balancement de marche/course) dans RentrezChezVous.jsx. | — |

## Le chalet dans la tempête (Chalet.jsx)
| Décor | Contenu | Options utiles |
|---|---|---|
| `chalet(cam, f, o)` | **Intérieur en rondins** (X ±1300, Z 0 → 2,6, plafond −1000, poutres) **éclairé polygone par polygone** (feu de cheminée qui vacille, fenêtre froide, lampe à pétrole, applique près de la porte, flash rouge d'alerte) : cheminée en pierre (`FEU`), table avec lampe et **téléphone posé** (`TEL_T`, écran qui s'allume), **porte** (`PORTE`, charnière gauche, poignée qui tourne, verrou qui saute, lumière dessous avec **ombres de pieds**), **fenêtre** (`FEN`) sur la tempête (sapins, neige, et ce qu'on y met), **lit** (`LIT`, 170 de vide dessous pour la vue « sous le lit »), **armoire à persiennes** (`ARM`), tapis, porte-manteau. | `feu`, `lampe`, `fenetre`, `applique`, `rouge` (0 → 1), `ecran`, `porte` (0 → 1), `poignee`, `verrou`, `coups` (la porte tremble), `pieds: [dx…]`, `armoire` (0 → 1), `dansArmoire` (caméra dedans : on ne dessine pas l'armoire, mets `<Lattes>` par-dessus), `dehors` / `dehorsPorte` (élément 3D vu par la fenêtre / la porte ouverte) |
| `chaletExt(cam, f, o)` | Le chalet vu de dehors (façade en rondins, toit enneigé, fenêtre chaude, lumière sur la neige, cheminée), à ajouter aux items d'une `foret(…, {neige: 1})`. | `lumiere`, `porte`, `perso` |
| outils | `boite(cam, [x0,x1], [y0,y1], [z0,z1], albédo, L, clé)` (boîte éclairée), `halo(cam, p, r, couleur, op, id)`, `<Neige f force vent rush />` (blizzard par-dessus l'image ; `rush` : les flocons foncent vers la caméra). | — |

## La ville de jour (Ville.jsx) — thèmes légers, pas d'horreur
| Décor | Contenu | Options utiles |
|---|---|---|
| `chambreJour()` | Chambre au soleil (X ±1400, Z 0 → 5, plafond −900) : murs pêche / menthe / lavande, parquet, fenêtre sur la ville (nuages qui passent), rideaux jaunes, **rayon de soleil** et poussières, lit (`LIT`), table de nuit avec lampe, plante, étagère de livres, affiches, guirlande, tapis rond. | `soleil` |
| `rueJour()` | **Rue commerçante de jour** (Z −5 → 60) : façades colorées à gauche (X −1600) avec fenêtres, volets, corniches ; boutiques `BOUTIQUES` (café, boulangerie avec pains en vitrine, **salle de sport** avec intérieur visible par la vitrine et miroir, fleuriste, pizza, librairie), stores rayés en pente, trottoir dallé, arbres tous les 12 Z, lampadaires, vélos, bancs, voitures garées, chaussée et passage piéton, immeubles d'en face, ciel et soleil. | `passants: [{x, z, id, ...props}]`, `salle: {gars: {x, z, ...props}}` (le gars dans la salle et son reflet), `boulangere` (props : elle derrière sa vitrine) |
| `boulangerieInt()` | Intérieur de boulangerie (X ±1300, Z 0 → 5,5) : étagères de pains et baguettes, ardoise, comptoir en bois avec vitrine de pâtisseries et caisse (`BO.comptoir` = 3), suspensions chaudes, sol en damier, mur carrelé bleu et blanc, baie sur la rue. | — |
| `busInt()` | Intérieur de bus (X ±1150, Z 0 → 10) : sièges orange par rangées (`RANGS`, face à +Z), barres jaunes, grandes vitres, **la ville qui défile dehors**, reflets du soleil qui glissent au sol. Pour un perso **assis** : `y = SOL − 20` et une caméra derrière la rangée de devant (le dossier cache les jambes). | `vitesse` |

## Le casino (Casino.jsx)
| Décor | Contenu | Options utiles |
|---|---|---|
| `casino()` | **Salle de casino** (X ±4500, Z −6 → 16, plafond −1700) : moquette rouge à losanges, plafond à caissons dorés, murs bordeaux à pilastres et appliques, enseigne néon « CASINO » (fond) et « JACKPOT » (devant), symboles ♠♥♦♣, 23 machines à sous qui clignotent, 4 piliers dorés, 4 tables voisines avec lampe, 6 lustres. | `rouge` (couleur de la brume), `lustres` (0 → 1.5), `neon`, `sans: ['voisines']` |
| `tableRoulette()` | Table de roulette au centre (plateau `TABLE_Y` = 90, X ±1250, Z 4.45 → 5.55) : rebord en cuir, tapis de mise plaqué (`mise` allume la case ROUGE), **la roue 3D** (`RoueDessin` de Roulette.jsx, en `ROUE` = (−760, Z 5), `ech` 0.36). | `th` (angle de la roue), `b` ({r, a, hop} de la bille), `allume(n)` (fait briller des cases), `lampe` |
| `lampeTable()`, `tableauNumeros()` | Lampe suspendue au-dessus de la table ; panneau lumineux « DERNIERS » numéros sur pied (à gauche de la roue). | `tableauNumeros(cam, f, liste, {nouveau, eclat})` |
| objets | `pileJetons(cam, x, z, n, couleur, key)`, `enveloppe(cam, x, z, key, {ouverte})` (« LOYER », billets), `rateau(cam, main, [x, z], key)`, `mains(cam, f, {serre, tremble})` (gros plan des mains crispées sur le rebord). | — |

**Les objets posés sur la table** (jetons, enveloppe, râteau) doivent être dessinés **dans l'item de la table**, après le tapis (voir `Vue` dans `Roulette1000.jsx`). Sinon, vus du côté du croupier, ils passent sous le tapis.

## Le vaisseau alien (Vaisseau.jsx)
| Décor | Contenu | Options utiles |
|---|---|---|
| `hall()` | **Salle des capsules** : long hall hexagonal (X ±1600, Z −1 → 26, plafond −1000, pans coupés), nervures métalliques tous les 3 Z avec néon et 2 gyrophares rouges, tuyaux et câbles, grilles d'aération (`GRILLES`), vapeur froide au sol, allée en caillebotis à liserés bleus, écrans muraux à diodes, porte blindée (Z −1), **hublot** au fond (Z 26) avec étoiles et Terre en vraie parallaxe. | `alarme` (gyrophares), `neons(z)`, `brume` |
| `capsule(cam, f, cote, z, k, opts)` | Capsule couchée le long d'un mur (`POD_Z`), socle, coque, matelas, dormeur (tête `Dormeur`, 5 visages), couvercle en verre demi-cylindrique qui bascule. | `ouvre` (0 → 1), `vide`, `griffee` (fêlures + griffes), `buee`, `lumiere`, `regard` (yeux du dormeur) |
| `couloirV()` | Couloir de fuite (X ±650, Z 0 → 48, plafond −650), néons tous les 3 Z, portes coulissantes blindées (`PORTES_V`) à bandes jaunes et voyant, gyrophares. | `neon(z)`, `porte(z)` (0 ouverte → 1 fermée), `alarme` |
| `salleEcrans()` | Salle de contrôle (X ±1400, Z 0 → 8, plafond −700) couverte de petits écrans animés, console lumineuse, **grand écran** (Z 8) qui affiche une autre vue 3D en direct (`flux`, voir `fluxHall` dans LeVaisseau.jsx), porte qui coulisse (mur gauche), **sas de la capsule de secours** (mur droit) avec intérieur éclairé. | `flux`, `porte`, `sas`, `alarme`, `lumiere` |

Vue « allongé dans la capsule » : `Couche` (LeVaisseau.jsx) dessine le bonhomme couché vu d'au-dessus, derrière une vitre embuée (`Buee`).


- `appart` : devant la TV `(820, Z 1.9)`, devant la porte `(850, 5.45)`, à la fenêtre `(-1220, 2.6)`, dans le couloir `(3000, 1.2)`.
- `quartier` : livreur sous le lampadaire `(-760, Z 7.35)`. Plongée depuis la fenêtre : `{x: 0, y: NOTRE.y1 - 180, z: 9.72, yaw: 180, pitch: 46 → 56}`.
- `casino` : joueur devant la case ROUGE `JOUEUR` = (359, Z 4.05), croupier `CROUPIER` = (−230, Z 5.95), case ROUGE `ROUGE_CASE` = (359, Z 4.675). Vue de dessus de la roue : `{x: −760, y: TABLE_Y − 1000, z: 4.98, pitch: 89}`.
- `jardin` : baie vitrée `(-2000, Z 9.7)` sur la terrasse (`SOL - 25`), pelouse `(-700, 6.2)`, devant le portail `(0, -2.4)`, perron `(0, 9.75)`.

## Exemples complets (à copier)
- `DernierBus.jsx` : rue, ruelle, terrain vague, bus.
- `SalleZero.jsx` : lycée, monstre 3D qui se retourne.
- `Soiree.jsx` : manoir, fenêtres rouges, téléphone, monstre « hôte ».
- `Livreur.jsx` : appart, judas, rue vue d'en haut, humain 3D, monstre au plafond.
- `Roulette1000.jsx` : casino, **roue 3D sous tous les angles** (dessus, ras, macro qui suit la bille, orbite), chrono du tour avec centièmes, BPM + vignette rouge qui bat, flashback sépia, croupier 2D. Les tours de roue et le cœur sont décrits dans `src/roulette1000/evenements.json` (lu aussi par le mixage).
- `LeVaisseau.jsx` : vaisseau, capsules, couloir, salle des écrans avec caméra de surveillance, alien 3D, deux screamers, voix guide puis vraie voix.
- `DernierTrain.jsx` : station de métro, escalators, grille qui se ferme (gros plan des mains en 2D : `MainsGrille`), néons qui s'éteignent un par un, chose 3D en ombre floue à contre-jour rouge (`chose`, marche avec `pasChose`), train fantôme qui arrive phares allumés, intérieur vu par les portes, **clones du bonhomme** qui tournent la tête (`passagers`).
- `LeBabyphone.jsx` : **téléphone réaliste** posé sur la table (3D) puis pris en main (CSS 3D, notifications en rafale, conversation), babyphone tenu en main avec la caméra en vision nocturne qui **pivote toute seule**, salon de nuit (appart + orage dans la fenêtre), manoir sous la pluie, chambre d'enfant, escalier, main grise, trappe, drap fantôme.
- `LaTente.jsx` : forêt de nuit, feu de camp qui s'éteint, tente éclairée avec ombres chinoises, intérieur de tente (lanterne, sacs de couchage, potes couchés), lui assis coupé sous le sol (`moiAssis`), ombre sur la toile, fermeture qui s'ouvre, **écran partagé en deux gros plans** pour un screamer à deux (`Partage`).
- `Hypergamie.jsx` : thème léger en 2,5D de jour : schéma animé en 2D avec couches (`Schema`), écrans de téléphone personnalisés (appli de rencontre, liste de messages, appel et visio, notifications), rue, boulangerie, salle de sport vue par la vitrine, bus, soirée (`appart` + lumières de fête), écran partagé en deux.
- `RentrezChezVous.jsx` : forêt au crépuscule puis de nuit (`ForetNuit.jsx`), messages d'un **numéro inconnu** (TelReel avec avatar « ? », « écrit… » qui s'arrête sans rien envoyer, **photo reçue**), demi-tour avec **flou de bougé** (`<Plan flou={[x, 0]}>`), **créature 2D articulée** (`Rodeur`) qui passe de debout à quatre pattes et charge, course avec **branches qui fouettent l'objectif**, cachette derrière un chêne (main sur la bouche), **griffes qui raclent l'écorce** vues d'en dessous, tête qui renifle, lampe torche qui clignote au loin, dilemme en écran partagé.
- `Gabarit.jsx` : petit modèle neutre (salon → message → rue) pour démarrer n'importe quel thème.

## StationNuit (station-service 3D, style « Rentrez chez vous ») — `src/StationNuit.jsx`
- Clairière dans `foret()` (degage + `feuillesDegage: false`), route qui part dans les arbres, lumière de la forêt orientée vers la station (troncs en contre-jour autour).
- Éclairage par face : lumières ponctuelles (6 néons d'auvent, vitrine, écran de pompe, `lumieres` en plus) × orientation (Lambert adouci) × atténuation, lune bleue en ambiance, rendu filmique `film()`, brume selon la distance éclairée par les lumières. Grandes faces subdivisées (`sub`) = taches de lumière.
- Asphalte mouillé : reflet miroir flouté des objets lumineux (néons, vitrine, enseignes). Cônes de lumière sous les néons. Halos (bloom).
- Voiture = profil extrudé (caisse + habitacle vitré), roues en polygones, trappe à essence ; pompe sur îlot (écran côté −X), tuyau qui passe derrière le bonhomme.
- `stationNuit(cam, f, o)` → `{fond, brume, items, L, P, poussiere}` pour `<Plan>` ; `eclaire(o, p)` donne la teinte d'un personnage à cet endroit.
- `dedans(cam, f, o)` : boutique en 3D (4 plafonniers qui s'éteignent un à un = vraie baisse de lumière, frigos lumineux, porte du générateur + veilleuse rouge, comptoir, écrans CCTV) ; le dehors est vu à travers la vitrine. `eclaireDedans(o, p)`.
- Pièges : ne jamais poser une caméra dans un volume (pompe, comptoir) ; pour voir la caissière derrière le comptoir, caméra côté client (z < COMPTOIR.z0) + zoom.

## Studio « explication » 2,5D (`ParrainageKit.jsx`, vidéo « Comment les banques gagnent de l'argent avec les parrainages »)
Pour les vidéos **informatives** (pas d'horreur) : fond en dégradé radial + halos qui dérivent + sol en perspective (grille qui défile), thèmes `violet`, `rose`, `bleu`, `vert`, `rouge`, `nuit`, `or`.
- Caméra : `<Cadre cam={{x, y, z, r}} t={t}>` (coup de zoom d'entrée) et `<Couche p={0.3…1.3}>` pour la parallaxe (fond lent, premier plan rapide). `derive(k, {...})` fait dériver la caméra pendant le plan.
- Objets prêts : `Billet` (100 €, rotation 3D `flip`, yeux, casque), `Piece`, `Pile`, `Gerbe` (explosion de billets/pièces), `Banque` (bâtiment à colonnes en volume, fenêtres-yeux qui se plissent), `Carte` bancaire rose, `MiniTel` (écran perso), `Tele`, `IconeInsta`, `IconePlay`, `Anneau` (ring light), `Tuile`, `Etiquette` (prix), `Coche`, `Tampon`, `Chiffre` (compteur), `Eclat`, `Confettis`, `Flux` (ligne d'argent animée), `BulleCommentaire`.
- Bonhomme : `Fig` (pieds en x, y ; accessoires `tete` et `devant`), `mainD(pose)` / `mainG(pose)` + `versEcran` pour poser un objet dans sa main ; `ChapeauFete`, `Cravate`, tenues `KARIM`, `COSTUME`, `VENDEUR`, `PASSANTS`.
- Polices : Montserrat Black (`TITRE`, chargée avec FontFace + delayRender) et Inter (`TEXTE`). Emojis Twemoji dans `public/emoji` (`Emo`).
- Alignement voix : si `caler_voix.py` se trompe sur une liste à virgules, corrige les passages à la main avec `voix/parrainage/retouche.py` (intervalles relevés sur l'énergie).

## Maison de nuit éclairée pièce par pièce (`MaisonNuit.jsx`, « Le babyphone 2 »)
Inspiré des vidéos de référence de Maé (« Nuit 5 – Papa », sleep paralysis) : une couleur de lumière forte par pièce + l'heure qui défile en haut.
- Moteur : faces 3D éclairées (lumières ponctuelles `{p, c, i, r, bas}`, ambiance `amb`, brume colorée `F`), murs subdivisés (sub 12) pour des dégradés lisses, `halo`, `boite`, `face`, `trier`.
- Pièces : `chambre` (Léna, bande LED orange au plafond, veilleuse, lit, fenêtre d'orage, caméra du babyphone), `couloir` (vert, trappe du grenier qui s'ouvre `trappe: 0..1`), `salon` (télé bleue, lampe, escalier plein + `solEscalier(z)`, placard sous l'escalier, porte d'entrée ; `tv: 0, lampe: 0` → coupure, la lune prend le relais), `cuisine` (cyan), `jardin` (façade, fenêtre de Léna `fenetreLena`, clôture, portail, orage).
- `eclair(fg)` (images `ECLAIRS`) fait claquer les fenêtres et le ciel.
- Persos : `Moi` / `Lena` teintés par la lumière du lieu + liseré lumineux (`RimDefs`, filtres `rim-orange|vert|bleu|cyan|violet`), `TeteCouchee` (tête sur l'oreiller : l'ancrer devant le lit, `z: LIT.z0 - 0.05`), `Creature` = Rodeur noir `visage="sourire"` (yeux injectés, sourire plein de dents).
- Habillage : `HUD` (« NUIT 1 · SALON » + heure en Anton), `horloge`, `Pluie2`. Police Anton dans `public/fonts` ; sous-titres en Anton via `"police": "Anton"` dans le JSON de `soustitres.py`.
- ⚠️ Ne pas écraser `src/Maison.jsx` (ancien décor utilisé par Soirée/Hypergamie) : le nouveau moteur s'appelle `MaisonNuit.jsx`.
