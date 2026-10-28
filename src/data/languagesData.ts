export interface LanguageItem {
  code: string;
  name: string;
  subtitle: string;
  nativeName?: string;
  image: string;
  color: string;
  gradient?: string;
  accent?: string;
}

export const CINEMA_LANGUAGES: LanguageItem[] = [
  {
    code: "hi",
    name: "Bollywood",
    subtitle: "Hindi Cinema",
    nativeName: "हिन्दी",
    image: "https://i.pinimg.com/736x/63/f0/90/63f090bfbdaa5867c2395aaac1d62a10.jpg",
    color: "rgba(229, 9, 20, 0.35)",
    accent: "#e50914",
  },
  {
    code: "en",
    name: "Hollywood",
    subtitle: "English Cinema",
    nativeName: "English",
    image: "https://i.pinimg.com/736x/ad/8b/86/ad8b8621446269c57dbebfbf9e0009ad.jpg",
    color: "rgba(59, 130, 246, 0.35)",
    accent: "#3b82f6",
  },
  {
    code: "te",
    name: "Tollywood",
    subtitle: "Telugu Cinema",
    nativeName: "తెలుగు",
    image: "https://i.pinimg.com/736x/4b/dd/ed/4bdded71528c3e85dd824133ec23beac.jpg",
    color: "rgba(245, 158, 11, 0.35)",
    accent: "#f59e0b",
  },
  {
    code: "ta",
    name: "Kollywood",
    subtitle: "Tamil Cinema",
    nativeName: "தமிழ்",
    image: "https://i.pinimg.com/736x/99/29/27/992927ee26cb576fa828db1157f69782.jpg",
    color: "rgba(239, 68, 68, 0.35)",
    accent: "#ef4444",
  },
  {
    code: "ml",
    name: "Mollywood",
    subtitle: "Malayalam Cinema",
    nativeName: "മലയാളം",
    image: "https://i.ibb.co/rf3LmMgV/a6ca8eb255b2852a57d7511196ca20e6-1.jpg",
    color: "rgba(16, 185, 129, 0.35)",
    accent: "#10b981",
  },
  {
    code: "kn",
    name: "Sandalwood",
    subtitle: "Kannada Cinema",
    nativeName: "ಕನ್ನಡ",
    image: "https://i.ibb.co/3mLTV8Jd/1282f7d2e181ee9f45064404d211299b.jpg",
    color: "rgba(139, 92, 246, 0.35)",
    accent: "#8b5cf6",
  },
  {
    code: "south",
    name: "South Indian Movies",
    subtitle: "All South Cinema",
    nativeName: "South",
    image: "https://i.postimg.cc/y8VsxLg4/839b37b9-78ec-43ef-8876-f70b3d8e5266.jpg",
    color: "rgba(249, 115, 22, 0.35)",
    accent: "#f97316",
  },
  {
    code: "tv",
    name: "Web Series",
    subtitle: "Series & Shows",
    nativeName: "Series",
    image: "https://i.postimg.cc/PJdxzTVr/784239c2d583ba8bf7cd0d505c073f84.jpg",
    color: "rgba(168, 85, 247, 0.35)",
    accent: "#a855f7",
  },
  {
    code: "dual",
    name: "Hindi Dubbed",
    subtitle: "Dual Audio",
    nativeName: "Dual Audio",
    image: "https://i.pinimg.com/736x/90/7d/39/907d39a12319a4e4796fce034e1e8fee.jpg",
    color: "rgba(6, 182, 211, 0.35)",
    accent: "#06b6d4",
  },
  {
    code: "pa",
    name: "Pollywood",
    subtitle: "Punjabi Cinema",
    nativeName: "ਪੰਜਾਬੀ",
    image: "https://i.pinimg.com/1200x/5a/e3/60/5ae360e6dba1a1c1b4bcabd57c6cd7ba.jpg",
    color: "rgba(234, 179, 8, 0.35)",
    accent: "#eab308",
  },
  {
    code: "ja",
    name: "Anime",
    subtitle: "Anime & Animation",
    nativeName: "アニメ",
    image: "https://i.pinimg.com/1200x/10/58/2d/10582d6830ddbe3324d558396b7e1f71.jpg",
    color: "rgba(236, 72, 153, 0.35)",
    accent: "#ec4899",
  },
  {
    code: "ko",
    name: "K-Drama",
    subtitle: "Korean Drama",
    nativeName: "한국어",
    image: "https://i.pinimg.com/736x/ad/3e/77/ad3e7738bcf5b1087b1149160545c4cf.jpg",
    color: "rgba(20, 184, 166, 0.35)",
    accent: "#14b8a6",
  },
];
