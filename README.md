# CompressX : File Optimizer

Prompt — Site web de compression de fichiers universelle

Crée une application web moderne appelée CompressX, spécialisée dans la compression et l’optimisation de fichiers.

Objectif

Créer un site permettant à l'utilisateur d'envoyer un ou plusieurs fichiers de n'importe quel type, de les compresser directement depuis son navigateur ou via le serveur, puis de télécharger les fichiers compressés.

Le site doit être conçu pour gérer de très gros fichiers et ne doit pas imposer artificiellement une limite de taille côté interface.

Important : ne jamais promettre qu'une compression est possible pour absolument tous les formats. Lorsqu'un format ne peut pas être davantage compressé, utiliser automatiquement une méthode d'archivage sans perte.

Formats à prendre en charge

Le système doit accepter notamment :

Images : JPG, JPEG, PNG, WEBP, GIF, SVG, TIFF, BMP, ICO

Vidéos : MP4, MKV, AVI, MOV, WEBM, FLV

Audio : MP3, WAV, FLAC, AAC, OGG, M4A

Documents : PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV

Archives : ZIP, RAR, 7Z, TAR, GZ, BZ2

Code : JS, TS, HTML, CSS, JSON, XML, C, C++, Java, Python, PHP, etc.

Fichiers 3D : OBJ, FBX, GLB, GLTF, STL, BLEND lorsque possible

Fichiers exécutables et binaires

Tout autre fichier inconnu

Pour les formats qui possèdent une compression spécifique, utiliser le meilleur algorithme disponible.

Pour les fichiers déjà compressés comme MP4, JPG, MP3, ZIP ou RAR, ne pas prétendre obtenir une réduction importante. Utiliser plutôt une compression d'archive sans perte ou indiquer clairement que le fichier est déjà optimisé.

Fonctionnalités principales

1. Upload

Créer une grande zone Drag & Drop au centre de la page :

"Glissez-déposez vos fichiers ici"

avec :

"ou cliquez pour sélectionner vos fichiers"

Permettre :

plusieurs fichiers simultanément ;

sélection de dossiers lorsque le navigateur le permet ;

fichiers très volumineux ;

reprise des uploads interrompus ;

barre de progression ;

vitesse d'upload ;

temps restant estimé ;

possibilité d'annuler un upload.

Éviter les limites artificielles côté frontend.

2. Compression

Après l'upload, afficher une liste :

FichierTaille originaleTypeCompressionTaille finaleÉtat

Chaque fichier doit pouvoir être configuré individuellement.

Ajouter un choix :

Compression maximale

Compression équilibrée

Compression rapide

Sans perte

Pour les images :

qualité ;

résolution ;

format de sortie ;

suppression éventuelle des métadonnées.

Pour les vidéos :

codec ;

résolution ;

bitrate ;

FPS ;

audio ;

format de sortie.

Pour l'audio :

bitrate ;

fréquence ;

codec ;

format.

Pour les documents et fichiers génériques :

utiliser une compression sans perte adaptée.

3. Compression intelligente

Créer un système qui détecte automatiquement le type du fichier.

Exemple :

JPG → optimisation JPEG / WebP / AVIF + archive si nécessaire

PNG → optimisation PNG + WebP/AVIF si l'utilisateur l'autorise

MP4 → compression vidéo avec FFmpeg

MKV → compression vidéo avec FFmpeg

WAV → FLAC ou compression audio selon les paramètres

PDF → optimisation PDF

TXT / CSV / JSON → Brotli / Gzip / Zstandard

Fichiers génériques → TAR + Zstandard ou ZIP/7Z

Fichiers déjà compressés → archivage sans perte

4. Compression par lots

Permettre de sélectionner 100, 1 000 ou davantage de fichiers.

Ajouter :

"Compresser tout"

et :

"Télécharger tout"

Créer automatiquement une archive ZIP ou 7Z contenant tous les résultats.

5. Prévisualisation

Afficher une miniature lorsque le format le permet.

Pour les images :

aperçu avant/après ;

taille avant/après ;

pourcentage économisé.

Pour les vidéos :

durée ;

résolution ;

codec ;

taille avant/après.

Pour les documents :

icône ;

nombre de pages lorsque disponible ;

taille avant/après.

6. Interface

Créer une interface très moderne inspirée des applications comme :

7-Zip

WinRAR

CloudConvert

TinyPNG

Dropbox

Google Drive

Design :

minimaliste ;

professionnel ;

responsive ;

animations fluides ;

mode clair/sombre ;

drag & drop très visible ;

aucune publicité intrusive.

Page principale :

Logo :

CompressX

Sous-titre :

"Compress everything. No artificial limits."

Zone centrale :

Déposez vos fichiers ici

Bouton :

Sélectionner des fichiers

