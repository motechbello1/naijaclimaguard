import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
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
        return { id: user.id, email: user.email, name: user.name, plan: user.plan } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.id = (user as any).id; token.plan = (user as any).plan; }
      return token;
    },
    async session({ session, token }) {
      if (session.user) { (session.user as any).id = token.id; (session.user as any).plan = token.plan; }
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET || "naijaclimaguard-secret-change-in-production",
};
