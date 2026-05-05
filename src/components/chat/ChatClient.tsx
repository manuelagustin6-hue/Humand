"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Send, Plus, Hash, Loader2, X } from "lucide-react";
import { formatDate, avatarUrl, cn } from "@/lib/utils";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  isDirect: boolean;
  messages: { sender: { name: string } }[];
  _count: { messages: number };
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string; image: string | null; position: string | null };
}

interface Props {
  currentUserId: string;
  currentUserName: string;
}

export default function ChatClient({ currentUserId, currentUserName }: Props) {
  const t = useTranslations("chat");
  const tc = useTranslations("common");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/chat/channels")
      .then((r) => r.json())
      .then((data) => {
        setChannels(data);
        if (data.length > 0) selectChannel(data[0]);
        setLoadingChannels(false);
      });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function selectChannel(channel: Channel) {
    setActiveChannel(channel);
    loadMessages(channel.id);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => loadMessages(channel.id), 5000);
  }

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function loadMessages(channelId: string) {
    setLoadingMessages(true);
    const res = await fetch(`/api/chat/channels/${channelId}/messages`);
    const data = await res.json();
    setMessages(data);
    setLoadingMessages(false);
  }

  async function handleSend() {
    if (!input.trim() || !activeChannel) return;
    setSending(true);
    const res = await fetch(`/api/chat/channels/${activeChannel.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: input }),
    });
    if (res.ok) {
      const msg = await res.json();
      setMessages((prev) => [...prev, msg]);
      setInput("");
    }
    setSending(false);
  }

  async function createChannel() {
    if (!newChannelName.trim()) return;
    const res = await fetch("/api/chat/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newChannelName, isPrivate: false }),
    });
    if (res.ok) {
      const channel = await res.json();
      const fullChannel = { ...channel, messages: [], _count: { messages: 0 } };
      setChannels((prev) => [...prev, fullChannel]);
      selectChannel(fullChannel);
      setShowNewChannel(false);
      setNewChannelName("");
    }
  }

  const groupedMessages = messages.reduce<{ date: string; msgs: Message[] }[]>((acc, msg) => {
    const date = new Date(msg.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
    const last = acc[acc.length - 1];
    if (last?.date === date) { last.msgs.push(msg); }
    else acc.push({ date, msgs: [msg] });
    return acc;
  }, []);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col shrink-0 hidden sm:flex">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("channels")}</h2>
            <button
              onClick={() => setShowNewChannel(true)}
              className="p-1 rounded hover:bg-gray-700 transition-colors"
            >
              <Plus className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {loadingChannels ? (
            <div className="flex items-center justify-center h-20">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => selectChannel(ch)}
                className={cn(
                  "w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors",
                  activeChannel?.id === ch.id
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                )}
              >
                <Hash className="w-4 h-4 shrink-0" />
                <span className="truncate">{ch.name}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {activeChannel ? (
          <>
            {/* Channel header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Hash className="w-5 h-5 text-gray-400" />
              <span className="font-semibold text-gray-900">{activeChannel.name}</span>
              {activeChannel.description && (
                <span className="text-sm text-gray-400 hidden sm:inline">— {activeChannel.description}</span>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {loadingMessages && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  {t("noMessages")}
                </div>
              ) : (
                groupedMessages.map(({ date, msgs }) => (
                  <div key={date}>
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-gray-100" />
                      <span className="text-xs text-gray-400 shrink-0">{date}</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                    {msgs.map((msg, i) => {
                      const isMe = msg.sender.id === currentUserId;
                      const showAvatar = i === 0 || msgs[i - 1]?.sender.id !== msg.sender.id;
                      return (
                        <div key={msg.id} className={cn("flex gap-2.5 mb-0.5", isMe && "flex-row-reverse")}>
                          {showAvatar ? (
                            <img
                              src={msg.sender.image ?? avatarUrl(msg.sender.name)}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                            />
                          ) : (
                            <div className="w-8 shrink-0" />
                          )}
                          <div className={cn("max-w-xs lg:max-w-md", isMe && "items-end flex flex-col")}>
                            {showAvatar && (
                              <div className={cn("flex items-baseline gap-2 mb-0.5", isMe && "flex-row-reverse")}>
                                <span className="text-xs font-semibold text-gray-800">{msg.sender.name}</span>
                                <span className="text-xs text-gray-400">
                                  {new Date(msg.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            )}
                            <div
                              className={cn(
                                "px-3 py-2 rounded-2xl text-sm",
                                isMe
                                  ? "bg-brand-600 text-white rounded-tr-sm"
                                  : "bg-gray-100 text-gray-800 rounded-tl-sm"
                              )}
                            >
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={t("typeMessage")}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition-colors"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Selecciona un canal para comenzar
          </div>
        )}
      </div>

      {/* New channel modal */}
      {showNewChannel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">{t("newChannel")}</h2>
              <button onClick={() => setShowNewChannel(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <input
              placeholder="Nombre del canal"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createChannel()}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowNewChannel(false)} className="flex-1 border border-gray-200 text-gray-700 text-sm py-2.5 rounded-xl hover:bg-gray-50">
                {tc("cancel")}
              </button>
              <button
                onClick={createChannel}
                disabled={!newChannelName.trim()}
                className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm py-2.5 rounded-xl"
              >
                {tc("create")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
