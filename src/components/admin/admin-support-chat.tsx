"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  Search,
  X,
  ImagePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/providers/session-provider";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { sounds } from "@/lib/sounds";

interface SupportMessage {
  id: string;
  license_key: string;
  content: string;
  is_admin: boolean;
  sender_name: string;
  created_at: string;
  is_system?: boolean;
}

interface ConversationSummary {
  license_key: string;
  user_name: string;
  last_message: string;
  last_time: string;
  message_count: number;
  is_resolved: boolean;
  unread_count: number;
}

export function AdminSupportChat() {
  const { session } = useSession();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/support?all=true");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Auto-refresh conversations every 15 seconds
  useEffect(() => {
    const interval = setInterval(fetchConversations, 15000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // Subscribe to real-time updates for all support messages
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel("admin-support-all")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
        },
        (payload) => {
          const newMsg = payload.new as SupportMessage;
          // If watching this conversation, add message
          if (newMsg.license_key === selectedKey) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
          // Refresh conversations list
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedKey, fetchConversations]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedKey) {
      setMessages([]);
      return;
    }
    setMessagesLoading(true);
    fetch(`/api/support?licenseKey=${selectedKey}`)
      .then((r) => r.json())
      .then((data) => setMessages(data.messages || []))
      .catch(() => {})
      .finally(() => setMessagesLoading(false));
  }, [selectedKey]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if ((!input.trim() && !imageFile) || sending || !selectedKey) return;
    setSending(true);
    sounds.send();

    let content = input.trim();
    if (imageFile) {
      const url = await uploadToCloudinary(imageFile);
      if (url) {
        content = content ? `[image]${url}\n${content}` : `[image]${url}`;
      }
    }

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licenseKey: selectedKey,
          content,
          isAdmin: true,
          senderName: session?.name || "Admin",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
        }
      }
    } catch {
      // silent
    }

    setInput("");
    setImageFile(null);
    setImagePreview(null);
    setSending(false);
    fetchConversations();
  };

  const handleResolve = async () => {
    if (!selectedKey) return;
    sounds.click();
    try {
      const res = await fetch("/api/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: selectedKey, action: "resolve" }),
      });
      if (res.ok) {
        // Refresh both
        fetchConversations();
        // Re-fetch messages to see system message
        const msgRes = await fetch(`/api/support?licenseKey=${selectedKey}`);
        if (msgRes.ok) {
          const data = await msgRes.json();
          setMessages(data.messages || []);
        }
      }
    } catch {
      // silent
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > 5 * 1024 * 1024) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const filteredConversations = searchQuery
    ? conversations.filter(
        (c) =>
          c.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.license_key.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  const selectedConv = conversations.find((c) => c.license_key === selectedKey);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden" style={{ height: "600px" }}>
      <div className="flex h-full">
        {/* Left: Conversation list */}
        <div className="w-80 border-r border-border flex flex-col shrink-0">
          <div className="p-3 border-b border-border space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              Support Chats
              {conversations.filter((c) => !c.is_resolved).length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                  {conversations.filter((c) => !c.is_resolved).length}
                </span>
              )}
            </h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari user..."
                className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                Belum ada percakapan support
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.license_key}
                  onClick={() => { sounds.click(); setSelectedKey(conv.license_key); }}
                  className={`flex w-full items-start gap-3 px-3 py-3 text-left transition-colors border-b border-border/50 ${
                    selectedKey === conv.license_key
                      ? "bg-primary/5 border-l-2 border-l-primary"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                    {conv.user_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold truncate">{conv.user_name}</span>
                      {conv.is_resolved && (
                        <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {conv.last_message}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock className="h-2.5 w-2.5 text-muted-foreground/60" />
                      <span className="text-[9px] text-muted-foreground/70">
                        {new Date(conv.last_time).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {!conv.is_resolved && conv.unread_count > 0 && (
                        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Chat thread */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedKey ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2">
                <MessageCircle className="h-10 w-10 text-muted-foreground/20 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Pilih percakapan untuk mulai membalas
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0">
                    {selectedConv?.user_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{selectedConv?.user_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {selectedKey?.slice(0, 12)}...
                    </p>
                  </div>
                  {selectedConv?.is_resolved && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Resolved
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!selectedConv?.is_resolved && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResolve}
                      className="h-7 text-[11px] gap-1 text-green-600 border-green-500/30 hover:bg-green-500/10"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Resolve
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setSelectedKey(null)}
                    className="sm:hidden"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto" ref={scrollRef}>
                <div className="p-4 space-y-3">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      Belum ada pesan
                    </div>
                  ) : (
                    messages.map((msg) => {
                      // System message (resolved confirmation)
                      if (msg.is_system) {
                        return (
                          <div key={msg.id} className="flex justify-center">
                            <div className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1.5 text-[10px] text-green-600 dark:text-green-400">
                              <CheckCircle2 className="h-3 w-3" />
                              {msg.content}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`flex ${msg.is_admin ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                              msg.is_admin
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            {!msg.is_admin && (
                              <p className="text-[10px] font-semibold mb-0.5 text-muted-foreground">
                                {msg.sender_name}
                              </p>
                            )}
                            {msg.content.startsWith("[image]") ? (
                              <>
                                <img
                                  src={msg.content.split("\n")[0].slice(7)}
                                  alt="Shared"
                                  className="max-h-48 rounded-lg mb-1"
                                  loading="lazy"
                                />
                                {msg.content.includes("\n") && (
                                  <p className="break-words whitespace-pre-wrap text-xs">
                                    {msg.content.split("\n").slice(1).join("\n")}
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className="break-words whitespace-pre-wrap text-xs">{msg.content}</p>
                            )}
                            <p
                              className={`text-[9px] mt-0.5 ${
                                msg.is_admin
                                  ? "text-primary-foreground/60"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {new Date(msg.created_at).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Input */}
              <div className="border-t border-border p-3 shrink-0">
                {imagePreview && (
                  <div className="relative inline-block mb-2">
                    <img src={imagePreview} alt="Preview" className="h-16 w-auto rounded-lg object-cover" />
                    <button
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="h-4 w-4" />
                  </Button>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Balas pesan user..."
                    maxLength={2000}
                    className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={(!input.trim() && !imageFile) || sending}
                    className="h-9 w-9 shrink-0"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
