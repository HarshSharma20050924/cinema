import React from "react";

interface DisclaimerPageProps {
  onBack: () => void;
}

export const DisclaimerPage: React.FC<DisclaimerPageProps> = () => {
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
              Copyright & Notice
            </span>
            <span style={{ fontSize: "12px", color: "#737373" }}>• Policy</span>
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
            DMCA & Disclaimer
          </h1>

          <p style={{ fontSize: "15px", color: "#a3a3a3", margin: 0, lineHeight: 1.6 }}>
            Index protocol information and third-party hosting statements.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Card 1: Non-Hosting Statement */}
          <div
            style={{
              background: "#0d0d10",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "24px 28px",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", margin: "0 0 10px 0" }}>
              1. Non-Hosting Statement
            </h2>
            <p style={{ fontSize: "14px", color: "#b3b3b3", lineHeight: 1.6, margin: 0 }}>
              Cinema is an open client interface and search aggregator. Cinema does not upload, host, store,
              or broadcast any video files, media streams, or audiovisual content. Cinema functions similarly
              to a specialized web browser that parses and displays publicly available metadata and links
              resolved via user-installed third-party extensions.
            </p>
          </div>

          {/* Card 2: Independent Third-Party Endpoints */}
          <div
            style={{
              background: "#0d0d10",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "24px 28px",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", margin: "0 0 10px 0" }}>
              2. Third-Party Web Hosts
            </h2>
            <p style={{ fontSize: "14px", color: "#b3b3b3", lineHeight: 1.6, margin: 0 }}>
              All video streams and files accessed through provider extensions are hosted on independent,
              external file servers not operated by or affiliated with Cinema. Cinema exercises no control
              over the operational infrastructure, file persistence, or legal compliance of external hosts.
            </p>
          </div>

          {/* Card 3: Copyright Takedown Requests */}
          <div
            style={{
              background: "#0d0d10",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "24px 28px",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", margin: "0 0 10px 0" }}>
              3. Copyright Inquiries
            </h2>
            <p style={{ fontSize: "14px", color: "#b3b3b3", lineHeight: 1.6, margin: 0 }}>
              If you are a copyright holder seeking removal of copyrighted works, please contact the third-party
              host actually storing and serving the content. Because Cinema does not host or store files, removing
              content from the originating third-party server permanently disables stream access across all
              browsers and client software.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
