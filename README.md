<div align="center">

<img src="src/assets/logo.png" alt="CompressX logo" width="96" />

# CompressX

**Compress your files right in the browser: nothing is uploaded, no account needed**

🇬🇧 English · [🇫🇷 Français](README.fr.md)

[![Live app](https://img.shields.io/badge/Live%20app-ultimate--compress.lovable.app-7C3AED?style=for-the-badge)](https://ultimate-compress.lovable.app)

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![TanStack Start](https://img.shields.io/badge/TanStack%20Start-FF4154?logo=tanstack&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

</div>

---

## About

**CompressX** is a web app that compresses files **directly on your device**. You drop in files of any type, pick a compression level, and download the lighter versions one by one or all together in a ZIP.

- 🔒 **Private**: files never leave the browser, and nothing is kept once you close the tab.
- 🧠 **Honest**: when a file cannot get smaller (MP4, ZIP, already optimized JPEG…), the app keeps the original and says so instead of pretending.
- ⚡ **Responsive**: the heavy work runs in Web Workers, so the interface stays fluid.

> [!NOTE]
> The interface is in French.

## Features

- **Drag & drop** or file picker, with several files at once
- **Automatic type detection** from the extension and MIME type, checked against the file's first bytes (magic bytes)
- **4 compression levels**: maximum, balanced, fast, lossless
- **Image settings**: quality, output format (automatic/WebP, keep original, WebP, JPEG, PNG), maximum size (4K, Full HD, HD, 800 px), metadata removal
- **Processing queue** with 1 to 6 files in parallel, per-file progress, speed and time remaining
- **Actions**: compress all, cancel the queue, retry, remove a file, clear the list
- **Download** each file, or **download all** as a single ZIP
- **Image previews** (files up to 12 MB)
- **Statistics**: processed files, original size, space saved, reduction and throughput
- **Light and dark theme**, with settings saved in the browser

## How files are compressed

| File type | What CompressX does |
| --- | --- |
| **Images** (JPG, PNG, WebP, BMP, ICO, AVIF, static GIF) | Re-encoded with `OffscreenCanvas` to WebP, JPEG or PNG, with the chosen quality and optional resizing. EXIF metadata is dropped. |
| **Animated GIF** | Every frame is decoded (WebCodecs `ImageDecoder`), the palette is reduced and the GIF is re-encoded with `gifenc`. The animation and its timing are kept. |
| **SVG** | Minified (comments and extra whitespace removed), then Gzip if that is not enough |
| **Documents and code** (PDF, DOCX, TXT, CSV, JSON, JS…) | Lossless Gzip archive (`.gz`) |
| **Video and audio** | Lossless Gzip archive. There is no transcoding in the browser. |
| **Archives, 3D models, binaries, unknown files** | Lossless Gzip archive |

**Built-in safeguards**

- **Streaming**: files are read in 4 MB chunks, so the whole input is never loaded into memory at once.
- **Quick check**: for formats that are already compressed (MP4, MP3, ZIP…), a 2 MB sample is tested first. If the gain would be under 3%, the original file is kept right away.
- **No bigger results**: if the output is not smaller than the original, the original is kept.
- **Lossless mode**: images are not re-encoded, so pixels and metadata stay identical.
- **Fallbacks**: if the browser cannot decode a format, or does not support Web Workers, the app switches to a lossless archive or to the main thread.

| Level | Gzip | Image quality |
| --- | --- | --- |
| Maximum | level 9 | at most 70% |
| Balanced | level 6 | slider value (82% by default) |
| Fast | level 1 | at least 88% |
| Lossless | level 9 | no re-encoding |

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | React 19 + TypeScript, [TanStack Start](https://tanstack.com/start) (file-based routing) |
| Build tool | Vite 8, Nitro |
| UI | Tailwind CSS 4, shadcn/ui (Radix UI), lucide-react |
| Compression | [fflate](https://github.com/101arrowz/fflate) (Gzip and ZIP), [gifenc](https://github.com/mattdesl/gifenc) (GIF) |
| Browser APIs | Web Workers, `OffscreenCanvas`, `createImageBitmap`, WebCodecs `ImageDecoder` |
| Scaffolding | [Lovable](https://lovable.dev) |

## Getting started

### Prerequisites

- A current LTS version of [Node.js](https://nodejs.org/), and npm (or [Bun](https://bun.sh/))

### Installation

```bash
git clone https://github.com/JLFlo12/ultimate-compress.git
cd ultimate-compress
npm install
npm run dev
```

Then open the local URL shown in the terminal.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the development server |
| `npm run build` | Builds the production version |
| `npm run preview` | Previews the production build locally |
| `npm run lint` | Runs ESLint |
| `npm run format` | Formats the code with Prettier |

## Project structure

```
ultimate-compress/
├── public/                      # Favicon, robots.txt
├── src/
│   ├── assets/                  # Logo
│   ├── components/
│   │   ├── compressx/           # Dropzone, JobCard, SettingsPanel, StatsBar, ThemeToggle
│   │   └── ui/                  # shadcn/ui components
│   ├── hooks/
│   │   └── useCompressionQueue.ts  # Queue, workers, cancel/retry, ZIP download
│   ├── lib/
│   │   ├── compression/
│   │   │   ├── detect.ts        # Type detection (extension, MIME, magic bytes)
│   │   │   ├── engine.ts        # Compression engine (images, streaming Gzip)
│   │   │   ├── gif.ts           # Animated GIF re-encoding
│   │   │   ├── worker.ts        # Web Worker
│   │   │   └── types.ts         # Types and default settings
│   │   └── format.ts            # Size, speed and duration formatting
│   └── routes/
│       ├── __root.tsx           # App shell
│       └── index.tsx            # Main page
├── package.json
└── vite.config.ts
```

## Limitations

- **Video and audio** are not transcoded. They are only archived without loss, so the gain is usually small.
- **PDF and Office files** are not optimized internally. They are only archived with Gzip.
- **Gzip results** are downloaded as `.gz` files, which you need to extract to get the original file back.
- **Animated GIFs** need a browser that supports the WebCodecs `ImageDecoder` API. Other browsers use the lossless archive instead.
- **Very large files**: the input is streamed, but the compressed result is kept in memory until you download it, so the maximum size depends on your device's RAM.

## Ideas for later

- Video and audio transcoding in the browser (e.g. FFmpeg.wasm)
- AVIF output and PDF optimization
- Brotli / Zstandard formats
- Selecting whole folders
- Optional server mode for very heavy files

## License

This project is released under the [MIT License](LICENSE).
