import Image from "next/image";
import Link from "next/link";
import { HomeDashboard } from "./components/HomeDashboard";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const variant = (await searchParams).variant === "b" ? "b" : "a";
  return (
    <main id="main-content" className="mx-auto w-full max-w-6xl px-5 pb-16 pt-8 sm:px-8 sm:pb-24 sm:pt-16">
      <HomeDashboard introduction={<section aria-labelledby="home-heading" data-design-variant={variant}
        className={`home-hero hero-variant-${variant} grid items-center gap-10 sm:gap-14 lg:grid-cols-2 lg:gap-16 lg:py-8`}>
        <div className="home-copy">
          <span className="inline-flex items-center gap-2 text-xs font-bold tracking-wide text-slate-600"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-indigo-600" />둘이 그려서, 하나의 작품</span>
          <h1 id="home-heading" className="mt-5 text-[clamp(2.25rem,10vw,3.25rem)] font-extrabold leading-[1.15] tracking-tight sm:text-6xl lg:text-7xl">
            {variant === "a" ? <>내 반쪽에<br />너의 상상을 더해.</> : <>둘의 상상이<br />한 장의 그림으로.</>}
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            나는 왼쪽, 친구는 오른쪽.<br />작은 경계 힌트로 이어 그린 뒤, 완성된 그림을 함께 열어봐요.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row">
            <Link href="/draw" className="button-primary">새 그림 시작하기 <span aria-hidden="true" className="ml-2">↗</span></Link>
            <Link href="/join" className="button-secondary">참여 코드 입력하기</Link>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">회원가입 없이 · 친구 한 명과 · 그림 실력은 상관없어요</p>
        </div>
        <figure className="home-art overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-lg shadow-slate-100">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-4 text-xs font-semibold">
            <span className="flex items-center gap-2 text-slate-700"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-indigo-500" />나의 반쪽</span>
            <span className="text-slate-500">+</span>
            <span className="flex items-center gap-2 text-slate-700"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-orange-400" />친구의 반쪽</span>
          </div>
          <Image src="/half-cat-rocket.webp" alt="왼쪽의 보라색 고양이와 오른쪽의 주황색 우주선이 한 그림으로 이어진 예시"
            width={960} height={640} sizes="(min-width: 1024px) 480px, (min-width: 640px) 650px, 90vw" preload className="h-auto w-full" />
          <figcaption className="border-t border-slate-100 px-5 py-4 text-sm leading-6 text-slate-600">고양이를 그렸는데… 우주선이 됐네?<span className="ml-2 text-xs text-slate-500">예시 그림</span></figcaption>
        </figure>
      </section>} />
      <section aria-labelledby="how-it-works" className="mt-16 border-t border-slate-200 pt-10 sm:mt-24 sm:pt-16">
        <span className="eyebrow">HOW IT WORKS</span>
        <h2 id="how-it-works" className="section-heading mt-3">세 번이면 완성돼요</h2>
        <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-3 sm:gap-6">
          {[
            ["01", "반쪽을 그려요", "왼쪽에 그리고, 그림 주제를 적어요."],
            ["02", "친구를 초대해요", "초대 링크를 보내면 친구가 오른쪽을 그려요."],
            ["03", "함께 열어봐요", "완성된 그림을 확인하고 저장·공유해요."],
          ].map(([number, title, text]) => (
            <div key={number} className="panel flex items-start gap-4 p-6 sm:flex-col sm:gap-6 sm:p-7">
              <span className="shrink-0 whitespace-nowrap text-2xl font-extrabold tracking-tight text-indigo-700">{number}</span>
              <div><h3 className="text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
