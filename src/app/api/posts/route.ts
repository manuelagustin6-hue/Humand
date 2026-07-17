import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const take = Math.min(
    Math.max(parseInt(searchParams.get("limit") ?? "", 10) || PAGE_SIZE, 1),
    MAX_PAGE_SIZE
  );

  const posts = await prisma.post.findMany({
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      author: { select: { id: true, name: true, image: true, position: true, department: true } },
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId: session.user.id }, select: { id: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        take: 20,
        include: { author: { select: { id: true, name: true, image: true } } },
      },
    },
  });

  const hasMore = posts.length > take;
  const items = hasMore ? posts.slice(0, take) : posts;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({ posts: items, nextCursor });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, imageUrl } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const post = await prisma.post.create({
    data: { content: content.trim(), imageUrl, authorId: session.user.id },
    include: {
      author: { select: { id: true, name: true, image: true, position: true, department: true } },
      _count: { select: { likes: true, comments: true } },
      likes: true,
      comments: true,
    },
  });

  return NextResponse.json(post, { status: 201 });
}
