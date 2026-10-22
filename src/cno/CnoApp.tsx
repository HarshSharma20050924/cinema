import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { HeroSpotlight } from "./components/HeroSpotlight";
import { CatalogRow } from "./components/CatalogRow";
import { EventBanner } from "./components/EventBanner";
import { SearchCommandPalette } from "./components/SearchCommandPalette";
import { DetailsView } from "./components/DetailsView";
import { MyListPage } from "./components/MyListPage";
import { SettingsModal } from "./components/SettingsModal";
import { VideoPlayerModal } from "../components/player/VideoPlayerModal";
import { OpenInWebModal } from "../components/web/OpenInWebModal";
import {
  CNO_HERO_SLIDES,
  CNO_CONTINUE_WATCHING,
  CNO_TOP_10_SHOWS,
  CNO_HALLOWEEN_NIGHT,
  CNO_MOST_LIKED_POSTERS,
  CNO_GENRES_ROW,
  CNO_FRANCHISES,
} from "./mockData";
import { api } from "../api/client";
import type { CnoMedia, CnoNavTab, CnoEpisode } from "./types";
import type { StreamItem } from "../types";
import "./cno.css";

interface CnoAppProps {
  onSwitchToClassic: () => void;
  onPlayMedia?: (title: string, poster?: string, backdrop?: string) => void;
  liveCatalogPosts?: any[];
  onOpenSettings?: () => void;
}

