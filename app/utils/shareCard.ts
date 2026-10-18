export const SHARE_CARD_SIZE = 1200;
export const SHARE_CARD_FILENAME = "half-drawing-card.png";
const DEFAULT_SITE = "https://half-drawing-prac.vercel.app";

export function shareSiteLabel(value = DEFAULT_SITE): string {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.host : new URL(DEFAULT_SITE).host;
  } catch {
    return new URL(DEFAULT_SITE).host;
  }
}

export function wrapCardText(context: Pick<CanvasRenderingContext2D, "measureText">, text: string, maxWidth: number, maxLines = 3): string[] {
  const characters = Array.from(text.replace(/\s+/g, " ").trim());
  const lines: string[] = [];
  let line = "";
  for (const character of characters) {
    if (line && context.measureText(line + character).width > maxWidth) {
      lines.push(line);
      line = "";
    }
    if (lines.length === maxLines) {
      let last = lines[maxLines - 1];
      while (last && context.measureText(last + "…").width > maxWidth) last = Array.from(last).slice(0, -1).join("");
      lines[maxLines - 1] = last + "…";
      return lines;
    }
    line += character;
  }
  if (line) lines.push(line);
  return lines;
}

/** Render locally: the actual completed drawing never goes to an image service. */
export function drawShareCard(target: HTMLCanvasElement, drawing: HTMLCanvasElement, prompt: string, siteUrl?: string) {
  target.width = SHARE_CARD_SIZE;
  target.height = SHARE_CARD_SIZE;
  const context = target.getContext("2d");
  if (!context) throw new Error("공유 카드를 만들지 못했습니다.");
  const ink = "#493127";
  const font = 'system-ui, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  context.fillStyle = "#fffbed";
  context.fillRect(0, 0, 1200, 1200);
  context.strokeStyle = "#a4beb54a";
  context.lineWidth = 1;
  context.beginPath();
  for (let position = 0; position <= 1200; position += 32) {
    context.moveTo(position, 0); context.lineTo(position, 1200);
    context.moveTo(0, position); context.lineTo(1200, position);
  }
  context.stroke();
  function rounded(x: number, y: number, width: number, height: number, radius: number, fill: string, border = true) {
    context!.beginPath(); context!.roundRect(x, y, width, height, radius);
    context!.fillStyle = fill; context!.fill();
    if (border) { context!.strokeStyle = ink; context!.lineWidth = 4; context!.stroke(); }
  }
  rounded(60, 96, 1104, 1040, 32, "#90b3bd", false);
  rounded(48, 84, 1104, 1040, 32, "#c5e0e8");
  rounded(452, 54, 308, 72, 18, "#bc9f71", false);
  rounded(446, 48, 308, 72, 18, "#ffe3a0");
  context.fillStyle = ink;
  context.textAlign = "center";
  context.font = `900 36px ${font}`;
  context.fillText("반쪽그림", 600, 96);
  context.textAlign = "left";
  context.font = `800 48px ${font}`;
  context.fillText("반쪽씩 그렸더니,", 96, 176);
  context.font = `900 56px ${font}`;
  context.fillText("이런 그림이 됐어!", 96, 238);

  // Preserve the full 8:5 artwork and its white background, including erased areas.
  rounded(96, 270, 1008, 630, 20, "#ffffff");
  context.save();
  context.beginPath(); context.roundRect(96, 270, 1008, 630, 20); context.clip();
  context.drawImage(drawing, 96, 270, 1008, 630);
  context.restore();

  context.fillStyle = ink;
  context.font = `700 24px ${font}`;
  context.fillText("우리의 그림 주제", 100, 946);
  context.font = `700 36px ${font}`;
  const lines = wrapCardText(context, prompt.slice(0, 80), 992);
  lines.forEach((line, index) => context.fillText(line, 100, 992 + index * 40));
  context.font = `800 32px ${font}`;
  context.fillText("반쪽그림", 64, 1170);
  context.textAlign = "right";
  context.font = `600 32px ${font}`;
  context.fillText(shareSiteLabel(siteUrl), 1136, 1170, 850);
  context.textAlign = "left";
}
