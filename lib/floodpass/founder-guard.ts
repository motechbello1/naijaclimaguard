import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isFounderSessionUser } from "@/lib/founder-auth";

/** True only for the logged-in founder. Every money, sending or approval action checks this. */
export async function isFounderRequest() {
  const session = await getServerSession(authOptions);
  return isFounderSessionUser(session?.user as { role?: unknown } | undefined);
}
