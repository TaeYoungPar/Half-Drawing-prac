import { isPublicAdPage } from "../utils/publicAdPages";

let installed = false;

/** The third-party script survives SPA navigation, so leave its document on exit. */
export function isolatePublicAdNavigation() {
  if (installed) return;
  installed = true;
  // Intentionally live for this document's lifetime, just like the Google script.
  document.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
    const target = new URL(anchor.href);
    if (target.origin !== location.origin || isPublicAdPage(target.pathname)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.assign(target.href);
  }, true);
  window.addEventListener("popstate", event => {
    if (isPublicAdPage(location.pathname)) return;
    event.stopImmediatePropagation();
    location.reload();
  }, true);
}
