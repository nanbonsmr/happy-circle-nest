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

const GRACE_PERIOD_MS = 1500;
const INACTIVITY_THRESHOLD = 120_000;

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
  const lastSizeRef = useRef({ w: window.innerWidth, h: window.innerHeight });
  // Tracks recent mousedown inside the exam — used to ignore browser-caused fullscreen exits
  const recentClickRef = useRef(false);

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

  // No-op — we use CSS overlay, not browser fullscreen API during exam
  const requestFullscreen = useCallback(() => {}, []);

  useEffect(() => {
    if (!enabled) return;

    // Grace period before counting violations
    readyRef.current = false;
    const graceTimer = setTimeout(() => {
      lastSizeRef.current = { w: window.innerWidth, h: window.innerHeight };
      readyRef.current = true;
    }, GRACE_PERIOD_MS);

    // ── Tab switch ───────────────────────────────────────────────────────────
    const onVisibilityChange = () => {
      if (document.hidden) logEvent("tab_switch");
    };

    // ── Track mouse clicks to distinguish browser-caused vs deliberate exits ──
    const onMouseDown = () => {
      recentClickRef.current = true;
      setTimeout(() => { recentClickRef.current = false; }, 800);
    };

    // ── Keys: Escape & F11 count as fullscreen_exit violation ────────────────
    // Also listen to fullscreenchange to re-enter if student exits
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        if (recentClickRef.current) {
          // Browser exited fullscreen due to a click (focus change) — re-enter silently
          setTimeout(() => {
            document.documentElement
              .requestFullscreen({ navigationUI: "hide" })
              .catch(() => {});
          }, 100);
        } else {
          // Deliberate exit (Escape / F11 / other) — log as violation then re-enter
          logEvent("fullscreen_exit", "Exited fullscreen");
          setTimeout(() => {
            document.documentElement
              .requestFullscreen({ navigationUI: "hide" })
              .catch(() => {});
          }, 300);
        }
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F11") {
        e.preventDefault();
        return;
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

    // ── Window resize — split-screen detection (debounced) ───────────────────
    const onResize = () => {
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
      resizeTimer.current = setTimeout(() => {
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

    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", onResize);
    document.addEventListener("contextmenu", onContextMenu, true);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);

    return () => {
      clearTimeout(graceTimer);
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
      readyRef.current = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("contextmenu", onContextMenu, true);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      activityEvents.forEach((ev) =>
        document.removeEventListener(ev, resetInactivity)
      );
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      // Exit real fullscreen if somehow still active
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [enabled, securityLevel, logEvent, resetInactivity, requestFullscreen]);

  return { counts: countsRef.current, requestFullscreen };
}
