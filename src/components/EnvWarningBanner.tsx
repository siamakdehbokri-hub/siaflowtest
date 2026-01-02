import React from "react";

export function EnvWarningBanner() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  if (url && key) return null;

  return (
    <div style={{
      position: "fixed",
      left: 12,
      right: 12,
      bottom: 12,
      zIndex: 9999,
      padding: "10px 12px",
      borderRadius: 12,
      background: "rgba(255, 90, 0, 0.12)",
      border: "1px solid rgba(255, 90, 0, 0.35)",
      backdropFilter: "blur(8px)",
      color: "rgba(255,255,255,0.92)",
      fontSize: 13,
      lineHeight: 1.35
    }}>
      <strong>Missing Supabase env.</strong>{" "}
      Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in your hosting provider (Vercel → Project → Settings → Environment Variables).
    </div>
  );
}
