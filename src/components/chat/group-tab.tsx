"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import { CircleHelp, GraduationCap, Loader2, Send, Trash2, Users, X } from "@/components/ui/icons";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useGroupChat } from "@/hooks/use-group-chat";
import { GroupSessions } from "@/components/mentor/group-sessions";
import { GroupRanking } from "@/components/mentor/group-ranking";
import { GroupSlots } from "@/components/mentor/group-slots";
import { GROUP_MESSAGE_MAX } from "@/lib/mentor/chat";
import { cn } from "@/lib/utils";

export interface MyGroup {
  id: string;
  name: string;
  scopeKey: string;
  /** Over: chat, questions and schedule stay readable, nothing new goes in. */
  archived?: boolean;
}

export interface PendingQuote {
  text: string;
  source?: string;
}

/**
 * The group chat inside the chat panel: one mentoring group at a time, its
 * members and mentors only.
 *
 * Lean on purpose. The class chat carries pins, voice rooms, images and
 * mentions; a group of a mentor and a handful of mentees needs to talk, see
 * who the mentor is, and quote the material they are stuck on ("Tanya
 * mentor" arrives here with the quote already attached).
 */
export function GroupTab({
  groups,
  pendingQuote,
  onQuoteConsumed,
  onLeft,
}: {
  groups: MyGroup[];
  pendingQuote: PendingQuote | null;
  onQuoteConsumed: () => void;
  /** After leaving a group: the panel drops it from the list. */
  onLeft: (groupId: string) => void;
}) {
  const [groupId, setGroupId] = useState<string | null>(groups[0]?.id ?? null);
  // The open group left the list (the person left it): open the next one.
  if (groupId && !groups.some((g) => g.id === groupId)) setGroupId(groups[0]?.id ?? null);
  const [leaving, setLeaving] = useState<"ask" | "busy" | null>(null);
  // A question from the material lands in the chat, whatever was open before.
  const [view, setView] = useState<"chat" | "pertanyaan" | "jadwal" | "peringkat">("chat");
  const [asQuestion, setAsQuestion] = useState(false);
  const [seenQuote, setSeenQuote] = useState<PendingQuote | null>(null);
  const archived = Boolean(groups.find((g) => g.id === groupId)?.archived);
  if (pendingQuote !== seenQuote) {
    setSeenQuote(pendingQuote);
    if (pendingQuote) {
      setView("chat");
      // A question needs a group that still takes messages.
      if (archived) setGroupId(groups.find((g) => !g.archived)?.id ?? groupId);
    }
  }
  const { messages, loading, hasMore, role, me, error, loadMore, send, remove, setAnswered } = useGroupChat(groupId);
  const [text, setText] = useState("");
  // Owned by the app-shell until sent or dismissed, so it survives switching
  // groups or closing the panel half-way through writing the question.
  const quote = pendingQuote;
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // "Tanya mentor" hands over a quote: put the cursor where the question goes.
  useEffect(() => {
    if (pendingQuote) inputRef.current?.focus();
  }, [pendingQuote]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, groupId]);

  const submit = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    const err = await send(content, quote, asQuestion || Boolean(quote));
    setSending(false);
    if (err) {
      toast.error(err);
      return;
    }
    setText("");
    setAsQuestion(false);
    if (quote) onQuoteConsumed();
  };

  const leave = async () => {
    if (!groupId) return;
    setLeaving("busy");
    try {
      const r = await fetch(`/api/mentor/groups/${groupId}/leave`, { method: "POST", credentials: "same-origin" });
      const b = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(b.error ?? "Belum berhasil keluar. Coba lagi.");
        setLeaving(null);
        return;
      }
      toast.success(`Kamu sudah keluar dari ${groups.find((g) => g.id === groupId)?.name ?? "grup ini"}.`);
      setLeaving(null);
      onLeft(groupId);
    } catch {
      toast.error("Koneksi terputus. Coba lagi.");
      setLeaving(null);
    }
  };

  const viewSwitch = (
    <>
      {/* One line, scrolling sideways when four tabs and "Keluar grup" do not fit. */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-3 py-1.5" role="tablist">
        {(["chat", "pertanyaan", "jadwal", "peringkat"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={cn(
              "min-h-9 shrink-0 whitespace-nowrap rounded-md px-3 text-xs font-medium transition-colors",
              view === v ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {v === "chat" ? "Chat" : v === "pertanyaan" ? "Pertanyaan" : v === "jadwal" ? "Jadwal" : "Peringkat"}
          </button>
        ))}
        {role === "member" && !archived && leaving === null && (
          <button
            type="button"
            onClick={() => setLeaving("ask")}
            className="ml-auto min-h-9 shrink-0 whitespace-nowrap rounded-md px-2 text-xs text-muted-foreground hover:text-destructive"
          >
            Keluar grup
          </button>
        )}
      </div>
      {leaving !== null && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-destructive/5 px-3 py-2">
          <p className="flex-1 text-xs text-foreground">
            Keluar dari {groups.find((g) => g.id === groupId)?.name ?? "grup ini"}? Kamu bisa masuk lagi lewat link atau
            kode grupnya selama masih dibuka.
          </p>
          <Button size="sm" variant="destructive" disabled={leaving === "busy"} onClick={() => void leave()}>
            {leaving === "busy" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Keluar"}
          </Button>
          <Button size="sm" variant="ghost" disabled={leaving === "busy"} onClick={() => setLeaving(null)}>
            Batal
          </Button>
        </div>
      )}
    </>
  );

  if (view === "pertanyaan" && groupId) {
    const questions = messages
      .filter((m) => m.isQuestion && !m.deleted)
      .sort(
        (a, b) =>
          Number(Boolean(a.answeredAt)) - Number(Boolean(b.answeredAt)) || b.createdAt.localeCompare(a.createdAt)
      );
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {groups.length > 1 && <GroupPicker groups={groups} groupId={groupId} onPick={setGroupId} />}
        {viewSwitch}
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {questions.length === 0 ? (
            <div className="mt-8 text-center">
              <CircleHelp className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                {archived ? (
                  "Grup ini tidak punya pertanyaan."
                ) : (
                  <>
                    Belum ada pertanyaan. Pakai &ldquo;Tanya mentor&rdquo; dari Rangkuman, atau tandai pesanmu sebagai
                    pertanyaan sebelum mengirim.
                  </>
                )}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {questions.map((m) => {
                const canMark = !archived && (role === "mentor" || (me !== null && m.accountId === me));
                return (
                  <li key={m.id} className="rounded-lg border border-border p-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground">{m.authorName}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(m.createdAt), "d MMM HH:mm", { locale: idLocale })}
                      </span>
                      <span
                        className={cn(
                          "ml-auto text-[10px] font-medium",
                          m.answeredAt ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {m.answeredAt ? "Terjawab" : "Belum terjawab"}
                      </span>
                    </div>
                    {m.quote && (
                      <figure className="mt-1 rounded-lg bg-muted/60 px-2.5 py-1.5">
                        {m.quoteSource && (
                          <figcaption className="text-[10px] font-medium text-muted-foreground">{m.quoteSource}</figcaption>
                        )}
                        <blockquote className="whitespace-pre-wrap text-xs text-foreground/80">{m.quote}</blockquote>
                      </figure>
                    )}
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">{m.content}</p>
                    {canMark && (
                      <button
                        type="button"
                        onClick={async () => {
                          const err = await setAnswered(m.id, !m.answeredAt);
                          if (err) toast.error(err);
                        }}
                        className="mt-1.5 min-h-9 text-xs font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {m.answeredAt ? "Buka lagi" : "Tandai terjawab"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  }

  if (view === "peringkat" && groupId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {groups.length > 1 && <GroupPicker groups={groups} groupId={groupId} onPick={setGroupId} />}
        {viewSwitch}
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <GroupRanking key={groupId} groupId={groupId} archived={archived} />
        </div>
      </div>
    );
  }

  if (view === "jadwal" && groupId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {groups.length > 1 && <GroupPicker groups={groups} groupId={groupId} onPick={setGroupId} />}
        {viewSwitch}
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {role === "mentor" && (
            <p className="mb-3 text-xs text-muted-foreground">
              Jadwal diatur dari{" "}
              <Link href="/partner" className="font-medium text-primary underline-offset-4 hover:underline">
                halaman Partner
              </Link>
              .
            </p>
          )}
          <GroupSessions key={groupId} groupId={groupId} canEdit={false} readOnly={archived} />
          {role === "member" && (
            <div className="mt-5">
              <h4 className="mb-2 text-sm font-semibold text-foreground">1-on-1 dengan mentor</h4>
              <GroupSlots key={`slots-${groupId}`} groupId={groupId} canEdit={false} readOnly={archived} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {groups.length > 1 && <GroupPicker groups={groups} groupId={groupId} onPick={setGroupId} />}
      {viewSwitch}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat chat grup
          </p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : messages.length === 0 ? (
          <div className="mt-8 text-center">
            <Users className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              {archived
                ? "Grup ini tidak punya pesan."
                : "Belum ada pesan. Yang kamu tulis di sini hanya terbaca oleh anggota grup dan mentornya."}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {hasMore && (
              <li className="text-center">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  className="min-h-9 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Muat pesan sebelumnya
                </button>
              </li>
            )}
            {messages.map((m) => {
              const own = me !== null && m.accountId === me;
              const canDelete = !archived && !m.deleted && (own || role === "mentor");
              return (
                <li key={m.id} className="group/msg">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-sm font-semibold", own ? "text-primary" : "text-foreground")}>
                      {m.authorName}
                    </span>
                    {m.isMentor && (
                      <Badge variant="mentor-outline" className="h-4 gap-0.5 px-1 text-[9px]">
                        <GraduationCap className="h-2.5 w-2.5" />
                        Mentor
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(m.createdAt), "d MMM HH:mm", { locale: idLocale })}
                    </span>
                    {m.isQuestion && !m.deleted && (
                      <span className={cn("text-[10px] font-medium", m.answeredAt ? "text-primary" : "text-muted-foreground")}>
                        {m.answeredAt ? "· Terjawab" : "· Pertanyaan"}
                      </span>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        aria-label="Hapus pesan"
                        onClick={async () => {
                          const err = await remove(m.id);
                          if (err) toast.error(err);
                        }}
                        className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover/msg:opacity-100 [@media(hover:none)]:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {m.deleted ? (
                    <p className="text-sm italic text-muted-foreground">Pesan dihapus</p>
                  ) : (
                    <>
                      {m.quote && (
                        <figure className="mt-1 rounded-lg bg-muted/60 px-2.5 py-1.5">
                          {m.quoteSource && (
                            <figcaption className="text-[10px] font-medium text-muted-foreground">
                              {m.quoteSource}
                            </figcaption>
                          )}
                          <blockquote className="whitespace-pre-wrap text-xs text-foreground/80">
                            {m.quote}
                          </blockquote>
                        </figure>
                      )}
                      <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-foreground">
                        {m.content}
                      </p>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      {archived ? (
        <p className="border-t border-border px-3 py-3 text-xs text-muted-foreground">
          Grup ini sudah diarsipkan. Pesan, pertanyaan, dan jadwalnya tetap bisa dibaca, tapi tidak bisa
          ditambah.
        </p>
      ) : (
      <div className="border-t border-border p-3">
        {quote && (
          <div className="mb-2 flex items-start gap-2 rounded-lg bg-muted/60 px-2.5 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium text-muted-foreground">
                Bertanya tentang{quote.source ? ` · ${quote.source}` : ""}
              </p>
              <p className="line-clamp-3 text-xs text-foreground/80">{quote.text}</p>
            </div>
            <button
              type="button"
              aria-label="Batalkan kutipan"
              onClick={onQuoteConsumed}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            type="button"
            aria-pressed={asQuestion || Boolean(quote)}
            disabled={Boolean(quote)}
            onClick={() => setAsQuestion((v) => !v)}
            title="Tandai sebagai pertanyaan untuk mentor"
            aria-label="Tandai sebagai pertanyaan"
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors",
              asQuestion || quote
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <CircleHelp className="h-4 w-4" />
          </button>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, GROUP_MESSAGE_MAX))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            rows={1}
            placeholder={quote || asQuestion ? "Tulis pertanyaanmu…" : "Tulis pesan ke grup…"}
            aria-label="Pesan ke grup"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          />
          <Button
            size="icon"
            className="h-11 w-11 shrink-0"
            onClick={() => void submit()}
            disabled={sending || !text.trim()}
            aria-label="Kirim"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      )}
    </div>
  );
}

function GroupPicker({
  groups,
  groupId,
  onPick,
}: {
  groups: MyGroup[];
  groupId: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto border-b border-border px-3 py-2">
      {groups.map((g) => (
        <button
          key={g.id}
          type="button"
          onClick={() => onPick(g.id)}
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
            g.id === groupId
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          {g.name}
          {g.archived && <span className="font-normal opacity-70"> · arsip</span>}
        </button>
      ))}
    </div>
  );
}
