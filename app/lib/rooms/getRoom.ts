import type {
  DrawingSide,
  DrawingStatus,
  Stroke,
} from "../../types/drawing";

import { createClient } from "../supabase/client";

export type RoomDrawing = {
  role: DrawingSide;
  strokes: Stroke[];
  completed: boolean;
};

export type RoomDetail = {
  id: string;
  prompt: string;
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
      prompt,
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

  return data as RoomDetail;
}