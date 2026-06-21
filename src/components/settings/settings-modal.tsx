"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Loader2,
  Palette,
  Clock,
  UserCircle,
  Volume2,
  Bell,
} from "lucide-react";
import { staggerContainer, staggerItem } from "@/lib/motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { useSettings } from "@/hooks/use-settings";
import { ThemePicker } from "./theme-picker";
import { FontPicker } from "./font-picker";
import { AccentPicker } from "./accent-picker";
import { LanguagePicker } from "./language-picker";
import { canUseVipFeatures } from "@/lib/tier";
import { DarkModeToggle } from "./dark-mode-toggle";
import { ReminderInput } from "./reminder-input";
import { PrivacyToggle } from "./privacy-toggle";
import { ReferralCard } from "./referral-card";
import { SessionInfo } from "./session-info";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { NotificationsSettingsTab } from "@/components/notifications/notifications-settings-tab";
import { Switch } from "@/components/ui/switch";
import { APP_VERSION } from "@/lib/constants";
import { isCropLocked } from "@/lib/crop-lock";
import { getSoundMuted, setSoundMuted, sounds } from "@/lib/sounds";
import { Download } from "lucide-react";
import { PWA_EVENTS, isStandalone } from "@/lib/pwa-version";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TABS = [
  { id: "appearance", icon: Palette, labelKey: "settings.appearance" },
  { id: "study", icon: Clock, labelKey: "settings.study" },
  { id: "notifications", icon: Bell, labelKey: "settings.notifications" },
  { id: "account", icon: UserCircle, labelKey: "settings.session" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { session } = useSession();
  const { t } = useTranslation();
  const { settings, isLoading, isSaving, updateSettings, refetch } = useSettings();
  const [activeTab, setActiveTab] = useState<TabId>("appearance");
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    setSoundEnabled(!getSoundMuted());
  }, []);

  // Refetch settings from server when modal opens
  useEffect(() => {
    if (open) refetch();
  }, [open, refetch]);

  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && isCropLocked()) return; onOpenChange(o); }}>
      <DialogContent className="flex flex-col w-[calc(100vw-2rem)] max-w-md sm:max-w-md max-h-[85dvh] p-0 overflow-hidden bg-background/90 backdrop-blur-xl border-border/30 data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-[0.96]">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t("settings.title")}
            {isSaving && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </DialogTitle>
          <DialogDescription>
            {t("settings.description")}
          </DialogDescription>
        </DialogHeader>

        {/* Custom tab bar */}
        <div className="flex shrink-0 gap-1 px-6 pt-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { sounds.click(); setActiveTab(tab.id); }}
                className={`relative flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t(tab.labelKey)}</span>
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-lg border border-primary/20"
                    layoutId="settings-tab-indicator"
                    transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Native scroll (no ScrollArea) so there's no overlay scrollbar gutter
            skewing the layout right; flex-1 + min-h-0 lets it fill the modal. */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 pb-6 pt-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="w-full min-w-0"
              >
                {activeTab === "appearance" && (
                  <motion.div
                    className="space-y-4"
                    variants={staggerContainer(0.06)}
                    initial="hidden"
                    animate="visible"
                  >
                    <motion.div
                      variants={staggerItem}
                      className="w-full min-w-0 rounded-xl bg-card/50 border border-primary/10 shadow-sm p-4 transition-all hover:border-primary/20 hover:shadow-primary/5"
                    >
                      <ThemePicker
                        value={settings.theme}
                        onChange={(theme) => updateSettings({ theme })}
                      />
                    </motion.div>

                    <motion.div
                      variants={staggerItem}
                      className="w-full min-w-0 rounded-xl bg-card/50 border border-primary/10 shadow-sm p-4 transition-all hover:border-primary/20 hover:shadow-primary/5"
                    >
                      <AccentPicker
                        value={settings.customAccent ?? null}
                        locked={!canUseVipFeatures(session)}
                        onChange={(customAccent) => updateSettings({ customAccent })}
                      />
                    </motion.div>

                    <motion.div
                      variants={staggerItem}
                      className="w-full min-w-0 rounded-xl bg-card/50 border border-primary/10 shadow-sm p-4 transition-all hover:border-primary/20 hover:shadow-primary/5"
                    >
                      <FontPicker
                        value={settings.font}
                        canUseVip={canUseVipFeatures(session)}
                        onChange={(font) => updateSettings({ font })}
                      />
                    </motion.div>

                    <motion.div
                      variants={staggerItem}
                      className="w-full min-w-0 rounded-xl bg-card/50 border border-primary/10 shadow-sm p-4 transition-all hover:border-primary/20 hover:shadow-primary/5"
                    >
                      <LanguagePicker
                        value={settings.language}
                        onChange={(language) => updateSettings({ language })}
                      />
                    </motion.div>

                    <motion.div
                      variants={staggerItem}
                      className="w-full min-w-0 rounded-xl bg-card/50 border border-primary/10 shadow-sm p-4 transition-all hover:border-primary/20 hover:shadow-primary/5"
                    >
                      <DarkModeToggle
                        darkMode={settings.darkMode}
                        schedule={settings.darkModeSchedule}
                        onDarkModeChange={(darkMode) =>
                          updateSettings({ darkMode })
                        }
                        onScheduleChange={(darkModeSchedule) =>
                          updateSettings({ darkModeSchedule })
                        }
                      />
                    </motion.div>
                  </motion.div>
                )}

                {activeTab === "study" && (
                  <motion.div
                    className="space-y-4"
                    variants={staggerContainer(0.06)}
                    initial="hidden"
                    animate="visible"
                  >
                    <motion.div
                      variants={staggerItem}
                      className="w-full min-w-0 rounded-xl bg-card/50 border border-primary/10 shadow-sm p-4 transition-all hover:border-primary/20 hover:shadow-primary/5"
                    >
                      <ReminderInput
                        value={settings.reminder}
                        onChange={(reminder) => updateSettings({ reminder })}
                      />
                    </motion.div>

                    <motion.div
                      variants={staggerItem}
                      className="w-full min-w-0 rounded-xl bg-card/50 border border-primary/10 shadow-sm p-4 transition-all hover:border-primary/20 hover:shadow-primary/5"
                    >
                      <PrivacyToggle
                        hideStatus={settings.hideStatus}
                        hideStatusChangedAt={settings.hideStatusChangedAt}
                        isAdmin={session.isAdmin}
                        onChange={(hideStatus) =>
                          updateSettings({
                            hideStatus,
                            hideStatusChangedAt: new Date().toISOString(),
                          })
                        }
                      />
                    </motion.div>

                    <motion.div
                      variants={staggerItem}
                      className="w-full min-w-0 rounded-xl bg-card/50 border border-primary/10 shadow-sm p-4 transition-all hover:border-primary/20 hover:shadow-primary/5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Volume2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{t("settings.sound_effects")}</p>
                            <p className="text-xs text-muted-foreground">{t("settings.sound_effects_desc")}</p>
                          </div>
                        </div>
                        <Switch
                          checked={soundEnabled}
                          onCheckedChange={(checked) => {
                            setSoundEnabled(checked);
                            setSoundMuted(!checked);
                            if (checked) sounds.toggle();
                          }}
                        />
                      </div>
                    </motion.div>

                    {!isStandalone() && (
                      <motion.div
                        variants={staggerItem}
                        className="w-full min-w-0 rounded-xl bg-card/50 border border-primary/10 shadow-sm p-4 transition-all hover:border-primary/20 hover:shadow-primary/5"
                      >
                        <button
                          onClick={() => {
                            sounds.click();
                            window.dispatchEvent(new Event(PWA_EVENTS.INSTALL_REQUEST));
                            onOpenChange(false);
                          }}
                          className="flex w-full items-center gap-2 text-left cursor-pointer"
                        >
                          <Download className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium">{t("settings.install_app")}</p>
                        </button>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {activeTab === "notifications" && (
                  <NotificationsSettingsTab />
                )}

                {activeTab === "account" && (
                  <motion.div
                    className="space-y-4"
                    variants={staggerContainer(0.06)}
                    initial="hidden"
                    animate="visible"
                  >
                    <motion.div
                      variants={staggerItem}
                      className="w-full min-w-0 rounded-xl bg-card/50 border border-primary/10 shadow-sm p-4 transition-all hover:border-primary/20 hover:shadow-primary/5"
                    >
                      <ProfileEditor onSaved={() => onOpenChange(false)} />
                    </motion.div>

                    <motion.div
                      variants={staggerItem}
                      className="w-full min-w-0 rounded-xl bg-card/50 border border-primary/10 shadow-sm p-4 transition-all hover:border-primary/20 hover:shadow-primary/5"
                    >
                      <ReferralCard />
                    </motion.div>

                    <motion.div
                      variants={staggerItem}
                      className="w-full min-w-0 rounded-xl bg-card/50 border border-primary/10 shadow-sm p-4 transition-all hover:border-primary/20 hover:shadow-primary/5"
                    >
                      <SessionInfo />
                    </motion.div>
                  </motion.div>
                )}

                {/* Version */}
                <div className="pt-4 flex justify-center">
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    haistudy v{APP_VERSION}
                  </Badge>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
