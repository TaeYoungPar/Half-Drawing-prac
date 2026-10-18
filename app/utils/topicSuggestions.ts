export const DRAWING_TOPICS = [
  "우주를 여행하는 고양이", "케이크 위에서 낮잠 자는 곰", "꽃을 배달하는 토끼", "바다를 헤엄치는 공룡",
  "구름으로 만든 강아지", "모자를 쓴 아기 펭귄", "딸기 집에 사는 햄스터", "노래하는 작은 로봇",
  "날개 달린 도넛", "비 오는 날의 개구리", "아이스크림을 먹는 여우", "달에서 피어난 꽃",
  "무지개 꼬리를 가진 물고기", "별을 줍는 다람쥐", "책 읽는 작은 용", "풍선을 타고 떠나는 코끼리",
  "산책 나온 문어", "수박 모자를 쓴 병아리", "숲속의 버섯 집", "잠옷을 입은 사자",
  "웃고 있는 해바라기", "바다 위의 작은 등대", "친구를 기다리는 눈사람", "고양이 모양의 찻잔",
  "쿠키를 굽는 너구리", "밤하늘을 달리는 기차", "스케이트 타는 바나나", "비밀 정원을 지키는 고슴도치",
  "우산을 쓴 유령", "도시락 속 작은 세상", "해적 모자를 쓴 오리", "무지개가 자라는 화분",
] as const;

export function suggestTopics(exclude: readonly string[] = [], random: () => number = Math.random): string[] {
  const choices = DRAWING_TOPICS.filter((topic) => !exclude.includes(topic));
  for (let index = choices.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [choices[index], choices[swap]] = [choices[swap], choices[index]];
  }
  return choices.slice(0, 3);
}
