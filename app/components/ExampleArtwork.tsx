import { useId } from "react";
import type { ExampleKind } from "../lib/public-content";

export type ExampleMode = "left" | "hint" | "full";

export function ExampleArtwork({ kind, mode = "full" }: { kind: ExampleKind; mode?: ExampleMode }) {
  const id = useId().replace(/:/g, "");
  const shape = kind === "cat" ? <path d="M260 290 Q220 245 255 200 L245 100 L325 145 Q400 115 475 145 L555 100 L545 200 Q580 245 540 290 Q520 355 400 360 Q280 355 260 290Z" /> : kind === "robot" ? <><rect x="265" y="110" width="270" height="170" rx="30" /><rect x="290" y="305" width="220" height="115" rx="20" /></> : <><path d="M400 220 C300 80 270 120 295 205 C170 180 200 300 315 280 C260 390 375 400 400 295 C425 400 540 390 485 280 C600 300 630 180 505 205 C530 120 500 80 400 220Z" /><circle cx="400" cy="245" r="60" /></>;
  const detail = kind === "cat" ? <><path d="M300 235 Q320 215 340 235 M460 230 l25 10 -25 10 M382 265 Q400 290 418 265 M400 282 Q370 320 345 295 M400 282 Q430 320 455 295 M260 270 l-50 -10 M265 290 l-50 15 M540 270 l50 -10 M535 290 l50 15" /><circle cx="310" cy="268" r="16" fill="#ed929d" stroke="none" /><circle cx="490" cy="268" r="16" fill="#ed929d" stroke="none" /></> : kind === "robot" ? <><path d="M400 110 V70 l35 -20 M310 280 v25 M490 280 v25 M290 340 h-45 v55 M510 340 h45 v55 M335 420 v40 h-35 M465 420 v40 h35 M340 235 Q400 265 460 235" /><circle cx="335" cy="180" r="14" fill="#493127" /><path d="M450 170 l18 20 -25 10" /><circle cx="350" cy="360" r="12" fill="#ed929d" /><path d="M425 345 h45 v35 h-45Z" /></> : <><path d="M400 310 V450 M400 410 Q310 415 310 355 Q370 350 400 410 M400 430 Q490 435 490 375 Q430 370 400 430" fill="#aacd95" /><circle cx="380" cy="235" r="5" fill="#493127" /><circle cx="420" cy="235" r="5" fill="#493127" /><path d="M380 260 Q400 280 420 260" /></>;
  return <svg viewBox="0 0 800 500" role="img" aria-label={`${kind === "cat" ? "고양이" : kind === "robot" ? "로봇" : "꽃"} 가이드 예시: ${mode === "left" ? "내가 그린 왼쪽 반쪽" : mode === "hint" ? "친구에게 보이는 경계 힌트와 빈 오른쪽" : "서로 다른 색으로 이어진 완성 그림"}`} className="block aspect-[8/5] w-full">
    <defs><clipPath id={`${id}-left`}><rect width="400" height="500" /></clipPath><clipPath id={`${id}-right`}><rect x="400" width="400" height="500" /></clipPath><clipPath id={`${id}-visible`}><rect x={mode === "hint" ? 376 : 0} width={mode === "hint" ? 24 : mode === "left" ? 400 : 800} height="500" /></clipPath></defs>
    <rect width="800" height="500" fill="#fffdf3" />
    {mode === "hint" && <rect width="376" height="500" fill="#e8e1d3" />}
    <g clipPath={`url(#${id}-visible)`} stroke="#493127" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
      <g clipPath={`url(#${id}-left)`} fill={kind === "flower" ? "#f4abb8" : "#ffc798"}>{shape}</g>
      <g clipPath={`url(#${id}-right)`} fill={kind === "flower" ? "#bcaddc" : "#bcdccb"}>{shape}</g>
      <g fill="none">{detail}</g>
    </g>
    <path d="M400 16 V484" stroke="#88775e" strokeWidth="3" strokeDasharray="9 10" />
  </svg>;
}
