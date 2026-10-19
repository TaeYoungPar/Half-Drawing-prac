import Link from "next/link";
import { ContentShell, DrawingCTA } from "../components/PublicContent";
import { contactEmail, contentMetadata } from "../lib/public-content";

export const metadata = contentMetadata("반쪽그림 소개와 문의", "친구의 작은 힌트에 상상을 더하는 두 사람의 그림 놀이, 반쪽그림의 이용 방식과 운영 문의 안내.", "/about");
export default function AboutPage() {
  return <ContentShell title="반쪽의 빈칸을, 함께 채우는 곳" intro="똑같은 주제를 떠올려도 두 사람의 머릿속 그림은 다르니까요. 반쪽그림은 그 차이를 한 장의 그림에서 만나게 하는 두 사람의 그림 놀이예요.">
    <div className="article-copy"><section><h2>조금만 보고, 나머지는 상상해요</h2><p>먼저 시작한 사람이 왼쪽을 그리고 친구를 초대해요. 친구에게는 경계 가까이의 작은 힌트만 보여요. 오른쪽까지 완성된 다음에야 두 사람의 전체 그림을 열어볼 수 있어요. 반듯하게 연결된 선도, 뜻밖에 달라진 모양도 두 사람이 만든 결과예요.</p><p>그림 실력을 겨루거나 작품 순위를 매기는 공간이 아니에요. 가볍게 주제 하나를 정하고 친구와 어떤 생각을 했는지 이야기해보세요. 고양이 얼굴에서 시작해 낯선 동물, 상상 속 음식, 서로 다른 계절로 넓혀가도 좋아요.</p></section><section><h2>우리 그림은 우리가 열어봐요</h2><p>그림은 공개 게시판에 자동으로 올라가지 않아요. 내 보관함은 현재 브라우저의 익명 이용 정보와 연결돼 있고, 다른 사람의 공개 갤러리로 제공하지 않아요. 참여 코드와 초대 링크는 그림을 이어 그릴 친구에게만 전달해주세요.</p><p>사이트의 <Link href="/examples">그리기 예시</Link>는 이용 방법을 설명하기 위해 별도로 제작한 그림이에요. 사용자의 그림을 가져와 전시하지 않아요. 실제 작품을 외부에 공유할 때는 함께 그린 친구의 의사를 확인해주세요.</p></section><section><h2>처음 방문했다면</h2><p><Link href="/guide">이용 가이드</Link>에서 초대와 저장 방법을 살펴보고, 예시에서 친구에게 보이는 화면을 바꿔보세요. 시작할 준비가 됐다면 별도의 이메일 회원가입 없이 그림을 그릴 수 있어요. 브라우저 데이터를 삭제하면 보관함을 다시 찾기 어려울 수 있으니 완성 그림은 따로 저장해주세요.</p></section><section id="contact"><h2>운영 문의</h2><p>기능 오류, 이용 관련 질문, 개인정보 열람·삭제 요청은 <a href={`mailto:${contactEmail}`}>{contactEmail}</a>로 보내주세요. 오류 문의에는 사용한 기기와 브라우저, 문제가 생긴 순서를 적어주시면 확인에 도움이 돼요.</p><p>그림 관련 요청에는 해당 방 링크 또는 참여 코드와 요청 내용을 함께 알려주세요. 다른 사람의 그림이 변경되거나 노출되지 않도록 요청자의 이용 관계를 확인한 뒤 처리 여부와 방법을 안내해요. 비밀번호나 인증 토큰은 보내지 마세요.</p><p>저장되는 정보와 브라우저 데이터의 차이는 <Link href="/privacy">개인정보·저장 안내</Link>에서 확인할 수 있어요.</p></section></div><DrawingCTA />
  </ContentShell>;
}
