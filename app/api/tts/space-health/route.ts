import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SPACE = "https://ememzyvisuals-wazobiavoice-demo.hf.space";

export async function GET() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${SPACE}/config`, { cache: "no-store", signal: controller.signal });
    if (!response.ok) return NextResponse.json({ available: false, status: response.status }, { status: 200 });
    const config: any = await response.json();
    const dependencies = Array.isArray(config?.dependencies)
      ? config.dependencies.map((d: any) => ({
          api_name: d?.api_name ?? null,
          backend_fn: Boolean(d?.backend_fn),
          queue: Boolean(d?.queue),
          inputs: d?.inputs ?? [],
          outputs: d?.outputs ?? [],
        })).filter((d: any) => d.backend_fn)
      : [];
    return NextResponse.json({
      available: true,
      version: config?.version ?? null,
      api_prefix: config?.api_prefix ?? null,
      dependencies,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    return NextResponse.json({ available: false, error: error?.name === "AbortError" ? "timeout" : "unreachable" }, { status: 200 });
  } finally {
    clearTimeout(timeout);
  }
}
