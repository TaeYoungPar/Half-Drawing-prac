import { createClient } from "../supabase/client";
import type { Stroke } from "../../types/drawing";
import type { CreatedRoom } from "../drawings/createRoom";

export type Rematch = {
  parent_room_id: string; starter_id: string; partner_id: string; prompt: string;
  requested_by: string | null; next_room_id: string | null; next_code: string | null;
  next_status: "waiting" | "guest_joined" | "completed" | "expired" | null;
};
export function isMissingFunction(error: { code?: string } | null) { return error?.code === "PGRST202" || error?.code === "42883"; }
function parseRematch(data: unknown, parent: string): Rematch {
  const row = data as Rematch;
  if (!row || row.parent_room_id !== parent || typeof row.starter_id !== "string" || typeof row.partner_id !== "string" || row.starter_id === row.partner_id || typeof row.prompt !== "string" ||
    !(row.requested_by === null || row.requested_by === row.starter_id || row.requested_by === row.partner_id) ||
    !(row.next_room_id === null || typeof row.next_room_id === "string") ||
    !(row.next_code === null || /^[A-Z0-9]{10}$/.test(row.next_code)) ||
    ![null,"waiting","guest_joined","completed","expired"].includes(row.next_status) ||
    (row.next_room_id === null) !== (row.next_code === null) || (row.next_room_id === null) !== (row.next_status === null)) {
    throw new Error("다음 판 정보를 확인하지 못했어요. 다시 시도해주세요.");
  }
  return row;
}
export async function getRematch(parent: string, signal?: AbortSignal): Promise<Rematch | null> {
  let query = createClient().rpc("get_room_rematch", { p_parent_room_id: parent });
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (isMissingFunction(error)) return null;
  if (error) throw new Error("다음 판을 확인하지 못했어요. 다시 시도해주세요.");
  return parseRematch(data, parent);
}
export async function requestRematch(parent: string): Promise<Rematch> {
  const { data, error } = await createClient().rpc("request_room_rematch", { p_parent_room_id: parent });
  if (error) throw new Error("한 판 더 신청하지 못했어요. 다시 시도해주세요.");
  return parseRematch(data, parent);
}
export async function createRematch(parent: string, prompt: string, strokes: Stroke[]): Promise<CreatedRoom> {
  const { data, error } = await createClient().rpc("create_rematch_room", { p_parent_room_id: parent, p_prompt: prompt, p_strokes: strokes });
  const row = data as CreatedRoom;
  if (error) throw new Error("다음 그림을 등록하지 못했어요. 그림은 그대로 있으니 다시 시도해주세요.");
  if (!row || typeof row.room_id !== "string" || !/^[A-Z0-9]{10}$/.test(row.room_code) || typeof row.prompt !== "string" || !["waiting","guest_joined","completed"].includes(row.room_status) || !Number.isFinite(Date.parse(row.expires_at))) {
    throw new Error("다음 그림의 저장 결과를 확인하지 못했어요. 다시 시도해주세요.");
  }
  return row;
}
