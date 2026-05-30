"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";
import {
  ALL_EMOJIS,
  EMOJI_CATEGORIES,
  loadRecentEmojis,
  pushRecentEmoji,
} from "@/lib/support/emoji-data";

interface Props {
  onSelect: (emoji: string) => void;
  /** Compact (used inside popover); default false. */
  compact?: boolean;
}

/**
 * Lightweight emoji grid with category tabs + recently-used + search.
 * No external library - keeps bundle slim.
 */
export function SupportEmojiPicker({ onSelect, compact = false }: Props) {
  const { t } = useTranslation();
  const [active, setActive] = useState<string>("recent");
  const [search, setSearch] = useState("");
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(loadRecentEmojis());
  }, []);

  const handlePick = (emoji: string) => {
    pushRecentEmoji(emoji);
    setRecent(loadRecentEmojis());
    onSelect(emoji);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.trim().toLowerCase();
    // No emoji name DB - fall back to substring match on the emoji char itself
    // (works for direct emoji paste). For text search we surface ALL_EMOJIS as
    // a graceful fallback.
    return ALL_EMOJIS.filter((e) => e.includes(q) || q === "" );
  }, [search]);

  const categoriesWithRecent = useMemo(
    () => [
      { id: "recent", labelKey: "support.recently_used_emoji", emojis: recent },
      ...EMOJI_CATEGORIES,
    ],
    [recent]
  );

  const currentCat =
    categoriesWithRecent.find((c) => c.id === active) ?? categoriesWithRecent[1];

  const showSearch = !compact;

  return (
    <div
      className="flex w-full flex-col"
      style={{ maxHeight: compact ? 280 : 360 }}
    >
      {showSearch && (
        <div className="border-b border-border p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("support.emoji_search_placeholder")}
              className="w-full rounded-md border border-border bg-background pl-7 pr-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {search.trim() && filtered ? (
          filtered.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              {t("support.emoji_no_results")}
            </p>
          ) : (
            <div className="grid grid-cols-8 gap-1">
              {filtered.map((e) => (
                <button
                  key={e}
                  onClick={() => handlePick(e)}
                  className="flex aspect-square items-center justify-center rounded text-xl transition-colors hover:bg-muted"
                >
                  {e}
                </button>
              ))}
            </div>
          )
        ) : currentCat.emojis.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {t("support.emoji_no_results")}
          </p>
        ) : (
          <div className="grid grid-cols-8 gap-1">
            {currentCat.emojis.map((e) => (
              <button
                key={e}
                onClick={() => handlePick(e)}
                className="flex aspect-square items-center justify-center rounded text-xl transition-colors hover:bg-muted"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-t border-border bg-muted/30 px-1 py-1">
        {categoriesWithRecent.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setActive(cat.id);
              setSearch("");
            }}
            className={`flex h-7 min-w-[36px] items-center justify-center rounded text-base transition-colors ${
              active === cat.id ? "bg-primary/15 text-primary" : "hover:bg-muted"
            }`}
            title={t(cat.labelKey)}
            aria-label={t(cat.labelKey)}
          >
            {cat.id === "recent" ? "🕒" : cat.emojis[0] ?? "✨"}
          </button>
        ))}
      </div>
    </div>
  );
}
