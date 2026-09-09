import Link from "next/link";
import { DrawingCanvas } from "../components/DrawingCanvas";

export default function DrawPage() {
  return (
    <main>
      <Link href="/">홈으로 돌아가기</Link>

      <h1>그림 이어 그리기</h1>

      <p>다른 사람이 시작한 그림을 이어서 그려보세요.</p>

      <DrawingCanvas />
    </main>
  );
}