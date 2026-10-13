import React from "react";

interface TermsPageProps {
  onBack: () => void;
}

export const TermsPage: React.FC<TermsPageProps> = () => {
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
              Legal & Compliance
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
            Terms of Service
          </h1>

          <p style={{ fontSize: "15px", color: "#a3a3a3", margin: 0, lineHeight: 1.6 }}>
            Architecture guidelines, community provider usage, and decentralized software terms for Cinema.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Card 1: Decentralized Architecture */}
          <div
            style={{
              background: "#0d0d10",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "24px 28px",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", margin: "0 0 10px 0" }}>
              1. Architecture & Non-Hosting Notice
            </h2>
            <p style={{ fontSize: "14px", color: "#b3b3b3", lineHeight: 1.6, margin: 0 }}>
              Cinema is an open client-side media browser, search aggregator, and local playback interface.
              Cinema does not host, upload, broadcast, or store video files or copyrighted multimedia on any servers.
              Metadata, posters, and stream manifests are resolved dynamically on client hardware through
              public APIs and community-maintained provider plugins.
            </p>
          </div>

          {/* Card 2: User Responsibility */}
          <div
            style={{
              background: "#0d0d10",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "24px 28px",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", margin: "0 0 10px 0" }}>
              2. User Compliance & Applicable Laws
            </h2>
            <p style={{ fontSize: "14px", color: "#b3b3b3", lineHeight: 1.6, margin: 0 }}>
              Users agree to access content strictly in accordance with copyright laws, intellectual property statutes,
              and licensing regulations in their local jurisdiction. You retain full responsibility for verifying
              the legal rights to stream or download media fetched via third-party web scrapers.
            </p>
          </div>

          {/* Card 3: Community Extensions */}
          <div
            style={{
              background: "#0d0d10",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "24px 28px",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", margin: "0 0 10px 0" }}>
              3. Modular Provider Extensions
            </h2>
            <p style={{ fontSize: "14px", color: "#b3b3b3", lineHeight: 1.6, margin: 0 }}>
              Provider plugins connect directly between your device and external web endpoints. Cinema contributors
              exercise no control over third-party link reliability, server availability, or external stream content.
            </p>
          </div>

          {/* Card 4: Local Storage & Downloads */}
          <div
            style={{
              background: "#0d0d10",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "24px 28px",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", margin: "0 0 10px 0" }}>
              4. Offline Downloads & Node Daemons
            </h2>
            <p style={{ fontSize: "14px", color: "#b3b3b3", lineHeight: 1.6, margin: 0 }}>
              Downloads initiated in Cinema write directly to your local file system. Offline files and background
              runner processes remain private on your personal device and are not uploaded to external networks.
            </p>
          </div>

          {/* Card 5: Warranty & Disclaimer */}
          <div
            style={{
              background: "#0d0d10",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "24px 28px",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", margin: "0 0 10px 0" }}>
              5. Software Disclaimer
            </h2>
            <p style={{ fontSize: "14px", color: "#b3b3b3", lineHeight: 1.6, margin: 0 }}>
              Cinema is provided "as-is" without warranty of any kind. The contributors are not liable for any
              damages, network issues, or service interruptions resulting from the operation of third-party scrapers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
