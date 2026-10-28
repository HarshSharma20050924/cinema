export interface WatchProviderItem {
  id: number;
  name: string;
  slug: string;
  logo: string;
  accentColor: string;
}

export const WATCH_PROVIDERS: WatchProviderItem[] = [
  {
    id: 8,
    name: "Netflix",
    slug: "netflix",
    logo: "https://image.tmdb.org/t/p/original/rK1KljqmbvO9HQa1PBFLILWah72.png",
    accentColor: "#E50914",
  },
  {
    id: 119,
    name: "Amazon Prime Video",
    slug: "prime-video",
    logo: "https://image.tmdb.org/t/p/original/gMZdpavHmxFNnLpMHwVxfqeux2g.png",
    accentColor: "#00A8E1",
  },
  {
    id: 122,
    name: "Disney Plus",
    slug: "disney-plus",
    logo: "https://image.tmdb.org/t/p/original/5eZ872CghnHFLB1j8grszbrx0dx.png",
    accentColor: "#113CCF",
  },
  {
    id: 350,
    name: "Apple TV+",
    slug: "apple-tv-plus",
    logo: "https://image.tmdb.org/t/p/w154/9icYBfYFcwgCbky5VdGUIKJ4C5i.png",
    accentColor: "#FFFFFF",
  },
  {
    id: 2,
    name: "Apple TV",
    slug: "apple-tv",
    logo: "https://image.tmdb.org/t/p/original/9icYBfYFcwgCbky5VdGUIKJ4C5i.png",
    accentColor: "#FFFFFF",
  },
  {
    id: 15,
    name: "Hulu",
    slug: "hulu",
    logo: "https://image.tmdb.org/t/p/original/44uAnmSqvA4yBOdbPWN8YgQHjWm.png",
    accentColor: "#1CE783",
  },
  {
    id: 1899,
    name: "HBO Max",
    slug: "hbo-max",
    logo: "https://image.tmdb.org/t/p/w154/skypuy7SXuugIQeYg0IglmzoKaS.png",
    accentColor: "#9952ff",
  },
  {
    id: 531,
    name: "Paramount+",
    slug: "paramount-plus",
    logo: "https://image.tmdb.org/t/p/original/4N4BMd0Mm0kHAmF7RZgL5lW3cwc.png",
    accentColor: "#0064FF",
  },
  {
    id: 386,
    name: "Peacock",
    slug: "peacock",
    logo: "https://image.tmdb.org/t/p/original/a1UIdq5BrkcAxnxcUhFsNbXnxeu.png",
    accentColor: "#FFCC00",
  },
  {
    id: 283,
    name: "Crunchyroll",
    slug: "crunchyroll",
    logo: "https://imgs.search.brave.com/whC2jGj2ND-6YxvLR7tMwkRy13H8CCBuipyCAxj3vIc/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9zdGF0/aWMudmVjdGVlenku/Y29tL3N5c3RlbS9y/ZXNvdXJjZXMvcHJl/dmlld3MvMDU2LzY1/OC8zMzUvbm9uXzJ4/L2NydW5jaHlyb2xs/LWxvZ28tc3F1YXJl/LXJvdW5kZWQtY3J1/bmNoeXJvbGwtbG9n/by1jcnVuY2h5cm9s/bC1sb2dvLWZyZWUt/ZG93bmxvYWQtZnJl/ZS1wbmcucG5n",
    accentColor: "#F47521",
  },
  {
    id: 43,
    name: "Starz",
    slug: "starz",
    logo: "https://image.tmdb.org/t/p/w154/h25xjouKmiSmFiiqw0aDXbxGZo7.png",
    accentColor: "#00A88F",
  },
  {
    id: 528,
    name: "AMC+",
    slug: "amc-plus",
    logo: "https://image.tmdb.org/t/p/w154/wsCUflcmL4dCkzBUaGP8cj1cTkh.png",
    accentColor: "#00E5FF",
  },
  {
    id: 583,
    name: "MGM+",
    slug: "mgm-plus",
    logo: "https://image.tmdb.org/t/p/original/gk7O3l9qHttE9F3hgDNnhbhlOs7.png",
    accentColor: "#F5A623",
  },
  {
    id: 192,
    name: "YouTube Premium",
    slug: "youtube-premium",
    logo: "https://image.tmdb.org/t/p/w154/eWHpKZihdiY617s5LipWJWvN28U.png",
    accentColor: "#FF0000",
  },
  {
    id: 191,
    name: "YouTube",
    slug: "youtube",
    logo: "https://image.tmdb.org/t/p/w154/5Maob4o5w8oZnNeYpCDyVFD3M7X.png",
    accentColor: "#FF0000",
  },
  {
    id: 73,
    name: "Tubi",
    slug: "tubi",
    logo: "https://image.tmdb.org/t/p/w154/9dEuvA8wg5TSeFBZlPxSVxFdimJ.png",
    accentColor: "#FA3200",
  },
  {
    id: 224,
    name: "MX Player",
    slug: "mx-player",
    logo: "https://imgs.search.brave.com/Vl8ACyAHdjbS-mKuunf2Uy-GLJyM3vty9vBnLFHaApM/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9hcmNo/aXZlLm9yZy9kb3du/bG9hZC9teC1wbGF5/ZXItaWNvbi9teC1w/bGF5ZXItaWNvbi5w/bmc",
    accentColor: "#0066FF",
  },
  {
    id: 220,
    name: "JioCinema",
    slug: "jiocinema",
    logo: "https://imgs.search.brave.com/3WBvvvDZhKpULhahfn9VLlQ6hgeZjFI_d2PCfW6VwaA/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy8x/LzE0L0ppb2NpbmVt/YS5wbmc_Xz0yMDE5/MTIwNDEwNTY0OQ",
    accentColor: "#E5007D",
  },
  {
    id: 232,
    name: "Zee5",
    slug: "zee5",
    logo: "https://imgs.search.brave.com/ZnWfwyij-AV_BA--iZycAXIsKNVbT04lbYw-kaZdR5E/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9zdGF0/aWMudmVjdGVlenku/Y29tL3N5c3RlbS9y/ZXNvdXJjZXMvcHJl/dmlld3MvMDU3LzM1/NS83OTMvbm9uXzJ4/L3plZTUtYXBwLWlj/b24tb24tdHJhbnNw/YXJlbnQtYmFja2dy/b3VuZC1mcmVlLXBu/Zy5wbmc",
    accentColor: "#8230C6",
  },
  {
    id: 237,
    name: "Sony LIV",
    slug: "sonyliv",
    logo: "https://imgs.search.brave.com/Hb2F0mehZ_vcb1aZXQMj-BQ0o-muLXHQeuJeTYDh4Ew/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9zdGF0/aWMudmVjdGVlenku/Y29tL3N5c3RlbS9y/ZXNvdXJjZXMvcHJl/dmlld3MvMDc1LzE5/NS80MTcvbm9uXzJ4/L3NvbnktbGl2LWxv/Z28tcm91bmRlZC1n/bG9zc3ktaWNvbi13/aXRoLXRyYW5zcGFy/ZW50LWJhY2tncm91/bmQtZnJlZS1wbmcu/cG5n",
    accentColor: "#00E5FF",
  },
  {
    id: 532,
    name: "Aha",
    slug: "aha",
    logo: "https://imgs.search.brave.com/H_7oTXREPNk8YC-Fj0fR2yZLvqrdn7g5ZeAM6GO5bwc/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pbWFn/ZXMuc2Vla2xvZ28u/Y29tL2xvZ28tcG5n/LzQ2LzIvYWhhLW90/dC1sb2dvLXBuZ19z/ZWVrbG9nby00NjM0/NTUucG5n",
    accentColor: "#FF6600",
  },
  {
    id: 554,
    name: "Lionsgate Play",
    slug: "lionsgate-play",
    logo: "https://imgs.search.brave.com/zN3XYkG578uXn1Y7o_89xV-4kzQmqFmhEpzWvCAMdB0/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9wbGF5/LWxoLmdvb2dsZXVz/ZXJjb250ZW50LmNv/bS8wcm9mSjBQOHRE/RlhUeGdwcTMwTVlv/REphWEtMak5PUW40/VXRXeC1JV3NUQjVU/T21oWXJ2MU9fUjBu/N0xyZFVkWjFkWl9Z/X1ZHQUtWNWI2bl9o/NG56SGc9dzI0MC1o/NDgw",
    accentColor: "#F5A623",
  },
];
