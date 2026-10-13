<div align="center">

# CINEMA

**Decentralized Theater-Grade Streaming & Autonomous Node Ecosystem**

A client-side media browser, search indexer, and playback environment for high-definition movies and television series.

<br/>

[![Live Web App](https://img.shields.io/badge/Web_App-cinema--dwh.pages.dev-E50914?style=flat-square&logo=googlechrome&logoColor=white)](https://cinema-dwh.pages.dev/)
[![Latest Release](https://img.shields.io/github/v/release/HarshSharma20050924/cinema?color=E50914&label=Latest%20Release&style=flat-square&logo=github)](https://github.com/HarshSharma20050924/cinema/releases/latest)
[![Platforms](https://img.shields.io/badge/Platforms-Android%20%7C%20Linux%20%7C%20Windows%20%7C%20macOS-111111?style=flat-square)](https://github.com/HarshSharma20050924/cinema/releases/latest)
[![License](https://img.shields.io/badge/License-Apache%202.0-111111?style=flat-square)](LICENSE)

<br/>

<img src="docs/preview.png" alt="Cinema Interface" width="100%" />

</div>

---

## Overview

Cinema is engineered to eliminate intrusive advertisements, redirect loops, and fragmented subscription catalogs. By separating media indexing from decentralized stream resolvers, Cinema delivers a smooth, theater-grade viewing experience across mobile phones, desktop workstations, and smart television displays.

---

## Ecosystem Architecture

The Cinema ecosystem comprises two distinct, interoperable products:

### 1. Cinema Application (Player & Streaming Client)
The primary client application available for Web, Android, Linux, Windows, and macOS.
* **Adaptive Streaming**: HLS streaming engine with multi-track audio selection, custom subtitle tracks, and resolutions from 480p up to 4K.
* **External Player Forwarding**: Instant 1-click launching into external decoders including VLC, MPV, and MX Player.
* **Offline Download Manager**: Multi-connection stream downloading directly into local file storage.
* **Resilient Poster Proxy**: Built-in image proxying to prevent browser privacy shields and ad-blockers from dropping media artwork.

### 2. Cinema Runner (Autonomous Scraper Daemon)
A background headless daemon and tunnel coordinator available for Android, Linux servers, Windows, and macOS.
* **Persistent Node Host**: Executes provider scrapers and resolves stream manifests locally.
* **Zero Root Android Daemon**: Runs persistently as an Android foreground service with automatic coordinator syncing.
* **Encrypted Edge Tunnels**: Creates local Cloudflare proxy tunnels to route stream queries securely.

---

## Downloads & Release Assets

Direct links to compiled releases from the latest stable release tag:

### Cinema Application (Player)

| Platform | Format | Direct Download |
| :--- | :--- | :--- |
| Android (Mobile & TV) | Universal APK | [Download Cinema-Web.apk](https://github.com/HarshSharma20050924/cinema/releases/latest/download/Cinema-Web.apk) |
| Linux (Debian / Ubuntu / Mint) | .deb Package | [Download .deb](https://github.com/HarshSharma20050924/cinema/releases/latest) |
| Linux (Universal) | Standalone .AppImage | [Download .AppImage](https://github.com/HarshSharma20050924/cinema/releases/latest) |
| Windows 10 / 11 | Setup Installer (.exe) | [Download Setup.exe](https://github.com/HarshSharma20050924/cinema/releases/latest) |
| Windows 10 / 11 | Portable Executable (.exe) | [Download Portable.exe](https://github.com/HarshSharma20050924/cinema/releases/latest) |
| macOS (Apple Silicon & Intel) | DMG Disk Image | [Download .dmg](https://github.com/HarshSharma20050924/cinema/releases/latest) |

### Cinema Runner (Node Daemon)

| Platform | Format | Direct Download |
| :--- | :--- | :--- |
| Android | Background Daemon APK | [Download Cinema-Runner.apk](https://github.com/HarshSharma20050924/cinema/releases/latest/download/Cinema-Runner.apk) |
| Linux / Server | Standalone .AppImage | [Download Runner AppImage](https://github.com/HarshSharma20050924/cinema/releases/latest) |
| Windows | Setup Installer (.exe) | [Download Runner Setup.exe](https://github.com/HarshSharma20050924/cinema/releases/latest) |
| Windows | Portable Executable (.exe) | [Download Runner Portable.exe](https://github.com/HarshSharma20050924/cinema/releases/latest) |
| macOS | DMG Disk Image | [Download Runner .dmg](https://github.com/HarshSharma20050924/cinema/releases/latest) |

> Complete binary manifests, release notes, and SHA-256 checksums are published on the [GitHub Releases Page](https://github.com/HarshSharma20050924/cinema/releases/latest).

---

## Getting Started Locally

### Prerequisites
* Node.js 22 or higher
* npm 10 or higher

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/HarshSharma20050924/cinema.git
cd cinema

# Install web application dependencies
npm install

# Start development server and API runner
npm run dev
```

The web client will be available at `http://localhost:5173`.

### Desktop Build

```bash
cd desktop-app
npm install

# Build for current operating system
npm run dist:linux    # on Linux (.deb & .AppImage)
npm run dist:win      # on Windows (.exe Setup & Portable)
npm run dist:mac      # on macOS (.dmg)
```

---

## Privacy & Decentralization

* **Local-First Storage**: User preferences, watch history, bookmarks, and installed extensions reside strictly on the user's device via local storage.
* **Zero Telemetry**: No third-party analytics SDKs, session recorders, tracking cookies, or user identifiers are included.
* **Non-Hosting Policy**: Cinema does not host, upload, or transmit video files. Media references are indexed client-side through public community scrapers.

---

## License

Distributed under the Apache 2.0 License. See `LICENSE` for details.
