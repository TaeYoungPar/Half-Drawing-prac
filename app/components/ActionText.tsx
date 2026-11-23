type Direction = "↗" | "→" | "←" | "⤢";
const paths: Record<Direction, string> = {
  "↗": "M7 17 17 7M7 7h10v10",
  "→": "M5 12h14m-6-6 6 6-6 6",
  "←": "M19 12H5m6-6-6 6 6 6",
  "⤢": "M9 3H3v6m0-6 7 7m5 11h6v-6m0 6-7-7",
};

/** One label and icon row, independent of the active language's font metrics. */
export function ActionText({ message, hideArrow = false }: { message: string; hideArrow?: boolean }) {
  return <span className="action-text">
    {message.split(/([↗→←⤢])/).filter(part => part.trim()).map((part, index) => part in paths ?
      <span key={index} className="action-arrow" aria-hidden={hideArrow || undefined}>
        <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d={paths[part as Direction]} />
        </svg>
        {!hideArrow && <span className="sr-only">{part}</span>}
      </span> : <span key={index} className="action-text-label">{part}</span>)}
  </span>;
}
