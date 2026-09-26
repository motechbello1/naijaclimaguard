import { getPublicPass } from "@/lib/floodpass/service";
import { looksLikePassCode, normalizePassCode } from "@/lib/floodpass/ledger";
import { publicBaseUrl } from "@/lib/floodpass/conversation-runner";
import { renderPassCard } from "@/lib/floodpass/card-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/floodpass/card/{code}: the FloodPass as a PNG picture. ?format=og for link previews. */
export async function GET(req: Request, { params }: { params: { code: string } }) {
  const og = new URL(req.url).searchParams.get("format") === "og";
  const code = normalizePassCode(decodeURIComponent(params.code));
  const pass = looksLikePassCode(code) ? await getPublicPass(code).catch(() => null) : null;
  return renderPassCard({ pass, code, checkUrl: `${publicBaseUrl()}/check?code=${encodeURIComponent(code)}`, og });
}
