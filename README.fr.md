<div align="center">

<img src="src/assets/logo.png" alt="Logo CompressX" width="96" />

# CompressX

**Compressez vos fichiers directement dans le navigateur : aucun envoi, aucun compte**

[🇬🇧 English](README.md) · 🇫🇷 Français

[![Application en ligne](https://img.shields.io/badge/Application%20en%20ligne-ultimate--compress.lovable.app-7C3AED?style=for-the-badge)](https://ultimate-compress.lovable.app)

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![TanStack Start](https://img.shields.io/badge/TanStack%20Start-FF4154?logo=tanstack&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Licence : MIT](https://img.shields.io/badge/Licence-MIT-yellow.svg)

</div>

---

## Présentation

**CompressX** est une application web qui compresse vos fichiers **directement sur votre appareil**. Vous déposez des fichiers de n'importe quel type, choisissez un niveau de compression, puis téléchargez les versions allégées une par une ou toutes ensemble dans un ZIP.

- 🔒 **Confidentiel** : les fichiers ne quittent jamais le navigateur, et rien n'est conservé une fois l'onglet fermé.
- 🧠 **Honnête** : quand un fichier ne peut pas être allégé (MP4, ZIP, JPEG déjà optimisé…), l'application garde l'original et l'indique, au lieu de faire semblant.
- ⚡ **Fluide** : le travail lourd tourne dans des Web Workers, l'interface reste réactive.

## Fonctionnalités

- **Glisser-déposer** ou sélection de fichiers, plusieurs à la fois
- **Détection automatique du type** à partir de l'extension et du type MIME, vérifiée avec les premiers octets du fichier (magic bytes)
- **4 niveaux de compression** : maximale, équilibrée, rapide, sans perte
- **Réglages des images** : qualité, format de sortie (automatique/WebP, conserver le format, WebP, JPEG, PNG), taille maximale (4K, Full HD, HD, 800 px), suppression des métadonnées
- **File de traitement** de 1 à 6 fichiers en parallèle, avec progression, vitesse et temps restant pour chaque fichier
- **Actions** : tout compresser, annuler la file, réessayer, retirer un fichier, vider la liste
- **Téléchargement** fichier par fichier, ou **tout télécharger** dans un seul ZIP
- **Aperçu des images** (fichiers jusqu'à 12 Mo)
- **Statistiques** : fichiers traités, volume d'origine, espace économisé, réduction et débit
- **Thème clair et sombre**, et réglages mémorisés dans le navigateur

## Comment les fichiers sont compressés

| Type de fichier | Ce que fait CompressX |
| --- | --- |
| **Images** (JPG, PNG, WebP, BMP, ICO, AVIF, GIF fixe) | Ré-encodage avec `OffscreenCanvas` en WebP, JPEG ou PNG, avec la qualité choisie et un redimensionnement facultatif. Les métadonnées EXIF sont supprimées. |
| **GIF animé** | Chaque image est décodée (WebCodecs `ImageDecoder`), la palette est réduite et le GIF est ré-encodé avec `gifenc`. L'animation et son rythme sont conservés. |
| **SVG** | Minification (commentaires et espaces superflus retirés), puis Gzip si ça ne suffit pas |
| **Documents et code** (PDF, DOCX, TXT, CSV, JSON, JS…) | Archive Gzip sans perte (`.gz`) |
| **Vidéo et audio** | Archive Gzip sans perte. Aucun transcodage n'est fait dans le navigateur. |
| **Archives, modèles 3D, binaires, fichiers inconnus** | Archive Gzip sans perte |

**Garde-fous intégrés**

- **Lecture par morceaux** : les fichiers sont lus par blocs de 4 Mo, ils ne sont donc jamais chargés en mémoire d'un seul coup.
- **Test rapide** : pour les formats déjà compressés (MP4, MP3, ZIP…), un échantillon de 2 Mo est testé d'abord. Si le gain serait inférieur à 3 %, le fichier original est conservé tout de suite.
- **Jamais de fichier plus gros** : si le résultat n'est pas plus petit que l'original, l'original est conservé.
- **Mode sans perte** : les images ne sont pas ré-encodées, les pixels et les métadonnées restent identiques.
- **Solutions de repli** : si le navigateur ne sait pas décoder un format ou ne prend pas en charge les Web Workers, l'application bascule vers une archive sans perte ou vers le thread principal.

| Niveau | Gzip | Qualité des images |
| --- | --- | --- |
| Maximale | niveau 9 | 70 % au maximum |
| Équilibrée | niveau 6 | valeur du curseur (82 % par défaut) |
| Rapide | niveau 1 | 88 % au minimum |
| Sans perte | niveau 9 | aucun ré-encodage |

## Stack technique

| Domaine | Technologie |
| --- | --- |
| Framework | React 19 + TypeScript, [TanStack Start](https://tanstack.com/start) (routage par fichiers) |
| Outil de build | Vite 8, Nitro |
| Interface | Tailwind CSS 4, shadcn/ui (Radix UI), lucide-react |
| Compression | [fflate](https://github.com/101arrowz/fflate) (Gzip et ZIP), [gifenc](https://github.com/mattdesl/gifenc) (GIF) |
| API du navigateur | Web Workers, `OffscreenCanvas`, `createImageBitmap`, WebCodecs `ImageDecoder` |
| Génération initiale | [Lovable](https://lovable.dev) |

## Installation

### Prérequis

- Une version LTS récente de [Node.js](https://nodejs.org/), et npm (ou [Bun](https://bun.sh/))

### Lancer le projet

```bash
git clone https://github.com/JLFlo12/ultimate-compress.git
cd ultimate-compress
npm install
npm run dev
```

Ouvrez ensuite l'adresse locale affichée dans le terminal.

### Scripts

| Commande | Description |
| --- | --- |
| `npm run dev` | Lance le serveur de développement |
| `npm run build` | Génère la version de production |
| `npm run preview` | Prévisualise la version de production en local |
| `npm run lint` | Lance ESLint |
| `npm run format` | Formate le code avec Prettier |

## Structure du projet

```
ultimate-compress/
├── public/                      # Favicon, robots.txt
├── src/
│   ├── assets/                  # Logo
│   ├── components/
│   │   ├── compressx/           # Dropzone, JobCard, SettingsPanel, StatsBar, ThemeToggle
│   │   └── ui/                  # Composants shadcn/ui
│   ├── hooks/
│   │   └── useCompressionQueue.ts  # File d'attente, workers, annulation/nouvel essai, ZIP
│   ├── lib/
│   │   ├── compression/
│   │   │   ├── detect.ts        # Détection du type (extension, MIME, magic bytes)
│   │   │   ├── engine.ts        # Moteur de compression (images, Gzip par morceaux)
│   │   │   ├── gif.ts           # Ré-encodage des GIF animés
│   │   │   ├── worker.ts        # Web Worker
│   │   │   └── types.ts         # Types et réglages par défaut
│   │   └── format.ts            # Affichage des tailles, débits et durées
│   └── routes/
│       ├── __root.tsx           # Structure de l'application
│       └── index.tsx            # Page principale
├── package.json
└── vite.config.ts
```

## Limites

- **Vidéo et audio** ne sont pas transcodés. Ils sont seulement archivés sans perte, donc le gain est généralement faible.
- **Les PDF et fichiers Office** ne sont pas optimisés en interne. Ils sont seulement archivés en Gzip.
- **Les résultats Gzip** sont téléchargés en `.gz` : il faut les extraire pour retrouver le fichier d'origine.
- **Les GIF animés** demandent un navigateur compatible avec l'API WebCodecs `ImageDecoder`. Les autres navigateurs utilisent l'archive sans perte.
- **Très gros fichiers** : l'entrée est lue par morceaux, mais le résultat compressé reste en mémoire jusqu'au téléchargement. La taille maximale dépend donc de la RAM de l'appareil.

## Idées pour la suite

- Transcodage vidéo et audio dans le navigateur (par ex. FFmpeg.wasm)
- Sortie AVIF et optimisation des PDF
- Formats Brotli / Zstandard
- Sélection de dossiers entiers
- Mode serveur facultatif pour les fichiers très lourds

## Licence

Ce projet est distribué sous [licence MIT](LICENSE).
