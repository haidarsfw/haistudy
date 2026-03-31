"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/session-provider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { session, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading && (!session || !session.isAdmin)) {
      router.push("/dashboard");
    }
  }, [isLoading, session, router]);

  useEffect(() => {
    document.title = "Admin Panel | haistudy";
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Memuat admin...</p>
        </div>
      </div>
    );
  }

  if (!session?.isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
