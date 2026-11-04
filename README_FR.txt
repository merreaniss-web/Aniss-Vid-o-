ANISS STUDIO — ÉDITION PERSONNELLE
==================================

LANCEMENT SUR WINDOWS
1. Décompressez ANISS_STUDIO_PRO.zip dans un dossier.
2. Ouvrez le dossier ANISS_STUDIO_PRO.
3. Double-cliquez sur start.bat.
4. Le navigateur ouvrira http://localhost:8765/.
5. Laissez la fenêtre noire du serveur ouverte pendant l'utilisation.

LANCEMENT SUR macOS
1. Décompressez l'archive.
2. Faites un clic droit sur start.command > Ouvrir.
3. Le navigateur ouvrira http://localhost:8765/.
4. Laissez le Terminal ouvert pendant l'utilisation.

LANCEMENT MANUEL
Dans ce dossier, lancez :
  python3 -m http.server 8765
Puis ouvrez : http://localhost:8765/

SUR IPHONE / IPAD
- Pour un test local sur le même réseau Wi-Fi, ouvrez l'adresse IP locale de
  l'ordinateur suivie de :8765 dans Safari (ex. http://192.168.1.20:8765).
- L'installation PWA, le microphone et certaines API exigent HTTPS sur un
  appareil distant. Publiez le dossier sur un hébergement HTTPS (par exemple
  GitHub Pages) pour l'ajouter à l'écran d'accueil depuis Safari.

FONCTIONS INCLUSES
- Import de vidéos, images et fichiers audio.
- Bibliothèque stock locale : 2 arrière-plans animés et 24 arrière-plans
  visuels haute résolution créés pour ANISS STUDIO.
- Timeline multipiste : pistes vidéo, audio et texte.
- Placement, déplacement, rognage et fractionnement des clips.
- Magnétisme, zoom de timeline, pistes verrouillables/masquables/muettes.
- Prévisualisation compositée sur Canvas.
- Titres, sous-titres, bandeaux, citation, stickers et formes.
- Transformations, keyframes, vitesse, opacité, fondus et filtres.
- Voix off via le microphone et dictée vocale quand le navigateur la prend
  en charge.
- Export par MediaRecorder : MP4 si disponible dans le navigateur, sinon WebM.
- Sauvegarde automatique locale via IndexedDB.
- Projet .asp portable avec médias intégrés.
- Fonctionnement hors ligne après le premier chargement complet, grâce au
  service worker, selon les règles de stockage du navigateur.

LIMITES TECHNIQUES À CONNAÎTRE
ANISS STUDIO est un éditeur vidéo web personnel. Le rendu vidéo s'appuie sur
Canvas, HTMLMediaElement, Web Audio et MediaRecorder. Le conteneur final et les
codecs effectivement disponibles dépendent du navigateur et de l'appareil.
Le rendu est temps réel : les projets longs, les médias 4K, les nombreux effets
ou les appareils mobiles peu puissants peuvent demander une résolution/FPS
plus modestes. Pour un rendu professionnel image par image, un moteur FFmpeg /
WebCodecs dédié et un pipeline natif restent une évolution distincte.
La dictée vocale est une reconnaissance de parole au microphone, pas une
transcription IA automatique de la piste vidéo existante.

RACCOURCIS
Espace       Lecture / pause
S            Fractionner le clip sélectionné au curseur
Suppr        Supprimer le clip sélectionné
Ctrl/Cmd + Z Annuler
Ctrl/Cmd + Shift + Z Rétablir
Ctrl/Cmd + D Dupliquer le clip sélectionné
Flèches      Avancer / reculer d'une image

PROJETS ET MÉDIAS
La sauvegarde automatique conserve les médias et le montage dans le stockage
local du navigateur utilisé. Pour transférer un projet vers un autre appareil,
utilisez Projet > Exporter le projet avec médias (.asp), puis ouvrez le fichier
sur l'autre appareil. Un fichier .asp avec de nombreux médias peut être lourd.
Gardez toujours une copie des médias originaux.

ANISS STUDIO — Build personnel, sans service distant obligatoire.
