"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart3,
  Users,
  KeyRound,
  Trophy,
  Clock,
  Loader2,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface UserStat {
  licenseKey: string;
  name: string;
  userName: string;
  totalQuizScore: number;
  totalOnlineMinutes: number;
  isAdmin: boolean;
  isTester: boolean;
}

export function Statistics() {
  const [users, setUsers] = useState<UserStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllQuiz, setShowAllQuiz] = useState(false);
  const [showAllActive, setShowAllActive] = useState(false);

  useEffect(() => {
    const fetchUsers = () => {
      fetch("/api/admin/users")
        .then((r) => r.json())
        .then((data) => setUsers(data.users || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    };

    fetchUsers();

    // Supabase Realtime for license_keys changes (quiz scores, online minutes)
    if (isSupabaseConfigured) {
      const supabase = createClient();
      if (supabase) {
        const channel = supabase
          .channel("admin-stats")
          .on("postgres_changes", { event: "*", schema: "public", table: "license_keys" }, () => fetchUsers())
          .on("postgres_changes", { event: "*", schema: "public", table: "activations" }, () => fetchUsers())
          .subscribe();

        // Polling fallback every 30s (Realtime covers live updates)
        const interval = setInterval(fetchUsers, 30_000);
        return () => {
          clearInterval(interval);
          supabase.removeChannel(channel);
        };
      }
    }

    // Fallback: poll every 30s
    const interval = setInterval(fetchUsers, 30_000);
    return () => clearInterval(interval);
  }, []);

  const regularUsers = users.filter((u) => !u.isAdmin && !u.isTester);
  const totalKeys = users.length;
  
  // Use regularUsers for averages if available, otherwise use all users
  const statsPool = regularUsers.length > 0 ? regularUsers : users;
  const avgScore =
    statsPool.length > 0
      ? Math.round(
          statsPool.reduce((sum, u) => sum + u.totalQuizScore, 0) /
            statsPool.length
        )
      : 0;
  const avgMinutes =
    statsPool.length > 0
      ? Math.round(
          statsPool.reduce((sum, u) => sum + u.totalOnlineMinutes, 0) /
            statsPool.length
        )
      : 0;

  // Leaderboard: top 10 by quiz score (all users)
  const quizRankedAll = [...users]
    .filter((u) => u.totalQuizScore > 0)
    .sort((a, b) => b.totalQuizScore - a.totalQuizScore);
  const leaderboard = quizRankedAll.slice(0, 10);

  // Most active: top 10 by online minutes (all users)
  const activeRankedAll = [...users]
    .filter((u) => u.totalOnlineMinutes > 0)
    .sort((a, b) => b.totalOnlineMinutes - a.totalOnlineMinutes);
  const mostActive = activeRankedAll.slice(0, 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalKeys}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{regularUsers.length}</p>
              <p className="text-xs text-muted-foreground">Active Students</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgScore}</p>
              <p className="text-xs text-muted-foreground">Avg Quiz Score</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {avgMinutes >= 60
                  ? `${Math.floor(avgMinutes / 60)}h ${avgMinutes % 60}m`
                  : `${avgMinutes}m`
                }
              </p>
              <p className="text-xs text-muted-foreground">Avg Online Time</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Quiz Leaderboard */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Quiz Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Belum ada data
              </p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((user, i) => (
                  <div
                    key={user.licenseKey}
                    className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
                  >
                    <span
                      className={`w-6 text-center text-sm font-bold ${
                        i === 0
                          ? "text-yellow-500"
                          : i === 1
                            ? "text-gray-400"
                            : i === 2
                              ? "text-amber-600"
                              : "text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {user.userName}
                      </p>
                    </div>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {user.totalQuizScore}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            {quizRankedAll.length > 10 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowAllQuiz(true)}
              >
                Tampilkan Semua ({quizRankedAll.length})
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Most Active */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Most Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mostActive.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Belum ada data
              </p>
            ) : (
              <div className="space-y-2">
                {mostActive.map((user, i) => {
                  const hours = Math.floor(user.totalOnlineMinutes / 60);
                  const mins = user.totalOnlineMinutes % 60;
                  return (
                    <div
                      key={user.licenseKey}
                      className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
                    >
                      <span className="w-6 text-center text-sm font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {user.userName}
                        </p>
                      </div>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
            {activeRankedAll.length > 10 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowAllActive(true)}
              >
                Tampilkan Semua ({activeRankedAll.length})
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Show All Quiz Leaderboard Dialog */}
      <Dialog open={showAllQuiz} onOpenChange={setShowAllQuiz}>
        <DialogContent className="sm:max-w-md max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Quiz Leaderboard
            </DialogTitle>
            <DialogDescription>
              Semua pengguna berdasarkan quiz score
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-3">
            <div className="space-y-1">
              {quizRankedAll.map((user, i) => (
                <div
                  key={user.licenseKey}
                  className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
                >
                  <span
                    className={`w-6 text-center text-sm font-bold ${
                      i === 0
                        ? "text-yellow-500"
                        : i === 1
                          ? "text-gray-400"
                          : i === 2
                            ? "text-amber-600"
                            : "text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {user.userName}
                    </p>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {user.totalQuizScore}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Show All Most Active Dialog */}
      <Dialog open={showAllActive} onOpenChange={setShowAllActive}>
        <DialogContent className="sm:max-w-md max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Most Active
            </DialogTitle>
            <DialogDescription>
              Semua pengguna berdasarkan waktu online
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-3">
            <div className="space-y-1">
              {activeRankedAll.map((user, i) => {
                const hours = Math.floor(user.totalOnlineMinutes / 60);
                const mins = user.totalOnlineMinutes % 60;
                return (
                  <div
                    key={user.licenseKey}
                    className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
                  >
                    <span className="w-6 text-center text-sm font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {user.userName}
                      </p>
                    </div>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
