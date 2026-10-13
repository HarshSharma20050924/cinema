import React, { useEffect, useRef, useState } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";
import { XIcon, VolumeIcon, ArrowLeftIcon, ExternalLinkIcon, DownloadIcon, CopyIcon, CheckIcon } from "../../icons";
import { launchExternalPlayer } from "../../hooks/useSettings";

interface VideoPlayerModalProps {
 playbackUrl: string | null;
 onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ playbackUrl, onClose }) => {
 const artRef = useRef<HTMLDivElement | null>(null);
 const playerInstanceRef = useRef<Artplayer | null>(null);
 const audioCtxRef = useRef<AudioContext | null>(null);
 const gainNodeRef = useRef<GainNode | null>(null);

 const [volumeBoost, setVolumeBoost] = useState<number>(100);
 const [isLoading, setIsLoading] = useState<boolean>(true);
 const [hasError, setHasError] = useState<boolean>(false);
 const [isFullScreen, setIsFullScreen] = useState<boolean>(true);
 const [copied, setCopied] = useState<boolean>(false);
 const [showProcessGuide, setShowProcessGuide] = useState<boolean>(true);

 const isDirectCors =
  playbackUrl?.includes("pixeldrain.dev") ||
  playbackUrl?.includes("pixeldrain.com") ||
  playbackUrl?.includes("gofile.io") ||
  playbackUrl?.includes("r2.dev");

 const origin = typeof window !== "undefined" ? window.location.origin : "";

 // Route through proxy so VLC and external players receive required Referer headers
 const playableCopyUrl = !isDirectCors && playbackUrl && origin && !playbackUrl.includes("/api/proxy")
  ? `${origin}/api/proxy?url=${encodeURIComponent(playbackUrl)}`
  : playbackUrl || "";

 const downloadStreamUrl = playbackUrl
  ? `${origin}/api/download?url=${encodeURIComponent(playbackUrl)}&filename=video.mp4`
  : "";

 // Auto-copy stream link on mount so user can instantly paste
 useEffect(() => {
  if (playableCopyUrl) {
   try {
    navigator.clipboard.writeText(playableCopyUrl);
   } catch (_) {}
  }
 }, [playableCopyUrl]);

 // Initialize Artplayer only after user chooses to continue in browser player
 useEffect(() => {
  if (!playbackUrl || !artRef.current || showProcessGuide) return;

  setIsLoading(true);
  setHasError(false);
  let hlsInstance: Hls | null = null;

  const isDirectCors =
   playbackUrl.includes("pixeldrain.dev") ||
   playbackUrl.includes("pixeldrain.com") ||
   playbackUrl.includes("gofile.io") ||
   playbackUrl.includes("r2.dev");

  const proxiedUrl = isDirectCors ? playbackUrl : `/api/proxy?url=${encodeURIComponent(playbackUrl)}`;
  const isM3u8 = playbackUrl.includes(".m3u8");

  const art = new Artplayer({
   container: artRef.current,
   url: proxiedUrl,
   type: isM3u8 ? "m3u8" : "auto",
   customType: {
    m3u8: (video: HTMLVideoElement, url: string) => {
     if (Hls.isSupported()) {
      const hls = new Hls({
       enableWorker: true,
       lowLatencyMode: true,
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hlsInstance = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
       setIsLoading(false);
       video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
       if (data.fatal) {
        console.warn("HLS fatal error:", data);
        setIsLoading(false);
        setHasError(true);
       }
      });
     } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.addEventListener("loadedmetadata", () => {
       setIsLoading(false);
       video.play().catch(() => {});
      });
     } else {
      setIsLoading(false);
      setHasError(true);
     }
    },
   },
   autoplay: true,
   isLive: false,
   playsInline: true,
   autoSize: false,
   autoMini: false,
   fullscreen: true,
   fullscreenWeb: true,
   setting: true,
   pip: true,
   playbackRate: true,
   aspectRatio: true,
   controls: [
    {
     name: "volume-booster",
     position: "right",
     html: `
      <div style="display:flex;align-items:center;gap:6px;padding:0 8px;cursor:pointer;" title="Sound Booster">
       <span style="font-size:11px;font-weight:700;color:var(--accent-red);background:rgba(229,9,20,0.15);padding:2px 6px;border-radius:4px;">BOOST</span>
       <span id="boost-val" style="font-size:11px;font-weight:600;min-width:32px;">${volumeBoost}%</span>
      </div>
     `,
     click: function () {
      const current = volumeBoost;
      const next = current === 100 ? 150 : current === 150 ? 200 : current === 200 ? 300 : 100;
      handleBoostChange(next);
      const span = document.getElementById("boost-val");
      if (span) span.innerText = `${next}%`;
     },
    },
   ],
   moreVideoAttr: {
    crossOrigin: "anonymous",
    preload: "auto",
   },
  });

  playerInstanceRef.current = art;

  // Web Audio 300% Booster Pipeline
  art.on("ready", () => {
   setIsLoading(false);
   const video = art.video;
   if (video) {
    try {
     const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
     if (AudioContextClass && !audioCtxRef.current) {
      const ctx = new AudioContextClass();
      const source = ctx.createMediaElementSource(video);
      const gain = ctx.createGain();
      gain.gain.value = volumeBoost / 100;
      source.connect(gain);
      gain.connect(ctx.destination);
      audioCtxRef.current = ctx;
      gainNodeRef.current = gain;
     }
    } catch (_) {}
   }
  });

  art.on("video:waiting", () => setIsLoading(true));
  art.on("video:playing", () => {
   setIsLoading(false);
   setHasError(false);
   if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
    audioCtxRef.current.resume();
   }
  });

  art.on("error", (err) => {
   console.warn("ArtPlayer stream error:", err);
   setIsLoading(false);
   setHasError(true);
  });

  return () => {
   if (hlsInstance) hlsInstance.destroy();
   if (art && art.destroy) art.destroy(false);
   if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
    audioCtxRef.current.close().catch(() => {});
    audioCtxRef.current = null;
   }
   playerInstanceRef.current = null;
  };
 }, [playbackUrl, showProcessGuide]);

 const handleBoostChange = (newVal: number) => {
  setVolumeBoost(newVal);
  if (gainNodeRef.current) {
   gainNodeRef.current.gain.value = newVal / 100;
  }
 };

 const handleOpenVlc = () => {
  if (!playbackUrl) return;
  const targetUrl = playableCopyUrl;
  launchExternalPlayer(targetUrl, "vlc");
  setCopied(true);
  setTimeout(() => setCopied(false), 2500);
 };

 const handleCopyLink = () => {
  if (!playableCopyUrl) return;
  navigator.clipboard.writeText(playableCopyUrl);
  setCopied(true);
  setTimeout(() => setCopied(false), 2500);
 };

 if (!playbackUrl) return null;

 return (
  <div
   style={{
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.98)",
    zIndex: 300,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    padding: isFullScreen ? "0" : "12px",
   }}
  >
   {/* Top Header Bar */}
   <div
    style={{
     width: "100%",
     display: "flex",
     alignItems: "center",
     justifyContent: "space-between",
     padding: "10px 16px",
     background: "rgba(10, 14, 22, 0.9)",
     borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
     zIndex: 10,
    }}
   >
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
     <button
      onClick={onClose}
      style={{
       display: "flex",
       alignItems: "center",
       gap: "6px",
       padding: "6px 12px",
       borderRadius: "8px",
       background: "rgba(255, 255, 255, 0.06)",
       border: "1px solid rgba(255, 255, 255, 0.1)",
       color: "#fff",
       fontSize: "12px",
       fontWeight: 600,
       cursor: "pointer",
      }}
     >
      <ArrowLeftIcon size={14} />
      <span>Back</span>
     </button>

     <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>Cinema Stream</span>
      <span
       style={{
        fontSize: "11px",
        padding: "2px 8px",
        borderRadius: "4px",
        background: "rgba(229, 9, 20, 0.2)",
        color: "#ff4d5a",
        fontWeight: 700,
       }}
      >
       HIGH SPEED
      </span>
     </div>
    </div>

    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
     <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <VolumeIcon size={14} color="#ff4d5a" />
      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>Boost:</span>
      <button
       onClick={() => handleBoostChange(volumeBoost === 100 ? 150 : volumeBoost === 150 ? 200 : volumeBoost === 200 ? 300 : 100)}
       style={{
        padding: "4px 8px",
        borderRadius: "6px",
        background: volumeBoost > 100 ? "rgba(229, 9, 20, 0.3)" : "rgba(255, 255, 255, 0.08)",
        border: volumeBoost > 100 ? "1px solid #e50914" : "1px solid rgba(255, 255, 255, 0.12)",
        color: "#fff",
        fontSize: "11px",
        fontWeight: 700,
        cursor: "pointer",
       }}
      >
       {volumeBoost}%
      </button>
     </div>

     <button
      onClick={() => setIsFullScreen(!isFullScreen)}
      style={{
       padding: "6px 12px",
       borderRadius: "8px",
       background: "rgba(255, 255, 255, 0.08)",
       border: "1px solid rgba(255, 255, 255, 0.12)",
       color: "#fff",
       fontSize: "11px",
       fontWeight: 600,
       cursor: "pointer",
      }}
     >
      {isFullScreen ? "Windowed" : "Desktop Fullscreen"}
     </button>

     <button
      onClick={onClose}
      style={{
       width: "32px",
       height: "32px",
       borderRadius: "8px",
       background: "rgba(255, 255, 255, 0.1)",
       display: "flex",
       alignItems: "center",
       justifyContent: "center",
       color: "#fff",
       cursor: "pointer",
      }}
     >
      <XIcon size={16} />
     </button>
    </div>
   </div>

   {/* Main Video View Container */}
   <div
    style={{
     width: "100%",
     height: isFullScreen ? "calc(100vh - 54px)" : "85vh",
     maxWidth: isFullScreen ? "100%" : "1200px",
     background: "#000",
     borderRadius: isFullScreen ? "0" : "16px",
     overflow: "hidden",
     position: "relative",
     display: "flex",
     alignItems: "center",
     justifyContent: "center",
    }}
   >
    {/* PRE-STREAM PROCESS & VLC GUIDE MODAL */}
    {showProcessGuide && (
     <div
      style={{
       position: "absolute",
       inset: 0,
       zIndex: 30,
       background: "radial-gradient(circle at center, rgba(17, 24, 39, 0.98), rgba(0, 0, 0, 0.99))",
       display: "flex",
       flexDirection: "column",
       alignItems: "center",
       justifyContent: "center",
       padding: "20px",
       overflowY: "auto",
      }}
     >
      <div
       style={{
        maxWidth: "520px",
        width: "100%",
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "16px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        backdropFilter: "blur(20px)",
       }}
      >
       {/* Header Badge & Title */}
       <div style={{ textAlign: "center" }}>
        <span
         style={{
          display: "inline-block",
          padding: "4px 10px",
          borderRadius: "20px",
          background: "rgba(229, 9, 20, 0.2)",
          border: "1px solid rgba(229, 9, 20, 0.4)",
          color: "#ff4d5a",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.05em",
          marginBottom: "8px",
         }}
        >
         FOR HIGH PERFORMANCE DOWNLOAD VLC
        </span>
        <h3 style={{ fontSize: "19px", fontWeight: 800, color: "#fff", margin: "4px 0" }}>
         How to Stream This Title
        </h3>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
         High bitrate 1080p & 4K MKV streams play with zero lag and full audio in VLC Player.
        </p>
       </div>

       {/* 3 Step Process Card */}
       <div
        style={{
         background: "rgba(0, 0, 0, 0.4)",
         border: "1px solid rgba(255, 255, 255, 0.06)",
         borderRadius: "12px",
         padding: "16px",
         display: "flex",
         flexDirection: "column",
         gap: "12px",
        }}
       >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
         <div
          style={{
           width: "24px",
           height: "24px",
           borderRadius: "50%",
           background: "#22c55e",
           color: "#000",
           display: "flex",
           alignItems: "center",
           justifyContent: "center",
           fontSize: "12px",
           fontWeight: 800,
           flexShrink: 0,
          }}
         >
          1
         </div>
         <div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>
           Link Ready & Copied
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
           The playable stream URL is ready. You can tap Copy Link below or open VLC directly.
          </div>
         </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
         <div
          style={{
           width: "24px",
           height: "24px",
           borderRadius: "50%",
           background: "#e50914",
           color: "#fff",
           display: "flex",
           alignItems: "center",
           justifyContent: "center",
           fontSize: "12px",
           fontWeight: 800,
           flexShrink: 0,
          }}
         >
          2
         </div>
         <div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>
           Open VLC & Stream
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.4 }}>
           Tap <strong>Open in VLC Player</strong> below, or in VLC tap <strong>More</strong> &rarr; <strong>New Stream</strong> &rarr; Paste link.
          </div>
         </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
         <div
          style={{
           width: "24px",
           height: "24px",
           borderRadius: "50%",
           background: "rgba(255, 255, 255, 0.2)",
           color: "#fff",
           display: "flex",
           alignItems: "center",
           justifyContent: "center",
           fontSize: "12px",
           fontWeight: 800,
           flexShrink: 0,
          }}
         >
          3
         </div>
         <div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>
           Don't have VLC?
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
           For high performance, download the free official VLC Player.
          </div>
         </div>
        </div>
       </div>

       {/* Action Buttons */}
       <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
         <button
          onClick={handleOpenVlc}
          style={{
           flex: 1,
           display: "flex",
           alignItems: "center",
           justifyContent: "center",
           gap: "8px",
           padding: "11px 14px",
           borderRadius: "10px",
           background: "#e50914",
           color: "#fff",
           fontSize: "13px",
           fontWeight: 700,
           cursor: "pointer",
           border: "none",
          }}
         >
          <ExternalLinkIcon size={15} />
          <span>Open in VLC Player</span>
         </button>

         <button
          onClick={handleCopyLink}
          style={{
           display: "flex",
           alignItems: "center",
           justifyContent: "center",
           gap: "6px",
           padding: "11px 16px",
           borderRadius: "10px",
           background: "rgba(255, 255, 255, 0.08)",
           border: "1px solid rgba(255, 255, 255, 0.15)",
           color: copied ? "#22c55e" : "#fff",
           fontSize: "13px",
           fontWeight: 600,
           cursor: "pointer",
          }}
         >
          {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
          <span>{copied ? "Copied!" : "Copy Link"}</span>
         </button>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
         <button
          onClick={() => window.open(downloadStreamUrl, "_blank")}
          style={{
           flex: 1,
           display: "flex",
           alignItems: "center",
           justifyContent: "center",
           gap: "6px",
           padding: "9px 12px",
           borderRadius: "8px",
           background: "rgba(255, 255, 255, 0.06)",
           border: "1px solid rgba(255, 255, 255, 0.1)",
           color: "#fff",
           fontSize: "12px",
           fontWeight: 600,
           cursor: "pointer",
          }}
         >
          <DownloadIcon size={14} />
          <span>Download File</span>
         </button>

         <a
          href="https://www.videolan.org/vlc/"
          target="_blank"
          rel="noreferrer"
          style={{
           flex: 1,
           display: "flex",
           alignItems: "center",
           justifyContent: "center",
           gap: "6px",
           padding: "9px 12px",
           borderRadius: "8px",
           background: "rgba(255, 255, 255, 0.06)",
           border: "1px solid rgba(255, 255, 255, 0.1)",
           color: "#f59e0b",
           fontSize: "12px",
           fontWeight: 600,
           textDecoration: "none",
          }}
         >
          <span>Download VLC App</span>
         </a>
        </div>

        {/* Continue in Browser Button */}
        <button
         onClick={() => setShowProcessGuide(false)}
         style={{
          width: "100%",
          padding: "12px",
          borderRadius: "10px",
          background: "rgba(255, 255, 255, 0.12)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          color: "#fff",
          fontSize: "13px",
          fontWeight: 700,
          cursor: "pointer",
          marginTop: "4px",
         }}
        >
          Continue in Browser Player
        </button>
       </div>
      </div>
     </div>
    )}

    {/* Loading Spinner for Browser Player */}
    {!showProcessGuide && isLoading && !hasError && (
     <div
      style={{
       position: "absolute",
       zIndex: 20,
       display: "flex",
       flexDirection: "column",
       alignItems: "center",
       justifyContent: "center",
       gap: "12px",
       pointerEvents: "none",
      }}
     >
      <div
       style={{
        width: "48px",
        height: "48px",
        borderRadius: "50%",
        border: "4px solid rgba(229, 9, 20, 0.2)",
        borderTopColor: "#e50914",
        animation: "spin 0.8s linear infinite",
       }}
      />
      <div style={{ fontSize: "12px", fontWeight: 700, color: "#fff", letterSpacing: "0.03em" }}>
       Loading Video Stream...
      </div>
     </div>
    )}

    {/* Playback Fallback Overlay if Browser Cannot Decode Container/Codec */}
    {!showProcessGuide && hasError && (
     <div
      style={{
       position: "absolute",
       zIndex: 25,
       inset: 0,
       background: "rgba(10, 14, 22, 0.96)",
       display: "flex",
       flexDirection: "column",
       alignItems: "center",
       justifyContent: "center",
       padding: "24px",
       textAlign: "center",
       gap: "16px",
      }}
     >
      <div style={{ fontSize: "18px", fontWeight: 800, color: "#fff" }}>
       Browser Cannot Play This Video
      </div>
      <p style={{ maxWidth: "480px", fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.5 }}>
       Standard web browsers cannot decode MKV containers or Dolby AC3 audio.{" "}
       <strong style={{ color: "#fff" }}>For high performance and smooth playback, download VLC Player.</strong>
      </p>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center", marginTop: "8px" }}>
       <button
        onClick={handleOpenVlc}
        style={{
         display: "flex",
         alignItems: "center",
         gap: "8px",
         padding: "11px 18px",
         borderRadius: "8px",
         background: "#e50914",
         color: "#fff",
         fontSize: "13px",
         fontWeight: 700,
         cursor: "pointer",
         border: "none",
        }}
       >
        <ExternalLinkIcon size={15} />
        <span>Open in VLC Player</span>
       </button>

       <button
        onClick={handleCopyLink}
        style={{
         display: "flex",
         alignItems: "center",
         gap: "8px",
         padding: "11px 18px",
         borderRadius: "8px",
         background: "rgba(255, 255, 255, 0.08)",
         border: "1px solid rgba(255, 255, 255, 0.15)",
         color: copied ? "#22c55e" : "#fff",
         fontSize: "13px",
         fontWeight: 600,
         cursor: "pointer",
        }}
       >
        {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
        <span>{copied ? "Copied!" : "Copy Link"}</span>
       </button>

       <button
        onClick={() => window.open(downloadStreamUrl, "_blank")}
        style={{
         display: "flex",
         alignItems: "center",
         gap: "8px",
         padding: "11px 18px",
         borderRadius: "8px",
         background: "rgba(255, 255, 255, 0.08)",
         border: "1px solid rgba(255, 255, 255, 0.15)",
         color: "#fff",
         fontSize: "13px",
         fontWeight: 600,
         cursor: "pointer",
        }}
       >
        <DownloadIcon size={15} />
        <span>Download Video File</span>
       </button>
      </div>
     </div>
    )}

    <div ref={artRef} style={{ width: "100%", height: "100%" }} />
   </div>
  </div>
 );
};
