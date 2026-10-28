import React, { useState, useEffect, useMemo, useRef } from "react";
import type { Post } from "../../types";
import { CatalogSection } from "./CatalogSection";
import {
  ArrowLeftIcon,
  PlayIcon,
  PlusIcon,
  CheckIcon,
  InfoIcon,
  StarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "../../icons";
import { fetchTMDBDetails, type TMDBDetails } from "../../api/tmdb";
import { parseTitleAndYear } from "../media/MediaCard";
import { cleanHeroTitle } from "../hero/HeroSpotlight";

const TMDB_API_KEY = "cfe422613b250f702980a3bbf9e90716";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_BASE_W500 = "https://image.tmdb.org/t/p/w500";
const IMG_BASE_ORIGINAL = "https://image.tmdb.org/t/p/original";

const GENRE_TMDB_MAP: Record<string, number> = {
  Action: 28,
  Adventure: 12,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Family: 10751,
  Fantasy: 14,
  History: 36,
  Horror: 27,
  Music: 10402,
  Mystery: 9648,
  Romance: 10749,
  "Science Fiction": 878,
  "Sci-Fi": 878,
  Thriller: 53,
  War: 10752,
  Western: 37,
};

export const LANGUAGE_TMDB_MAP: Record<string, string> = {
  Hindi: "hi",
  Bollywood: "hi",
  Malayalam: "ml",
  Mollywood: "ml",
  Tamil: "ta",
  Kollywood: "ta",
  Telugu: "te",
  Tollywood: "te",
  Kannada: "kn",
  Sandalwood: "kn",
  English: "en",
  Hollywood: "en",
  Korean: "ko",
  "K-Drama": "ko",
  Japanese: "ja",
  Anime: "anime",
  Punjabi: "pa",
  Pollywood: "pa",
  "South Indian Movies": "te|ta|ml|kn",
  "Hindi Dubbed": "hi",
  "Web Series": "tv",
  Bengali: "bn",
  Marathi: "mr",
};

// Fallback curated spotlight slides for top genres
const GENRE_DEFAULT_SLIDES: Record<string, Post[]> = {
  Romance: [
    {
      title: "Corpse Bride",
      year: "2005",
      rating: "7.8",
      image: "https://image.tmdb.org/t/p/w500/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg",
      backdropUrl: "https://image.tmdb.org/t/p/original/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg",
      logoUrl: "https://image.tmdb.org/t/p/original/2wT5B7tH4a7g5v9v4a8m5h6h9.png",
      genres: "Romance, Fantasy",
      tag: "1h 17m",
      description:
        "In a 19th-century European village, a young man about to be married is whisked away to the underworld and wed to a mysterious corpse bride, while his real bride waits bereft in the world of the living.",
      link: "/search?q=Corpse+Bride",
    },
    {
      title: "Twilight",
      year: "2008",
      rating: "6.8",
      image: "https://image.tmdb.org/t/p/w500/a2Z52QvK0n09p1G6n8U8kXjU9.jpg",
      backdropUrl: "https://image.tmdb.org/t/p/original/9r9f6U6Xy2kZ2H4H2Q4P9X7kX.jpg",
      genres: "Romance, Fantasy, Drama",
      tag: "2h 2m",
      description:
        "Bella Swan moves to small-town Washington and finds herself drawn to mysterious, handsome Edward Cullen, who harbors a supernatural secret.",
      link: "/search?q=Twilight",
    },
    {
      title: "Forrest Gump",
      year: "1994",
      rating: "8.8",
      image: "https://image.tmdb.org/t/p/w500/arw2tuvTnGlmp2ufRBZKQxQvuww.jpg",
      backdropUrl: "https://image.tmdb.org/t/p/original/qdIMlsUm4TxkoIFbBpCImfq0GsU.jpg",
      genres: "Comedy, Drama, Romance",
      tag: "2h 22m",
      description:
        "A man with a low IQ has accomplished great things in his life and been present during significant historic events—in each step guided by his lifelong love for Jenny.",
      link: "/search?q=Forrest+Gump",
    },
    {
      title: "Your Name.",
      year: "2016",
      rating: "8.5",
      image: "https://image.tmdb.org/t/p/w500/q719jXXEzOoYaps6qFsxWa93oMm.jpg",
      backdropUrl: "https://image.tmdb.org/t/p/original/dIWwZWnlXjjIP6O2ea9ILRKLBsJ.jpg",
      genres: "Animation, Romance, Fantasy",
      tag: "1h 46m",
      description:
        "High schoolers Mitsuha and Taki are complete strangers living separate lives until they suddenly begin switching bodies across time and distance.",
      link: "/search?q=Your+Name",
    },
    {
      title: "La La Land",
      year: "2016",
      rating: "8.0",
      image: "https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkVJt0Rf0.jpg",
      backdropUrl: "https://image.tmdb.org/t/p/original/qJeU7KM4oWvH1i32B4N6d2HwY9A.jpg",
      genres: "Comedy, Drama, Romance",
      tag: "2h 8m",
      description:
        "While navigating their careers in Los Angeles, a pianist and an actress fall in love while attempting to reconcile their aspirations for the future.",
      link: "/search?q=La+La+Land",
    },
  ],
  Action: [
    {
      title: "Top Gun: Maverick",
      year: "2022",
      rating: "8.3",
      image: "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
      backdropUrl: "https://image.tmdb.org/t/p/original/odJ4hx6g6vBt4lBWKFD1tI8WS4x.jpg",
      genres: "Action, Drama",
      tag: "2h 10m",
      description:
        "After thirty years, Maverick is still pushing the envelope as a top naval aviator, but must confront ghosts of his past when he leads TOP GUN's elite graduates on an impossible mission.",
      link: "/search?q=Top+Gun+Maverick",
    },
    {
      title: "The Batman",
      year: "2022",
      rating: "7.8",
      image: "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg",
      backdropUrl: "https://image.tmdb.org/t/p/original/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg",
      genres: "Action, Crime, Drama",
      tag: "2h 56m",
      description:
        "In his second year of fighting crime, Batman uncovers corruption in Gotham City that connects to his own family while facing a serial killer known as the Riddler.",
      link: "/search?q=The+Batman",
    },
    {
      title: "Dune: Part Two",
      year: "2024",
      rating: "8.5",
      image: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
      backdropUrl: "https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg",
      genres: "Action, Sci-Fi, Adventure",
      tag: "2h 46m",
      description:
        "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
      link: "/search?q=Dune+Part+Two",
    },
    {
      title: "Gladiator II",
      year: "2024",
      rating: "7.0",
      image: "https://image.tmdb.org/t/p/w500/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg",
      backdropUrl: "https://image.tmdb.org/t/p/original/euYIwmwkmz95mnExvufzkajMz4P.jpg",
      genres: "Action, Drama, History",
      tag: "2h 28m",
      description:
        "Years after witnessing the death of Maximus at the hands of his uncle, Lucius must enter the Colosseum after his home is conquered by tyrannical Emperors.",
      link: "/search?q=Gladiator+II",
    },
  ],
  Horror: [
    {
      title: "IT",
      year: "2017",
      rating: "7.5",
      image: "https://image.tmdb.org/t/p/w500/tcheoA2nPATCm2vvXw2hVQoaEFD.jpg",
      backdropUrl: "https://image.tmdb.org/t/p/original/tcheoA2nPATCm2vvXw2hVQoaEFD.jpg",
      genres: "Horror, Mystery",
      tag: "2h 15m",
      description:
        "In the summer of 1989, a group of bullied kids band together to destroy a shape-shifting monster, which disguises itself as a clown and preys on the children of Derry.",
      link: "/search?q=IT",
    },
    {
      title: "The Nun",
      year: "2018",
      rating: "6.0",
      image: "https://image.tmdb.org/t/p/w500/sFC1ElvoKGdHJIWRpNB3xWJ9lJA.jpg",
      backdropUrl: "https://image.tmdb.org/t/p/original/cMnVmutb5mVgIBeiMOncAbwNjvG.jpg",
      genres: "Horror, Mystery, Thriller",
      tag: "1h 36m",
      description:
        "A priest with a haunted past and a novice on the threshold of her final vows are sent by the Vatican to investigate the death of a young nun in Romania.",
      link: "/search?q=The+Nun",
    },
    {
      title: "Smile",
      year: "2022",
      rating: "6.8",
      image: "https://image.tmdb.org/t/p/w500/aPqcQwu4VGEewPhagWNncDbJ9Xp.jpg",
      backdropUrl: "https://image.tmdb.org/t/p/original/kMZIMqEXO5MFd5Y1Ha2jZZF4pvF.jpg",
      genres: "Horror, Mystery",
      tag: "1h 55m",
      description:
        "After witnessing a bizarre, traumatic incident involving a patient, Dr. Rose Cotter starts experiencing frightening occurrences that she can't explain.",
      link: "/search?q=Smile",
    },
  ],
};

interface GenreShowcasePageProps {
  genreTitle: string;
  posts: Post[];
  onSelectPost: (post: Post) => void;
  onBack: () => void;
  onOpenFilterBrowse: (genre: string) => void;
  onStreamNow?: (post: Post) => void;
  onSlideChange?: (post: Post, backdropUrl: string) => void;
}

export const GenreShowcasePage: React.FC<GenreShowcasePageProps> = ({
  genreTitle,
  posts,
  onSelectPost,
  onBack,
  onOpenFilterBrowse,
  onStreamNow,
  onSlideChange,
}) => {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isHoveringSlide, setIsHoveringSlide] = useState(false);
  const [liveSlides, setLiveSlides] = useState<Post[]>([]);
  const [popularItems, setPopularItems] = useState<Post[]>([]);
  const [criticsItems, setCriticsItems] = useState<Post[]>([]);
  const [newReleaseItems, setNewReleaseItems] = useState<Post[]>([]);
  const [hiddenGemItems, setHiddenGemItems] = useState<Post[]>([]);
  const [classicItems, setClassicItems] = useState<Post[]>([]);

  // 1. Initial curated pool
  const defaultSlides = useMemo(() => {
    if (GENRE_DEFAULT_SLIDES[genreTitle]) {
      return GENRE_DEFAULT_SLIDES[genreTitle];
    }
    // Filter from home posts
    const q = genreTitle.toLowerCase();
    const filtered = posts.filter((p) => {
      const text = `${p.title || ""} ${p.genres || ""} ${p.tag || ""}`.toLowerCase();
      return text.includes(q);
    });
    return filtered.length >= 3 ? filtered : posts.slice(0, 5);
  }, [genreTitle, posts]);

  const activeSlides = liveSlides.length > 0 ? liveSlides : defaultSlides;
  const currentSlide = activeSlides[activeSlideIndex % activeSlides.length] || activeSlides[0];

  // TMDB details cache for extracted PNG logos
  const [slideDetails, setSlideDetails] = useState<Record<string, TMDBDetails>>({});

  useEffect(() => {
    if (!activeSlides.length) return;
    let active = true;

    activeSlides.forEach((slide) => {
      const rawTitle = slide.title;
      if (!rawTitle || slideDetails[rawTitle]) return;
      const { title: cleanTitle, year } = parseTitleAndYear(rawTitle);

      fetchTMDBDetails(cleanTitle || rawTitle, (slide as any).imdbId, year || slide.year, (slide as any).id)
        .then((data) => {
          if (!active || !data) return;
          setSlideDetails((prev) => ({ ...prev, [rawTitle]: data }));
        })
        .catch(() => {});
    });

    return () => {
      active = false;
    };
  }, [activeSlides]);

  const currentTmdb = slideDetails[currentSlide?.title || ""];
  const currentLogo = currentSlide?.logoUrl || currentTmdb?.logoUrl;

  // 2. Fetch Live Genre Catalog from TMDB
  useEffect(() => {
    let mounted = true;
    const tmdbGenreId = GENRE_TMDB_MAP[genreTitle];
    const tmdbLangCode = LANGUAGE_TMDB_MAP[genreTitle];

    if (!tmdbGenreId && !tmdbLangCode) return;

    const fetchTmdbItems = async (sort: string, voteCountGte = 30) => {
      try {
        let url = "";
        if (tmdbLangCode === "tv") {
          url = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&sort_by=${sort}&vote_count.gte=${voteCountGte}`;
        } else if (tmdbLangCode === "anime") {
          url = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_genres=16&with_original_language=ja&sort_by=${sort}&vote_count.gte=${voteCountGte}`;
        } else if (tmdbGenreId) {
          url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${tmdbGenreId}&sort_by=${sort}&vote_count.gte=${voteCountGte}`;
        } else {
          url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=${tmdbLangCode}&sort_by=${sort}&vote_count.gte=${voteCountGte}`;
        }
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.results || [])
          .filter((r: any) => r.poster_path && r.backdrop_path)
          .slice(0, 16)
          .map((r: any) => ({
            title: r.title || r.name,
            year: (r.release_date || r.first_air_date || "").slice(0, 4),
            rating: r.vote_average ? r.vote_average.toFixed(1) : "7.5",
            image: `${IMG_BASE_W500}${r.poster_path}`,
            backdropUrl: `${IMG_BASE_ORIGINAL}${r.backdrop_path}`,
            description: r.overview,
            genres: genreTitle,
            link: `/search?q=${encodeURIComponent(r.title || r.name)}`,
          }));
      } catch {
        return [];
      }
    };

    Promise.all([
      fetchTmdbItems("popularity.desc", tmdbLangCode ? 20 : 100),
      fetchTmdbItems("vote_average.desc", tmdbLangCode ? 35 : 500),
      fetchTmdbItems("primary_release_date.desc", 10),
      fetchTmdbItems("vote_count.desc", tmdbLangCode ? 30 : 300),
    ]).then(([popular, critics, newReleases, classics]) => {
      if (!mounted) return;
      if (popular.length > 0) {
        setPopularItems(popular);
        setLiveSlides(popular.slice(0, 6));
      }
      if (critics.length > 0) setCriticsItems(critics);
      if (newReleases.length > 0) setNewReleaseItems(newReleases);
      if (classics.length > 0) {
        setClassicItems(classics.slice(0, 14));
        setHiddenGemItems(classics.slice(4, 18));
      }
    });

    return () => {
      mounted = false;
    };
  }, [genreTitle]);

  // 3. Auto-Advance Slide with Pause on Hover
  useEffect(() => {
    if (isHoveringSlide || activeSlides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % activeSlides.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [isHoveringSlide, activeSlides.length]);

  const nextSlide = () => {
    setActiveSlideIndex((prev) => (prev + 1) % activeSlides.length);
  };

  const prevSlide = () => {
    setActiveSlideIndex((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  };

  // Sync ambient background on slide change
  useEffect(() => {
    if (currentSlide && onSlideChange) {
      const bg = currentSlide.backdropUrl || "https://image.tmdb.org/t/p/original/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg";
      if (bg) onSlideChange(currentSlide, bg);
    }
  }, [currentSlide, onSlideChange]);

  // Fallback sub-shelf items if TMDB still loading
  const displayPopular = popularItems.length > 0 ? popularItems : posts.slice(0, 12);
  const displayCritics = criticsItems.length > 0 ? criticsItems : posts.slice(4, 16);
  const displayNewReleases = newReleaseItems.length > 0 ? newReleaseItems : posts.slice(2, 14);
  const displayHiddenGems = hiddenGemItems.length > 0 ? hiddenGemItems : posts.slice(6, 18);
  const displayClassics = classicItems.length > 0 ? classicItems : posts.slice(8, 20);

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "transparent",
        color: "#ffffff",
        paddingBottom: "80px",
        position: "relative",
      }}
    >
      {/* Full-Page Blurred Ambient Background (Smoothly shifts with active slide colors like Home page) */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          overflow: "hidden",
          backgroundColor: "#0a0c10",
        }}
      >
        <img
          key={currentSlide?.backdropUrl || "genre-ambient-fallback"}
          src={currentSlide?.backdropUrl || "https://image.tmdb.org/t/p/original/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg"}
          alt=""
          style={{
            position: "absolute",
            top: "-15%",
            left: "-15%",
            width: "130%",
            height: "130%",
            objectFit: "cover",
            objectPosition: "center 25%",
            filter: "blur(90px) saturate(2.4) brightness(0.48)",
            opacity: 1,
            animation: "ambientFadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(10, 12, 16, 0.12) 0%, rgba(10, 12, 16, 0.32) 35%, rgba(10, 12, 16, 0.58) 70%, rgba(10, 12, 16, 0.78) 100%)",
          }}
        />
      </div>

      <style>{`
        @keyframes ambientFadeIn {
          0% {
            opacity: 0.3;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes genreSlideFade {
          0% {
            opacity: 0.25;
            transform: scale(1.03);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes genreContentSlide {
          0% {
            opacity: 0;
            transform: translateY(18px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Floating iPhone Glossy Back Button + Large Genre Title directly over the slide */}
      <div
        style={{
          position: "absolute",
          top: "84px",
          left: "48px",
          zIndex: 35,
          display: "flex",
          alignItems: "center",
          gap: "14px",
          pointerEvents: "auto",
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 18px",
            borderRadius: "9999px",
            background: "rgba(255, 255, 255, 0.08)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.35)",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.28)";
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <ArrowLeftIcon size={16} />
          <span>Home</span>
        </button>

        <h1
          style={{
            fontSize: "28px",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#ffffff",
            textShadow: "0 2px 14px rgba(0, 0, 0, 0.9)",
          }}
        >
          <span style={{ color: "#e50914" }}>•</span>
          <span>{genreTitle}</span>
        </h1>
      </div>

      {/* Hero Spotlight Multi-Slide Carousel with Smooth Animation (matching home page slides) */}
      {currentSlide && (
        <div
          onMouseEnter={() => setIsHoveringSlide(true)}
          onMouseLeave={() => setIsHoveringSlide(false)}
          style={{
            position: "relative",
            width: "100%",
            minHeight: "680px",
            height: "85vh",
            maxHeight: "880px",
            overflow: "hidden",
            marginBottom: "36px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "flex-end",
            padding: "0 48px 64px 48px",
            userSelect: "none",
            background: "transparent",
            border: "none",
            boxShadow: "none",
          }}
        >
          {/* Background Image Container - Fade mask ONLY applied to the image layer */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              zIndex: 1,
              pointerEvents: "none",
              WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 90%, rgba(0, 0, 0, 0.45) 96%, transparent 100%)",
              maskImage: "linear-gradient(to bottom, black 0%, black 90%, rgba(0, 0, 0, 0.45) 96%, transparent 100%)",
            }}
          >
            <div
              key={currentSlide.title}
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url(${currentSlide.backdropUrl || "https://image.tmdb.org/t/p/original/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg"})`,
                backgroundSize: "cover",
                backgroundPosition: "center 22%",
                filter: "brightness(1.08) saturate(1.12)",
                animation: "genreSlideFade 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              }}
            />

            {/* Soft text protection without darkening the slide artwork */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(90deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.25) 45%, transparent 75%)",
              }}
            />

            {/* Top gradient under navigation bar */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "80px",
                background: "linear-gradient(180deg, rgba(0, 0, 0, 0.35) 0%, transparent 100%)",
              }}
            />
          </div>

          {/* Left Arrow Button on Spotlight - ONLY visible on slide hover */}
          <button
            onClick={prevSlide}
            title="Previous Slide"
            style={{
              position: "absolute",
              left: "24px",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "rgba(20, 24, 32, 0.65)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              opacity: isHoveringSlide ? 1 : 0,
              pointerEvents: isHoveringSlide ? "auto" : "none",
              transition: "opacity 0.25s ease, transform 0.2s ease, background 0.2s",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.6)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-50%) scale(1.08)";
              e.currentTarget.style.background = "rgba(30, 36, 48, 0.9)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
              e.currentTarget.style.background = "rgba(20, 24, 32, 0.65)";
            }}
          >
            <ChevronLeftIcon size={22} color="#ffffff" />
          </button>

          {/* Right Arrow Button on Spotlight - ONLY visible on slide hover */}
          <button
            onClick={nextSlide}
            title="Next Slide"
            style={{
              position: "absolute",
              right: "24px",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "rgba(20, 24, 32, 0.65)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              opacity: isHoveringSlide ? 1 : 0,
              pointerEvents: isHoveringSlide ? "auto" : "none",
              transition: "opacity 0.25s ease, transform 0.2s ease, background 0.2s",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.6)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-50%) scale(1.08)";
              e.currentTarget.style.background = "rgba(30, 36, 48, 0.9)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
              e.currentTarget.style.background = "rgba(20, 24, 32, 0.65)";
            }}
          >
            <ChevronRightIcon size={22} color="#ffffff" />
          </button>

          {/* Slide Indicator Dots matching Home hero style */}
          {activeSlides.length > 1 && (
            <div
              style={{
                position: "absolute",
                bottom: "38px",
                right: "48px",
                zIndex: 10,
                display: "flex",
                alignItems: "center",
                gap: "7px",
                background: "rgba(0, 0, 0, 0.4)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                padding: "6px 12px",
                borderRadius: "999px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              {activeSlides.map((_, i) => {
                const isActive = i === activeSlideIndex % activeSlides.length;
                return (
                  <button
                    key={i}
                    onClick={() => setActiveSlideIndex(i)}
                    aria-label={`Slide ${i + 1}`}
                    style={{
                      width: isActive ? "28px" : "7px",
                      height: "7px",
                      borderRadius: "999px",
                      background: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.4)",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      transition: "width 0.35s cubic-bezier(0.16, 1, 0.3, 1), background 0.25s ease",
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* Slide Content with Slide Animation - Sits at zIndex 4 with full unmasked clarity */}
          <div
            key={`content-${currentSlide.title}`}
            style={{
              position: "relative",
              zIndex: 4,
              maxWidth: "680px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              textAlign: "left",
              gap: "14px",
              animation: "genreContentSlide 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          >
            {/* Logo or Title - Uses official extracted TMDB PNG logo like Home hero */}
            {currentLogo ? (
              <img
                src={currentLogo}
                alt={currentSlide.title}
                style={{
                  maxHeight: "135px",
                  maxWidth: "min(480px, 88vw)",
                  objectFit: "contain",
                  marginBottom: "6px",
                  filter: "drop-shadow(0 4px 24px rgba(0, 0, 0, 0.95))",
                }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <h1
                style={{
                  fontFamily: "var(--font-display, 'Space Grotesk', -apple-system, sans-serif)",
                  fontSize: (currentSlide?.title || "").length > 25 ? "clamp(30px, 4.2vw, 50px)" : "clamp(48px, 6.5vw, 84px)",
                  fontWeight: 900,
                  lineHeight: 1.05,
                  color: "#ffffff",
                  letterSpacing: "-0.01em",
                  textTransform: "uppercase",
                  textShadow: "0 4px 32px rgba(0, 0, 0, 0.95)",
                  margin: 0,
                  maxWidth: "680px",
                  wordBreak: "break-word",
                }}
              >
                {cleanHeroTitle(currentSlide.title)}
              </h1>
            )}

            {/* Metadata Line matching Home hero */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
                fontSize: "14px",
                fontWeight: 700,
                color: "rgba(255, 255, 255, 0.92)",
                textShadow: "0 2px 8px rgba(0, 0, 0, 0.9)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  color: "#f59e0b",
                  fontWeight: 800,
                }}
              >
                <StarIcon size={14} fill="#f59e0b" color="#f59e0b" />
                <span>
                  {currentTmdb?.rating
                    ? currentTmdb.rating.includes("/10")
                      ? currentTmdb.rating
                      : `${currentTmdb.rating}/10`
                    : currentSlide.rating
                    ? currentSlide.rating.includes("/10")
                      ? currentSlide.rating
                      : `${currentSlide.rating}/10`
                    : "8.0/10"}
                </span>
              </div>
              <span style={{ color: "rgba(255, 255, 255, 0.4)" }}>•</span>
              <span>{currentTmdb?.year || currentSlide.year || "2026"}</span>
              <span style={{ color: "rgba(255, 255, 255, 0.4)" }}>•</span>
              <span>
                {(currentTmdb?.genres && currentTmdb.genres.length > 0
                  ? currentTmdb.genres[0]
                  : currentSlide.genres) || genreTitle}
              </span>
              {currentTmdb?.runtime && (
                <>
                  <span style={{ color: "rgba(255, 255, 255, 0.4)" }}>•</span>
                  <span style={{ color: "rgba(255, 255, 255, 0.75)" }}>{currentTmdb.runtime}</span>
                </>
              )}
            </div>

            {/* Synopsis - Crisp, fully visible text */}
            <p
              style={{
                fontSize: "clamp(16px, 1.25vw, 19px)",
                lineHeight: 1.55,
                color: "rgba(255, 255, 255, 0.92)",
                maxWidth: "620px",
                margin: "0",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textShadow: "0 2px 14px rgba(0, 0, 0, 0.95), 0 1px 4px rgba(0, 0, 0, 0.8)",
              }}
            >
              {currentTmdb?.overview ||
                currentSlide.description ||
                "A captivating masterpiece crafted with heartfelt emotional journeys, stunning visuals, and unforgettable performances."}
            </p>

            {/* Action Buttons: Red Play Button + Glass Capsule for Watchlist & Info */}
            <div
              className="hero-spotlight-actions"
              style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "8px" }}
            >
              {/* Premium Red Play Button */}
              <button
                onClick={() => (onStreamNow ? onStreamNow(currentSlide) : onSelectPost(currentSlide))}
                style={{
                  height: "52px",
                  padding: "0 34px",
                  borderRadius: "999px",
                  background: "#e50914",
                  color: "#ffffff",
                  fontSize: "16px",
                  fontWeight: 800,
                  cursor: "pointer",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  boxShadow: "0 6px 28px rgba(229, 9, 20, 0.55)",
                  transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.background = "#f40612";
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(229, 9, 20, 0.7)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.background = "#e50914";
                  e.currentTarget.style.boxShadow = "0 6px 28px rgba(229, 9, 20, 0.55)";
                }}
              >
                <PlayIcon size={20} fill="#ffffff" color="#ffffff" />
                <span>Play</span>
              </button>

              {/* Glass Capsule for Watchlist & Info */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  height: "52px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.16)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  border: "1px solid rgba(255, 255, 255, 0.22)",
                  padding: "0 8px",
                  boxShadow: "0 4px 18px rgba(0, 0, 0, 0.35)",
                }}
              >
                <button
                  title={isSaved ? "Saved to Watchlist" : "Add to Watchlist"}
                  onClick={() => setIsSaved(!isSaved)}
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    background: "transparent",
                    border: "none",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "transform 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.12)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  {isSaved ? <CheckIcon size={22} color="#4ade80" /> : <PlusIcon size={22} color="#ffffff" />}
                </button>

                <div style={{ width: "1px", height: "22px", background: "rgba(255, 255, 255, 0.24)" }} />

                <button
                  title="Details & Cast"
                  onClick={() => onSelectPost(currentSlide)}
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    background: "transparent",
                    border: "none",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "transform 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.12)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <InfoIcon size={22} color="#ffffff" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-shelves within this Genre matching cno.to Screenshot 5 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        {/* 1. Popular (Landscape) */}
        <CatalogSection
          title="Popular"
          filter={`/genre/${genreTitle.toLowerCase()}-popular`}
          initialPosts={displayPopular}
          layout="landscape"
          onSelectPost={onSelectPost}
          onViewAll={() => onOpenFilterBrowse(genreTitle)}
        />

        {/* 2. Critically Acclaimed (Portrait) */}
        <CatalogSection
          title="Critically Acclaimed"
          filter={`/genre/${genreTitle.toLowerCase()}-critics`}
          initialPosts={displayCritics}
          layout="portrait"
          onSelectPost={onSelectPost}
          onViewAll={() => onOpenFilterBrowse(genreTitle)}
        />

        {/* 3. New Releases (Landscape) */}
        <CatalogSection
          title="New Releases"
          filter={`/genre/${genreTitle.toLowerCase()}-new`}
          initialPosts={displayNewReleases}
          layout="landscape"
          onSelectPost={onSelectPost}
          onViewAll={() => onOpenFilterBrowse(genreTitle)}
        />

        {/* 4. Hidden Gems (Portrait) */}
        <CatalogSection
          title="Hidden Gems"
          filter={`/genre/${genreTitle.toLowerCase()}-hidden-gems`}
          initialPosts={displayHiddenGems}
          layout="portrait"
          onSelectPost={onSelectPost}
          onViewAll={() => onOpenFilterBrowse(genreTitle)}
        />

        {/* 5. Classics (Portrait) */}
        <CatalogSection
          title="Classics"
          filter={`/genre/${genreTitle.toLowerCase()}-classics`}
          initialPosts={displayClassics}
          layout="portrait"
          onSelectPost={onSelectPost}
          onViewAll={() => onOpenFilterBrowse(genreTitle)}
        />
      </div>

      {/* Centered Bottom Pill: [ All {genreTitle} → ] matching cno.to Screenshot 5 */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: "48px", padding: "0 24px" }}>
        <button
          onClick={() => onOpenFilterBrowse(genreTitle)}
          style={{
            padding: "12px 34px",
            borderRadius: "30px",
            background: "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            color: "#ffffff",
            fontSize: "14.5px",
            fontWeight: 800,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.6)",
            transition: "all 0.25s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#e50914";
            e.currentTarget.style.borderColor = "#e50914";
            e.currentTarget.style.transform = "scale(1.04)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <span>All {genreTitle}</span>
          <span>&rarr;</span>
        </button>
      </div>
    </div>
  );
};
