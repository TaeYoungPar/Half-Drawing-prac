export function DrawingPrompt({ prompt, compact = false }: { prompt: string; compact?: boolean }) {
  return (
    <div aria-label="그림 주제" className={`w-full max-w-[800px] border border-slate-200 bg-white ${compact ? "rounded-2xl px-3 py-2" : "rounded-3xl px-5 py-5 shadow-lg shadow-slate-100 sm:px-6"}`}>
      <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-600"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-indigo-600" />그림 주제</p>
      <p className={`mt-1 break-words font-bold text-slate-900 ${compact ? "text-base leading-6" : "text-xl leading-8 sm:text-2xl"}`}>{prompt}</p>
    </div>
  );
}
