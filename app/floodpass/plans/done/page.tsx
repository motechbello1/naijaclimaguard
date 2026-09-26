import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import FpShell from "@/components/floodpass/FpShell";
import { confirmByReference } from "@/lib/floodpass/billing/service";
import { planByCode } from "@/lib/floodpass/billing/plans";

export const metadata: Metadata = { title: "Payment | FloodPass" };
export const dynamic = "force-dynamic";

/** Paystack sends people back here with ?reference=... We check the payment with Paystack ourselves. */
export default async function Page({ searchParams }: { searchParams: { reference?: string; trxref?: string } }) {
  const reference = (searchParams.reference ?? searchParams.trxref ?? "").slice(0, 120);
  let result: Awaited<ReturnType<typeof confirmByReference>> | null = null;
  if (reference) result = await confirmByReference(reference).catch(() => null);
  if (result && "addressCheck" in result && result.addressCheck) redirect(`/floodpass/address-check/${result.addressCheck}`);
  const plan = result && "plan" in result ? planByCode(result.plan) : null;
  const ok = Boolean(result?.ok);
  return (
    <FpShell active="plans">
      <div className="fp-stack" style={{ gap: 20 }}>
        <h1 className="fp-h1">{ok ? "Thank you" : "Payment not confirmed yet"}</h1>
        {ok && plan ? (
          <div className="fp-status fp-status-blue fp-stack">
            <p style={{ margin: 0, fontWeight: 800 }}>{plan.name} is on.</p>
            <p style={{ margin: 0 }}>On WhatsApp or SMS, send FAMILY and a number (for example FAMILY 08031234567) to add family. Send ADD PLACE to watch another place. Send SAFE to tell your family you are safe.</p>
          </div>
        ) : (
          <p className="fp-status fp-status-amber" style={{ margin: 0 }}>If money left your account, it will show here within a few minutes; Paystack also tells us directly. Your reference: {reference || "none"}.</p>
        )}
        <Link className="fp-btn fp-btn-ghost" href="/">Back home</Link>
      </div>
    </FpShell>
  );
}
