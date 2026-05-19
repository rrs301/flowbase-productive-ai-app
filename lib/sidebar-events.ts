export const sidebarAppsRefreshEvent = "flowbase:sidebar-apps-refresh";

export function refreshSidebarApps() {
  window.dispatchEvent(new Event(sidebarAppsRefreshEvent));
}
