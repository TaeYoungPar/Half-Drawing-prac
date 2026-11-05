export function isPublicAdPage(pathname: string): boolean {
  return ["/guide", "/examples", "/examples/cat", "/examples/robot", "/examples/flower"].includes(pathname.replace(/\/$/, ""));
}
