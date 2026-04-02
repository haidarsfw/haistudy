"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/components/providers/session-provider";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useSession();
  const [activeTab, setActiveTab] = useState(0);

  // Deep-link: /admin?tab=7 opens the Support tab directly
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      const n = parseInt(tabParam, 10);
      if (!isNaN(n) && n >= 0 && n <= 7) setActiveTab(n);
    }
  }, [searchParams]);

  const handleBack = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  if (!session?.isAdmin) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Kelola lisensi, pengguna, dan konten haistudy
          </p>
        </div>
      </div>

      {/* Tabs */}
      <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
