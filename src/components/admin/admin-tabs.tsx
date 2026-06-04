"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { durationFast } from "@/lib/motion";
import { QuickLicense } from "./quick-license";
import { LicenseTable } from "./license-table";
import { Statistics } from "./statistics";
import { ActivityLogs } from "./activity-logs";
import { ErrorLogs } from "./error-logs";
import { AdminAnnouncements } from "./announcements";
import { PurchaseQueue } from "./purchase-queue";
import { DangerZone } from "./danger-zone";
import { FeedbackList } from "./feedback-list";
import { AdminSupportChat } from "./admin-support-chat";
import { useAdminScope } from "@/components/providers/admin-scope-provider";
import { useAdminPurchaseCount } from "@/hooks/use-admin-purchase-count";
import {
  Zap,
  KeyRound,
  BarChart3,
  ScrollText,
  Megaphone,
  ShoppingCart,
  MessageSquarePlus,
  Headphones,
} from "lucide-react";

const TABS = [
  { label: "Quick", icon: Zap, value: 0 },
  { label: "Lisensi", icon: KeyRound, value: 1 },
  { label: "Statistik", icon: BarChart3, value: 2 },
  { label: "Log", icon: ScrollText, value: 3 },
  { label: "Broadcast", icon: Megaphone, value: 4 },
  { label: "Purchase", icon: ShoppingCart, value: 5 },
  { label: "Feedback", icon: MessageSquarePlus, value: 6 },
  { label: "Support", icon: Headphones, value: 7 },
] as const;

interface AdminTabsProps {
  activeTab: number;
  onTabChange: (tab: number) => void;
}

export function AdminTabs({ activeTab, onTabChange }: AdminTabsProps) {
  const [feedbackCount, setFeedbackCount] = useState(0);
  const { scopeQuery, adminScopeKey, isAllPeriods } = useAdminScope();
  const { pendingCount, refresh: refreshPurchaseCount } = useAdminPurchaseCount({ scopeQuery });
  const [purchaseReload, setPurchaseReload] = useState(0);

  useEffect(() => {
    fetch("/api/feedback?countUnread=true")
      .then((r) => r.json())
      .then((data) => setFeedbackCount(data.unreadCount || 0))
      .catch(() => {});
    // Refresh the pending-purchase badge on tab change (e.g. after approve/reject).
    refreshPurchaseCount();
  }, [activeTab, refreshPurchaseCount]); // Refetch when switching tabs (e.g. after marking as read)

  return (
    <Tabs
      value={activeTab}
      onValueChange={(val) => onTabChange(val as number)}
    >
      <TabsList className="w-full overflow-x-auto" variant="line">
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.value === 5 && pendingCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-white">
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}
            {tab.value === 6 && feedbackCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-white">
                {feedbackCount > 9 ? "9+" : feedbackCount}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          className="mt-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={durationFast}
        >
          <TabsContent value={0}>
            <QuickLicense />
          </TabsContent>
          <TabsContent value={1}>
            <LicenseTable />
          </TabsContent>
          <TabsContent value={2}>
            <Statistics />
          </TabsContent>
          <TabsContent value={3}>
            <div className="space-y-6">
              <ActivityLogs />
              <ErrorLogs />
            </div>
          </TabsContent>
          <TabsContent value={4}>
            <AdminAnnouncements />
          </TabsContent>
          <TabsContent value={5}>
            <div className="space-y-6">
              <PurchaseQueue reloadToken={purchaseReload} />
              <DangerZone
                purchaseScopeKey={adminScopeKey}
                purchaseIsAllPeriods={isAllPeriods}
                purchaseScopeQuery={scopeQuery}
                onPurchasesCleared={() => {
                  setPurchaseReload((n) => n + 1);
                  refreshPurchaseCount();
                }}
              />
            </div>
          </TabsContent>
          <TabsContent value={6}>
            <FeedbackList />
          </TabsContent>
          <TabsContent value={7}>
            <AdminSupportChat />
          </TabsContent>
        </motion.div>
      </AnimatePresence>
    </Tabs>
  );
}
