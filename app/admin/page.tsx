import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { isFounderSessionUser } from "@/lib/founder-auth";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!isFounderSessionUser(session?.user as any)) {
    redirect("/login?mode=founder&callbackUrl=/admin");
  }
  redirect("/revenue/command");
}
