import React, { useState, useRef, useEffect } from "react";
import { ServerIcon, ChevronDownIcon, XIcon } from "../../icons";
import type { Provider } from "../../types";

export interface ProviderDropdownProps {
  providers: Provider[];
  activeProvider: Provider | null;
  onSelectProvider: (provider: Provider) => void;
  onSearchReset?: () => void;
}

export const ProviderDropdown: React.FC<ProviderDropdownProps> = ({
  providers,
  activeProvider,
  onSelectProvider,
  onSearchReset,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 640 : false
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          height: "42px",
          padding: "0 18px",
          borderRadius: "999px",
          background: "rgba(14, 14, 14, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.16)",
          color: "#ffffff",
          fontSize: "15px",
          fontWeight: 600,
          cursor: "pointer",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(24, 24, 24, 0.95)";
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.28)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(14, 14, 14, 0.85)";
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.16)";
        }}
      >
        {activeProvider?.icon ? (
          <img
            src={activeProvider.icon}
            alt=""
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "4px",
              objectFit: "contain",
            }}
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        ) : (
          <ServerIcon size={15} color="#94a3b8" />
        )}
        <span
          style={{
            maxWidth: "130px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {activeProvider?.name || "Extension"}
        </span>
        <ChevronDownIcon size={13} color="rgba(255, 255, 255, 0.6)" />
      </button>

      {dropdownOpen && (
        <>
          {isMobile && (
            <div
              onClick={() => setDropdownOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0, 0, 0, 0.75)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                zIndex: 9998,
              }}
            />
          )}

          <div
            style={{
              position: isMobile ? "fixed" : "absolute",
              top: isMobile ? "auto" : "48px",
              bottom: isMobile ? "76px" : "auto",
              left: isMobile ? "12px" : "auto",
              right: isMobile ? "12px" : 0,
              maxWidth: isMobile ? "400px" : "none",
              margin: isMobile ? "0 auto" : "0",
              width: isMobile ? "auto" : "290px",
              maxHeight: isMobile ? "68vh" : "420px",
              overflowY: "auto",
              borderRadius: isMobile ? "22px" : "20px",
              padding: "12px",
              boxShadow: "0 24px 70px rgba(0, 0, 0, 0.98)",
              zIndex: isMobile ? 9999 : 50,
              background: "rgba(10, 10, 10, 0.98)",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              animation: isMobile ? "slideUpModal 0.2s cubic-bezier(0.16, 1, 0.3, 1)" : "fadeIn 0.15s ease-out",
            }}
          >
            <div
              style={{
                padding: "4px 8px 10px 8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                marginBottom: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  color: "#ffffff",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Available Sources ({providers.length})
              </span>
              <button
                type="button"
                onClick={() => setDropdownOpen(false)}
                title="Close"
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <XIcon size={13} />
              </button>
            </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            {providers.map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  onSelectProvider(p);
                  setDropdownOpen(false);
                  if (onSearchReset) onSearchReset();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  background:
                    activeProvider?.value === p.value
                      ? "rgba(255, 255, 255, 0.12)"
                      : "transparent",
                  color: activeProvider?.value === p.value ? "#ffffff" : "rgba(255, 255, 255, 0.85)",
                  fontSize: "13px",
                  fontWeight: activeProvider?.value === p.value ? 700 : 500,
                  textAlign: "left",
                  cursor: "pointer",
                  border: "none",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (activeProvider?.value !== p.value) {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeProvider?.value !== p.value) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {p.icon && (
                    <img
                      src={p.icon}
                      alt=""
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "4px",
                        objectFit: "contain",
                      }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  )}
                  <span>{p.name}</span>
                </div>
                <span
                  style={{
                    fontSize: "10px",
                    padding: "2px 6px",
                    borderRadius: "999px",
                    background: "rgba(255, 255, 255, 0.08)",
                    color: "rgba(255, 255, 255, 0.5)",
                    textTransform: "capitalize",
                  }}
                >
                  {p.type}
                </span>
              </button>
            ))}
          </div>
        </div>
      </>
    )}
  </div>
  );
};
