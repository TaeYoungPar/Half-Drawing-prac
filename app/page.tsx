import { Text, LocalizedImage } from "./i18n/I18n";
import Link from "next/link";
import { ToolIcon } from "./components/ToolIcon";
import { ExampleCards } from "./components/PublicContent";
import { DailyTopic } from "./components/DailyTopic";
import { dailyTopic } from "./utils/dailyTopic";
import { IntentLink } from "./components/IntentLink";
import { PublicAdBanner } from "./components/PublicAdBanner";

export const metadata = { alternates: { canonical: "/" } };

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const variant = (await searchParams).variant === "b" ? "b" : "a";
  return (
    <main id="main-content" className="mx-auto w-full max-w-5xl px-4 pb-14 pt-5 sm:px-8 sm:pb-20 sm:pt-8">
      <section aria-labelledby="home-heading" data-design-variant={variant} className={`home-hero hero-variant-${variant}`}>
        <h1 id="home-heading" className="board-label"><Text>{variant === "a" ? "반쪽은 내가, 나머지는 너!" : "둘의 상상이 만나는 그림판"}</Text></h1>
        <div className="board-shell">
          <figure className="home-art board-paper">
            <div className="absolute inset-x-0 top-0 z-10 flex justify-between px-4 py-3 text-xs font-bold text-slate-700 sm:px-6">
              <span><Text>나의 반쪽</Text></span><span><Text>친구의 반쪽</Text></span>
            </div>
            <LocalizedImage src="/half-notebook-cat.webp" alt="연필을 든 고양이의 왼쪽 살구색 반쪽과 오른쪽 민트색 반쪽이 하나로 이어진 예시 그림"
              width={1536} height={1024} sizes="(min-width: 640px) 450px, 243px" loading="eager" fetchPriority="high" className="mx-auto h-[190px] w-auto max-w-full object-contain pt-7 sm:h-[320px] sm:pt-5" />
            <figcaption className="sr-only"><Text>반쪽씩 이어 그리는 놀이를 표현한 고양이 일러스트</Text></figcaption>
          </figure>
          <div className="home-copy mt-4 text-center">
            <p className="mb-2 text-xs font-bold text-slate-600"><Text>친구와 반씩 그리는 그림 게임</Text></p>
            <p className="text-sm font-semibold leading-6 text-slate-800 sm:text-base"><Text>나는 왼쪽, 친구는 오른쪽.</Text><br className="sm:hidden" /> <Text>경계 힌트만 보고 이어 그려요.</Text></p>
            <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
              <IntentLink href="/draw" className="button-primary"><ToolIcon name="pen" /><Text>그림 시작하기</Text></IntentLink>
              <IntentLink href="/join" className="button-secondary"><Text hideArrow>참여 코드 입력하기 ↗</Text></IntentLink>
            </div>
            <IntentLink href="/examples/cat" className="action-link mt-2 inline-flex min-h-11 items-center px-2 text-sm font-bold"><Text hideArrow>친구 없이 예시 먼저 보기 ↗</Text></IntentLink>
            <p className="mt-4 text-xs leading-5 text-slate-700"><Text>회원가입 없이 · 친구 한 명과 · 그림 실력은 상관없어요</Text></p>
          </div>
        </div>
      </section>
      <DailyTopic initial={dailyTopic()} />
      <PublicAdBanner />
      <section aria-labelledby="how-it-works" className="mt-12 sm:mt-16">
        <span className="eyebrow"><Text>우리의 작은 그림 시간</Text></span>
        <h2 id="how-it-works" className="section-heading mt-2"><Text>세 번이면 완성돼요</Text></h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3 sm:gap-5">
          {[
            ["01", "반쪽을 그려요", "왼쪽에 그리고, 그림 주제를 적어요."],
            ["02", "친구를 초대해요", "친구는 경계 힌트만 보고 오른쪽을 이어 그려요."],
            ["03", "함께 열어봐요", "완성된 그림을 확인하고 저장·공유해요."],
          ].map(([number, title, text], index) => (
            <div key={number} className={`panel flex items-start gap-4 p-5 sm:flex-col sm:gap-4 sm:p-6 ${index === 1 ? "bg-[#f9dce0]!" : index === 2 ? "bg-[#dcedd5]!" : "bg-[#fff0bd]!"}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#493127] bg-[#fffdf3] text-sm font-extrabold">{number}</span>
              <div><h3 className="text-lg font-bold"><Text>{title}</Text></h3><p className="mt-2 text-sm leading-6 text-slate-700"><Text>{text}</Text></p></div>
            </div>
          ))}
        </div>
      </section>
      <section aria-labelledby="learn-more" className="mt-12 sm:mt-16">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><span className="eyebrow"><Text>어떤 그림이 나올까요?</Text></span><h2 id="learn-more" className="section-heading mt-2"><Text>상상은 다르게, 그림은 함께</Text></h2></div><Link href="/examples" className="action-link inline-flex min-h-11 items-center text-sm font-bold"><Text>모든 예시 보기 ↗</Text></Link></div>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700"><Text>얼굴, 로봇, 꽃처럼 익숙한 모양에서 시작해요. 경계에 어떤 힌트를 남길지, 친구는 무엇을 보며 이어 그릴지 가이드용 예시로 살펴보세요.</Text></p><ExampleCards />
      </section>
      <section aria-labelledby="guide-intro" className="panel mt-10 bg-[#c5e0e8]! p-6 sm:p-8"><h2 id="guide-intro" className="section-heading"><Text>처음이라면, 작은 안내서부터</Text></h2><p className="mt-3 max-w-2xl text-sm leading-7"><Text>친구 초대부터 물감통으로 채우기, 완성 그림 저장까지. 처음 쓰는 도구도 차근차근 알아볼 수 있어요. 그림은 공개 게시판에 자동으로 올라가지 않아요.</Text></p><div className="mt-5 flex flex-wrap gap-3"><Link href="/guide" className="button-secondary"><Text>이용 가이드 읽기</Text></Link><Link href="/about" className="inline-flex min-h-11 items-center px-2 text-sm font-bold underline underline-offset-4"><Text>반쪽그림 소개</Text></Link></div></section>
    </main>
  );
}
