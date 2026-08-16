import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { FOUNDER_ROLE, verifyFounderCredentials } from "@/lib/founder-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, plan: user.plan, role: "USER" } as any;
      },
    }),
    CredentialsProvider({
      id: "founder-credentials",
      name: "Founder",
      credentials: {
        username: { label: "Founder username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const valid = await verifyFounderCredentials(credentials?.username, credentials?.password);
        if (!valid) return null;
        return {
          id: "naijaclimaguard-founder",
          email: "founder@naijaclimaguard.internal",
          name: "NaijaClimaGuard Founder",
          plan: FOUNDER_ROLE,
          role: FOUNDER_ROLE,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.plan = (user as any).plan;
        token.role = (user as any).role || "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).plan = token.plan;
        (session.user as any).role = token.role || "USER";
        (session.user as any).revenueAdmin = token.role === FOUNDER_ROLE;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET || "naijaclimaguard-secret-change-in-production",
};
