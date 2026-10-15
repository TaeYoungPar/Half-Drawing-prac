import Image from "next/image";
import Link from "next/link";
import { ToolIcon } from "./components/ToolIcon";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const variant = (await searchParams).variant === "b" ? "b" : "a";
  return (
    <main id="main-content" className="mx-auto w-full max-w-5xl px-4 pb-14 pt-5 sm:px-8 sm:pb-20 sm:pt-8">
      <section aria-labelledby="home-heading" data-design-variant={variant} className={`home-hero hero-variant-${variant}`}>
        <h1 id="home-heading" className="board-label">{variant === "a" ? "반쪽은 내가, 나머지는 너!" : "둘의 상상이 만나는 그림판"}</h1>
        <div className="board-shell">
          <figure className="home-art board-paper">
            <div className="absolute inset-x-0 top-0 z-10 flex justify-between px-4 py-3 text-xs font-bold text-slate-700 sm:px-6">
              <span>나의 반쪽</span><span>친구의 반쪽</span>
            </div>
            <Image src="/half-notebook-cat.webp" alt="연필을 든 고양이의 왼쪽 살구색 반쪽과 오른쪽 민트색 반쪽이 하나로 이어진 예시 그림"
              width={1536} height={1024} sizes="(min-width: 1024px) 850px, 94vw" preload className="mx-auto h-[190px] w-full object-contain pt-7 sm:h-[320px] sm:pt-5" />
            <figcaption className="sr-only">두 사람이 반쪽씩 그려 함께 완성한 예시 그림</figcaption>
          </figure>
          <div className="home-copy mt-4 text-center">
            <p className="text-sm font-semibold leading-6 text-slate-800 sm:text-base">나는 왼쪽, 친구는 오른쪽.<br className="sm:hidden" /> 작은 힌트로 한 장의 그림을 완성해요.</p>
            <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
              <Link href="/draw" className="button-primary"><ToolIcon name="pen" />그림 시작하기</Link>
              <Link href="/join" className="button-secondary">참여 코드 입력하기 <span aria-hidden="true">↗</span></Link>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-700">회원가입 없이 · 친구 한 명과 · 그림 실력은 상관없어요</p>
          </div>
        </div>
      </section>
      <section aria-labelledby="how-it-works" className="mt-12 sm:mt-16">
        <span className="eyebrow">우리의 작은 그림 시간</span>
        <h2 id="how-it-works" className="section-heading mt-2">세 번이면 완성돼요</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3 sm:gap-5">
          {[
            ["01", "반쪽을 그려요", "왼쪽에 그리고, 그림 주제를 적어요."],
            ["02", "친구를 초대해요", "초대 링크를 보내면 친구가 오른쪽을 그려요."],
            ["03", "함께 열어봐요", "완성된 그림을 확인하고 저장·공유해요."],
          ].map(([number, title, text], index) => (
            <div key={number} className={`panel flex items-start gap-4 p-5 sm:flex-col sm:gap-4 sm:p-6 ${index === 1 ? "bg-[#f9dce0]!" : index === 2 ? "bg-[#dcedd5]!" : "bg-[#fff0bd]!"}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#493127] bg-[#fffdf3] text-sm font-extrabold">{number}</span>
              <div><h3 className="text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-700">{text}</p></div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
