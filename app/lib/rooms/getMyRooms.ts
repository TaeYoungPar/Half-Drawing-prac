import { createClient } from "../supabase/client";
import type { DrawingStatus } from "../../types/drawing";

export const MY_ROOMS_PAGE_SIZE = 6;
export type MyRoom = {
  id: string;
  code: string;
  prompt: string;
  status: DrawingStatus;
  created_at: string;
  expires_at: string;
};

/** Read metadata only; never download either artist's drawing on the home page. */
export async function getMyRooms(page = 0): Promise<{ rooms: MyRoom[]; total: number }> {
  const supabase = createClient();
  const sessionResult = await supabase.auth.getSession();
  if (sessionResult.error) throw new Error("사용자 연결을 확인하지 못했습니다. 다시 시도해주세요.");
  const userId = sessionResult.data.session?.user.id;
  // A visitor does not need a new anonymous account just to see the home page.
  if (!userId) return { rooms: [], total: 0 };
  if (!Number.isInteger(page) || page < 0) throw new Error("목록 페이지가 올바르지 않습니다.");

  const start = page * MY_ROOMS_PAGE_SIZE;
  const { data, error, count } = await supabase.from("rooms")
    .select("id, code, prompt, status, created_at, expires_at", { count: "exact" })
    .eq("host_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(start, start + MY_ROOMS_PAGE_SIZE - 1);
  // RLS remains the authority. Client filtering is for selecting our own rooms.
  if (error) throw new Error("내 그림 목록을 불러오지 못했어요. 연결을 확인하고 다시 시도해주세요.");
  if (!Array.isArray(data) || typeof count !== "number" || !Number.isInteger(count) || count < 0 || !data.every((room) =>
    room && typeof room.id === "string" && typeof room.code === "string" &&
    typeof room.prompt === "string" && ["waiting", "guest_joined", "completed", "expired"].includes(room.status) &&
    typeof room.created_at === "string" && Number.isFinite(Date.parse(room.created_at)) &&
    typeof room.expires_at === "string" && Number.isFinite(Date.parse(room.expires_at)))) {
    throw new Error("내 그림 목록의 데이터 형식을 확인해주세요.");
  }
  const now = Date.now();
  return {
    total: count,
    rooms: data.map((room) => ({ ...room,
      status: room.status !== "completed" && Date.parse(room.expires_at) <= now ? "expired" : room.status,
    })) as MyRoom[],
  };
}
