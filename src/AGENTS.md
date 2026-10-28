# Cinema UI & Architecture Rules

## 1. Translucent Frosted Glass UI (Navbar Style) Everywhere
- **STRICT MANDATE**: Every interactive overlay, dropdown menu, popover, shelf scroll arrow, modal header, and floating badge MUST use the **Navbar Frosted Glass UI**.
- **Never use solid opaque black or dark gray** for dropdowns, popovers, or shelf arrows.
- **Visual Token Standards**:
  - `background`: `rgba(14, 16, 22, 0.75)` to `rgba(20, 24, 32, 0.82)` (translucent, never opaque).
  - `backdropFilter`: `blur(20px)` / `-webkit-backdrop-filter: blur(20px)`.
  - `border`: `1px solid rgba(255, 255, 255, 0.14)` to `rgba(255, 255, 255, 0.18)`.
  - `boxShadow`: `0 16px 40px rgba(0, 0, 0, 0.75)`.
  - `borderRadius`: `999px` (full pill) for buttons/badges, `16px` - `20px` for dropdown menus.

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

