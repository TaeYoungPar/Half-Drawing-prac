import Image from "next/image";

type LoadingStateProps = {
  title: string;
  description?: string;
  variant?: "page" | "section" | "inline";
};

function LoadingDots() {
  return <span className="loading-dots" aria-hidden="true"><span /><span /><span /></span>;
}

function LoadingArtwork({ compact = false }: { compact?: boolean }) {
  return <div className={`loading-art ${compact ? "loading-art-compact shrink-0" : "mx-auto"}`} aria-hidden="true">
    <span className="loading-art-halo" />
    <Image src="/loading-kitten.webp" alt="" width={512} height={512} unoptimized loading="eager" className="loading-mascot relative z-10 h-full w-full object-contain" />
  </div>;
}

export function LoadingState({ title, description, variant = "section" }: LoadingStateProps) {
  if (variant === "inline") {
    return <div role="status" aria-live="polite" aria-atomic="true" data-loading-state="inline" className="flex items-center gap-3 rounded-xl border border-slate-200 bg-[#fffdf3] px-3 py-3">
      <Image src="/loading-kitten.webp" alt="" width={512} height={512} unoptimized loading="eager" className="h-12 w-12 shrink-0 object-contain" />
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold leading-6">{title}</p>{description && <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>}</div>
      <LoadingDots />
    </div>;
  }

  if (variant === "section") {
    return <section role="status" aria-live="polite" aria-atomic="true" data-loading-state="section" className="loading-note panel flex w-full items-center gap-3 p-4 sm:gap-5 sm:p-6">
      <LoadingArtwork compact />
      <div className="min-w-0"><p aria-hidden="true" className="text-xs font-semibold text-slate-500">조금만 기다려주세요</p><h2 className="mt-2 text-lg font-extrabold sm:text-xl">{title}</h2>{description && <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>}<div className="mt-3"><LoadingDots /></div></div>
    </section>;
  }

  return <section role="status" aria-live="polite" aria-atomic="true" data-loading-state="page" className="loading-note panel mx-auto w-full max-w-lg px-5 py-7 text-center sm:px-9 sm:py-8">
    <span aria-hidden="true" className="loading-note-label">조금만 기다려주세요</span>
    <LoadingArtwork />
    <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
    {description && <p className="mx-auto mt-3 max-w-xs text-sm leading-7 text-slate-600">{description}</p>}
    <div className="mt-5 flex justify-center"><LoadingDots /></div>
  </section>;
}

export function LoadingPage({ title, description }: Pick<LoadingStateProps, "title" | "description">) {
  return <main id="main-content" className="loading-page mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-10 sm:px-8 sm:py-12">
    <LoadingState title={title} description={description} variant="page" />
  </main>;
}
