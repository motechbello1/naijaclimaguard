import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();
    if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be 8+ characters" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email: email.toLowerCase(), name: name || null, passwordHash: hash, plan: "FREE" },
      select: { id: true, email: true, name: true, plan: true },
    });

    return NextResponse.json({ message: "Account created", user }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
