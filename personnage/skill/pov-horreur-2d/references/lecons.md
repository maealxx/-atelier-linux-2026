# Leçons apprises (à lire avant de lancer un rendu)

## Ce que Maé a demandé et validé
- **Le même bonhomme et le même style** à chaque fois : on ne redessine pas.
- **Plus de 3D et de mouvement de caméra.** Des plans fixes ou trop longs la lassent. Elle a dit « c'est pile ce que je voulais » pour la version découpée en plans de 1 à 2 s, avec des points de vue très variés et un coup de zoom à chaque coupe.
- **Changer de point de vue** quand l'action se répète (marche) : drone, pieds, face, vue subjective.
- **Pas de blanc** : le texte remplit toute la vidéo.
- **Sa voix ElevenLabs**, accélérée d'environ 5 %, avec les blancs raccourcis (mais pas supprimés) et les chuchotements remontés. Elle doit rester agréable et audible.
- **Durée d'au moins 60 s.**
- **Bruitages discrets**, qui ne passent jamais devant la voix.
- **Pas de « TAP TAP »** écrit à l'écran : elle les a fait enlever.
- La fin en **dilemme pour le spectateur** et la description « Partie N ».

## Pièges techniques déjà rencontrés
- **Réseau** : Hugging Face et les sites de modèles (alphacephei, openaipublic) sont bloqués. Pas de Whisper ni de Vosk, donc **pas de reconnaissance vocale**. Kokoro passe par les *GitHub releases*, et npm et PyPI marchent. L'alignement des sous-titres se fait donc à partir des pauses de la voix et du texte connu (`caler_voix.py`). La position des mots dans une phrase est estimée : dis-le à Maé.
- **Tu ne peux pas écouter.** Vérifie par mesures (`volumedetect`, RMS par tranche de 2 s) et dis clairement ce que tu n'as pas pu vérifier.
- **Rendu** : environ 10 minutes pour une minute de vidéo. Lance-le en arrière-plan, sinon il dépasse la limite de 10 minutes d'une commande. Il ralentit, voire se met en pause, quand la session est inactive : c'est normal.
- **Taille** : le grain fait gonfler le fichier (100 Mo brut). Recompresse à environ 3,2 Mb/s : 60 s donnent environ 26 Mo, sous la limite d'envoi de 30 Mo.
- `remotion still` recompile à chaque appel (environ 50 s). Utilise `apercu.mjs`, qui compile une seule fois. Avec une seule image, il fait une copie au lieu d'appeler `xstack`.
- N'écris jamais `cat > fichier` sans rien derrière dans une commande : ça attend une entrée et bloque tout.
- `interpolate` de Remotion exige des bornes **croissantes** : `interpolate(z, [-19, 7], [1, 0])` et pas `[7, -19]`.
- Une boucle dans un pipeline doit tenir **dans une seule commande** : pas de `sleep` suivi d'une vérification.

## Pièges de mise en scène
- Une caméra **collée à un mur ou à une carrosserie** donne un aplat de couleur illisible. Recule-la (plus de 600 unités) ou mets-la en diagonale (`yaw` de ±20 à 60).
- Une caméra **de l'autre côté d'une façade** (X > 520 dans la rue) ne voit plus rien.
- **Ordre d'affichage** : un objet long comme le bus se trie sur son centre (`zp + L/2`). Sinon il passe devant le perso qui est à côté.
- Avec du lacet, `visible()` et `scale()` doivent recevoir X et Y, sinon un billboard disparaît alors qu'il est à l'écran.
- Les **yeux rouges** dessinés « par-dessus » ne sont pas masqués par le perso : place-les sur le côté.
- Les **étiquettes** à l'écran ne doivent pas cacher un visage, les yeux de la créature ni la bande des sous-titres (y ≈ 1325).
- Une **silhouette** dans un tunnel ou une pièce doit tenir sous le plafond : réduis son échelle.
- Le **point de fuite** à y = 820 (et non 640) évite d'avoir la moitié basse de l'image vide.
- Un perso dans le noir devient une tache : garde `lum ≥ 0.3` et une source de lumière proche.
