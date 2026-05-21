// Cheat prevention disabled.
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

export function useCheatPrevention(_options: UseCheatPreventionOptions) {
  return { counts: {} as Record<CheatEventType, number>, requestFullscreen: () => {} };
}
