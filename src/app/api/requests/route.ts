import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role: string }).role;
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view");

  let where = {};

  if (view === "approve" && ["ADMIN", "MANAGER"].includes(role)) {
    where = { status: "PENDING" };
  } else {
    where = { requestedById: session.user.id };
  }

  const requests = await prisma.leaveRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: { select: { id: true, name: true, image: true, position: true, department: true } },
      approvedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  const request = await prisma.leaveRequest.create({
    data: {
      type: data.type,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      reason: data.reason,
      requestedById: session.user.id,
    },
    include: {
      requestedBy: { select: { id: true, name: true, image: true, position: true } },
      approvedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(request, { status: 201 });
}
