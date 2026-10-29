import React, { useState } from "react";
import { ProfileAvatar } from "./ProfileAvatar";
import {
  getActiveProfile,
  getProfilePersonalization,
  setProfilePersonalization,
} from "../../utils/profileService";

interface PersonalizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

const AVAILABLE_GENRES = [
  { id: "Action", name: "Action", icon: "⚡" },
  { id: "Sci-Fi", name: "Sci-Fi", icon: "🛸" },
  { id: "Crime", name: "Crime", icon: "🕵️" },
  { id: "Thriller", name: "Thriller", icon: "🔪" },
  { id: "Drama", name: "Drama", icon: "🎭" },
  { id: "Animation", name: "Animation & Anime", icon: "✨" },
  { id: "Comedy", name: "Comedy", icon: "🍿" },
  { id: "Horror", name: "Horror", icon: "🩸" },
  { id: "Fantasy", name: "Fantasy", icon: "🔮" },
  { id: "Mystery", name: "Mystery", icon: "🔍" },
  { id: "Adventure", name: "Adventure", icon: "🗺️" },
  { id: "Romance", name: "Romance", icon: "🌹" },
];

export const PersonalizationModal: React.FC<PersonalizationModalProps> = ({
  isOpen,
  onClose,
  onCompleted,
}) => {
  const activeProfile = getActiveProfile();
  const [selected, setSelected] = useState<string[]>(() => getProfilePersonalization());

  if (!isOpen) return null;

  const toggleGenre = (genreId: string) => {
    setSelected((prev) =>
      prev.includes(genreId) ? prev.filter((g) => g !== genreId) : [...prev, genreId]
    );
  };

  const handleSave = () => {
    setProfilePersonalization(selected.length > 0 ? selected : ["Action", "Sci-Fi", "Crime"]);
    onClose();
    if (onCompleted) onCompleted();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100010,
        background: "rgba(0, 0, 0, 0.76)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        animation: "cinemaFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "linear-gradient(145deg, rgba(255, 255, 255, 0.12) 0%, rgba(20, 24, 34, 0.85) 100%)",
          backdropFilter: "blur(36px) saturate(200%)",
          WebkitBackdropFilter: "blur(36px) saturate(200%)",
          border: "1px solid rgba(255, 255, 255, 0.22)",
          borderRadius: "28px",
          padding: "32px 30px",
          boxShadow: "0 28px 70px rgba(0, 0, 0, 0.65), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.4)",
          display: "flex",
          flexDirection: "column",
          gap: "22px",
          position: "relative",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", textAlign: "center" }}>
          <ProfileAvatar avatarKey={activeProfile.avatar} size={58} gradient={activeProfile.avatarColor} />
          <h2 style={{ margin: "4px 0 0", fontSize: "24px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.3px" }}>
            Top Picks for {activeProfile.name}
          </h2>
          <p style={{ margin: 0, fontSize: "13.5px", color: "rgba(255, 255, 255, 0.65)", maxWidth: "380px" }}>
            Select 3 or more genres you enjoy to power your personalized home shelf.
          </p>
        </div>

        {/* Counter Badge */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <span
            style={{
              padding: "4px 14px",
              borderRadius: "999px",
              background: selected.length >= 3 ? "rgba(34, 197, 94, 0.18)" : "rgba(255, 255, 255, 0.08)",
              border: selected.length >= 3 ? "1px solid rgba(34, 197, 94, 0.4)" : "1px solid rgba(255, 255, 255, 0.14)",
              color: selected.length >= 3 ? "#4ade80" : "rgba(255, 255, 255, 0.7)",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            {selected.length >= 3 ? `✓ ${selected.length} Genres Selected` : `Select at least ${3 - selected.length} more`}
          </span>
        </div>

        {/* Genres Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "10px",
            maxHeight: "280px",
            overflowY: "auto",
            padding: "4px 2px",
          }}
        >
          {AVAILABLE_GENRES.map((genre) => {
            const isSelected = selected.includes(genre.id);
            return (
              <button
                key={genre.id}
                type="button"
                onClick={() => toggleGenre(genre.id)}
                style={{
                  padding: "10px 12px",
                  borderRadius: "14px",
                  background: isSelected ? "#e50914" : "rgba(255, 255, 255, 0.07)",
                  border: isSelected ? "1px solid #e50914" : "1px solid rgba(255, 255, 255, 0.14)",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: isSelected ? 700 : 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: isSelected ? "0 4px 16px rgba(229, 9, 20, 0.55)" : "none",
                  transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                <span>{genre.name}</span>
              </button>
            );
          })}
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleSave}
          style={{
            padding: "13px 20px",
            borderRadius: "9999px",
            background: "#e50914",
            border: "1px solid #e50914",
            color: "#ffffff",
            fontSize: "14.5px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(229, 9, 20, 0.55)",
            transition: "transform 0.18s ease, filter 0.18s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.02)";
            e.currentTarget.style.filter = "brightness(1.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.filter = "brightness(1)";
          }}
        >
          Save & Explore Feed
        </button>
      </div>
    </div>
  );
};
