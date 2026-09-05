"use client";

import { useEffect } from "react";

export default function RefCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("refCode", ref.toUpperCase());
    }
  }, []);

  return null;
}
