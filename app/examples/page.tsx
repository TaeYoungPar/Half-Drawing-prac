import { ContentShell, DrawingCTA, ExampleCards } from "../components/PublicContent";
import { contentMetadata } from "../lib/public-content";

export const metadata = contentMetadata("반쪽그림 주제별 예시", "고양이, 로봇, 꽃을 반쪽씩 이어 그리는 방법. 경계에 남길 힌트와 도구 사용 팁을 예시로 알아보세요.", "/examples");
export default function ExamplesPage() {
  return <ContentShell title="무엇을 그릴지 망설여질 때" intro="쉬운 모양 하나에서 시작해봐요. 주제마다 연결할 곳과 바꿔볼 요소를 짚어두었어요. 각 예시에서 내 반쪽, 친구가 보는 힌트, 완성 모습을 비교할 수 있어요.">
    <section aria-labelledby="example-list"><h2 id="example-list" className="section-heading">세 가지 주제로 연습해요</h2><ExampleCards /><p className="mt-5 text-xs leading-6 text-slate-500">이 그림들은 서비스 이용 방법을 설명하기 위해 제작한 가이드용 예시이며, 사용자 작품을 공개한 것이 아니에요.</p></section>
    <section className="article-copy mt-12"><h2>좋은 주제에는 같은 기준과 다른 상상이 있어요</h2><p>‘고양이’처럼 대상을 함께 정하면 서로 무엇을 그릴지 알 수 있어요. 여기에 ‘한쪽은 졸리고, 한쪽은 신난’처럼 각자 선택할 여지를 남겨보세요. 모양을 맞히는 시험보다 두 해석이 만나는 놀이가 돼요.</p><p>처음에는 얼굴처럼 가운데를 기준으로 나누기 쉬운 대상을 추천해요. 익숙해지면 한쪽은 낮, 다른 쪽은 밤인 풍경이나 서로 다른 맛의 케이크로 넓혀보세요. 두 사람이 화면 밖에서 세부 모양까지 모두 정하기보다는, 주제만 나누고 결과를 기다려보는 것도 좋아요.</p></section><DrawingCTA />
  </ContentShell>;
}
