// A familiar silhouette plus one expressive detail, without a scene to draw.
export const DRAWING_TOPICS = [
  "졸린 고양이", "심술난 토끼", "깜짝 놀란 곰", "멍한 강아지",
  "볼 빵빵한 햄스터", "부끄러운 돼지", "하품하는 판다", "윙크하는 개구리",
  "화난 딸기", "울보 양파", "웃는 수박", "졸린 사과",
  "콧수염 난 달걀", "째려보는 귤", "깜짝 놀란 도넛", "볼 빨간 복숭아",
  "녹아내리는 아이스크림", "왕관 쓴 푸딩", "선글라스 낀 해", "잠든 초승달",
  "겁먹은 유령", "수줍은 하트", "찌그러진 별", "웃는 꽃",
  "삐진 눈사람", "뚱한 로봇", "콧수염 난 구름", "리본 단 버섯",
  "윙크하는 풍선", "눈이 세 개인 감자", "이빨 빠진 호박", "눈썹 짙은 선인장",
] as const;

export function suggestTopics(exclude: readonly string[] = [], random: () => number = Math.random): string[] {
  const choices = DRAWING_TOPICS.filter((topic) => !exclude.includes(topic));
  for (let index = choices.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [choices[index], choices[swap]] = [choices[swap], choices[index]];
  }
  return choices.slice(0, 3);
}
