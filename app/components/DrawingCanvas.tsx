/* 클라이언트 컴포넌트 선언 */
"use client";
export function DrawingCanvas() {
  return (
    /* section 안에 canvas 작성 */
    <section>
 <canvas
    width={800}
    height={500}
    className={"border border-gray-400"}
  />
    </section>
  );
}