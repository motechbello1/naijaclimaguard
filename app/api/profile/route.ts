import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// GET - fetch current user profile
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, name: true, plan: true, createdAt: true },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ user });
}

// PATCH - update user profile
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { name, email, currentPassword, newPassword } = await request.json();

  const updateData: any = {};

  // Update name
  if (name !== undefined && name !== user.name) {
    updateData.name = name;
  }

  // Update email
  if (email && email !== user.email) {
    const emailLower = email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: emailLower } });
    if (existing && existing.id !== user.id) {
      return NextResponse.json({ error: "This email is already registered to another account" }, { status: 409 });
    }
    updateData.email = emailLower;
  }

  // Update password
  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required to set a new password" }, { status: 400 });
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }
    updateData.passwordHash = await bcrypt.hash(newPassword, 12);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ message: "No changes to save" });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: updateData,
    select: { id: true, email: true, name: true, plan: true },
  });

  return NextResponse.json({ message: "Profile updated", user: updated });
}
