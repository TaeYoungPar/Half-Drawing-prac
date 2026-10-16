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
  const text = "내가 그린 반쪽, 뭘 그렸을 것 같아? 🎨\n힌트만 보고 나머지를 그려줘! 완성되면 같이 열어보자.";
  // Keep the URL inline: browsers may append a separate `url` on a new line,
  // which remains as an empty last line when a messenger turns it into a preview.
  const message = `${text} ${url}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: "반쪽만 보고, 이어 그릴 수 있어? 🎨", text: message });
      return "초대 링크를 공유했습니다.";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return null;
      // A rejected share can still fall back to copying the invitation.
    }
  }
  if (!navigator.clipboard?.writeText) throw new Error("공유를 사용할 수 없습니다. 사이트 주소와 참여 코드를 직접 보내주세요.");
  await navigator.clipboard.writeText(message);
  return "초대 문구와 링크를 복사했어요. 친구에게 붙여넣어 보내주세요.";
}
