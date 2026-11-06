let scriptLoad: Promise<void> | null = null;

/** One vendor script per document, with exactly the attributes AdSense provides. */
export function loadAdSense(client: string): Promise<void> {
  if (scriptLoad) return scriptLoad;
  scriptLoad = new Promise<void>((resolve, reject) => {
    const append = () => {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
      script.crossOrigin = "anonymous";
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => reject(new Error("AdSense script failed to load")), { once: true });
      document.head.appendChild(script);
    };
    if (document.readyState === "complete") append();
    else window.addEventListener("load", append, { once: true });
  });
  return scriptLoad;
}
