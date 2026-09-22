import type { Stroke } from "../../types/drawing";
import { createClient } from "../supabase/client";

export async function saveRightDrawing(
  roomId: string,
  strokes: Stroke[]
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("drawings")
    .insert({
      room_id: roomId,
      role: "right",
      strokes,
      completed: true,
    });

  if (error) {
    throw new Error(
      "이어 그린 그림을 저장하지 못했습니다."
    );
  }
}