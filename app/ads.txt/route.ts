import { adsensePublisherId } from "../lib/adsense";

export const dynamic = "force-static";

export function GET() {
  const body = adsensePublisherId
    ? `google.com, ${adsensePublisherId}, DIRECT, f08c47fec0942fa0\n`
    : "# Google AdSense pendiente de configuración.\n";

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
