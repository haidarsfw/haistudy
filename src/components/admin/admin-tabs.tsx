"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { directionalPanel, NAV } from "@/lib/motion";
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
import { ReferralCodes } from "./referral-codes";
import { FeedbackDiscounts } from "./feedback-discounts";
import { ClassDiscounts } from "./class-discounts";
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
  Gift,
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
  { label: "Referral", icon: Gift, value: 8 },
] as const;

interface AdminTabsProps {
  activeTab: number;
  onTabChange: (tab: number) => void;
}

export function AdminTabs({ activeTab, onTabChange }: AdminTabsProps) {
  const [feedbackCount, setFeedbackCount] = useState(0);
  // Which way the panel should travel.
  //
  // Derived during render by comparing against the previous value, not in an
  // effect: the direction has to be known in the SAME render that swaps the
  // panel, and an effect runs after the animation has already started in the
  // wrong direction.
  const [prevTab, setPrevTab] = useState(activeTab);
  const [dir, setDir] = useState(1);
  if (prevTab !== activeTab) {
    setDir(activeTab > prevTab ? 1 : -1);
    setPrevTab(activeTab);
  }
  const reduced = useReducedMotion();
  const tabMotion = useMemo(
    () => directionalPanel(NAV.distance.tab, reduced),
    [reduced]
  );
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

      {/* Sideways in the direction you actually moved. Jumping from Lisensi to
          Feedback and back used to play the identical animation both ways,
          which is what made a row of eight tabs feel like eight unrelated
          screens instead of one strip you move along. */}
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={activeTab}
          custom={dir}
          className="mt-4"
          variants={tabMotion}
          initial="hidden"
          animate="visible"
          exit="exit"
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
          <TabsContent value={8}>
            {/* Both answer "how does this person end up paying less". Kept on
                one tab so two discounts cannot quietly contradict each other. */}
            <div className="space-y-4">
              <ReferralCodes />
              <FeedbackDiscounts />
              <ClassDiscounts />
            </div>
          </TabsContent>
        </motion.div>
      </AnimatePresence>
    </Tabs>
  );
}
