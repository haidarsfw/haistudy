"use client";

import { memo } from "react";
import {
  FileText,
  BookOpen,
  List,
  Layers,
  HelpCircle,
  MessageSquare,
  StickyNote,
  BookMarked,
  ClipboardList,
  Zap,
  PenLine,
} from "lucide-react";
import { sounds } from "@/lib/sounds";

// Diktat (7) + Soal Ujian (8) sit right after Materi in display order but keep
// high ids so existing tab numbers (Forum=5, Catatan=6) and ?tab= deep-links
// stay stable. They only appear for subjects that tag materi items with `tab`.
// Belajar Kilat (9) sits right after Materi too; only shows for subjects that
// ship a Kilat feed.
export const SUBJECT_TABS = [
  { id: 0, label: "Materi", shortLabel: "Materi", icon: FileText },
  { id: 9, label: "Belajar Kilat", shortLabel: "Kilat", icon: Zap },
  { id: 10, label: "Latihan Soal", shortLabel: "Latihan", icon: PenLine },
  { id: 7, label: "Diktat", shortLabel: "Diktat", icon: BookMarked },
  { id: 8, label: "Soal Ujian", shortLabel: "Soal", icon: ClipboardList },
  { id: 1, label: "Rangkuman", shortLabel: "Rangkum", icon: BookOpen },
  { id: 2, label: "Kisi-Kisi", shortLabel: "Kisi", icon: List },
  // Merged Flashcards + Quiz (s2/uas/bm onward). Hidden elsewhere; ids 3+4 below
  // stay for earlier scopes that still show them separately.
  { id: 11, label: "Drill", shortLabel: "Drill", icon: Layers },
  { id: 3, label: "Flashcards", shortLabel: "Flash", icon: Layers },
  { id: 4, label: "Quiz", shortLabel: "Quiz", icon: HelpCircle },
  { id: 5, label: "Forum", shortLabel: "Forum", icon: MessageSquare },
  { id: 6, label: "Catatan", shortLabel: "Notes", icon: StickyNote },
] as const;

interface TabNavProps {
  activeTab: number;
  onTabChange: (tab: number) => void;
  counts?: Record<number, number>;
  tabDots?: Record<number, boolean>;
  /** Tab ids to hide entirely (e.g. content tabs with no data). */
  hiddenTabs?: ReadonlySet<number>;
}

export const TabNav = memo(function TabNav({
  activeTab,
  onTabChange,
  counts,
  tabDots,
  hiddenTabs,
}: TabNavProps) {
  return (
    <div className="border-b border-border">
      {/* Mobile: single inline row that scrolls horizontally (icon + label like
          desktop — clear widths, no empty gaps, not tall). Desktop (sm+): wraps. */}
      <div className="relative flex overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
        {SUBJECT_TABS.filter((tab) => !hiddenTabs?.has(tab.id)).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { sounds.click(); onTabChange(tab.id); }}
              className={`hs-press relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative">
                <tab.icon className="h-4 w-4 shrink-0" />
                {tabDots?.[tab.id] && (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </div>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
              {counts?.[tab.id] !== undefined &&
                counts[tab.id] > 0 && (
                  <span className="hidden sm:inline text-[10px] text-muted-foreground/70">
                    ({counts[tab.id]})
                  </span>
                )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary tab-indicator-anim" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});
