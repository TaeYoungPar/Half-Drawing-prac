/** Clipboard writes need a secure browser context (HTTPS or localhost). */
export async function copyRoomCode(code: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error("이 브라우저에서는 코드 복사를 사용할 수 없습니다. 코드를 직접 선택해 복사해주세요.");
  }

  try {
    await navigator.clipboard.writeText(code);
  } catch {
    throw new Error("코드를 복사하지 못했습니다. 코드를 직접 선택해 복사해주세요.");
  }
}
