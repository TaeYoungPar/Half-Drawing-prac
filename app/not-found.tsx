import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col items-start gap-4 px-5 py-20">
      <span className="eyebrow">404 · 길을 잘못 찾았어요</span>
      <h1 className="text-3xl font-bold">이 페이지는 없어요.</h1>
      <p className="text-sm leading-6 text-slate-600">초대받았다면 참여 코드를 입력해주세요. 그리던 그림은 같은 브라우저에서 다시 열 수 있어요.</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/join" className="button-primary">참여 코드 입력</Link>
        <Link href="/" className="button-secondary">홈으로</Link>
      </div>
    </main>
  );
}
