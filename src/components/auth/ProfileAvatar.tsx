import React from "react";
import { AVATAR_OPTIONS } from "../../utils/profileService";

interface ProfileAvatarProps {
  avatarKey?: string;
  size?: number;
  gradient?: string;
  glow?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  avatarKey = "leaf",
  size = 40,
  gradient,
  glow = true,
  className,
  style,
}) => {
  const opt = AVATAR_OPTIONS.find((o) => o.icon === avatarKey || o.id === avatarKey) || AVATAR_OPTIONS[0];
  const bg = gradient || opt.gradient;

  const renderVectorIcon = () => {
    const iconSize = Math.round(size * 0.52);
    switch (avatarKey) {
      case "leaf":
        return (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
          </svg>
        );
      case "star":
        return (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            color="#ffffff"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        );
      case "film":
        return (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="2" width="20" height="20" rx="2.5" />
            <line x1="7" y1="2" x2="7" y2="22" />
            <line x1="17" y1="2" x2="17" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="2" y1="7" x2="7" y2="7" />
            <line x1="2" y1="17" x2="7" y2="17" />
            <line x1="17" y1="17" x2="22" y2="17" />
            <line x1="17" y1="7" x2="22" y2="7" />
          </svg>
        );
      case "flame":
        return (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
        );
      case "rocket":
        return (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
          </svg>
        );
      case "crown":
        return (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
          </svg>
        );
      case "sparkles":
        return (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
          </svg>
        );
      case "moon":
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" color="#ffffff">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        );
      case "planet":
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="5.5" stroke="#ffffff" strokeWidth="2" />
            <ellipse cx="12" cy="12" rx="10" ry="3.8" stroke="#ffffff" strokeWidth="1.8" transform="rotate(-20 12 12)" />
          </svg>
        );
      case "wave":
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round">
            <path d="M3 10c2.5-2 5-2 7.5 0s5 2 7.5 0 2.5-1 3-1.5" />
            <path d="M3 15c2.5-2 5-2 7.5 0s5 2 7.5 0 2.5-1 3-1.5" />
          </svg>
        );
      case "heart":
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" color="#ffffff">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        );
      case "diamond":
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3h12l4 6-10 12L2 9Z" />
            <path d="M11 3 8 9l4 12 4-12-3-6" strokeWidth="1.6" />
            <path d="M2 9h20" strokeWidth="1.6" />
          </svg>
        );
      case "bolt":
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" color="#ffffff">
            <polygon points="13 2 4 14 11 14 10 22 20 10 13 10 13 2" />
          </svg>
        );
      case "satellite":
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3.5" fill="#ffffff" />
            <line x1="12" y1="2" x2="12" y2="6" strokeWidth="2.2" />
            <line x1="12" y1="18" x2="12" y2="22" strokeWidth="2.2" />
            <line x1="2" y1="12" x2="6" y2="12" strokeWidth="2.2" />
            <line x1="18" y1="12" x2="22" y2="12" strokeWidth="2.2" />
            <line x1="4.9" y1="4.9" x2="7.7" y2="7.7" strokeWidth="1.8" />
            <line x1="16.3" y1="16.3" x2="19.1" y2="19.1" strokeWidth="1.8" />
          </svg>
        );
      case "spiral":
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 0-5-3.87" />
            <circle cx="12" cy="12" r="2.5" fill="#ffffff" stroke="none" />
          </svg>
        );
      case "shield":
      default:
        return (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        );
    }
  };

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        borderRadius: "50%",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: glow
          ? `0 6px 18px ${opt.glow}, inset 0 1px 1.5px rgba(255, 255, 255, 0.45), inset 0 -1.5px 2px rgba(0, 0, 0, 0.4)`
          : "inset 0 1px 1.5px rgba(255, 255, 255, 0.45)",
        border: "1.5px solid rgba(255, 255, 255, 0.28)",
        overflow: "hidden",
        userSelect: "none",
        ...style,
      }}
    >
      {/* 3D Glass Specular Highlight Arch */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "10%",
          right: "10%",
          height: "45%",
          borderRadius: "50% 50% 40% 40%",
          background: "linear-gradient(180deg, rgba(255, 255, 255, 0.38) 0%, rgba(255, 255, 255, 0.05) 80%, transparent 100%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {renderVectorIcon()}
      </div>
    </div>
  );
};
