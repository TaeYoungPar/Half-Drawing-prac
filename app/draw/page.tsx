import { DayLabel } from "../components/DayLabel";
import { Text } from "../i18n/I18n";
import { DrawingCanvas } from "../components/DrawingCanvas";
import { RematchDrawing } from "../components/RematchDrawing";
import { topicForDay } from "../utils/dailyTopic";
import { notFound } from "next/navigation";

export default async function DrawPage({ searchParams }: PageProps<"/draw">) {
  const params = await searchParams;
  if (typeof params.rematch === "string") {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.rematch)) notFound();
    return <RematchDrawing key={params.rematch} parentId={params.rematch} />;
  }
  const daily = typeof params.daily === "string" ? topicForDay(params.daily) : null;
  return (
    <main className="workspace drawing-workspace">
      <div className="space-y-2">
        <span className="eyebrow">{daily ? <DayLabel day={daily.day} topic /> : <Text>STEP 1 · 내 반쪽 그리기</Text>}</span>
        <h1 className="text-xl font-extrabold tracking-tight sm:text-4xl"><Text>{daily ? daily.topic : "어떤 상상을 시작해볼까요?"}</Text></h1>
      </div>
      <DrawingCanvas key={daily?.day ?? "regular"} drawingSide="left" initialPrompt={daily?.topic} draftId={daily ? `daily:${daily.day}` : undefined} />
    </main>
  );
}
