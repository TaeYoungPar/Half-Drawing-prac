import { createClient } from "../supabase/client";
import { isStrokeArray } from "../../utils/validateStroke";
import { drawHalfStrokes } from "../../utils/drawHalfStrokes";

/** Only completed rooms are eligible. The existing authenticated RLS still applies. */
export async function getCompletedThumbnail(roomId: string): Promise<string> {
  const { data, error } = await createClient().from("rooms")
    .select("id, status, drawings(role, strokes, completed)")
    .eq("id", roomId).eq("status", "completed").single();
  if (error || !data || data.id !== roomId || data.status !== "completed" ||
      !Array.isArray(data.drawings) || data.drawings.length !== 2) {
    throw new Error("완성 그림을 불러오지 못했어요.");
  }
  const source = document.createElement("canvas");
  source.width = 800;
  source.height = 500;
  const context = source.getContext("2d");
  if (!context) throw new Error("미리보기를 만들지 못했어요.");
  for (const side of ["left", "right"] as const) {
    const drawing = data.drawings.find((item) => item.role === side);
    if (!drawing || drawing.completed !== true || !isStrokeArray(drawing.strokes)) {
      throw new Error("완성 그림의 형식을 확인해주세요.");
    }
    drawHalfStrokes(context, drawing.strokes, side);
  }
  const thumbnail = document.createElement("canvas");
  thumbnail.width = 320;
  thumbnail.height = 200;
  const preview = thumbnail.getContext("2d");
  if (!preview) throw new Error("미리보기를 만들지 못했어요.");
  preview.fillStyle = "#ffffff";
  preview.fillRect(0, 0, 320, 200);
  preview.drawImage(source, 0, 0, 320, 200);
  // Keep just the small image in this library visit's memory, never in public storage.
  return thumbnail.toDataURL("image/webp", 0.8);
}
