import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role: string }).role;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  let where: { userId?: string } = {};

  if (role === "ADMIN") {
    if (userId) where = { userId };
  } else {
    where = { userId: session.user.id };
  }

  const salaries = await prisma.salary.findMany({
    where,
    orderBy: { period: "desc" },
    include: {
      user: { select: { id: true, name: true, position: true, department: true } },
    },
  });

  return NextResponse.json(salaries);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role: string }).role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await req.json();
  const salary = await prisma.salary.create({
    data: {
      userId: data.userId,
      period: data.period,
      grossAmount: data.grossAmount,
      netAmount: data.netAmount,
      currency: data.currency ?? "ARS",
      breakdown: data.breakdown,
      fileUrl: data.fileUrl,
    },
    include: {
      user: { select: { id: true, name: true, position: true, department: true } },
    },
  });

  return NextResponse.json(salary, { status: 201 });
}
