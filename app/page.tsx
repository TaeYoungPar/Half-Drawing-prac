import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>Half-Drawing</h1>

      <p>
        누군가 시작한 반쪽 그림을 이어서 완성해 보세요.
      </p>

      <Link href="/draw">
        그림 시작하기
      </Link>
    </main>
  );
}