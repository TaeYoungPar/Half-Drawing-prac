type IconName = "pen" | "eraser" | "undo" | "redo" | "trash" | "download" | "palette" | "settings";

const paths: Record<IconName, string[]> = {
  settings: ["M4 7h5m4 0h7M4 17h9m4 0h3", "M9 4v6M13 14v6"],
  palette: ["M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 0-4h-1a1.5 1.5 0 0 1 0-3h3a6 6 0 0 0 0-12Z", "M7 9h.01M10 6h.01M15 6h.01M6 13h.01"],
  pen: ["m16 3 5 5-13 13H3v-5L16 3Z", "m13 6 5 5"],
  eraser: ["m15 3 6 6-11 12H6l-5-5L15 3Z", "m8 10 6 6", "M10 21h11"],
  undo: ["M9 4 4 9l5 5", "M4 9h10a6 6 0 0 1 0 12"],
  redo: ["m15 4 5 5-5 5", "M20 9H10a6 6 0 0 0 0 12"],
  trash: ["M3 6h18", "M9 6V3h6v3", "M5 6l1 15h12l1-15", "M10 10v7M14 10v7"],
  download: ["M12 3v12", "m7 10 5 5 5-5", "M4 16v5h16v-5"],
};

export function ToolIcon({ name }: { name: IconName }) {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      {paths[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}
