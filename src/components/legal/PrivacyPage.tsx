import React from "react";

interface PrivacyPageProps {
  onBack: () => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = () => {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#000000",
        color: "#ffffff",
        paddingTop: "90px",
        paddingBottom: "100px",
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "880px",
          margin: "0 auto",
          padding: "0 24px",
        }}
      >
        <div style={{ marginBottom: "36px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 800,
                color: "#e50914",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Data & Transparency
            </span>
            <span style={{ fontSize: "12px", color: "#737373" }}>• Updated October 2026</span>
          </div>

          <h1
            style={{
              fontSize: "clamp(30px, 4vw, 42px)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              margin: "0 0 12px 0",
              color: "#ffffff",
            }}
          >
            Privacy Policy
          </h1>

          <p style={{ fontSize: "15px", color: "#a3a3a3", margin: 0, lineHeight: 1.6 }}>
            Cinema operates with zero tracking, zero remote databases, and full client-side sovereignty.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Card 1: Local-First Architecture */}
          <div
            style={{
              background: "#0d0d10",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "24px 28px",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", margin: "0 0 10px 0" }}>
              1. Local-Only Storage
            </h2>
            <p style={{ fontSize: "14px", color: "#b3b3b3", lineHeight: 1.6, margin: 0 }}>
              All configuration, installed providers, watch progress, resume points, and offline downloads
              are saved strictly on your local device via local storage or app application storage.
              Cinema operates no user accounts, user profiles, or centralized telemetry servers.
            </p>
          </div>

          {/* Card 2: Zero Telemetry */}
          <div
            style={{
              background: "#0d0d10",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "24px 28px",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", margin: "0 0 10px 0" }}>
              2. Zero Analytics & No Tracking
            </h2>
            <p style={{ fontSize: "14px", color: "#b3b3b3", lineHeight: 1.6, margin: 0 }}>
              Cinema does not bundle tracking SDKs, analytics pixels, advertising libraries, or session recorders.
              What you search, stream, or download is never collected, logged, or shared.
            </p>
          </div>

          {/* Card 3: Outbound Network Calls */}
          <div
            style={{
              background: "#0d0d10",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "24px 28px",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", margin: "0 0 10px 0" }}>
              3. Direct Provider Requests
            </h2>
            <p style={{ fontSize: "14px", color: "#b3b3b3", lineHeight: 1.6, margin: 0 }}>
              Metadata queries and stream extraction requests communicate directly between your IP address
              and public endpoints (such as TMDB, Cinemeta, and provider sites). Users who prefer masked network
              routing can operate Cinema behind a VPN or proxy tunnel.
            </p>
          </div>

          {/* Card 4: Device Permissions */}
          <div
            style={{
              background: "#0d0d10",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "24px 28px",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", margin: "0 0 10px 0" }}>
              4. Application Permissions
            </h2>
            <p style={{ fontSize: "14px", color: "#b3b3b3", lineHeight: 1.6, margin: 0 }}>
              Mobile and desktop builds request only networking permissions and local storage access for writing
              offline media files. The Runner app utilizes optional background service permissions to maintain
              scraping daemons.
            </p>
          </div>

          {/* Card 5: Complete Data Control */}
          <div
            style={{
              background: "#0d0d10",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "24px 28px",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", margin: "0 0 10px 0" }}>
              5. Instant Data Deletion
            </h2>
            <p style={{ fontSize: "14px", color: "#b3b3b3", lineHeight: 1.6, margin: 0 }}>
              Because data is saved locally, you can erase your data instantly by clearing site data in your browser,
              resetting the app via the in-app Settings dialog, or clearing app data in Android/Desktop system settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
