import React from "react";

export function EnvWarningBanner() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  if (url && key) return null;

  return (
    <div className="fixed left-3 right-3 bottom-3 z-[9999] rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-[13px] text-white/90 backdrop-blur">
      <span className="font-semibold">Missing Supabase env.</span>{" "}
      Set <code className="rounded bg-white/10 px-1 py-0.5">VITE_SUPABASE_URL</code> and{" "}
      <code className="rounded bg-white/10 px-1 py-0.5">VITE_SUPABASE_PUBLISHABLE_KEY</code> in your hosting provider.
    </div>
  );
}
