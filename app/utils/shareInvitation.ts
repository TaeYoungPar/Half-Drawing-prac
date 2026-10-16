export function invitationUrl(origin: string, code: string): string {
  const url = new URL("/join", origin);
  url.searchParams.set("code", code);
  return url.toString();
}

export function normalizeRoomCode(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10);
}

export async function shareInvitation(code: string): Promise<string | null> {
  const url = invitationUrl(window.location.origin, code);
  if (navigator.share) {
    try {
      await navigator.share({ url });
      return "초대 링크를 공유했습니다.";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return null;
      // A rejected share can still fall back to copying the invitation.
    }
  }
  if (!navigator.clipboard?.writeText) throw new Error("공유를 사용할 수 없습니다. 사이트 주소와 참여 코드를 직접 보내주세요.");
  await navigator.clipboard.writeText(url);
  return "초대 링크를 복사했어요. 친구에게 붙여넣어 보내주세요.";
}
