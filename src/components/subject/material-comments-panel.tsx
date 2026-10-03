"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import { Check, ChevronDown, Link2, Loader2, MessageSquare, Pencil, RotateCcw, SmilePlus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  COMMENT_BODY_MAX,
  COMMENT_EMOJI,
  type CommentAnchor,
  type CommentVisibility,
  type MaterialComment,
} from "@/lib/comments";
import { cn } from "@/lib/utils";

type Result = Promise<string | null>;

export interface CommentsPanelProps {
  comments: MaterialComment[];
  groups: { id: string; name: string }[];
  canComment: boolean;
  /** Threads whose passage was found in the current text; null until the marks are placed. */
  placed: Set<string> | null;
  activeId: string | null;
  onActivate: (id: string) => void;
  draft: CommentAnchor | null;
  onDraftDone: () => void;
  onCreate: (input: { body: string; visibility: CommentVisibility; groupId?: string | null; anchor: CommentAnchor }) => Result;
  onReply: (parentId: string, body: string) => Result;
  onEdit: (id: string, body: string) => Result;
  onResolve: (id: string, resolved: boolean) => Result;
  onRemove: (id: string) => Result;
  onReact: (id: string, emoji: string) => Result;
  linkFor: (rootId: string) => string;
  onClose: () => void;
}

function ago(iso: string): string {
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true, locale: idLocale });
}

/** Body text with @mentions set in bold. */
function Body({ text }: { text: string }) {
  const parts = text.split(/(@[\p{L}\p{N}_]{2,30})/u);
  return (
    <p className="whitespace-pre-wrap break-words text-sm text-foreground">
      {parts.map((p, i) => (p.startsWith("@") ? <strong key={i}>{p}</strong> : <span key={i}>{p}</span>))}
    </p>
  );
}

/**
 * The comments column of a Rangkuman module: threads in the order their
 * passages appear, the ones whose text changed after them (never dropped),
 * and the finished ones folded at the bottom.
 */
