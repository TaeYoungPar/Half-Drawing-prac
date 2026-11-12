import { Text, Localized } from "../../i18n/I18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentShell, DrawingCTA } from "../../components/PublicContent";
import { ExamplePreview } from "../../components/ExamplePreview";
import { contentMetadata, examples } from "../../lib/public-content";
import { PublicAdBanner } from "../../components/PublicAdBanner";

export function generateStaticParams() { return examples.map(({ slug }) => ({ slug })); }
export const dynamicParams = false;
export async function generateMetadata({ params }: PageProps<"/examples/[slug]">) {
  const { slug } = await params;
  const entry = examples.find(item => item.slug === slug);
  if (!entry) notFound();
  return contentMetadata(entry.title, entry.description, `/examples/${entry.slug}`);
}
export default async function ExamplePage({ params }: PageProps<"/examples/[slug]">) {
  const { slug } = await params;
  const example = examples.find(item => item.slug === slug);
  if (!example) notFound();
  return <ContentShell title={example.title} intro={example.description}>
    <div className="grid items-start gap-6 lg:grid-cols-[1.2fr_1fr]"><ExamplePreview kind={example.slug} /><aside className="panel p-6" style={{ backgroundColor: example.color }}><h2 className="text-lg font-bold"><Text>이번 그림의 작은 약속</Text></h2><dl className="mt-5 space-y-5 text-sm leading-7"><div><dt className="font-bold"><Text>함께 정할 주제</Text></dt><dd><Text>{example.topic}</Text></dd></div><div><dt className="font-bold"><Text>경계에서 확인할 것</Text></dt><dd><Text>{example.focus}</Text></dd></div><div><dt className="font-bold"><Text>각자 다르게 해볼 것</Text></dt><dd><Text>{example.variation}</Text></dd></div></dl></aside></div>
    <Localized as="article" className="article-copy mt-10" label="{0} 그리는 방법" labelValues={[example.title]}>{example.steps.map(([title, text], index) => <section key={title}><h2>{index + 1}. <Text>{title}</Text></h2><p><Text>{text}</Text></p></section>)}<section><h2><Text>이어진 모양이 어색하다면</Text></h2><p><Text>{example.mistake}</Text></p><aside><Text>{example.toolTip}</Text></aside></section><section><h2><Text>완성한 뒤 나눌 이야기</Text></h2><p><Text>그림을 열기 전에는 친구가 어떤 색과 모양을 골랐을지 짐작해보세요. 열고 나서는 가장 예상 밖이었던 부분을 하나씩 말해보세요. 잘 그린 쪽을 고르기보다 두 반쪽이 만나 새로 생긴 모양을 찾아보면 좋아요.</Text></p><p><Text>마음에 든 그림은 원본으로 저장하고, 주제까지 함께 남기고 싶으면 공유 카드를 골라보세요. 다음 그림에서는 시작하는 사람과 참여하는 사람의 역할을 바꿔 같은 주제를 다시 그려봐도 재미있어요.</Text></p></section></Localized>
    <Link href="/examples" className="mt-8 inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4"><Text>← 다른 주제의 예시 보기</Text></Link><DrawingCTA />
    <PublicAdBanner />
  </ContentShell>;
}
