import { Text } from "./i18n/I18n";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col items-start gap-4 px-5 py-20">
      <span className="eyebrow"><Text>404 · 길을 잘못 찾았어요</Text></span>
      <h1 className="text-3xl font-bold"><Text>이 페이지는 없어요.</Text></h1>
      <p className="text-sm leading-6 text-slate-600"><Text>초대받았다면 참여 코드를 입력해주세요. 그리던 그림은 같은 브라우저에서 다시 열 수 있어요.</Text></p>
      <div className="flex flex-wrap gap-3">
        <Link href="/join" className="button-primary"><Text>참여 코드 입력</Text></Link>
        <Link href="/" className="button-secondary"><Text>홈으로</Text></Link>
      </div>
    </main>
  );
}
