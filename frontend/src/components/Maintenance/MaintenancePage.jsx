import React, { useEffect, useState } from "react";

function format(ms) {
  if (!ms || ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = String(Math.floor((s % 86400) / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return { d, h, m, sec };
}

// Friendly full-screen maintenance page with a live countdown to `until`.
const MaintenancePage = ({ until, message, onElapsed }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = until ? new Date(until).getTime() - now : null;
  useEffect(() => {
    if (until && remaining !== null && remaining <= 0) onElapsed?.();
  }, [remaining, until, onElapsed]);

  const cd = format(remaining);

  const box = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg,#0033A0 0%,#001a52 100%)",
    color: "#fff",
    textAlign: "center",
    padding: "2rem",
  };
  const cell = {
    minWidth: 64,
    padding: "10px 12px",
    background: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    fontSize: 28,
    fontWeight: 700,
    lineHeight: 1,
  };
  const lbl = { fontSize: 11, opacity: 0.8, marginTop: 6, textTransform: "uppercase", letterSpacing: 1 };

  return (
    <div style={box}>
      <div style={{ maxWidth: 560 }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🛠️</div>
        <h1 style={{ fontWeight: 800, marginBottom: 12 }}>We&apos;ll be back soon</h1>
        <p style={{ fontSize: 18, opacity: 0.9, marginBottom: 28 }}>
          {message?.trim() ||
            "The portal is temporarily down for scheduled maintenance. Thanks for your patience."}
        </p>

        {cd ? (
          <>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              {cd.d > 0 && (
                <div>
                  <div style={cell}>{cd.d}</div>
                  <div style={lbl}>Days</div>
                </div>
              )}
              <div>
                <div style={cell}>{cd.h}</div>
                <div style={lbl}>Hours</div>
              </div>
              <div>
                <div style={cell}>{cd.m}</div>
                <div style={lbl}>Min</div>
              </div>
              <div>
                <div style={cell}>{cd.sec}</div>
                <div style={lbl}>Sec</div>
              </div>
            </div>
            <p style={{ marginTop: 24, opacity: 0.75 }}>Estimated time until we&apos;re back.</p>
          </>
        ) : (
          <p style={{ opacity: 0.75 }}>We&apos;re working on it and will be back shortly.</p>
        )}
      </div>
    </div>
  );
};

export default MaintenancePage;
