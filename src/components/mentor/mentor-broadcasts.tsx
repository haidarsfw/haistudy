"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";

interface Broadcast {
  id: string;
  body: string;
  createdAt: string;
}

/**
 * "Dari haistudy": the owner's latest messages to mentors, at the top of the
 * mentor's own page. Shows nothing for anyone who is not a mentor, or when
 * there is nothing to read.
 */
export function MentorBroadcasts() {
  const [items, setItems] = useState<Broadcast[]>([]);

  useEffect(() => {
    let alive = true;
    fetch("/api/mentor/broadcasts", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { broadcasts: [] }))
      .then((d: { broadcasts?: Broadcast[] }) => alive && setItems(d.broadcasts ?? []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!items.length) return null;
  return (
    <section aria-label="Dari haistudy" className="mt-3 rounded-xl border border-border bg-card p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Megaphone className="h-4 w-4 text-primary" /> Dari haistudy
      </h3>
      <ul className="mt-2 space-y-3">
        {items.map((b) => (
          <li key={b.id}>
            <p className="text-xs text-muted-foreground">
              {new Date(b.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{b.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
