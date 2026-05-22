"use client";

import { Calendar } from "lucide-react";
import { useScopedData } from "@/components/providers/scoped-data-provider";

export function ExamSchedule() {
  const { weeklySchedule } = useScopedData();

  if (weeklySchedule.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm mb-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-heading font-semibold">Jadwal Kuliah</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Jadwal kuliah belum diatur untuk periode ini.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm mb-3">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="font-heading font-semibold">Jadwal Kuliah</span>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Hari</th>
              <th className="pb-2 pr-4 font-medium">Mata Kuliah</th>
              <th className="pb-2 pr-4 font-medium">Waktu</th>
              <th className="pb-2 font-medium">Sesi</th>
            </tr>
          </thead>
          <tbody>
            {weeklySchedule.map((s) => (
              <tr
                key={s.subjectId}
                className="border-b border-border/50 last:border-0"
              >
                <td className="py-2 pr-4 text-muted-foreground">{s.day}</td>
                <td className="py-2 pr-4 font-medium">{s.subject}</td>
                <td className="py-2 pr-4 text-muted-foreground tabular-nums">
                  {s.startTime} – {s.endTime}
                </td>
                <td className="py-2 text-muted-foreground">
                  {s.sessions} sesi
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="flex flex-col gap-2 sm:hidden">
        {weeklySchedule.map((s) => (
          <div
            key={s.subjectId}
            className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium">{s.subject}</p>
              <p className="text-[11px] text-muted-foreground">
                {s.day} &middot; {s.startTime}–{s.endTime}
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {s.sessions}x
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
