import Image from "next/image";
import Link from "next/link";
import { MyDrawings } from "./components/MyDrawings";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const variant = (await searchParams).variant === "b" ? "b" : "a";
  return (
    <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <section aria-labelledby="home-heading" data-design-variant={variant}
        className={`home-hero hero-variant-${variant} grid items-center gap-6 rounded-3xl border border-amber-100 bg-[#fffaf2] p-5 sm:gap-10 sm:p-10 lg:grid-cols-2`}>
        <div className="home-copy">
          <span className="inline-flex rounded-full bg-white px-3 py-2 text-xs font-bold text-indigo-700">둘이 그려서, 하나의 작품</span>
          <h1 id="home-heading" className="mt-4 text-[clamp(1.875rem,9vw,2.25rem)] font-extrabold leading-[1.2] tracking-tight sm:text-5xl lg:text-6xl">
            {variant === "a" ? <>내 반쪽에<br />너의 상상을 더해.</> : <>둘의 상상이<br />한 장의 그림으로.</>}
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-slate-600">
            나는 왼쪽, 친구는 오른쪽.<br />작은 경계 힌트로 이어 그린 뒤, 완성된 그림을 함께 열어봐요.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/draw" className="button-primary">새 그림 시작하기 <span aria-hidden="true" className="ml-2">↗</span></Link>
            <Link href="/join" className="button-secondary">참여 코드 입력하기</Link>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-600">회원가입 없이 · 친구 한 명과 · 그림 실력은 상관없어요</p>
        </div>
        <figure className="home-art overflow-hidden rounded-2xl border border-amber-100 bg-[#fffdf7]">
          <div className="flex items-center justify-between gap-2 px-4 pt-4 text-xs font-semibold">
            <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-indigo-700">나의 반쪽</span>
            <span className="text-slate-500">+</span>
            <span className="rounded-full bg-orange-50 px-3 py-1.5 text-orange-800">친구의 반쪽</span>
          </div>
          <Image src="/half-cat-rocket.webp" alt="왼쪽의 보라색 고양이와 오른쪽의 주황색 우주선이 한 그림으로 이어진 예시"
            width={960} height={640} sizes="(min-width: 1024px) 480px, (min-width: 640px) 650px, 90vw" preload className="h-auto w-full" />
          <figcaption className="px-4 pb-4 text-center text-sm leading-6 text-slate-600">고양이를 그렸는데… 우주선이 됐네?<span className="ml-2 text-xs text-slate-500">예시 그림</span></figcaption>
        </figure>
      </section>
      <MyDrawings />
      <section aria-labelledby="how-it-works" className="mt-10 sm:mt-14">
        <h2 id="how-it-works" className="text-xl font-bold sm:text-2xl">세 번이면 완성돼요</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ["01", "반쪽을 그려요", "왼쪽에 그리고, 그림 주제를 적어요."],
            ["02", "친구를 초대해요", "초대 링크를 보내면 친구가 오른쪽을 그려요."],
            ["03", "함께 열어봐요", "완성된 그림을 확인하고 저장·공유해요."],
          ].map(([number, title, text]) => (
            <div key={number} className="panel flex items-start gap-3 p-4 sm:flex-col sm:p-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-bold text-indigo-700">{number}</span>
              <div><h3 className="text-base font-bold">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{text}</p></div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
