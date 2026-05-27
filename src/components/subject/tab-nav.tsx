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
} from "lucide-react";
import { sounds } from "@/lib/sounds";

export const SUBJECT_TABS = [
  { id: 0, label: "Materi", shortLabel: "Materi", icon: FileText },
  { id: 1, label: "Rangkuman", shortLabel: "Rangkum", icon: BookOpen },
  { id: 2, label: "Kisi-Kisi", shortLabel: "Kisi", icon: List },
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
}

export const TabNav = memo(function TabNav({
  activeTab,
  onTabChange,
  counts,
  tabDots,
}: TabNavProps) {
  return (
    <div className="border-b border-border">
      <div className="relative flex flex-wrap">
        {SUBJECT_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { sounds.click(); onTabChange(tab.id); }}
              className={`relative flex items-center gap-1 px-2.5 sm:px-4 py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative">
                <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
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
