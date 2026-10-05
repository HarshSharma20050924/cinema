# 🎬 Cinema

<p align="center">
  <strong>A modern, ad-free streaming and downloading ecosystem for Movies & TV Series.</strong>
</p>

<p align="center">
  <a href="https://cinema-dwh.pages.dev/">
    <img src="https://custom-icon-badges.demolab.com/badge/-Visit_Live_Website-E50914?style=for-the-badge&logo=globe&logoColor=white" alt="Live Website" />
  </a>
  <a href="https://github.com/HarshSharma20050924/cinema/releases/latest">
    <img src="https://img.shields.io/github/v/release/HarshSharma20050924/cinema?color=E50914&label=Latest%20Release&style=for-the-badge&logo=android" alt="Latest Release" />
  </a>
  <a href="https://github.com/HarshSharma20050924/cinema/releases/latest">
    <img src="https://img.shields.io/badge/APK_Size-~29MB_(arm64)--v8a-2ea44f?style=for-the-badge&logo=googleplay" alt="APK Size" />
  </a>
  <a href="https://github.com/HarshSharma20050924/cinema">
    <img src="https://img.shields.io/badge/License-Apache_2.0-blue?style=for-the-badge" alt="License" />
  </a>
</p>

---

> [!IMPORTANT]
> ### 🔑 First-Time Setup (Provider Verification)
> When you open the application (Web or Android App) for the first time during onboarding, enter:
> **`harsh cinema`**
> as the provider name to verify and load the full catalog of streaming providers.

> [!NOTE]
> ### 🌐 Web App & Server Availability Notice
> The **Cinema Web App** ([cinema-dwh.pages.dev](https://cinema-dwh.pages.dev/)) relies on an external backend proxy hosted on a local/mobile home server. Due to sleep states or local power-saving modes, the web backend may occasionally be inactive or offline.
> - **Server Inactive?**: If streams or search results do not load on the web app, please **contact the maintainer** ([Harsh Sharma](https://github.com/HarshSharma20050924)) to turn on / wake the server.
> - **🚀 Recommended Alternative**: Use the **Cinema Android App**! The mobile app works **completely independently** without relying on any external home server, handling all scraping, stream resolution, and video playback natively on your phone.

---

## 📱 Ecosystem Overview

Cinema is a complete media ecosystem consisting of:

1. **Cinema Android App**: Native mobile application built with React Native and Kotlin, featuring high-performance video streaming, multi-server selection, in-app quick downloads, external player support (VLC, MX Player), and background resume. Works 100% independently of any central server.
2. **Cinema Web App**: Accessible live at [**cinema-dwh.pages.dev**](https://cinema-dwh.pages.dev/) — a lightweight, fast, modern web application powered by **React 19**, **Vite**, **TypeScript**, and **Artplayer** with an integrated proxy backend.

---

## 🚀 Key Features

### 📱 Android App (Standalone & Serverless)
- **Zero Server Dependency**: Runs completely independently on-device—no external proxy server needed.
- **Multi-Server Selection**: Choose from multiple streaming and download mirrors seamlessly.
- **One-Tap Quick Download**: Directly download high-speed streams with synchronized subtitles.
- **External Player Support**: Native stream forwarding built in Kotlin to bypass player header restrictions (plays smoothly in VLC, MX Player, and native players).
- **Auto In-App Updates**: Seamless update detection directly from GitHub Releases without needing to manually reinstall.
- **Ad-Free & Lightweight**: Optimized for `arm64-v8a` (under 30MB) providing battery efficiency and smooth 60fps animations.
- **Material 3 Dynamic Theming**: Sleek dark modes and fluid typography.

### 🌐 Web App ([cinema-dwh.pages.dev](https://cinema-dwh.pages.dev/))
- **Live Deployment**: Ready to use directly in any browser at [cinema-dwh.pages.dev](https://cinema-dwh.pages.dev/).
- **React 19 & Vite**: Ultra-fast HMR and responsive layout designed for desktop, tablet, and mobile browsers.
- **Artplayer & HLS.js**: Native HLS and MP4 streaming with custom playback speed, quality selector, and full keyboard shortcuts.
- **Integrated Backend Proxy**: Handles CORS bypass, stream header injection, and provider resolvers smoothly.
- **Cross-Platform Ready**: Optimized for modern web browsers and easily packaged into hybrid webview environments.

---

## 📥 Download Android App

Download the latest optimized APK for your Android device:

[![Download APK](https://custom-icon-badges.demolab.com/badge/-Download_Latest_APK_(arm64)-E50914?style=for-the-badge&logo=download&logoColor=white)](https://github.com/HarshSharma20050924/cinema/releases/latest)

> **Compatibility**: The `arm64-v8a` APK works seamlessly on **99%+ of modern Android phones** (Samsung, OnePlus, Xiaomi, Realme, Vivo, Oppo, Google Pixel, Motorola, etc.).

---

## 🛠️ Technology Stack

| Platform | Core Technologies |
| :--- | :--- |
| **Android App** | React Native, Expo, Kotlin Native Modules, TypeScript, NativeWind, MMKV |
| **Web App** | React 19, Vite, TypeScript, Artplayer, HLS.js, Tailwind CSS |
| **Backend & Proxy** | Node.js, Express, Axios, Cheerio, OkHttp3 |

---

## 💻 Getting Started / Development

### 1. Running the Web App
```bash
# Clone the repository
git clone https://github.com/HarshSharma20050924/cinema.git
cd cinema

# Install dependencies
npm install

# Run backend proxy & client simultaneously
npm start
```
The web app will run locally at `http://localhost:5174`.

---

### 2. Running the Android App
```bash
# Navigate to mobile project folder
cd vega-app

# Install dependencies
npm install

# Run on connected Android device / emulator
npm run android

# To assemble a release APK locally
npm run build:apk:arm64
```
Output APK will be generated at:
`vega-app/android/app/build/outputs/apk/release/Cinema-arm64-v8a-v4.0.7.apk`

---

## 👤 Author & Maintainer

- **Developer**: [Harsh Sharma](https://github.com/HarshSharma20050924)
- **Repository**: [https://github.com/HarshSharma20050924/cinema](https://github.com/HarshSharma20050924/cinema)

---

## ⚠️ Disclaimer

Cinema does not host, store, or upload any media content on its servers. All media URLs and metadata are sourced dynamically from public third-party tools and APIs. Cinema is built strictly for educational and personal research purposes.
