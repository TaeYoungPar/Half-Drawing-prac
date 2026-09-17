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
    throw new Error(error.message);
  }

  const room =
    data?.[0] as JoinedRoom | undefined;

  if (!room) {
    throw new Error(
      "참여할 방 정보를 받지 못했습니다."
    );
  }

  return room;
}