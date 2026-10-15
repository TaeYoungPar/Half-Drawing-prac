import { createClient } from "../supabase/client";
import type { DrawingStatus } from "../../types/drawing";

export const MY_ROOMS_PAGE_SIZE = 6;
export type RoomScope = "all" | "host" | "guest";
export type MyRoom = {
  id: string;
  code: string;
  prompt: string;
  status: DrawingStatus;
  created_at: string;
  expires_at: string;
  host_id: string;
  guest_id: string | null;
  participantRole: "host" | "guest";
};

/** Read metadata only; never download either artist's drawing in the library. */
export async function getMyRooms(page = 0, scope: RoomScope = "all"): Promise<{ rooms: MyRoom[]; total: number }> {
  const supabase = createClient();
  const sessionResult = await supabase.auth.getSession();
  if (sessionResult.error) throw new Error("사용자 연결을 확인하지 못했습니다. 다시 시도해주세요.");
  const userId = sessionResult.data.session?.user.id;
  // A visitor does not need a new anonymous account just to open the library.
  if (!userId) return { rooms: [], total: 0 };
  if (!Number.isInteger(page) || page < 0) throw new Error("목록 페이지가 올바르지 않습니다.");

  if (!["all", "host", "guest"].includes(scope)) throw new Error("목록 종류가 올바르지 않습니다.");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    throw new Error("사용자 연결을 확인하지 못했습니다. 다시 시도해주세요.");
  }
  const start = page * MY_ROOMS_PAGE_SIZE;
  let query = supabase.from("rooms")
    .select("id, code, prompt, status, created_at, expires_at, host_id, guest_id", { count: "exact" });
  query = scope === "all" ? query.or(`host_id.eq.${userId},guest_id.eq.${userId}`)
    : query.eq(scope === "host" ? "host_id" : "guest_id", userId);
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(start, start + MY_ROOMS_PAGE_SIZE - 1);
  // RLS remains the authority. Client filtering is for selecting our own rooms.
  if (error) throw new Error("내 그림 목록을 불러오지 못했어요. 연결을 확인하고 다시 시도해주세요.");
  if (!Array.isArray(data) || typeof count !== "number" || !Number.isInteger(count) || count < 0 || !data.every((room) =>
    room && typeof room.id === "string" && typeof room.code === "string" &&
    typeof room.prompt === "string" && ["waiting", "guest_joined", "completed", "expired"].includes(room.status) &&
    typeof room.created_at === "string" && Number.isFinite(Date.parse(room.created_at)) &&
    typeof room.host_id === "string" && (room.guest_id === null || typeof room.guest_id === "string") &&
    (room.host_id === userId || room.guest_id === userId) &&
    (scope !== "host" || room.host_id === userId) && (scope !== "guest" || room.guest_id === userId) &&
    typeof room.expires_at === "string" && Number.isFinite(Date.parse(room.expires_at)))) {
    throw new Error("내 그림 목록의 데이터 형식을 확인해주세요.");
  }
  const now = Date.now();
  return {
    total: count,
    rooms: data.map((room) => ({ ...room,
      participantRole: room.host_id === userId ? "host" as const : "guest" as const,
      status: room.status !== "completed" && Date.parse(room.expires_at) <= now ? "expired" : room.status,
    })) as MyRoom[],
  };
}
