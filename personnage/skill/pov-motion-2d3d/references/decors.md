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
| métro | Metro.jsx | Quai de métro carrelé, néons, voies, piliers (scène autonome). | — |
| `classe()` | Lycee.jsx | Salle de classe (X ±950, Z −1.5 → 7) : tables, tableau, fenêtres, frise, étagères. | `neon`, `craie` (texte qui s'écrit), `horloge`, `lune` |
| `couloir()` | Lycee.jsx | Long couloir de lycée (X ±520, Z → 30) : casiers colorés, portes, affiches, néons, flèches. | `neon(k)`, `casier(z)`, `fleche`, `porteRouge`, `ouvreRouge`, `eclats` |
| `escalier()` / `volee()` | Lycee.jsx | Cage d'escalier vue d'en haut (vertige), volée de marches. `marcheY(z)` donne la hauteur des marches. | `lumiere`, `ampoule` |
| `appart()` | Appart.jsx | **Appartement** : salon (X ±1500, Z 0 → 6, plafond −620) en couleurs (bleu canard, papier peint, vert sauge), poutres. Porte d'entrée (X 650 → 1050, judas), canapé, table basse, TV, bibliothèque + guirlande, cuisine, fenêtre sur la ville, monstera, appliques, galerie de cadres, horloge, guitare, tapis. Couloir (X 1500 → 3600) et **chambre** au bout (lit, armoire, fenêtre ouverte, rideaux au vent). | `tv`, `lampes`, `choc` (porte qui tremble), `fente` (ombre sous la porte), `cadre` (le cadre tombe), `fenteChambre`, `porteChambre` (0 → 1), `monstre` (élément 3D dans la chambre), `rideau`, `lumiereChambre` |
| `palier()` | Appart.jsx | Couloir d'immeuble (X ±3500, Z 6 → 7.6) : portes 41/43/45, ascenseur, sortie de secours, néons, extincteur, panneau d'affichage. À filmer depuis le judas : `JU = {x: 850, y: -160, z: 6.02}` avec `<Judas>`. | `neon(k)`, `faux: {x, z, tilt, sy}` (quelqu'un devant la porte), `sac` |

## Positions utiles
- `appart` : devant la TV `(820, Z 1.9)`, devant la porte `(850, 5.45)`, à la fenêtre `(-1220, 2.6)`, dans le couloir `(3000, 1.2)`.
- `quartier` : livreur sous le lampadaire `(-760, Z 7.35)`. Plongée depuis la fenêtre : `{x: 0, y: NOTRE.y1 - 180, z: 9.72, yaw: 180, pitch: 46 → 56}`.
- `jardin` : baie vitrée `(-2000, Z 9.7)` sur la terrasse (`SOL - 25`), pelouse `(-700, 6.2)`, devant le portail `(0, -2.4)`, perron `(0, 9.75)`.

## Exemples complets (à copier)
- `DernierBus.jsx` : rue, ruelle, terrain vague, bus.
- `SalleZero.jsx` : lycée, monstre 3D qui se retourne.
- `Soiree.jsx` : manoir, fenêtres rouges, téléphone, monstre « hôte ».
- `Livreur.jsx` : appart, judas, rue vue d'en haut, humain 3D, monstre au plafond.
- `Gabarit.jsx` : petit modèle neutre (salon → message → rue) pour démarrer n'importe quel thème.