export function MaterialCommentsPanel(p: CommentsPanelProps) {
  const [showDone, setShowDone] = useState(false);
  const roots = p.comments.filter((c) => !c.parentId);
  const isPlaced = (id: string) => !p.placed || p.placed.has(id);
  const repliesOf = (id: string) => p.comments.filter((c) => c.parentId === id);
  const byPlace = (a: MaterialComment, b: MaterialComment) =>
    (a.anchor?.line ?? 0) - (b.anchor?.line ?? 0) || (a.anchor?.start ?? 0) - (b.anchor?.start ?? 0);
  const open = roots.filter((r) => !r.resolvedAt);
  const inText = open.filter((r) => isPlaced(r.id)).sort(byPlace);
  const moved = open.filter((r) => !isPlaced(r.id));
  const done = roots.filter((r) => r.resolvedAt);
  const groupName = (id: string | null) => p.groups.find((g) => g.id === id)?.name;

  // A link to a finished thread unfolds the list once; folding it again stays folded.
  const [unfoldedFor, setUnfoldedFor] = useState<string | null>(null);
  if (p.activeId && p.activeId !== unfoldedFor && done.some((r) => r.id === p.activeId)) {
    setUnfoldedFor(p.activeId);
    setShowDone(true);
  }

  // Bring the open thread into view inside the list.
  useEffect(() => {
    if (!p.activeId) return;
    document.getElementById(`komentar-${p.activeId}`)?.scrollIntoView({ block: "nearest" });
  }, [p.activeId, showDone]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <MessageSquare className="h-4 w-4 text-primary" />
        <p className="flex-1 text-sm font-semibold text-foreground">Komentar</p>
        <button
          type="button"
          onClick={p.onClose}
          aria-label="Tutup komentar"
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {p.draft && (
          <Composer
            anchor={p.draft}
            groups={p.groups}
            onCancel={p.onDraftDone}
            onSubmit={async (input) => {
              const err = await p.onCreate({ ...input, anchor: p.draft! });
              if (err) toast.error(err);
              else p.onDraftDone();
              return err;
            }}
          />
        )}

        {!p.draft && open.length === 0 && done.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {p.canComment
              ? "Belum ada komentar di modul ini. Sorot teks, lalu pilih “Komentar”."
              : "Masuk dengan akunmu untuk berkomentar."}
          </p>
        )}

        {inText.map((r) => (
          <Thread key={r.id} root={r} replies={repliesOf(r.id)} groupName={groupName(r.groupId)} {...p} />
        ))}

        {moved.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Teks sudah berubah</p>
            {moved.map((r) => (
              <Thread key={r.id} root={r} replies={repliesOf(r.id)} groupName={groupName(r.groupId)} moved {...p} />
            ))}
          </div>
        )}

        {done.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowDone((v) => !v)}
              aria-expanded={showDone}
              className="flex min-h-9 items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showDone && "rotate-180")} />
              Selesai ({done.length})
            </button>
            {showDone && (
              <div className="mt-2 space-y-3">
                {done.map((r) => (
                  <Thread key={r.id} root={r} replies={repliesOf(r.id)} groupName={groupName(r.groupId)} {...p} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Composer({
  anchor,
  groups,
  onCancel,
  onSubmit,
}: {
  anchor: CommentAnchor;
  groups: { id: string; name: string }[];
  onCancel: () => void;
  onSubmit: (input: { body: string; visibility: CommentVisibility; groupId?: string | null }) => Result;
}) {
  const [body, setBody] = useState("");
  // Private until the author says otherwise: a question a student is shy
  // about should not land in front of the class by default.
  const [target, setTarget] = useState<string>("private");
  const [busy, setBusy] = useState(false);
  const options = [
    { value: "private", label: "Hanya aku" },
    ...groups.map((g) => ({ value: `group:${g.id}`, label: `Grup ${g.name}` })),
    { value: "period", label: "Semua di periode ini" },
  ];

  const send = async () => {
    if (!body.trim() || busy) return;
    setBusy(true);
    const visibility: CommentVisibility = target.startsWith("group:") ? "group" : (target as CommentVisibility);
    await onSubmit({ body: body.trim(), visibility, groupId: target.startsWith("group:") ? target.slice(6) : null });
    setBusy(false);
  };

  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 p-2.5">
      <blockquote className="line-clamp-2 border-border text-xs text-muted-foreground">“{anchor.text}”</blockquote>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, COMMENT_BODY_MAX))}
        rows={3}
        autoFocus
        aria-label="Tulis komentar"
        placeholder="Tulis komentar. Sebut orang dengan @nama."
        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      />
      <label className="mt-2 block text-xs font-medium text-foreground">
        Siapa yang bisa melihat
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-2 flex gap-2">
        <Button className="h-11 gap-2" onClick={() => void send()} disabled={busy || !body.trim()}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Kirim
        </Button>
        <Button variant="ghost" className="h-11" onClick={onCancel}>
          Batal
        </Button>
      </div>
    </div>
  );
}

function Thread(
  props: CommentsPanelProps & {
    root: MaterialComment;
    replies: MaterialComment[];
    groupName?: string;
    moved?: boolean;
  }
) {
  const { root, replies, groupName, moved } = props;
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const active = props.activeId === root.id;
  const vis =
    root.visibility === "private" ? "Hanya kamu" : root.visibility === "group" ? `Grup ${groupName ?? ""}`.trim() : "Semua di periode ini";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(props.linkFor(root.id));
      toast.success("Link komentar tersalin.");
    } catch {
      toast.error("Browser menolak menyalin.");
    }
  };

  return (
    <article
      id={`komentar-${root.id}`}
      className={cn(
        "rounded-lg border p-2.5 transition-colors",
        active ? "border-primary/60 bg-primary/5" : "border-border",
        root.resolvedAt && "opacity-75"
      )}
    >
      {root.anchor && (
        <button
          type="button"
          onClick={() => props.onActivate(root.id)}
          disabled={moved}
          className="w-full text-left disabled:cursor-default"
          title={moved ? undefined : "Lompat ke teksnya"}
        >
          <blockquote className="line-clamp-2 text-xs text-muted-foreground">“{root.anchor.text}”</blockquote>
          {moved && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Teks ini sudah berubah, jadi tandanya tidak bisa ditampilkan. Komentarnya tetap di sini.
            </p>
          )}
        </button>
      )}
      <p className="mt-1 text-[10px] text-muted-foreground">{vis}</p>

      <Message c={root} {...props} />
      {replies.map((r) => (
        <div key={r.id} className="mt-2 border-t border-border pt-2">
          <Message c={r} {...props} />
        </div>
      ))}

      <div className="mt-2 flex flex-wrap items-center gap-1">
        {!root.resolvedAt && props.canComment && (
          <button
            type="button"
            onClick={() => setReplying((v) => !v)}
            className="min-h-9 rounded-md px-2 text-xs font-medium text-foreground hover:bg-muted"
          >
            Balas
          </button>
        )}
        {root.canResolve && (
          <button
            type="button"
            onClick={async () => {
              const err = await props.onResolve(root.id, !root.resolvedAt);
              if (err) toast.error(err);
            }}
            className="flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-medium text-foreground hover:bg-muted"
          >
            {root.resolvedAt ? <RotateCcw className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            {root.resolvedAt ? "Buka lagi" : "Selesai"}
          </button>
        )}
        <button
          type="button"
          onClick={() => void copyLink()}
          aria-label="Salin link komentar"
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        >
          <Link2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {replying && (
        <div className="mt-2 flex items-end gap-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value.slice(0, COMMENT_BODY_MAX))}
            rows={2}
            autoFocus
            aria-label="Tulis balasan"
            placeholder="Balas…"
            className="min-h-11 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          />
          <Button
            className="h-11"
            disabled={!reply.trim()}
            onClick={async () => {
              const err = await props.onReply(root.id, reply.trim());
              if (err) {
                toast.error(err);
                return;
              }
              setReply("");
              setReplying(false);
            }}
          >
            Kirim
          </Button>
        </div>
      )}
    </article>
  );
}

