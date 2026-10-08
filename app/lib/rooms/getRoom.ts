import type {
  DrawingSide,
  DrawingStatus,
  Stroke,
} from "../../types/drawing";

import { createClient } from "../supabase/client";
import { isStrokeArray } from "../../utils/validateStroke";

export type RoomDrawing = {
  role: DrawingSide;
  strokes: Stroke[];
  completed: boolean;
};

export type RoomDetail = {
  id: string;
  code: string;
  prompt: string;
  host_id: string;
  guest_id: string | null;
  status: DrawingStatus;
  expires_at: string;
  drawings: RoomDrawing[];
};

export async function getRoom(
  roomId: string
): Promise<RoomDetail> {
  const supabase = createClient();

  const {
    data,
    error,
  } = await supabase
    .from("rooms")
    .select(`
      id,
      code,
      prompt,
      host_id,
      guest_id,
      status,
      expires_at,
      drawings (
        role,
        strokes,
        completed
      )
    `)
    .eq("id", roomId)
    .single();

  if (error) {
    throw new Error(
      "방 정보를 불러오지 못했습니다."
    );
  }

  const room = data as RoomDetail;
  if (!room || typeof room.id !== "string" || typeof room.code !== "string" ||
      typeof room.prompt !== "string" || typeof room.host_id !== "string" ||
      !(room.guest_id === null || typeof room.guest_id === "string") ||
      !["waiting", "guest_joined", "completed", "expired"].includes(room.status) ||
      typeof room.expires_at !== "string" || !Number.isFinite(Date.parse(room.expires_at)) ||
      !Array.isArray(room.drawings) || !room.drawings.every((drawing) => drawing &&
        (drawing.role === "left" || drawing.role === "right") &&
        typeof drawing.completed === "boolean" && isStrokeArray(drawing.strokes))) {
    throw new Error("방 데이터 형식이 올바르지 않습니다. 방 설정을 확인해주세요.");
  }
  // UI guard only. Database must separately enforce expiry on writes.
  if (room.status !== "completed" && Date.parse(room.expires_at) <= Date.now()) {
    return { ...room, status: "expired" };
  }
  return room;
}
