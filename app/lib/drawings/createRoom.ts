import type { Stroke } from "../../types/drawing";
import { createClient } from "../supabase/client";

export type CreatedRoom = {
  room_id: string;
  room_code: string;
  prompt: string;
  room_status: string;
  expires_at: string;
};

export async function createRoom(
  prompt: string,
  strokes: Stroke[]
): Promise<CreatedRoom> {
  const supabase = createClient();

  const {
    data,
    error,
  } = await supabase.rpc("create_room", {
    room_prompt: prompt,
    initial_strokes: strokes,
  });

  if (error) {
    throw new Error(error.message);
  }

  const room =
    data?.[0] as CreatedRoom | undefined;

  if (!room) {
    throw new Error(
      "생성된 방 정보를 받지 못했습니다."
    );
  }

  return room;
}