En dessous :

"Images • Vidéos • Audio • Documents • Archives • Code • 3D • Tous fichiers"

Architecture technique

Utiliser une architecture moderne et scalable.

Frontend :

React

TypeScript

Tailwind CSS

composants réutilisables

interface responsive

Backend :

Node.js

API REST ou architecture adaptée

traitement asynchrone

système de files d'attente pour les gros traitements

Compression :

FFmpeg pour vidéo/audio

Sharp pour les images

Ghostscript ou outils équivalents pour PDF

Zstandard

Brotli

Gzip

ZIP

7-Zip

Pour les traitements lourds, utiliser des workers séparés afin que l'interface reste réactive.

Gros fichiers

Le système doit être conçu pour les fichiers de plusieurs Go.

Ne jamais charger un énorme fichier entièrement en RAM.

Utiliser :

streaming ;

chunk upload ;

fichiers temporaires ;

traitement par flux ;

workers ;

nettoyage automatique des fichiers temporaires.

Prévoir une architecture permettant de remplacer facilement le stockage local par :

S3

Cloudflare R2

MinIO

autre stockage compatible S3.

Sécurité

La sécurité est prioritaire.

Implémenter :

validation des extensions ;

détection réelle du MIME type ;

limitation du nombre de fichiers simultanés configurable côté serveur ;

protection contre les fichiers malveillants ;

antivirus optionnel avec ClamAV ;

sandbox pour les outils de compression ;

isolation des workers ;

suppression automatique des fichiers après traitement ;

protection contre le path traversal ;

noms de fichiers nettoyés ;

rate limiting ;

protection contre les abus ;

HTTPS ;

aucune exécution directe de fichiers uploadés.

Ne jamais exécuter un fichier utilisateur comme du code.

Confidentialité

Afficher clairement :

"Vos fichiers sont automatiquement supprimés après leur traitement."

Prévoir une option permettant un traitement 100 % local dans le navigateur lorsque cela est techniquement possible.

Pour les fichiers qui nécessitent le serveur, indiquer clairement que le fichier est temporairement transféré au serveur.

Ne jamais conserver définitivement les fichiers utilisateurs sans leur consentement.

"Illimité"

Le produit doit donner une expérience sans limite artificielle de taille ou de nombre de fichiers.

Cependant, ne pas écrire de fausse promesse du type :

"taille réellement illimitée"

si l'infrastructure possède des contraintes physiques.

Afficher plutôt :

"Aucune limite artificielle imposée par l'interface."

L'architecture doit permettre d'augmenter les ressources serveur pour traiter des fichiers extrêmement volumineux.

Dashboard

Créer une page permettant de voir :

fichiers en cours ;

fichiers terminés ;

compression en cours ;

taille économisée ;

historique local des traitements.

Statistiques :

Fichiers traités : 128

Taille originale : 42,8 Go

Taille finale : 18,2 Go

Espace économisé : 24,6 Go

Compression moyenne : 57,5 %

API

Créer une API propre avec par exemple :

POST /api/upload

POST /api/compress

GET /api/jobs/:id

GET /api/download/:id

DELETE /api/files/:id

GET /api/health

Les traitements longs doivent retourner un Job ID et être suivis via WebSocket ou Server-Sent Events.

UX

Pendant une compression afficher :

"Analyse du fichier..."

puis :

"Compression en cours..."

puis :

"Compression terminée"

Avec :

progression ;

vitesse ;

taille actuelle ;

taille estimée ;

temps restant.

À la fin :

Compression terminée !

2,4 Go → 840 Mo

Économie : 65 %

Boutons :

Télécharger

Télécharger tout

Nouvelle compression

Pages

Créer au minimum :

Accueil

Compresseur

Résultats

Paramètres

À propos

Politique de confidentialité

Responsive

Le site doit fonctionner parfaitement sur :

PC

tablette

smartphone

Sur mobile, permettre également la sélection de plusieurs fichiers.

Qualité du code

Le projet doit être :

propre ;

modulaire ;

documenté ;

typé avec TypeScript ;

facilement maintenable ;

prêt pour la production.

Créer également :

Dockerfile

docker-compose.yml

fichier .env.example

README.md

configuration de production

système de logs

gestion des erreurs

health check

Important

Ne crée pas uniquement une maquette visuelle.

Je veux une application fonctionnelle de bout en bout, avec :

Frontend → Upload → Backend → File processing → Compression → Progression → Téléchargement.

Si une technologie ne permet pas de compresser correctement un type de fichier, mettre en place un fallback automatique vers une compression d'archive sans perte.

Commence par générer l'architecture du projet, puis implémente progressivement chaque fonctionnalité.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ultimate-compress.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ba7661bf-8faa-4c29-a27d-fc060008862e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
