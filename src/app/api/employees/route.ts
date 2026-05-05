import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employees = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      position: true,
      department: true,
      phone: true,
      role: true,
      startDate: true,
      manager: { select: { id: true, name: true } },
      _count: { select: { teamMembers: true } },
    },
  });

  return NextResponse.json(employees);
}
