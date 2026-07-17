"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Heart, MessageCircle, Pin, Send, Loader2 } from "lucide-react";
import { formatDate, avatarUrl, cn } from "@/lib/utils";
import Image from "next/image";

interface Author {
  id: string;
  name: string;
  image: string | null;
  position: string | null;
  department: string | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string; image: string | null };
}

interface Post {
  id: string;
  content: string;
  imageUrl: string | null;
  pinned: boolean;
  createdAt: string;
  author: Author;
  _count: { likes: number; comments: number };
  likes: { id: string }[];
  comments: Comment[];
}

export default function FeedClient({ currentUserId, currentUserRole }: { currentUserId: string; currentUserRole: string }) {
  const t = useTranslations("feed");
  const tc = useTranslations("common");
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [newContent, setNewContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    const res = await fetch("/api/posts");
    const data = await res.json();
    setPosts(data.posts ?? []);
    setNextCursor(data.nextCursor ?? null);
    setLoading(false);
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const res = await fetch(`/api/posts?cursor=${encodeURIComponent(nextCursor)}`);
    const data = await res.json();
    setPosts((prev) => [...prev, ...(data.posts ?? [])]);
    setNextCursor(data.nextCursor ?? null);
    setLoadingMore(false);
  }

  async function handlePost() {
    if (!newContent.trim()) return;
    setPosting(true);
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent }),
    });
    if (res.ok) {
      const post = await res.json();
      setPosts((prev) => [post, ...prev]);
      setNewContent("");
    }
    setPosting(false);
  }

  async function handleLike(postId: string) {
    const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    const { liked } = await res.json();
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          _count: { ...p._count, likes: p._count.likes + (liked ? 1 : -1) },
          likes: liked ? [{ id: "temp" }] : [],
        };
      })
    );
  }

  async function handleComment(postId: string) {
    const content = commentInputs[postId];
    if (!content?.trim()) return;
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      const comment = await res.json();
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, comments: [...p.comments, comment], _count: { ...p._count, comments: p._count.comments + 1 } }
            : p
        )
      );
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-4">
      {/* New post box */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex gap-3">
          <img
            src={session?.user?.image ?? avatarUrl(session?.user?.name ?? "?")}
            alt=""
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
          <div className="flex-1">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={t("placeholder")}
              rows={3}
              className="w-full resize-none text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handlePost}
                disabled={posting || !newContent.trim()}
                className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors flex items-center gap-2"
              >
                {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {t("post")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="text-center text-gray-400 py-16">{t("noPosts")}</div>
      ) : (
        posts.map((post) => {
          const liked = post.likes.length > 0;
          const showComments = expandedComments[post.id];
          return (
            <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-100">
              {post.pinned && (
                <div className="flex items-center gap-1.5 px-4 pt-3 text-xs text-brand-600 font-medium">
                  <Pin className="w-3.5 h-3.5" />
                  {t("pinned")}
                </div>
              )}

              <div className="p-4">
                {/* Author */}
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={post.author.image ?? avatarUrl(post.author.name)}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{post.author.name}</p>
                    <p className="text-xs text-gray-500">
                      {post.author.position ?? post.author.department} · {formatDate(post.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>

                {post.imageUrl && (
                  <div className="mt-3 rounded-xl overflow-hidden">
                    <img src={post.imageUrl} alt="" className="w-full object-cover max-h-80" />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={cn(
                      "flex items-center gap-1.5 text-sm transition-colors",
                      liked ? "text-red-500" : "text-gray-500 hover:text-red-500"
                    )}
                  >
                    <Heart className={cn("w-4 h-4", liked && "fill-current")} />
                    {post._count.likes > 0 && <span>{post._count.likes}</span>}
                    <span className="hidden sm:inline">{t("like")}</span>
                  </button>

                  <button
                    onClick={() => setExpandedComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {post._count.comments > 0 && <span>{post._count.comments}</span>}
                    <span className="hidden sm:inline">{t("comment")}</span>
                  </button>
                </div>

                {/* Comments section */}
                {showComments && (
                  <div className="mt-3 space-y-2.5">
                    {post.comments.map((c) => (
                      <div key={c.id} className="flex gap-2.5">
                        <img
                          src={c.author.image ?? avatarUrl(c.author.name)}
                          alt=""
                          className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                        />
                        <div className="bg-gray-50 rounded-xl px-3 py-2 flex-1">
                          <span className="font-semibold text-xs text-gray-800">{c.author.name} </span>
                          <span className="text-xs text-gray-700">{c.content}</span>
                        </div>
                      </div>
                    ))}

                    <div className="flex gap-2.5 pt-1">
                      <img
                        src={session?.user?.image ?? avatarUrl(session?.user?.name ?? "?")}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                      />
                      <div className="flex-1 flex gap-2">
                        <input
                          value={commentInputs[post.id] ?? ""}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleComment(post.id);
                            }
                          }}
                          placeholder={t("writeComment")}
                          className="flex-1 bg-gray-50 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400"
                        />
                        <button
                          onClick={() => handleComment(post.id)}
                          className="text-brand-600 hover:text-brand-700"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

      {nextCursor && (
        <div className="flex justify-center pt-2">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50 px-4 py-2"
          >
            {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
            {tc("loadMore")}
          </button>
        </div>
      )}
    </div>
  );
}
