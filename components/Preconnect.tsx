"use client";

import { preconnect } from "react-dom";

export default function Preconnect() {
  preconnect("https://msfbyneidkfhmofnoupg.supabase.co", { crossOrigin: "anonymous" });
  return null;
}
