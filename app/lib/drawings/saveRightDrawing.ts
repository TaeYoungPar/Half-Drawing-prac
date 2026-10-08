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
    // If the first response was lost, a retry must not insert or overwrite
    // a second drawing. RLS still restricts this read to its participant.
    if (error.code === "23505") {
      const existing = await supabase.from("drawings").select("completed")
        .eq("room_id", roomId).eq("role", "right").single();
      if (!existing.error && existing.data?.completed) return;
    }
    throw new Error(
      "이어 그린 그림을 저장하지 못했어요. 연결을 확인하고 다시 시도해주세요."
    );
  }
}
