import React from "react";
import { ArrowLeftIcon } from "../../icons";

interface DisclaimerPageProps {
  onBack: () => void;
}

export const DisclaimerPage: React.FC<DisclaimerPageProps> = ({ onBack }) => {
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
          Copyright & DMCA
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
            DMCA & Content Disclaimer
          </h1>
          <p style={{ fontSize: "14px", color: "#94a3b8", margin: 0 }}>
            Notice regarding third-party content and copyright compliance
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
              1. Non-Hosting Statement
            </h2>
            <p style={{ margin: 0 }}>
              Cinema is an indexer and client user interface. Cinema does not upload, store, host,
              or transmit any video files, streams, or proprietary audiovisual works. The software
              functions similarly to an Internet browser that interprets links and publicly available
              media references retrieved from user-enabled third-party provider extensions.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", marginBottom: "8px" }}>
              2. Third-Party Web Hosts
            </h2>
            <p style={{ margin: 0 }}>
              All video content and streaming links are hosted on independent, non-affiliated third-party
              servers (such as public cyberlockers and file repositories). Cinema has no affiliation
              with or control over the servers, data, or administrators of these hosting sites.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", marginBottom: "8px" }}>
              3. Copyright Inquiries
            </h2>
            <p style={{ margin: 0 }}>
              If you are a copyright owner or legal representative and believe your copyrighted content
              is being made accessible via an external file host, please submit takedown requests
              directly to the third-party service provider actually hosting the physical file. Removing
              a file at the hosting source renders it immediately unreachable across all clients
              and search indexers.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
