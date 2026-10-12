<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&height=220&text=CINEMA&fontAlign=50&fontAlignY=40&color=0:E50914,50:B81D24,100:141414&fontColor=ffffff&fontSize=52"/>

### Unified Streaming & Downloading Ecosystem

Building a distraction-free, theater-grade experience for Movies & TV Series.

<br>

[![Live Web App](https://img.shields.io/badge/Live%20Web%20App-E50914?style=for-the-badge&logo=googlechrome&logoColor=white&labelColor=0d1117)](https://cinema-dwh.pages.dev/)
[![Release](https://img.shields.io/badge/Release-v4.0.8-B81D24?style=for-the-badge&logo=github&logoColor=white&labelColor=0d1117)](https://github.com/HarshSharma20050924/cinema/releases/latest)
[![License](https://img.shields.io/badge/License-Apache%202.0-E50914?style=for-the-badge&logo=opensourceinitiative&logoColor=white&labelColor=0d1117)](https://github.com/HarshSharma20050924/cinema)

<br><br>

[![Developer](https://img.shields.io/badge/Developer-Harsh%20Sharma-E50914?style=for-the-badge&logo=github&logoColor=white&labelColor=0d1117)](https://github.com/HarshSharma20050924)
[![Portfolio](https://img.shields.io/badge/Website-harshsharma.runs--on.dev-B81D24?style=for-the-badge&logo=globe&logoColor=white&labelColor=0d1117)](https://harshsharma.runs-on.dev/)

<br><br>

<img src="docs/preview.png" alt="Cinema Web App Interface" width="100%" />

</div>

---

## The Story

The modern streaming landscape is cluttered. Countless subscription tiers, intrusive advertisements, broken links, and frustrating redirects have made watching a simple movie an exhausting chore.

**Cinema** was built to restore simplicity. 

It is designed as an all-in-one entertainment ecosystem that eliminates noise, bypasses ads, and brings high-definition movies and television series straight to your screen. Whether you are browsing from a desktop browser, casting to a television, or streaming on your smartphone during a commute, Cinema provides a smooth, theater-grade experience without compromises.

---

## The Three Pillars

Cinema is built as a cohesive triad, connecting your screen directly to decentralized media sources:

```
                  +-----------------------------------+
                  |         Cinema Web App            |
                  |     (cinema-dwh.pages.dev)        |
                  +-----------------+-----------------+
                                    |
                    Streams via Encrypted Tunnels
                                    |
                  +-----------------+-----------------+
                  |       Cinema Node Runner          |
                  |  (Autonomous Android Background)  |
                  +-----------------+-----------------+
                                    |
                  +-----------------+-----------------+
                  |      Cinema Android Client        |
                  |   (Native Player & Downloader)    |
                  +-----------------------------------+
```

### 1. Cinema Web
The flagship streaming destination. Built for speed, responsiveness, and fluid navigation across all screen sizes.
* **Fluid Playback**: Full support for multi-track audio switching, adaptive resolution selection (from 480p up to 4K), and custom subtitle tracks.
* **Smart Navigation**: Remembers your exact search terms and scroll positions when navigating between titles.
* **Shield Protection**: Intelligent proxy routing ensures artwork and posters load flawlessly without being blocked by browser shields.

### 2. Cinema Node Runner
A background service application built for Android devices. It turns any spare device into a private, high-speed streaming gateway.
* **One-Tap Operation**: Launches background scrapers and establishes secure Cloudflare tunnels automatically.
* **Always Connected**: Built with native Android background services to prevent battery management suspensions.
* **Seamless Updates**: Features in-app background downloading that updates the engine directly without visiting external websites.

### 3. Cinema Android Client
A standalone mobile player for on-the-go streaming and media management.
* **External Player Forwarding**: Stream directly to your favorite media players, including VLC and MX Player.
* **Fast Downloads**: Resumable multi-mirror download options for offline viewing.

---

## First-Time Setup

When launching Cinema for the first time, you will be prompted to verify your media directory.

> **Access Key:** `harsh cinema`

Enter this key in the provider setup prompt to unlock the complete streaming library.

---

## Experience Cinema

### Web Application
Access the platform instantly from any modern web browser:
**[cinema-dwh.pages.dev](https://cinema-dwh.pages.dev/)**

### Local Development
To run the project locally on your machine:

```bash
# Clone the repository
git clone https://github.com/HarshSharma20050924/cinema.git
cd cinema

# Install dependencies and start
npm install
npm start
```

Your local instance will be live at `http://localhost:5174`.

---

## Architecture & Technologies

<div align="center">

<p>
<img src="https://skillicons.dev/icons?i=react,ts,vite,nodejs,express,kotlin,android,cloudflare&theme=dark" />
</p>

</div>

<div align="center">

| Component | Role | Core Technologies |
| :--- | :--- | :--- |
| **Interface** | Responsive Web App | React 19, TypeScript, Artplayer, HLS.js |
| **Node Host** | Background Tunnel & Engine | Capacitor, Node.js Mobile, Android Services |
| **Mobile App** | Native Player & Downloader | React Native, Kotlin, MMKV |
| **Infrastructure** | Edge Delivery & Routing | Cloudflare Pages, Cloudflare Tunnels |

</div>

---

<div align="center">

## Author & Maintainer

Cinema is designed and maintained by **[Harsh Sharma](https://github.com/HarshSharma20050924)**.

<br/>

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white&labelColor=0d1117)](https://linkedin.com/in/harsh-sharma-44476339b)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=for-the-badge&logo=github&logoColor=white&labelColor=0d1117)](https://github.com/HarshSharma20050924)
[![Gmail](https://img.shields.io/badge/Gmail-Contact-EA4335?style=for-the-badge&logo=gmail&logoColor=white&labelColor=0d1117)](mailto:harsh20050924@gmail.com)

<br/><br/>

<img src="https://capsule-render.vercel.app/api?type=waving&height=180&section=footer&text=Experience%20Pure%20Cinema&fontSize=32&fontAlignY=70&color=0:E50914,50:B81D24,100:141414&fontColor=ffffff"/>

</div>

---

## Disclaimer

Cinema is an open-source research and educational project. It does not host, store, or distribute any media files. All metadata and streams are resolved dynamically from publicly accessible third-party services.
