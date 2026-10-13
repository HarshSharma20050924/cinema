import React from "react";
import { ArrowLeftIcon } from "../../icons";

interface PrivacyPageProps {
  onBack: () => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onBack }) => {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#090c13",
        color: "#e2e8f0",
        paddingBottom: "80px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(9, 12, 19, 0.9)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#e2e8f0",
            padding: "8px 14px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
          }}
        >
          <ArrowLeftIcon size={16} />
          <span>Back to Cinema</span>
        </button>

        <span
          style={{
            fontSize: "11px",
            fontWeight: 800,
            color: "#e50914",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Data & Privacy
        </span>
      </div>

      <div
        style={{
          maxWidth: "840px",
          margin: "0 auto",
          padding: "40px 24px 0 24px",
        }}
      >
        <div style={{ marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "clamp(26px, 4vw, 36px)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              margin: "0 0 10px 0",
              color: "#ffffff",
            }}
          >
            Privacy Policy
          </h1>
          <p style={{ fontSize: "14px", color: "#94a3b8", margin: 0 }}>
            Last revised: October 2026
          </p>
        </div>

        <div
          style={{
            background: "rgba(18, 23, 34, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "18px",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "28px",
            lineHeight: 1.7,
            fontSize: "14px",
            color: "#cbd5e1",
          }}
        >
          <section>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", marginBottom: "8px" }}>
              1. Local-First Storage Architecture
            </h2>
            <p style={{ margin: 0 }}>
              Cinema is engineered under a strict local-first philosophy. All user configuration,
              including watch history, resume timestamps, bookmarks, extension configurations,
              and downloaded media records, are kept locally in your device storage
              (browser localStorage or application userData directory). This data is never
              transmitted to or stored on remote tracking databases.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", marginBottom: "8px" }}>
              2. Zero Telemetry & No Analytics
            </h2>
            <p style={{ margin: 0 }}>
              Cinema does not contain behavioral tracking scripts, third-party analytics SDKs,
              fingerprinting mechanisms, or advertising trackers. We do not log what movies,
              shows, or streams you search for or watch.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", marginBottom: "8px" }}>
              3. Direct Outbound Network Requests
            </h2>
            <p style={{ margin: 0 }}>
              When browsing catalogs or streaming media, your client application communicates directly
              with public metadata providers (such as Cinemeta, TMDB) and community scraper endpoints.
              These third-party servers may observe your IP address as part of standard HTTP protocol
              negotiation. You may utilize a VPN or encrypted tunnel if you desire additional network
              layer privacy.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", marginBottom: "8px" }}>
              4. Permissions Requested by Mobile & Desktop Apps
            </h2>
            <p style={{ margin: 0 }}>
              The Cinema mobile and desktop applications request only minimal system permissions:
              Internet access for stream loading, local storage access for writing user-initiated
              offline downloads, and optional foreground service notification permissions for the
              Android background runner daemon. Camera, microphone, and contacts access are never
              requested or accessed.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", marginBottom: "8px" }}>
              5. Data Deletion
            </h2>
            <p style={{ margin: 0 }}>
              Because all state is stored locally, you maintain complete sovereignty over your data.
              You can wipe all history, cache, bookmarks, and configurations at any time through
              the in-app Settings menu or by clearing browser site data.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
