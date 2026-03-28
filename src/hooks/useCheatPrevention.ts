import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SecurityLevel = "low" | "high";

export type CheatEventType =
  | "tab_switch"
  | "fullscreen_exit"
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

// How long after mount to ignore all events (browser settling time)
const GRACE_PERIOD_MS = 2500;

export function useCheatPrevention({
  sessionId,
  securityLevel,
  onWarning,
  enabled,
}: UseCheatPreventionOptions) {
  const countsRef = useRef<Record<CheatEventType, number>>({
    tab_switch: 0,
    fullscreen_exit: 0,
    copy_attempt: 0,
    paste_attempt: 0,
    right_click: 0,
    devtools_open: 0,
    inactivity: 0,
    window_resize: 0,
    visibility_change: 0,
  });

  // True while we are in the startup grace period — events are ignored
  const readyRef = useRef(false);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const INACTIVITY_THRESHOLD = 120_000; // 2 minutes

  const logEvent = useCallback(
    async (eventType: CheatEventType, detail?: string) => {
      // Drop events during grace period or when disabled
      if (!readyRef.current || !sessionId || !enabled) return;

      countsRef.current[eventType] = (countsRef.current[eventType] || 0) + 1;
      onWarning(eventType, countsRef.current[eventType]);

      try {
        await supabase.from("cheat_logs").insert({
          session_id: sessionId,
          event_type: eventType,
          detail: detail ?? null,
        });
      } catch {
        // silently fail — never interrupt the exam
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

  const requestFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Reset ready flag and start grace period
    readyRef.current = false;
    const graceTimer = setTimeout(() => {
      readyRef.current = true;
    }, GRACE_PERIOD_MS);

    // Request fullscreen immediately (this may fire fullscreenchange during grace period — safe)
    requestFullscreen();

    // ── Fullscreen exit ──────────────────────────────────────────────────────
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        logEvent("fullscreen_exit");
        setTimeout(requestFullscreen, 600);
      }
    };

    // ── Tab switch (page hidden) ─────────────────────────────────────────────
    // visibilitychange is the reliable cross-browser signal for tab switching.
    // We do NOT use window blur — it fires on every in-page click in some browsers.
    const onVisibilityChange = () => {
      if (document.hidden) {
        logEvent("tab_switch");
      }
    };

    // ── Window resize (split-screen detection) ───────────────────────────────
    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;
    const onResize = () => {
      const dw = Math.abs(window.innerWidth - lastWidth);
      const dh = Math.abs(window.innerHeight - lastHeight);
      if (dw > 150 || dh > 150) {
        logEvent("window_resize", `${window.innerWidth}x${window.innerHeight}`);
      }
      lastWidth = window.innerWidth;
      lastHeight = window.innerHeight;
    };

    // ── High security only ───────────────────────────────────────────────────
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
    const onKeyDown = (e: KeyboardEvent) => {
      if (securityLevel !== "high") return;
      const blocked =
        e.key === "PrintScreen" ||
        (e.ctrlKey && ["c", "v", "u", "s", "a", "p"].includes(e.key.toLowerCase())) ||
        e.key === "F12" ||
        (e.altKey && e.key === "Tab") ||
        e.key === "Meta";
      if (blocked) {
        e.preventDefault();
        if (e.key === "F12" || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "i")) {
          logEvent("devtools_open");
        }
      }
    };

    // ── Inactivity ───────────────────────────────────────────────────────────
    const activityEvents = ["mousemove", "keydown", "click", "touchstart"] as const;
    activityEvents.forEach((ev) => document.addEventListener(ev, resetInactivity));
    resetInactivity();

    // Attach listeners
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("resize", onResize);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      clearTimeout(graceTimer);
      readyRef.current = false;
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
      activityEvents.forEach((ev) => document.removeEventListener(ev, resetInactivity));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [enabled, securityLevel, logEvent, resetInactivity, requestFullscreen]);

  return { counts: countsRef.current, requestFullscreen };
}
