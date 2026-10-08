import { createClient } from "../supabase/client";

export type JoinedRoom = {
  room_id: string;
  prompt: string;
  room_status: string;
  expires_at: string;
};

export async function joinRoom(
  roomCode: string
): Promise<JoinedRoom> {
  const supabase = createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "join_room",
    {
      room_code: roomCode,
    }
  );

 if (error) {
  if (
    error.message.includes(
      "ROOM_NOT_AVAILABLE"
    )
  ) {
    throw new Error(
      "코드를 확인해주세요. 만료·이미 참여 중인 방이거나, 내가 만든 방에는 참여할 수 없어요."
    );
  }

  if (
    error.message.includes(
      "LOGIN_REQUIRED"
    )
  ) {
    throw new Error(
      "로그인이 필요합니다."
    );
  }

  throw new Error(
    "방 참여 중 오류가 발생했습니다."
  );
}

  const room =
    data?.[0] as JoinedRoom | undefined;

  if (!room || typeof room.room_id !== "string" || !room.room_id ||
      typeof room.prompt !== "string" ||
      !["guest_joined", "completed"].includes(room.room_status) ||
      typeof room.expires_at !== "string" || !Number.isFinite(Date.parse(room.expires_at))) {
    throw new Error(
      "참여할 방 정보를 받지 못했습니다."
    );
  }

  return room;
}
