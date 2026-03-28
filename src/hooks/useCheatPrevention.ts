import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SecurityLevel = "low" | "high";

export type CheatEventType =
  | "tab_switch"
  | "fullscreen_exit"
  | "copy_attempt"
  | "paste_attempt"
  | "devtools_open"
  | "inactivity"
  | "window_resize";

interface UseCheatPreventionOptions {
  sessionId: string;
  securityLevel: SecurityLevel;
  onWarning: (event: CheatEventType, count: number) => void;
  enabled: boolean;
}

const GRACE_PERIOD_MS = 3500;
const INACTIVITY_THRESHOLD = 120_000;
// If fullscreen exits within this many ms after a mouse click, it's browser-caused (not Escape)
const CLICK_FULLSCREEN_WINDOW_MS = 600;

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
    devtools_open: 0,
    inactivity: 0,
    window_resize: 0,
  });

  const readyRef = useRef(false);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Timestamp of last mouse click — used to detect browser-caused fullscreen exits
  const lastClickTimeRef = useRef(0);
  const lastSizeRef = useRef({ w: window.innerWidth, h: window.innerHeight });

  const logEvent = useCallback(
    async (eventType: CheatEventType, detail?: string) => {
      if (!readyRef.current || !sessionId || !enabled) return;
      countsRef.current[eventType] = (countsRef.current[eventType] || 0) + 1;
      onWarning(eventType, countsRef.current[eventType]);
      try {
        await supabase.from("cheat_logs").insert({
          session_id: sessionId,
          event_type: eventType,
          detail: detail ?? null,
        });
      } catch { /* never interrupt exam */ }
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
    if (document.fullscreenElement) return;
    document.documentElement
      .requestFullscreen({ navigationUI: "hide" })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!enabled) return;

    readyRef.current = false;
    const graceTimer = setTimeout(() => {
      lastSizeRef.current = { w: window.innerWidth, h: window.innerHeight };
      readyRef.current = true;
    }, GRACE_PERIOD_MS);

    requestFullscreen();

    // ── Track mouse clicks so we can tell if fullscreen exit was browser-caused ──
    const onMouseDown = () => {
      lastClickTimeRef.current = Date.now();
    };

    // ── Fullscreen change ────────────────────────────────────────────────────
    const onFullscreenChange = () => {
      if (document.fullscreenElement) return; // entered fullscreen — ignore

      const timeSinceClick = Date.now() - lastClickTimeRef.current;
      const browserCaused = timeSinceClick < CLICK_FULLSCREEN_WINDOW_MS;

      if (browserCaused) {
        // Radio button / UI click caused this — silently re-enter, no warning
        setTimeout(requestFullscreen, 200);
      } else {
        // Student pressed Escape or used a shortcut — count as violation
        logEvent("fullscreen_exit", "Deliberate exit (Escape or shortcut)");
        // Re-enter fullscreen after showing warning
        setTimeout(requestFullscreen, 300);
      }
    };

    // ── Block Escape key — can't prevent fullscreen exit but we can log it ───
    // We also block other common exit shortcuts
    const onKeyDown = (e: KeyboardEvent) => {
      // Escape — browser will still exit fullscreen but we log it
      // (browsers don't allow preventDefault on Escape for fullscreen)
      if (e.key === "Escape") {
        // Mark as NOT a click-caused exit so fullscreenchange counts it
        lastClickTimeRef.current = 0;
      }

      // Block F11 (toggle fullscreen)
      if (e.key === "F11") {
        e.preventDefault();
        lastClickTimeRef.current = 0;
      }

      // Block devtools for all levels
      const isDevTools =
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["i", "j"].includes(e.key.toLowerCase())) ||
        (e.ctrlKey && e.key.toLowerCase() === "u");
      if (isDevTools) {
        e.preventDefault();
        logEvent("devtools_open");
        return;
      }

      if (securityLevel !== "high") return;

      const blocked =
        e.key === "PrintScreen" ||
        (e.ctrlKey && ["c", "v", "s", "a", "p"].includes(e.key.toLowerCase())) ||
        (e.altKey && e.key === "Tab") ||
        e.key === "Meta";
      if (blocked) {
        e.preventDefault();
        if (e.key === "PrintScreen") logEvent("copy_attempt", "PrintScreen");
      }
    };

    // ── Tab switch ───────────────────────────────────────────────────────────
    const onVisibilityChange = () => {
      if (document.hidden) logEvent("tab_switch");
    };

    // ── Window resize — split-screen (debounced, ignores fullscreen resize) ──
    const onResize = () => {
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
      resizeTimer.current = setTimeout(() => {
        if (document.fullscreenElement) {
          lastSizeRef.current = { w: window.innerWidth, h: window.innerHeight };
          return;
        }
        const dw = Math.abs(window.innerWidth - lastSizeRef.current.w);
        const dh = Math.abs(window.innerHeight - lastSizeRef.current.h);
        if (dw > 200 || dh > 200) {
          logEvent("window_resize", `${window.innerWidth}x${window.innerHeight}`);
        }
        lastSizeRef.current = { w: window.innerWidth, h: window.innerHeight };
      }, 600);
    };

    // ── Right-click: always blocked, never a violation ───────────────────────
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // ── High security: block copy/paste ──────────────────────────────────────
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

    // ── Inactivity ───────────────────────────────────────────────────────────
    const activityEvents = ["mousemove", "keydown", "click", "touchstart"] as const;
    activityEvents.forEach((ev) => document.addEventListener(ev, resetInactivity));
    resetInactivity();

    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", onResize);
    document.addEventListener("contextmenu", onContextMenu, true);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);

    return () => {
      clearTimeout(graceTimer);
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
      readyRef.current = false;
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("contextmenu", onContextMenu, true);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      activityEvents.forEach((ev) =>
        document.removeEventListener(ev, resetInactivity)
      );
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [enabled, securityLevel, logEvent, resetInactivity, requestFullscreen]);

  return { counts: countsRef.current, requestFullscreen };
}
