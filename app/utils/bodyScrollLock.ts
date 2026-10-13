let locks = 0;
let previousOverflow = "";

/** Nested drawing/tool/preview overlays share one scroll lock. */
export function lockBodyScroll(): () => void {
  if (locks++ === 0) previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return () => {
    if (--locks === 0) document.body.style.overflow = previousOverflow;
  };
}
