import React, { useState, useEffect, useRef } from "react";
import { FilmIcon } from "../../icons";
import type { PlatformMode } from "./types";

const rankingPosterCache = new Map<string, string>();

export interface RankingPosterProps {
  src: string | undefined;
  imdbId?: string;
  title: string;
  year?: number;
  isHov: boolean;
  mode?: PlatformMode;
}

export function RankingPoster({
  src,
  imdbId,
  title,
  year,
  isHov,
  mode = "imdb",
}: RankingPosterProps) {
  const cleanTitle = title.replace(/\s*\(\d{4}\)$/, "").trim();
  const cacheKey = cleanTitle.toLowerCase();
  const cachedPoster = rankingPosterCache.get(cacheKey);

  const primarySrc =
    cachedPoster ||
    src ||
    (imdbId ? `https://images.metahub.space/poster/medium/${imdbId}/img` : undefined);

  const [currentSrc, setCurrentSrc] = useState<string | undefined>(primarySrc);
  const [state, setState] = useState<"loading" | "ok" | "error">(primarySrc ? "loading" : "error");
  const attemptsRef = useRef<number>(0);
  const imgRef = useRef<HTMLImageElement>(null);

  // Safety timeout: never stay in skeleton past 2.2s
  useEffect(() => {
    if (state === "loading") {
      const timer = setTimeout(() => {
        if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
          setState("ok");
        } else {
          triggerAutoReload();
        }
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [state, currentSrc]);

  useEffect(() => {
    const cached = rankingPosterCache.get(cacheKey);
    const s =
      cached ||
      src ||
      (imdbId ? `https://images.metahub.space/poster/medium/${imdbId}/img` : undefined);
    setCurrentSrc(s);
    setState(s ? "loading" : "error");
    attemptsRef.current = 0;
  }, [src, imdbId, title]);

  const triggerAutoReload = async () => {
    attemptsRef.current += 1;
    if (attemptsRef.current > 4) {
      setState("error");
      return;
    }

    // Try Cinemeta / TMDB via /api/poster
    try {
      const res = await fetch(`/api/poster?query=${encodeURIComponent(cleanTitle)}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.poster) {
          rankingPosterCache.set(cacheKey, data.poster);
          setCurrentSrc(data.poster);
          setState("loading");
          return;
        }
      }
    } catch (_) {}

    // Fallback: Metahub by imdbId
    if (imdbId && currentSrc !== `https://images.metahub.space/poster/medium/${imdbId}/img`) {
      setCurrentSrc(`https://images.metahub.space/poster/medium/${imdbId}/img`);
      setState("loading");
      return;
    }

    setState("error");
  };

  const isImdb = mode === "imdb";
  const pillBg = isImdb ? "#f5c518" : "#00e054";
  const pillShadow = isImdb
    ? "0 2px 8px rgba(245, 197, 24, 0.45)"
    : "0 2px 8px rgba(0, 224, 84, 0.45)";

  if (!currentSrc || state === "error") {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #18181c, #0d0d0f)",
          color: "rgba(255, 255, 255, 0.7)",
          padding: "14px 10px",
          textAlign: "center",
          gap: "8px",
        }}
      >
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255, 255, 255, 0.4)",
          }}
        >
          <FilmIcon size={20} />
        </div>

        <div
          style={{
            fontSize: "11.5px",
            fontWeight: 700,
            color: "#f1f5f9",
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            wordBreak: "break-word",
          }}
        >
          {title}
        </div>

        {year && (
          <span style={{ fontSize: "10.5px", color: "rgba(255, 255, 255, 0.45)", fontWeight: 600 }}>
            {year}
          </span>
        )}


      </div>
    );
  }

  return (
    <>
      {state === "loading" && (
        <div
          className="skeleton-shimmer"
          style={{ position: "absolute", inset: 0, zIndex: 1 }}
        />
      )}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={title}
        loading="lazy"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          opacity: state === "loading" ? 0 : 1,
          transform: isHov ? "scale(1.08)" : "scale(1)",
          transition:
            "opacity 0.3s ease, transform 0.4s cubic-bezier(0.16,1,0.3,1)",
        }}
        onLoad={() => setState("ok")}
        onError={() => triggerAutoReload()}
      />
    </>
  );
}
