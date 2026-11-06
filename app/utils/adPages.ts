/** Library content eligibility is checked separately by MyDrawings. */
export function isAdPage(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  return ["/", "/library", "/guide", "/examples", "/examples/cat", "/examples/robot", "/examples/flower"].includes(path);
}
