const SIDEBAR_KEY = "coachmap-sidebar-collapsed";
const PRESENTATION_KEY = "coachmap-presentation-mode";

export function loadSidebarCollapsed(): boolean {
  return localStorage.getItem(SIDEBAR_KEY) === "1";
}

export function saveSidebarCollapsed(v: boolean): void {
  localStorage.setItem(SIDEBAR_KEY, v ? "1" : "0");
}

export function loadPresentationMode(): boolean {
  return localStorage.getItem(PRESENTATION_KEY) === "1";
}

export function savePresentationMode(v: boolean): void {
  localStorage.setItem(PRESENTATION_KEY, v ? "1" : "0");
}
