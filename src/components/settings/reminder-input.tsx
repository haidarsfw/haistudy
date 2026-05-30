"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RATE_LIMITS } from "@/lib/constants";
import { useTranslation } from "@/components/providers/language-provider";
import { toast } from "@/components/ui/toast";

interface ReminderInputProps {
  value: string | null;
  onChange: (reminder: string | null) => void;
}

export function ReminderInput({ value, onChange }: ReminderInputProps) {
  const { t } = useTranslation();
  const [testCooldown, setTestCooldown] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);

  const playTestBeep = () => {
    if (testCooldown) return;
    setTestCooldown(true);
    setTimeout(() => setTestCooldown(false), RATE_LIMITS.REMINDER_TEST_COOLDOWN_MS);

    try {
      if (!audioRef.current) {
        audioRef.current = new AudioContext();
      }
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.stop(ctx.currentTime + 0.5);
      toast.info(t("settings.reminder_audio_test"));
    } catch {
      toast.error(t("settings.reminder_audio_error"));
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        {t("settings.reminder_title")}
      </Label>
      <p className="text-xs text-muted-foreground">
        {t("settings.reminder_desc")}
      </p>

      <div className="flex items-center gap-2">
        <Input
          type="time"
          value={value || ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="h-9 w-32 text-sm"
          placeholder="HH:MM"
        />

        {value && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => onChange(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          onClick={playTestBeep}
          disabled={testCooldown}
        >
          <Play className="h-3 w-3" />
          {t("common.test")}
        </Button>
      </div>

      <AnimatePresence>
        {value && (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-xs text-muted-foreground overflow-hidden"
          >
            {t("settings.reminder_alarm_active")} <span className="font-medium">{value}</span>{" "}
            {t("settings.reminder_alarm_daily")}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
