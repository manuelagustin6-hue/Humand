import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const recognitions = await prisma.recognition.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      givenBy: { select: { id: true, name: true, image: true, position: true } },
      receivedBy: { select: { id: true, name: true, image: true, position: true } },
    },
  });

  return NextResponse.json(recognitions);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { receivedById, message, category } = await req.json();
  if (!receivedById || !message?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const recognition = await prisma.recognition.create({
    data: {
      message: message.trim(),
      category: category ?? "great_job",
      givenById: session.user.id,
      receivedById,
    },
    include: {
      givenBy: { select: { id: true, name: true, image: true, position: true } },
      receivedBy: { select: { id: true, name: true, image: true, position: true } },
    },
  });

  return NextResponse.json(recognition, { status: 201 });
}
