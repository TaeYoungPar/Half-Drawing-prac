import type { Stroke } from "../../types/drawing";
import { createClient } from "../supabase/client";
import { isStrokeArray } from "../../utils/validateStroke";

/** Only a narrow strip near the seam is returned to the second artist. */
export async function getLeftPreview(roomId: string): Promise<Stroke[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_left_preview", {
    requested_room_id: roomId,
  });

  if (error || !isStrokeArray(data) || !data.every((stroke) =>
    stroke.points.every((point) => point.x >= 376 && point.x <= 400))) {
    throw new Error("경계 그림을 불러오지 못했습니다.");
  }

  return data as Stroke[];
}
