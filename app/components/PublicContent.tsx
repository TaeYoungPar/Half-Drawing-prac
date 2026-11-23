import { Localized, Text } from "../i18n/I18n";
import Link from "next/link";
import type { ReactNode } from "react";
import { examples } from "../lib/public-content";
import { ExampleArtwork } from "./ExampleArtwork";
import { IntentLink } from "./IntentLink";

export function ContentShell({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return <main id="main-content" className="public-content mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
    <Localized as="nav" aria-label="그리기 안내" className="mb-9 flex flex-wrap gap-x-6 gap-y-1 text-sm font-bold"><Link href="/guide"><Text>이용 가이드</Text></Link><Link href="/examples"><Text>그리기 예시</Text></Link><Link href="/about"><Text>반쪽그림 소개</Text></Link></Localized>
    <header className="mb-8 max-w-2xl"><p className="eyebrow"><Text>반쪽그림의 작은 안내서</Text></p><h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl"><Text>{title}</Text></h1><p className="mt-5 text-base leading-8 text-slate-700"><Text>{intro}</Text></p></header>
    {children}
  </main>;
}

export function ExampleCards() {
  return <div className="mt-6 grid gap-5 sm:grid-cols-3">{examples.map(example => <Link key={example.slug} href={`/examples/${example.slug}`} className="example-card panel block overflow-hidden">
    <div className="border-b border-[#c8b99b] p-3" style={{ backgroundColor: example.color }}><div className="overflow-hidden rounded-xl border border-[#c8b99b]"><ExampleArtwork kind={example.slug} /></div></div>
    <div className="p-5"><span className="text-xs font-bold text-slate-500"><Text>{example.tag}</Text></span><h3 className="mt-2 text-lg font-bold"><Text>{example.title}</Text></h3><p className="mt-3 text-sm leading-7 text-slate-700"><Text>{example.description}</Text></p><span className="mt-5 inline-block text-sm font-bold"><Text hideArrow>그리는 방법 보기 ↗</Text></span></div>
  </Link>)}</div>;
}

export function DrawingCTA() {
  return <section className="panel mt-12 bg-[#dcedd5]! p-6 sm:p-8"><h2 className="section-heading"><Text>이번에는 우리 그림으로</Text></h2><p className="mt-3 max-w-xl text-sm leading-7"><Text>예시와 똑같이 그릴 필요 없어요. 친구와 주제 하나를 정하고, 각자의 상상으로 반쪽씩 채워보세요.</Text></p><div className="mt-5 flex flex-wrap gap-3"><IntentLink href="/draw" className="button-primary"><Text>그림 시작하기</Text></IntentLink><IntentLink href="/join" className="button-secondary"><Text>참여 코드 입력하기</Text></IntentLink></div></section>;
}
