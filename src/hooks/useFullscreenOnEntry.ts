import { useEffect } from "react";

/**
 * Requests fullscreen when the landing page mounts.
 * Silently ignores any browser rejection (no user gesture, permissions denied, etc.).
 * Only used on the landing page — never in the exam flow.
 */
export function useFullscreenOnEntry() {
  useEffect(() => {
    if (document.fullscreenElement) return; // already fullscreen
    document.documentElement
      .requestFullscreen({ navigationUI: "hide" })
      .catch(() => {
        // Silently ignore — browser may block without a user gesture
      });
  }, []);
}
