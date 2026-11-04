import { createClient } from "../supabase/client";
import { isMissingFunction } from "./rematch";

export async function setRoomHidden(roomId: string, hidden: boolean) {
  const { data, error } = await createClient().rpc("set_room_hidden", { p_room_id: roomId, p_hidden: hidden });
  if (error || data !== hidden) throw new Error(hidden ? "숨기지 못했어요. 잠시 후 다시 시도해주세요." : "복원하지 못했어요. 잠시 후 다시 시도해주세요.");
}
export async function markCommentRead(roomId: string, updatedAt: string): Promise<boolean> {
  const { data, error } = await createClient().rpc("mark_room_comment_read", { p_room_id: roomId, p_seen_updated_at: updatedAt });
  if (isMissingFunction(error)) return false;
  if (error || typeof data !== "boolean") throw new Error("읽음 상태를 저장하지 못했어요.");
  return true;
}
