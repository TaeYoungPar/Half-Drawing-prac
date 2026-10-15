export function DrawingPrompt({ prompt, compact = false }: { prompt: string; compact?: boolean }) {
  return (
    <div aria-label="그림 주제" className={`w-full max-w-[800px] rounded-xl border border-indigo-200 bg-indigo-50 ${compact ? "px-3 py-2" : "px-4 py-4 sm:px-5"}`}>
      <p className="text-xs font-semibold tracking-wide text-indigo-700">그림 주제</p>
      <p className={`mt-1 break-words font-bold text-slate-900 ${compact ? "text-base leading-6" : "text-xl leading-8 sm:text-2xl"}`}>{prompt}</p>
    </div>
  );
}
