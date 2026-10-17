import { DrawingCanvas } from "../components/DrawingCanvas";

export default function DrawPage() {
  return (
    <main className="workspace drawing-workspace">
      <div className="space-y-2">
        <span className="eyebrow">STEP 1 · 내 반쪽 그리기</span>
        <h1 className="text-xl font-extrabold tracking-tight sm:text-4xl">어떤 상상을 시작해볼까요?</h1>
        <p className="text-sm leading-6 text-slate-600">왼쪽을 그린 뒤, 주제를 적고 친구를 초대해요.</p>
      </div>
      <DrawingCanvas drawingSide="left" />
    </main>
  );
}
