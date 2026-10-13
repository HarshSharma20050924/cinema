import React from "react";
import { SearchIcon, XIcon } from "../../icons";

export interface NavSearchBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isGlobalSearch: boolean;
  onToggleGlobalSearch: () => void;
  activeProviderName?: string;
  width?: string;
}

export const NavSearchBar: React.FC<NavSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  isGlobalSearch,
  onToggleGlobalSearch,
  activeProviderName = "library",
  width = "290px",
}) => {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        width,
      }}
    >
      <SearchIcon
        size={16}
        color="rgba(255, 255, 255, 0.6)"
        style={{ position: "absolute", left: "14px", pointerEvents: "none" }}
      />
      <input
        type="text"
        placeholder={
          isGlobalSearch
            ? "Search everywhere..."
            : `Search in ${activeProviderName}...`
        }
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{
          width: "100%",
          height: "42px",
          padding: "0 74px 0 42px",
          background: "rgba(14, 14, 14, 0.85)",
          borderRadius: "999px",
          color: "#ffffff",
          fontSize: "15px",
          fontWeight: 500,
          border: "1px solid rgba(255, 255, 255, 0.16)",
          outline: "none",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
          transition: "background 0.2s, border-color 0.2s, box-shadow 0.2s",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.35)";
          e.currentTarget.style.background = "rgba(22, 22, 22, 0.95)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.16)";
          e.currentTarget.style.background = "rgba(14, 14, 14, 0.85)";
        }}
      />

      <div
        style={{
          position: "absolute",
          right: "8px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {/* Toggle switch for Global Search */}
        <div
          onClick={onToggleGlobalSearch}
          title={isGlobalSearch ? "Searching everywhere" : "Quick Search"}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "3px 6px",
            borderRadius: "999px",
            background: isGlobalSearch
              ? "rgba(229, 9, 20, 0.2)"
              : "rgba(255, 255, 255, 0.08)",
            border: isGlobalSearch
              ? "1px solid rgba(229, 9, 20, 0.4)"
              : "1px solid rgba(255, 255, 255, 0.1)",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: "22px",
              height: "12px",
              borderRadius: "999px",
              background: isGlobalSearch ? "#e50914" : "rgba(255, 255, 255, 0.25)",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#ffffff",
                position: "absolute",
                top: "2px",
                left: isGlobalSearch ? "12px" : "2px",
                transition: "left 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            />
          </div>
        </div>

        {searchQuery && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSearchChange("");
            }}
            title="Clear search"
            aria-label="Clear search"
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.24)",
              border: "none",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
              flexShrink: 0,
            }}
          >
            <XIcon size={13} color="#ffffff" />
          </button>
        )}
      </div>
    </div>
  );
};
