import { adsPublisherId } from "../lib/ads";

export function GET() {
  const client = adsPublisherId();
  return new Response(client ? `google.com, ${client.slice(3)}, DIRECT, f08c47fec0942fa0\n` : "", {
    status: client ? 200 : 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
