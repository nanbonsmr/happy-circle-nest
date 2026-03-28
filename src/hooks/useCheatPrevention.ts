import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SecurityLevel = "low" | "high";

export type CheatEventType =
  | "tab_switch"
  | "fullscreen_exit"
  | "window_blur"
  | "copy_attempt"
  | "paste_attempt"
  | "right_click"
  | "devtools_open"
  | "inactivity"
  | "window_resize"
  | "visibility_change";

interface UseCheatPreventionOptions {
  sessionId: string;
  securityLevel: SecurityLevel;
  onWarning: (event: CheatEventType, count: number) => void;
  enabled: boolean;
}

export function useCheatPrevention({
  sessionId,
  securityLevel,
  onWarning,
  enabled,
}: UseCheatPreventionOptions) {
  const countsRef = useRef<Record<CheatEventType, number>>({
    tab_switch: 0,
    fullscreen_exit: 0,
    window_blur: 0,
    copy_attempt: 0,
    paste_attempt: 0,
    right_click: 0,
    devtools_open: 0,
    inactivity: 0,
    window_resize: 0,
    visibility_change: 0,
  });
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const INACTIVITY_THRESHOLD = 120_000; // 2 minutes

  const logEvent = useCallback(
    async (eventType: CheatEventType, detail?: string) => {
      if (!sessionId || !enabled) return;
      countsRef.current[eventType] = (countsRef.current[eventType] || 0) + 1;
      onWarning(eventType, countsRef.current[eventType]);

      try {
        await supabase.from("cheat_logs").insert({
          session_id: sessionId,
          event_type: eventType,
          detail: detail ?? null,
        });
      } catch {
        // silently fail — don't interrupt the exam
      }
    },
    [sessionId, enabled, onWarning]
  );

  const resetInactivity = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      logEvent("inactivity", `Inactive for ${INACTIVITY_THRESHOLD / 1000}s`);
    }, INACTIVITY_THRESHOLD);
  }, [logEvent]);

  // Request fullscreen
  const requestFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // --- Fullscreen enforcement ---
    requestFullscreen();

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        logEvent("fullscreen_exit");
        // Re-request after a short delay
        setTimeout(requestFullscreen, 500);
      }
    };

    // --- Visibility / tab switch ---
    const onVisibilityChange = () => {
      if (document.hidden) {
        logEvent("tab_switch");
      }
    };

    // --- Window blur (app switch on desktop) ---
    const onBlur = () => logEvent("window_blur");

    // --- Window resize (split-screen detection) ---
    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;
    const onResize = () => {
      const dw = Math.abs(window.innerWidth - lastWidth);
      const dh = Math.abs(window.innerHeight - lastHeight);
      if (dw > 100 || dh > 100) {
        logEvent("window_resize", `${window.innerWidth}x${window.innerHeight}`);
      }
      lastWidth = window.innerWidth;
      lastHeight = window.innerHeight;
    };

    // --- High security: block copy/paste/right-click ---
    const onCopy = (e: ClipboardEvent) => {
      if (securityLevel === "high") {
        e.preventDefault();
        logEvent("copy_attempt");
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      if (securityLevel === "high") {
        e.preventDefault();
        logEvent("paste_attempt");
      }
    };
    const onContextMenu = (e: MouseEvent) => {
      if (securityLevel === "high") {
        e.preventDefault();
        logEvent("right_click");
      }
    };

    // --- High security: block keyboard shortcuts ---
    const onKeyDown = (e: KeyboardEvent) => {
      if (securityLevel !== "high") return;
      const blocked =
        // PrintScreen
        e.key === "PrintScreen" ||
        // Ctrl+C, Ctrl+V, Ctrl+U, Ctrl+S, Ctrl+A, Ctrl+P
        (e.ctrlKey && ["c", "v", "u", "s", "a", "p"].includes(e.key.toLowerCase())) ||
        // F12 devtools
        e.key === "F12" ||
        // Alt+Tab
        (e.altKey && e.key === "Tab") ||
        // Windows key
        e.key === "Meta";

      if (blocked) {
        e.preventDefault();
        if (e.key === "F12" || (e.ctrlKey && e.shiftKey && e.key === "I")) {
          logEvent("devtools_open");
        }
      }
    };

    // --- Inactivity tracking ---
    const activityEvents = ["mousemove", "keydown", "click", "touchstart"];
    activityEvents.forEach((ev) => document.addEventListener(ev, resetInactivity));
    resetInactivity();

    // Attach all listeners
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("resize", onResize);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
      activityEvents.forEach((ev) => document.removeEventListener(ev, resetInactivity));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      // Exit fullscreen on cleanup
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [enabled, securityLevel, logEvent, resetInactivity, requestFullscreen]);

  return { counts: countsRef.current, requestFullscreen };
}
