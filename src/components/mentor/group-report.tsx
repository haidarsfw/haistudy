"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import { Loader2, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

interface Report {
  generatedAt: string;
  group: { id: string; name: string; period: string; status: string; createdAt: string; mentor: string };
  sessions: {
    held: number;
    cancelled: number;
    upcoming: number;
    unclosed: number;
    hours: number;
    list: { id: string; title: string; startsAt: string; durationMinutes: number; present: number; of: number }[];
  };
  coverage: { covered: number; total: number; modules: { subject: string; module: string; session: string; date: string }[] };
  questions: { asked: number; answered: number };
  comments: number;
  left: number;
  members: {
    accountId: string;
    name: string;
    joinedAt: string | null;
    hasAccess: boolean;
    overall: number;
    exam: { attempts: number; avgScore: number | null };
    attended: number;
    sessions: number;
    questions: number;
  }[];
}

const day = (iso: string) => format(new Date(iso), "d MMM yyyy", { locale: idLocale });

/**
 * The program report of one group, as of the moment it is opened: what was
 * held, who came, what it covered, where each member stands. Laid out to be
 * read on screen and printed as is ("Cetak atau simpan PDF"), so the mentor
 * can hand it to the campus without retyping it.
 */
export function GroupReport({ groupId, printable = false }: { groupId: string; printable?: boolean }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/mentor/groups/${groupId}/report`, { credentials: "same-origin" })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!alive) return;
        if (r.ok) setReport(b as Report);
        else setError((b as { error?: string }).error ?? "Laporan belum bisa dibuat.");
      })
      .catch(() => alive && setError("Koneksi terputus."));
    return () => {
      alive = false;
    };
  }, [groupId]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!report) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Menyusun laporan
      </p>
    );
  }

  const { group, sessions, coverage, questions, members } = report;
  const totalSessions = members.reduce((n, m) => n + m.sessions, 0);
  const totalAttended = members.reduce((n, m) => n + m.attended, 0);
  const attendance = totalSessions ? Math.round((totalAttended / totalSessions) * 100) : null;
  const avgProgress = members.length ? Math.round(members.reduce((n, m) => n + m.overall, 0) / members.length) : null;

  const facts: [string, string][] = [
    ["Sesi terlaksana", `${sessions.held} sesi · ${sessions.hours.toLocaleString("id-ID")} jam`],
    ["Kehadiran rata-rata", attendance === null ? "Belum ada sesi tercatat" : `${attendance}%`],
    ["Modul dibahas di sesi", coverage.total ? `${coverage.covered} dari ${coverage.total}` : `${coverage.covered}`],
    ["Progres rata-rata anggota", avgProgress === null ? "Belum ada anggota" : `${avgProgress}%`],
    ["Pertanyaan di grup", `${questions.asked}, ${questions.answered} terjawab`],
    ["Komentar materi di grup", String(report.comments)],
  ];

  return (
    <div className="space-y-6 print:text-black">
      <header>
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground print:text-black">
          Laporan program · {group.name}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground print:text-black">
          {group.period} · Mentor {group.mentor} · grup dibuat {day(group.createdAt)}
          {group.status === "archived" ? " · sudah selesai" : ""}
        </p>
        <p className="text-xs text-muted-foreground print:text-black">
          Dihitung {format(new Date(report.generatedAt), "d MMM yyyy, HH.mm", { locale: idLocale })}
        </p>
        {printable && (
          <Button variant="outline" className="mt-3 h-11 gap-2 print:hidden" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Cetak atau simpan PDF
          </Button>
        )}
      </header>

      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground print:text-black">{label}</dt>
            <dd className="text-base font-semibold text-foreground print:text-black">{value}</dd>
          </div>
        ))}
      </dl>

      {(sessions.unclosed > 0 || sessions.upcoming > 0 || report.left > 0) && (
        <ul className="space-y-1 text-sm text-muted-foreground print:text-black">
          {sessions.unclosed > 0 && (
            <li>{sessions.unclosed} sesi sudah lewat tapi belum ditutup dengan catatan, jadi belum terhitung di sini.</li>
          )}
          {sessions.upcoming > 0 && <li>{sessions.upcoming} sesi masih dijadwalkan.</li>}
          {sessions.cancelled > 0 && <li>{sessions.cancelled} sesi dibatalkan.</li>}
          {report.left > 0 && <li>{report.left} anggota keluar dari grup sebelum laporan ini dibuat.</li>}
        </ul>
      )}

      <section>
        <h3 className="text-sm font-semibold text-foreground print:text-black">Anggota ({members.length})</h3>
        {members.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">Belum ada anggota.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground print:text-black">
                  <th className="py-2 pr-3 font-medium">Nama</th>
                  <th className="py-2 pr-3 font-medium">Progres</th>
                  <th className="py-2 pr-3 font-medium">Hadir</th>
                  <th className="py-2 pr-3 font-medium">Latihan Soal</th>
                  <th className="py-2 font-medium">Pertanyaan</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.accountId} className="border-b border-border/60 align-top">
                    <td className="py-2 pr-3 text-foreground print:text-black">
                      {m.name}
                      {!m.hasAccess && (
                        <span className="block text-xs text-muted-foreground print:text-black">belum punya akses periode ini</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-foreground print:text-black">{m.overall}%</td>
                    <td className="py-2 pr-3 tabular-nums text-foreground print:text-black">
                      {m.sessions ? `${m.attended}/${m.sessions}` : "–"}
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-foreground print:text-black">
                      {m.exam.attempts ? `${m.exam.attempts}× · rata-rata ${m.exam.avgScore ?? "–"}` : "–"}
                    </td>
                    <td className="py-2 tabular-nums text-foreground print:text-black">{m.questions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-1 text-xs text-muted-foreground print:text-black">
          Hadir dihitung dari sesi yang ditutup sesudah orangnya bergabung.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-foreground print:text-black">Sesi yang terlaksana</h3>
        {sessions.list.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">Belum ada sesi yang ditutup dengan catatan.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border/60">
            {sessions.list.map((s) => (
              <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2 text-sm">
                <span className="text-foreground print:text-black">
                  {day(s.startsAt)} · {s.title}
                </span>
                <span className="tabular-nums text-muted-foreground print:text-black">
                  {s.durationMinutes} menit · hadir {s.present}/{s.of}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-foreground print:text-black">Modul yang dibahas di sesi</h3>
        {coverage.modules.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Belum ada modul yang masuk agenda sesi yang sudah ditutup.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border/60">
            {coverage.modules.map((m) => (
              <li key={`${m.subject}/${m.module}`} className="py-2 text-sm">
                <span className="text-foreground print:text-black">
                  {m.subject} · {m.module}
                </span>
                <span className="block text-xs text-muted-foreground print:text-black">
                  {m.session}, {day(m.date)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
