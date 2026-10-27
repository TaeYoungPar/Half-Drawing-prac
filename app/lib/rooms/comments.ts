import { createClient } from "../supabase/client";

export const COMMENT_LIMIT = 80;
export const commentLength = (body: string) => Array.from(body).length;
export const commentDraft = (body: string) => Array.from(body.replace(/[\u0000-\u001f\u007f]/g, " ")).slice(0, COMMENT_LIMIT).join("");

export type RoomComment = { room_id: string; author_id: string; body: string; created_at: string; updated_at: string };
const columns = "room_id,author_id,body,created_at,updated_at";

function isComment(value: unknown, roomId: string): value is RoomComment {
  if (!value || typeof value !== "object") return false;
  const row = value as RoomComment;
  return row.room_id === roomId && typeof row.author_id === "string" &&
    typeof row.body === "string" && row.body === row.body.trim() &&
    commentLength(row.body) >= 1 && commentLength(row.body) <= COMMENT_LIMIT &&
    !/[\u0000-\u001f\u007f]/.test(row.body) &&
    typeof row.created_at === "string" && Number.isFinite(Date.parse(row.created_at)) &&
    typeof row.updated_at === "string" && Number.isFinite(Date.parse(row.updated_at));
}

export async function getRoomComments(roomId: string, signal?: AbortSignal): Promise<RoomComment[] | null> {
  let query = createClient().from("room_comments").select(columns).eq("room_id", roomId).order("created_at");
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  // Roll out safely before the one-time database migration is installed.
  if (error?.code === "42P01" || error?.code === "PGRST205") return null;
  if (error) throw new Error("한마디를 불러오지 못했어요. 잠시 후 다시 확인해주세요.");
  if (!Array.isArray(data) || data.length > 2 || !data.every(row => isComment(row, roomId)) ||
      new Set(data.map(row => row.author_id)).size !== data.length) {
    throw new Error("한마디를 불러오지 못했어요. 다시 확인해주세요.");
  }
  return data;
}

export async function saveRoomComment(roomId: string, authorId: string, body: string): Promise<RoomComment> {
  const text = body.trim();
  if (!text || commentLength(text) > COMMENT_LIMIT || /[\u0000-\u001f\u007f]/.test(text)) {
    throw new Error("줄바꿈 없이 1~80자로 적어주세요.");
  }
  const { data, error } = await createClient().from("room_comments")
    .upsert({ room_id: roomId, author_id: authorId, body: text }, { onConflict: "room_id,author_id" })
    .select(columns).single();
  if (error) throw new Error("저장하지 못했어요. 적은 내용은 그대로 있으니 다시 시도해주세요.");
  if (!isComment(data, roomId) || data.author_id !== authorId) throw new Error("저장 결과를 확인하지 못했어요. 다시 시도해주세요.");
  return data;
}

export async function deleteRoomComment(roomId: string, authorId: string): Promise<void> {
  const { data, error } = await createClient().from("room_comments").delete()
    .eq("room_id", roomId).eq("author_id", authorId).select("author_id");
  if (error || !Array.isArray(data) || data.length > 1 || data.some(row => row.author_id !== authorId)) {
    throw new Error("삭제하지 못했어요. 잠시 후 다시 시도해주세요.");
  }
}
