"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Wordmark } from "@/components/landing/logo";
import { cn } from "@/lib/utils";

export interface AccountNavItem {
  id: string;
  label: string;
}

/**
 * Layout for the account page.
 *
 * Two shapes. On a wide screen a sticky contents list sits on the left and the
 * sections scroll past it, so five blocks never feel like a hunt. On a phone
 * there is no room for that, so each section heading sticks to the top as you
 * pass through it — you always know which block you are in without a menu
 * eating the screen.
 *
 * Tabs were the other option and were rejected: with five short blocks, tabs
 * hide four of them behind a guess, and on a phone the tab strip itself has to
 * scroll sideways.
 */
export function AccountShell({
  items,
  children,
}: {
  items: AccountNavItem[];
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const nodes = items
      .map((i) => document.getElementById(i.id))
      .filter((n): n is HTMLElement => Boolean(n));
    if (!nodes.length) return;

    // Fires on the section nearest the top of the viewport rather than the one
    // taking up the most space, which is what makes the highlight track where
    // the reader actually is.
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -55% 0px", threshold: 0 }
    );

    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [items]);

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-6 lg:px-8 lg:py-10">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Beranda
        </Link>
        <Wordmark className="text-sm" />
      </div>

      <div className="mt-8 gap-12 lg:grid lg:grid-cols-[12rem_1fr]">
        <nav aria-label="Bagian halaman" className="hidden lg:block">
          <ul className="sticky top-10 flex flex-col gap-0.5">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-sm transition-colors",
                    active === item.id
                      ? "bg-accent font-semibold text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col gap-10 lg:gap-14">{children}</div>
      </div>
    </div>
  );
}

/**
 * One block. The heading pins itself to the top on a phone and behaves
 * normally once there is a contents list to do that job instead.
 */
export function AccountSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <div className="sticky top-0 z-20 -mx-5 border-b border-border/60 bg-background/90 px-5 py-3 backdrop-blur lg:static lg:z-auto lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
        <h2 className="font-display text-base font-bold text-foreground lg:text-lg">
          {title}
        </h2>
      </div>
      {description && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}
