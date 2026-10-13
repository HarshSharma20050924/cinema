import React, { useState, useEffect } from "react";
import { FilmIcon, CheckIcon, ServerIcon, ArrowLeftIcon } from "../../icons";
import type { Provider } from "../../types";

const REQUIRED_PROVIDER_NAME = "harsh cinema";

interface OnboardingModalProps {
  availableProviders: Provider[];
  onComplete: (providerSource: string, installedExtensions: string[]) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  availableProviders,
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [providerSource, setProviderSource] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper to get auto-selected providers (hdhub4u only by default)
  const getAutoSelected = (providers: Provider[]) => {
    return providers
      .filter((p) => p.value.toLowerCase() === "hdhub4u")
      .map((p) => p.value);
  };

  const [selectedExtensions, setSelectedExtensions] = useState<string[]>(() =>
    getAutoSelected(availableProviders)
  );

  const initialLoadRef = React.useRef(false);
  // Only auto-select default provider (hdhub4u) once when availableProviders load
  useEffect(() => {
    if (!initialLoadRef.current && availableProviders.length > 0) {
      initialLoadRef.current = true;
      if (selectedExtensions.length === 0) {
        setSelectedExtensions(getAutoSelected(availableProviders));
      }
    }
  }, [availableProviders]);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = providerSource.trim().toLowerCase();
    if (cleanInput !== REQUIRED_PROVIDER_NAME) {
      setErrorMessage("Access denied. Please enter the exact provider name.");
      return;
    }
    setErrorMessage(null);
    setStep(2);
  };

  const toggleExtension = (val: string) => {
    setSelectedExtensions((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  const isAllSelected = availableProviders.length > 0 && selectedExtensions.length === availableProviders.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedExtensions([]);
    } else {
      setSelectedExtensions(availableProviders.map((p) => p.value));
    }
  };

  const handleFinish = () => {
    const finalExtensions =
      selectedExtensions.length > 0
        ? selectedExtensions
        : getAutoSelected(availableProviders);

    onComplete(providerSource.trim(), finalExtensions);
  };

  // Sort providers so selected ones appear at the top of the list
  const sortedProviders = [...availableProviders].sort((a, b) => {
    const aSel = selectedExtensions.includes(a.value);
    const bSel = selectedExtensions.includes(b.value);
    if (aSel && !bSel) return -1;
    if (!aSel && bSel) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.94)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        zIndex: 250,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "520px",
          maxHeight: "92vh",
          overflowY: "auto",
          borderRadius: "20px",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.9)",
          padding: "28px 24px",
        }}
      >
        {/* Header Icon */}
        <div style={{ textAlign: "center", marginBottom: "22px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #e50914, #ff334b)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 20px rgba(229, 9, 20, 0.45)",
              marginBottom: "12px",
            }}
          >
            <FilmIcon size={24} color="#fff" />
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "0.02em", marginBottom: "6px" }}>
            {step === 1 ? "Welcome to Cinema" : "Select Movie Sources"}
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            {step === 1
              ? "Enter your provider name to get started."
              : "Choose which movie sources you would like to enable."}
          </p>
        </div>

        {/* STEP 1: Single Provider Name Input - Strict exact name validation */}
        {step === 1 ? (
          <form onSubmit={handleNextStep}>
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                Provider Name
              </label>
              <input
                type="text"
                value={providerSource}
                onChange={(e) => {
                  setProviderSource(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter provider name"
                autoComplete="off"
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: errorMessage
                    ? "1px solid #e50914"
                    : "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              />
              {errorMessage && (
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "12px",
                    color: "#ff4d5a",
                    fontWeight: 600,
                  }}
                >
                  {errorMessage}
                </div>
              )}
            </div>

            <button
              type="submit"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #e50914, #ff334b)",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 700,
                boxShadow: "0 6px 20px rgba(229, 9, 20, 0.4)",
                cursor: "pointer",
              }}
            >
              Continue
            </button>
          </form>
        ) : (
          /* STEP 2: Select Extensions */
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "10px",
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>
                {selectedExtensions.length} of {availableProviders.length} active
              </span>
              <button
                type="button"
                onClick={toggleSelectAll}
                style={{
                  fontSize: "12px",
                  color: "#ff4d5a",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  cursor: "pointer",
                }}
              >
                <CheckIcon size={14} />
                <span>{isAllSelected ? "Deselect All" : "Select All"}</span>
              </button>
            </div>

            {/* List of Extensions (Sorted with selected items on top) */}
            <div
              style={{
                maxHeight: "260px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "7px",
                paddingRight: "4px",
                marginBottom: "18px",
              }}
            >
              {sortedProviders.map((p) => {
                const isSelected = selectedExtensions.includes(p.value);
                return (
                  <div
                    key={p.value}
                    onClick={() => toggleExtension(p.value)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "9px 12px",
                      borderRadius: "10px",
                      background: isSelected ? "rgba(229, 9, 20, 0.12)" : "rgba(255, 255, 255, 0.03)",
                      border: `1px solid ${isSelected ? "rgba(229, 9, 20, 0.45)" : "rgba(255, 255, 255, 0.06)"}`,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {p.icon ? (
                        <img
                          src={p.icon}
                          alt=""
                          style={{ width: "18px", height: "18px", borderRadius: "3px", objectFit: "contain" }}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <ServerIcon size={16} color="var(--accent-cyan)" />
                      )}
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "capitalize" }}>
                          {p.type} • v{p.version}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "5px",
                        background: isSelected ? "#e50914" : "rgba(255, 255, 255, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isSelected && <CheckIcon size={13} color="#fff" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions with Back button */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "11px 16px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <ArrowLeftIcon size={14} />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleFinish}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #e50914, #ff334b)",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 700,
                  boxShadow: "0 6px 20px rgba(229, 9, 20, 0.4)",
                  cursor: "pointer",
                }}
              >
                Continue to Cinema
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
