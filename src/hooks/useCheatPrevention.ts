import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SecurityLevel = "low" | "high";

export type CheatEventType =
  | "tab_switch"
  | "copy_attempt"
  | "paste_attempt"
  | "right_click"
  | "devtools_open"
  | "inactivity"
  | "window_resize";

interface UseCheatPreventionOptions {
  sessionId: string;
  securityLevel: SecurityLevel;
  onWarning: (event: CheatEventType, count: number) => void;
  enabled: boolean;
}

// Ignore all events for this long after mount (browser settling)
const GRACE_PERIOD_MS = 3000;
const INACTIVITY_THRESHOLD = 120_000; // 2 minutes

export function useCheatPrevention({
  sessionId,
  securityLevel,
  onWarning,
  enabled,
}: UseCheatPreventionOptions) {
  const countsRef = useRef<Record<CheatEventType, number>>({
    tab_switch: 0,
    copy_attempt: 0,
    paste_attempt: 0,
    right_click: 0,
    devtools_open: 0,
    inactivity: 0,
    window_resize: 0,
  });

  const readyRef = useRef(false);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Debounce resize so rapid resize events only count once
  const resizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Debounce fullscreen re-entry so it doesn't flicker
  const fullscreenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      } catch {
        // never interrupt the exam
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

  // Silently re-enter fullscreen — NO warning, NO count
  const requestFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Grace period — ignore all events while browser is settling
    readyRef.current = false;
    const graceTimer = setTimeout(() => {
      readyRef.current = true;
    }, GRACE_PERIOD_MS);

    // Enter fullscreen silently on mount
    requestFullscreen();

    // ── Fullscreen: silently re-enter, NEVER count as violation ─────────────
    // Clicking radio buttons / interactive elements can briefly exit fullscreen
    // in some browsers. We just silently re-enter with a debounce.
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        if (fullscreenTimer.current) clearTimeout(fullscreenTimer.current);
        fullscreenTimer.current = setTimeout(() => {
          requestFullscreen();
        }, 800);
      }
    };

    // ── Tab switch — only real cheat signal ──────────────────────────────────
    const onVisibilityChange = () => {
      if (document.hidden) {
        logEvent("tab_switch");
      }
    };

    // ── Window resize — split-screen detection (debounced) ───────────────────
    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;
    const onResize = () => {
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
      resizeTimer.current = setTimeout(() => {
        const dw = Math.abs(window.innerWidth - lastWidth);
        const dh = Math.abs(window.innerHeight - lastHeight);
        if (dw > 200 || dh > 200) {
          logEvent("window_resize", `${window.innerWidth}x${window.innerHeight}`);
        }
        lastWidth = window.innerWidth;
        lastHeight = window.innerHeight;
      }, 500);
    };

    // ── Right-click: blocked for ALL security levels ─────────────────────────
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      // Only count as violation in high security
      if (securityLevel === "high") {
        logEvent("right_click");
      }
    };

    // ── High security extras ─────────────────────────────────────────────────
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
        if (
          e.key === "F12" ||
          (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "i")
        ) {
          logEvent("devtools_open");
        }
      }
    };

    // ── Inactivity ───────────────────────────────────────────────────────────
    const activityEvents = ["mousemove", "keydown", "click", "touchstart"] as const;
    activityEvents.forEach((ev) => document.addEventListener(ev, resetInactivity));
    resetInactivity();

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("resize", onResize);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      clearTimeout(graceTimer);
      if (fullscreenTimer.current) clearTimeout(fullscreenTimer.current);
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
      readyRef.current = false;
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("keydown", onKeyDown);
      activityEvents.forEach((ev) =>
        document.removeEventListener(ev, resetInactivity)
      );
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [enabled, securityLevel, logEvent, resetInactivity, requestFullscreen]);

  return { counts: countsRef.current, requestFullscreen };
}
