# Cinema UI & Architecture Rules

## 1. Pure Crystal Transparent Frosted Glass UI Everywhere
- **STRICT MANDATE**: Every interactive overlay, dropdown menu, popover, shelf scroll arrow, modal header, floating badge, and video player control MUST use **Pure Crystal Transparent Frosted Glass**.
- **STRICT PROHIBITION**: NEVER use dark black, dark grey, or opaque tints (NO `rgba(14, 16, 22)`, `rgba(10, 10, 10)`, or dark black gradients). The glass MUST be truly transparent so it dynamically takes on whatever background is behind it (e.g. blue sea, grey sky, warm sunset, video scenes).
- **Visual Token Standards**:
  - `background`: `rgba(255, 255, 255, 0.08)` to `rgba(255, 255, 255, 0.14)` (pure white translucent, zero black pigment).
  - `backdropFilter`: `blur(24px) saturate(180%)` to `blur(32px) saturate(200%)`.
  - `WebkitBackdropFilter`: `blur(24px) saturate(180%)` to `blur(32px) saturate(200%)`.
  - `border`: `1px solid rgba(255, 255, 255, 0.20)` to `rgba(255, 255, 255, 0.25)`.
  - `boxShadow`: `0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.4)`.
  - `borderRadius`: `9999px` (full pill) for buttons/badges, `20px` - `24px` for cards and dropdown menus.

## 2. Active Selection & Hover Accent (Cinema Red)
- When a filter pill, toggle, or primary action button is **Active or Selected**, style it with **Solid Cinema Red**:
  - `background`: `#e50914` (solid red, matching the Play button and Discover hover).
  - `color`: `#ffffff`.
  - `border`: `1px solid #e50914`.
  - `boxShadow`: `0 4px 14px rgba(229, 9, 20, 0.45)`.
- Never use red underlines or weird red outlines for buttons (like Reset). Reset buttons must be clean, translucent frosted pills (`rgba(255, 255, 255, 0.08)` with hover `rgba(255, 255, 255, 0.18)`).

## 3. Shelf Scroll Arrows
- Shelf scroll arrow buttons must be **fully translucent frosted glass** floating buttons:
  - `background`: `rgba(255, 255, 255, 0.10)` / `rgba(18, 20, 26, 0.5)`.
  - `backdropFilter`: `blur(16px)` / `-webkit-backdrop-filter: blur(16px)`.
  - `border`: `1px solid rgba(255, 255, 255, 0.18)`.
  - `color`: `#ffffff`.
  - On hover: `background: #e50914`, `borderColor: #e50914`, `transform: translateY(-50%) scale(1.08)`.

## 4. Media Card Badges & Release Dates
- Release date tags and technical badges on Media Cards must be styled with the **Navbar Frosted Glass pill**:
  - `background`: `rgba(10, 12, 18, 0.65)`.
  - `backdropFilter`: `blur(12px)` / `-webkit-backdrop-filter: blur(12px)`.
  - `border`: `1px solid rgba(255, 255, 255, 0.18)`.
  - `borderRadius`: `999px`.
  - `color`: `#ffffff`.
  - `fontSize`: `11px`, `fontWeight: 700`.

## 5. STRICT RULE: No Hardcoding Fake or Unreleased Movies
- **NEVER hardcode fake, unreleased, or fan-concept titles** (e.g., *Spider-Man: Brand New Day*, unreleased *Avengers: Doomsday* in released lists, *Clayface*, fake dates).
- Always fetch real data dynamically from TMDB `/trending`, `/discover`, `/movie/upcoming`, `/tv/on_the_air`.
- For released shelves: strictly filter `release_date <= today` and `vote_count > 0`.
- For upcoming shelves: strictly fetch live future releases from TMDB (`primary_release_date.gte=today` and `release_date > today`) and cache dynamically in `localStorage`.
- For services / watch providers: fetch dynamically from TMDB watch providers (`/watch/providers/movie?watch_region=IN`) and active app providers; DO NOT rely on static hardcoded lists.

## 6. Daily-Updating Shelves vs Fixed Curated Collections
- **Daily Shelves (Dynamic ONLY)**:
  - `Top 10 Shows Today`, `Top 10 Movies Today`, `Trending Movies`, `Trending TV Shows`, `Popular Right Now`, `New Episodes This Week`, `Coming Soon`.
  - **MANDATE**: NEVER hardcode static movie/show arrays for these shelves (no hardcoded Lupin, The Dark Knight, Shogun, Grey's Anatomy as fallbacks). These shelves MUST pull strictly from live TMDB daily/weekly trending APIs and dynamic localStorage caches (`cinema_live_*`).
- **Fixed Collections (Curated Allowed)**:
  - Only permanent historical or award collections (e.g., *IMDb Top 250*, *Letterboxd Top 250*, *Oscar Best Picture Winners*, *Emmy Award Winners*, *Palme d'Or Winners*, *All-Time Box Office Hits*, *Franchises*) are allowed to have fixed curated rankings.