function Message(props: CommentsPanelProps & { c: MaterialComment }) {
  const { c } = props;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(c.body ?? "");
  const [picking, setPicking] = useState(false);
  // Deleting asks once more: a removed comment cannot be brought back.
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="mt-1">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-foreground">{c.authorName}</span>
        <span className="text-[10px] text-muted-foreground">
          {ago(c.createdAt)}
          {c.editedAt ? " · diedit" : ""}
        </span>
        {c.isMine && !c.deleted && !editing && (
          <span className="ml-auto flex">
            <button
              type="button"
              aria-label="Edit komentar"
              onClick={() => setEditing(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Hapus komentar"
              onClick={() => setConfirming(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </span>
        )}
      </div>
      {confirming && (
        <div className="mt-1 flex flex-wrap items-center gap-2 rounded-md bg-destructive/10 px-2 py-1.5">
          <p className="flex-1 text-xs text-foreground">Hapus komentar ini? Tidak bisa dibatalkan.</p>
          <button
            type="button"
            onClick={async () => {
              setConfirming(false);
              const err = await props.onRemove(c.id);
              if (err) toast.error(err);
            }}
            className="min-h-8 rounded-md px-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
          >
            Hapus
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="min-h-8 rounded-md px-2 text-xs font-medium text-foreground hover:bg-muted"
          >
            Batal
          </button>
        </div>
      )}
      {c.deleted ? (
        <p className="text-sm italic text-muted-foreground">Komentar dihapus</p>
      ) : editing ? (
        <div className="mt-1 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, COMMENT_BODY_MAX))}
            rows={3}
            aria-label="Ubah komentar"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          />
          <div className="flex gap-2">
            <Button
              className="h-9"
              disabled={!text.trim()}
              onClick={async () => {
                const err = await props.onEdit(c.id, text.trim());
                if (err) toast.error(err);
                else setEditing(false);
              }}
            >
              Simpan
            </Button>
            <Button variant="ghost" className="h-9" onClick={() => setEditing(false)}>
              Batal
            </Button>
          </div>
        </div>
      ) : (
        <Body text={c.body ?? ""} />
      )}

      {!c.deleted && (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {c.reactions.map((r) => (
            <button
              key={r.emoji}
              type="button"
              aria-pressed={r.mine}
              onClick={async () => {
                const err = await props.onReact(c.id, r.emoji);
                if (err) toast.error(err);
              }}
              className={cn(
                "flex h-7 items-center gap-1 rounded-full border px-2 text-xs",
                r.mine ? "border-primary/50 bg-primary/10 text-foreground" : "border-border text-muted-foreground"
              )}
            >
              <span aria-hidden>{r.emoji}</span>
              {r.count}
            </button>
          ))}
          {props.canComment && (
            <button
              type="button"
              aria-label="Tambah reaksi"
              aria-expanded={picking}
              onClick={() => setPicking((v) => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
            >
              <SmilePlus className="h-3.5 w-3.5" />
            </button>
          )}
          {picking && (
            <span className="flex gap-0.5" role="group" aria-label="Pilih reaksi">
              {COMMENT_EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={async () => {
                    setPicking(false);
                    const err = await props.onReact(c.id, e);
                    if (err) toast.error(err);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-base hover:bg-muted"
                >
                  {e}
                </button>
              ))}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
