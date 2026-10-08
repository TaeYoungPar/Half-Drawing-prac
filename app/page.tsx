import Link from "next/link";
import { MyDrawings } from "./components/MyDrawings";

export default function HomePage() {
  return (
    <main id="main-content" className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-20">
      <section className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <span className="eyebrow">둘이 그려서, 하나의 작품</span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            내 반쪽에<br />너의 상상을 더해.
          </h1>
          <p className="mt-6 max-w-md text-base leading-8 text-slate-600">
            친구의 그림은 살짝만 보여요. 경계의 작은 힌트를 따라
            나머지 반쪽을 채우면, 예상 못 한 그림이 탄생해요.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/draw" className="button-primary">새 그림 시작하기 <span aria-hidden="true">↗</span></Link>
            <Link href="/join" className="button-secondary">참여 코드 입력하기</Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">회원가입 없이 · 친구 한 명과 · 그림 실력은 상관없어요</p>
        </div>
        <div className="relative rounded-[2rem] border border-white bg-white p-5 shadow-xl shadow-indigo-950/5 sm:p-8">
          <div className="mb-5 flex items-center justify-between text-sm font-semibold">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">예를 들면 이런 그림!</span>
            <span className="text-slate-400">나 + 친구</span>
          </div>
          <svg viewBox="0 0 440 320" role="img" aria-label="왼쪽은 고양이, 오른쪽은 우주선으로 이어진 상상 속 그림" className="w-full rounded-2xl bg-amber-50">
            <path d="M220 0V320" stroke="#c7d2fe" strokeDasharray="6 8" strokeWidth="2" />
            <g fill="none" stroke="#4338ca" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6">
              <path d="M220 245H100Q62 240 69 181L81 95L125 125Q168 102 220 130" fill="#e0e7ff" />
              <path d="M83 101L94 143L119 128M150 170h8M110 201l-31-8M111 215l-34 8M185 195q12 16 25 0" />
              <path d="M220 130Q290 95 338 160L380 192L334 225Q293 258 220 245" fill="#fde68a" stroke="#d97706" />
              <circle cx="280" cy="186" r="26" fill="#fff" stroke="#d97706" />
              <path d="M334 165l26-33l-8 45M334 218l27 31l-8-42M383 182l21 10l-21 10" stroke="#d97706" />
            </g>
            <g fill="#a5b4fc"><circle cx="47" cy="62" r="5" /><circle cx="290" cy="55" r="4" /><path d="M386 66l4 10l10 4l-10 4l-4 10l-4-10l-10-4l10-4z" /></g>
          </svg>
          <p className="mt-5 text-center text-sm text-slate-500">고양이를 그렸는데… 우주선이 됐네?</p>
        </div>
      </section>
      <MyDrawings />
      <section aria-labelledby="how-it-works" className="mt-20">
        <h2 id="how-it-works" className="text-2xl font-bold">세 번이면 완성돼요</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            ["01", "반쪽을 그려요", "왼쪽에 자유롭게 그리고, 친구에게 줄 주제를 적어요."],
            ["02", "코드를 나눠요", "친구는 다른 브라우저나 기기에서 코드로 참여해요."],
            ["03", "함께 열어봐요", "친구가 오른쪽을 완성하면 전체 그림을 확인하고 저장해요."],
          ].map(([number, title, text]) => (
            <div key={number} className="panel p-6">
              <span className="text-sm font-bold text-indigo-500">{number}</span>
              <h3 className="mt-3 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
