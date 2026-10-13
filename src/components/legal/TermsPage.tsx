import React from "react";
import { ArrowLeftIcon } from "../../icons";

interface TermsPageProps {
  onBack: () => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onBack }) => {
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
          Legal & Compliance
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
            Terms of Service
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
              1. Nature of the Application
            </h2>
            <p style={{ margin: 0 }}>
              Cinema is an open, client-side media browser, search indexer, and playback interface.
              Cinema functions strictly as a tool for aggregating publicly accessible metadata and
              rendering streams resolved via community extensions. Cinema does not host, upload,
              store, or broadcast any media files, video streams, or copyrighted material on any
              servers operated by Cinema.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", marginBottom: "8px" }}>
              2. User Responsibility & Compliance
            </h2>
            <p style={{ margin: 0 }}>
              By utilizing Cinema, you agree to access content only in accordance with all applicable
              local, national, and international laws, copyright regulations, and licensing agreements
              in your jurisdiction. You retain sole responsibility for determining the legality of any
              streams, scrapers, or downloads accessed through third-party provider plugins.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", marginBottom: "8px" }}>
              3. Community Extensions & Third-Party Endpoints
            </h2>
            <p style={{ margin: 0 }}>
              Cinema incorporates modular provider plugins that query external, third-party web
              services. Cinema exercises no ownership or control over the accuracy, uptime, legality,
              or safety of external hosts. Connections initiated by provider extensions communicate
              directly between your local client machine and third-party servers.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", marginBottom: "8px" }}>
              4. Offline Downloads & Runner Nodes
            </h2>
            <p style={{ margin: 0 }}>
              The download manager and background runner daemons operate entirely client-side on your
              hardware. Files downloaded through Cinema are stored exclusively on your local device.
              You agree not to redistribute, commercially exploit, or misuse content downloaded via
              the software.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", marginBottom: "8px" }}>
              5. Disclaimer of Warranties
            </h2>
            <p style={{ margin: 0 }}>
              Cinema is provided "as is" and "as available", without warranties of any kind, either
              express or implied. The developers do not guarantee uninterrupted access, error-free
              playback, or persistent availability of third-party sources.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", marginBottom: "8px" }}>
              6. Limitation of Liability
            </h2>
            <p style={{ margin: 0 }}>
              To the fullest extent permissible under applicable law, the contributors of Cinema
              shall not be liable for any direct, indirect, incidental, or consequential damages
              arising out of the use or inability to use the software.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
