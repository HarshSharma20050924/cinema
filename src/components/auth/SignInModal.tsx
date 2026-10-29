import React, { useState } from "react";
import { signInAccountWithPassword } from "../../utils/profileService";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateAccount: () => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  onClose,
  onOpenCreateAccount,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);
    setError(null);
    const success = await signInAccountWithPassword(email.trim(), password);
    setLoading(false);

    if (success) {
      onClose();
    } else {
      setError("Invalid email or password");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100010,
        background: "rgba(0, 0, 0, 0.72)",
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
          maxWidth: "420px",
          background: "linear-gradient(145deg, rgba(255, 255, 255, 0.12) 0%, rgba(20, 24, 34, 0.75) 100%)",
          backdropFilter: "blur(36px) saturate(200%)",
          WebkitBackdropFilter: "blur(36px) saturate(200%)",
          border: "1px solid rgba(255, 255, 255, 0.22)",
          borderRadius: "26px",
          padding: "32px 30px",
          boxShadow: "0 28px 70px rgba(0, 0, 0, 0.65), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.4)",
          display: "flex",
          flexDirection: "column",
          gap: "22px",
          position: "relative",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.08)",
            border: "none",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.18)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
        >
          ✕
        </button>

        {/* Brand & Heading */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", textAlign: "center" }}>
          <img
            src="/logo.png"
            alt="Cinema"
            style={{ width: "48px", height: "48px", borderRadius: "12px", objectFit: "cover" }}
          />
          <h2 style={{ margin: "4px 0 0", fontSize: "24px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.3px" }}>
            Sign in to Cinema
          </h2>
          <p style={{ margin: 0, fontSize: "13px", color: "rgba(255, 255, 255, 0.6)" }}>
            Access your synchronized watchlist, history & top picks
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "12px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              color: "#ff6b6b",
              fontSize: "12.5px",
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "rgba(255, 255, 255, 0.7)", marginBottom: "6px" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="name@example.com"
              autoFocus
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "14px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                color: "#ffffff",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s ease, background 0.2s ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#e50914";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
              }}
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255, 255, 255, 0.7)" }}>
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255, 255, 255, 0.6)",
                  fontSize: "11.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "14px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                color: "#ffffff",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s ease, background 0.2s ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#e50914";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              marginTop: "8px",
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
            Sign In
          </button>
        </form>

        {/* Link to create account */}
        <div style={{ textAlign: "center", fontSize: "13px", color: "rgba(255, 255, 255, 0.65)" }}>
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCreateAccount();
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              fontWeight: 700,
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
            }}
          >
            Create one
          </button>
        </div>
      </div>
    </div>
  );
};
