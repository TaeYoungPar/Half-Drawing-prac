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
    throw new Error("그림을 등록하지 못했어요. 연결을 확인하고 다시 시도해주세요.");
  }

  const room =
    data?.[0] as CreatedRoom | undefined;

  if (!room || typeof room.room_id !== "string" || !room.room_id ||
      typeof room.room_code !== "string" || !/^[A-Z0-9]{10}$/.test(room.room_code) ||
      typeof room.prompt !== "string" || room.room_status !== "waiting" ||
      typeof room.expires_at !== "string" || !Number.isFinite(Date.parse(room.expires_at))) {
    throw new Error(
      "생성된 방 정보를 받지 못했습니다."
    );
  }

  return room;
}