export const CnoApp: React.FC<CnoAppProps> = ({
  onSwitchToClassic,
  onPlayMedia,
  liveCatalogPosts = [],
  onOpenSettings,
}) => {
  const [activeTab, setActiveTab] = useState<CnoNavTab>("home");
  const [selectedMedia, setSelectedMedia] = useState<CnoMedia | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("cno_watchlist");
      return saved ? JSON.parse(saved) : ["6977-no-country-for-old-men", "560016-monkey-man"];
    } catch {
      return [];
    }
  });

  // Player & Streams state
  const [playerPreference, setPlayerPreference] = useState<string>(() => {
    return localStorage.getItem("cinema_player_preference") || "web";
  });
  const [activeStreams, setActiveStreams] = useState<StreamItem[]>([]);
  const [playerActive, setPlayerActive] = useState(false);
  const [playingTitle, setPlayingTitle] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Open in Web Modal State (Shows direct download links and qualities from Telegram / Card)
  const [openInWebData, setOpenInWebData] = useState<{
    title: string;
    provider: string;
    link: string;
    type?: "movie" | "show" | "series";
    poster?: string;
  } | null>(null);

  // Handle Telegram Bot "Open in Web" URL parameters (?open=web&...)
  useEffect(() => {
    function checkOpenInWeb() {
      if (typeof window !== "undefined") {
        const p = new URLSearchParams(window.location.search);
        const openParam = p.get("open");
        const linkParam = p.get("link") || p.get("details") || p.get("stream");
        const provParam = p.get("provider") || "hdhub4u";
        const searchParam = p.get("search");
        const titleParam = p.get("title") || searchParam || "";
        if (openParam === "web" && (linkParam || titleParam)) {
          const cleanProv = provParam === "default" ? "hdhub4u" : provParam;
          setOpenInWebData({
            title: titleParam || "Selected Title",
            provider: cleanProv,
            link: linkParam || "",
            poster: p.get("poster") || undefined,
            type: (p.get("type") as any) || "movie",
          });
        }
      }
    }
    checkOpenInWeb();
    window.addEventListener("popstate", checkOpenInWeb);
    return () => window.removeEventListener("popstate", checkOpenInWeb);
  }, []);

  // Live posts fetched from cluster
  const [livePosts, setLivePosts] = useState<CnoMedia[]>([]);

  useEffect(() => {
    // Save watchlist
    localStorage.setItem("cno_watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    // Keyboard shortcut for Search (Ctrl + K or /)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key.toLowerCase() === "k") || (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName))) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch live cluster posts to augment showcase
  useEffect(() => {
    async function loadLiveCluster() {
      try {
        const providers = await api.getProviders();
        if (providers.length > 0) {
          const first = providers[0];
          const posts = await api.getPosts(first.value, "");
          const mapped: CnoMedia[] = posts.slice(0, 12).map((p, idx) => ({
            id: p.link || `cluster-${idx}`,
            title: p.title,
            type: "movie",
            year: 2024,
            genres: ["Cinema"],
            overview: p.description || p.title,
            backdrop: p.image || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600&auto=format&fit=crop",
            poster: p.image || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400&auto=format&fit=crop",
            backendProvider: p.provider || first.value,
            backendLink: p.link,
          }));
          setLivePosts(mapped);
        }
      } catch (err) {
        console.warn("Could not load initial cluster posts:", err);
      }
    }
    loadLiveCluster();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleToggleWatchlist = (media: CnoMedia) => {
    if (watchlist.includes(media.id)) {
      setWatchlist((prev) => prev.filter((id) => id !== media.id));
      showToast("Removed from My List");
    } else {
      setWatchlist((prev) => [...prev, media.id]);
      showToast("✓ Added to My List");
    }
  };

  const handleOpenInWeb = (media: CnoMedia) => {
    setOpenInWebData({
      title: media.title,
      provider: media.backendProvider || "hdhub4u",
      link: media.backendLink || media.id,
      poster: media.poster,
      type: media.type,
    });
  };

  const handlePlay = async (media: CnoMedia, episode?: CnoEpisode) => {
    const title = episode ? `${media.title} - ${episode.title}` : media.title;
    setPlayingTitle(title);

    // If media has backend details, fetch live streams
    if (media.backendProvider && media.backendLink) {
      showToast("Fetching streams from cluster...");
      try {
        const streams = await api.getStreams(media.backendProvider, media.backendLink, media.type);
        if (streams && streams.length > 0) {
          setActiveStreams(streams);
          setPlayerActive(true);
          return;
        }
      } catch (e) {
        console.warn("Failed live streams, fallback to demo stream:", e);
      }
    }

    // High quality demo fallback stream for visual preview
    setActiveStreams([
      {
        server: "Cluster Primary (HLS)",
        link: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        type: "m3u8",
        quality: "1080p",
      },
      {
        server: "Cluster Backup 1",
        link: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        type: "mp4",
        quality: "720p",
      },
    ]);
    setPlayerActive(true);
  };

  return (
    <div className="cno-root">
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setSelectedMedia(null);
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSettings={() => (onOpenSettings ? onOpenSettings() : setIsSettingsOpen(true))}
        onSwitchToClassic={onSwitchToClassic}
      />

      {/* Main View: Details View OR Home/Tab View */}
      {selectedMedia ? (
        <DetailsView
          media={selectedMedia}
          onBack={() => setSelectedMedia(null)}
          onPlay={handlePlay}
          onToggleWatchlist={handleToggleWatchlist}
          isWatchlisted={watchlist.includes(selectedMedia.id)}
          onShowToast={showToast}
        />
      ) : activeTab === "my_list" ? (
        <MyListPage
          continueWatching={CNO_CONTINUE_WATCHING}
          savedItems={CNO_MOST_LIKED_POSTERS.filter((item) => watchlist.includes(item.id))}
          onPlay={handlePlay}
          onOpenDetails={(media) => setSelectedMedia(media)}
          onToggleWatchlist={handleToggleWatchlist}
          watchlist={watchlist}
          onShowToast={showToast}
        />
      ) : (
        <>
          {/* Hero Spotlight Banner */}
          <HeroSpotlight
            slides={CNO_HERO_SLIDES}
            onPlay={handlePlay}
            onOpenDetails={(media) => setSelectedMedia(media)}
            onToggleWatchlist={handleToggleWatchlist}
            watchlist={watchlist}
          />

          {/* Rows & Content Catalog */}
          <div className="cno-content-body">
            {/* Continue Watching Row */}
            <CatalogRow
              title="Continue Watching"
              items={CNO_CONTINUE_WATCHING}
              variant="continue_watching"
              onPlay={handlePlay}
              onOpenDetails={(media) => setSelectedMedia(media)}
              onToggleWatchlist={handleToggleWatchlist}
              watchlist={watchlist}
              onShowToast={showToast}
            />

            {/* Top 10 Shows Today */}
            <CatalogRow
              title="Top 10 Shows Today"
              items={CNO_TOP_10_SHOWS}
              variant="top10"
              onPlay={handlePlay}
              onOpenDetails={(media) => setSelectedMedia(media)}
              onToggleWatchlist={handleToggleWatchlist}
              watchlist={watchlist}
              onShowToast={showToast}
            />

            {/* Halloween Event Banner */}
            <EventBanner
              subtitle="ALL OCTOBER"
              title="Halloween"
              description="Slashers, haunted houses, witches, ghost stories, and scares for the kids."
              buttonText="Explore Halloween"
              backgroundImage="https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1920&auto=format&fit=crop"
              onExplore={() => showToast("Exploring Halloween collection")}
            />

            {/* Halloween Night Row */}
            <CatalogRow
              title="Halloween Night"
              items={CNO_HALLOWEEN_NIGHT}
              variant="landscape"
              onPlay={handlePlay}
              onOpenDetails={(media) => setSelectedMedia(media)}
              onToggleWatchlist={handleToggleWatchlist}
              watchlist={watchlist}
              onShowToast={showToast}
            />

            {/* Most Liked on Cno.to (2:3 Vertical Posters) */}
            <CatalogRow
              title="Most Liked on Cno.to"
              items={CNO_MOST_LIKED_POSTERS}
              variant="portrait"
              onPlay={handlePlay}
              onOpenDetails={(media) => setSelectedMedia(media)}
              onToggleWatchlist={handleToggleWatchlist}
              watchlist={watchlist}
              onShowToast={showToast}
            />

            {/* Live Scraper Cluster Catalog */}
            {livePosts.length > 0 && (
              <CatalogRow
                title="Fresh from Cinema Cluster"
                items={livePosts}
                variant="portrait"
                onPlay={handlePlay}
                onOpenDetails={(media) => setSelectedMedia(media)}
                onToggleWatchlist={handleToggleWatchlist}
                watchlist={watchlist}
                onShowToast={showToast}
              />
            )}

            {/* Browse by Genre Row */}
            <section className="cno-row-container">
              <div className="cno-row-header">
                <button className="cno-row-title-btn">
                  <span>Browse by Genre</span>
                </button>
              </div>
              <div className="cno-row-scroll">
                {CNO_GENRES_ROW.map((g, idx) => (
                  <div
                    key={idx}
                    className="cno-card-landscape"
                    style={{ flex: "0 0 240px" }}
                    onClick={() => showToast(`Browsing ${g.name}`)}
                  >
                    <img src={g.image} alt={g.name} className="cno-card-img" />
                    <div className="cno-card-overlay-bottom">
                      <div className="cno-card-title-logo" style={{ fontSize: "18px" }}>
                        {g.name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Franchises Row */}
            <section className="cno-row-container">
              <div className="cno-row-header">
                <button className="cno-row-title-btn">
                  <span>Franchises</span>
                </button>
              </div>
              <div className="cno-row-scroll">
                {CNO_FRANCHISES.map((f, idx) => (
                  <div
                    key={idx}
                    className="cno-card-landscape"
                    style={{ flex: "0 0 260px" }}
                    onClick={() => showToast(`Exploring ${f.name}`)}
                  >
                    <img src={f.image} alt={f.name} className="cno-card-img" />
                    <div className="cno-card-overlay-bottom">
                      <div className="cno-card-title-logo" style={{ fontSize: "18px" }}>
                        {f.name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      {/* Spotlight Command Palette Modal */}
      <SearchCommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectMedia={(media) => {
          setSelectedMedia(media);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        playerPreference={playerPreference}
        onPlayerPreferenceChange={(p) => {
          setPlayerPreference(p);
          localStorage.setItem("cinema_player_preference", p);
        }}
        onShowToast={showToast}
      />

      {/* Integrated Video Player Modal with Multi-Server Auto-Fallback */}
      {playerActive && activeStreams.length > 0 && (
        <VideoPlayerModal
          streamUrl={activeStreams[0].link}
          title={playingTitle}
          onClose={() => {
            setPlayerActive(false);
            setActiveStreams([]);
          }}
          fallbackStreams={activeStreams}
        />
      )}

      {/* Open in Web Modal (Direct qualities, mirrors and fast cloud downloads) */}
      {openInWebData && (
        <OpenInWebModal
          isOpen={Boolean(openInWebData)}
          onClose={() => setOpenInWebData(null)}
          title={openInWebData.title}
          provider={openInWebData.provider}
          link={openInWebData.link}
          type={openInWebData.type}
          poster={openInWebData.poster}
          onPlayStream={(streamUrl, title) => {
            setOpenInWebData(null);
            setPlayingTitle(title);
            setActiveStreams([{ server: "Cloud Server", link: streamUrl, type: "hls" }]);
            setPlayerActive(true);
          }}
        />
      )}

      {/* Pill Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "32px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(18, 22, 28, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "9999px",
            padding: "10px 22px",
            color: "#ffffff",
            fontSize: "13.5px",
            fontWeight: "600",
            backdropFilter: "blur(20px)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.8)",
            zIndex: 9999,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Persistent Floating Switcher Pill (Local Experiment mode switch) */}
      <div
        className="cno-experiment-switch-pill"
        onClick={onSwitchToClassic}
        title="Click to switch back to Classic Cinema UI"
      >
        <span>↩ Switch to Classic UI</span>
      </div>
    </div>
  );
};
