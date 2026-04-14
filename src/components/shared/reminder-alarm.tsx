"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReminderAlarmProps {
  reminderTime: string | null; // "HH:MM" format
}

export function ReminderAlarm({ reminderTime }: ReminderAlarmProps) {
  const [isRinging, setIsRinging] = useState(false);
  const [hasFiredToday, setHasFiredToday] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAlarm = useCallback(() => {
    // Re-entry guard — if an AudioContext already exists, we're already ringing.
    // Prevents double-creation when the 30s check window + async setIsRinging race.
    if (audioCtxRef.current) return;
    setIsRinging(true);

    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      // Assertive alarm: rapid triple-beep pattern at higher frequency, repeating
      const playAlarmPattern = () => {
        if (!audioCtxRef.current) return;
        const now = ctx.currentTime;

        // Triple beep pattern (beep-beep-beep with short gaps)
        for (let i = 0; i < 3; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);

          // Alternate between two frequencies for urgency
          osc.type = "square";
          osc.frequency.value = i % 2 === 0 ? 1200 : 900;
          gain.gain.setValueAtTime(0.35, now + i * 0.18);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.12);
          osc.start(now + i * 0.18);
          osc.stop(now + i * 0.18 + 0.12);
        }
      };

      playAlarmPattern();
      // Repeat every 800ms (fast tempo) until dismissed
      intervalRef.current = setInterval(playAlarmPattern, 800);
    } catch {
      // Audio not available - visual only
    }
  }, []);

  const dismiss = useCallback(() => {
    setIsRinging(false);
    setHasFiredToday(true);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  }, []);

  // Check every 30 seconds if it's time to ring
  useEffect(() => {
    if (!reminderTime || isRinging) return;

    const check = () => {
      if (hasFiredToday) return;

      const now = new Date();
      const [h, m] = reminderTime.split(":").map(Number);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const targetMinutes = h * 60 + m;

      // Fire if within 1 minute of target time
      if (
        currentMinutes >= targetMinutes &&
        currentMinutes < targetMinutes + 1
      ) {
        startAlarm();
      }
    };

    check();
    const timer = setInterval(check, 30_000);
    return () => clearInterval(timer);
  }, [reminderTime, isRinging, hasFiredToday, startAlarm]);

  // Reset hasFiredToday when the calendar day changes (timezone/DST-safe)
  useEffect(() => {
    const getToday = () => new Date().toDateString();
    let lastDay = getToday();
    const checkDayChange = () => {
      const today = getToday();
      if (today !== lastDay) {
        lastDay = today;
        setHasFiredToday(false);
      }
    };
    const timer = setInterval(checkDayChange, 60_000);
    return () => clearInterval(timer);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  return (
    <AnimatePresence>
      {isRinging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="mx-4 flex max-w-sm flex-col items-center gap-6 rounded-2xl border border-border bg-card p-8 text-center shadow-2xl"
          >
            {/* Animated bell */}
            <motion.div
              animate={{
                rotate: [0, -15, 15, -10, 10, -5, 5, 0],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                repeatDelay: 0.2,
              }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/15"
            >
              <Bell className="h-10 w-10 text-destructive" />
            </motion.div>

            <div>
              <h2 className="font-heading text-xl font-bold">
                Waktunya Belajar!
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pengingat belajar pukul {reminderTime}
              </p>
            </div>

            <Button size="lg" variant="destructive" className="w-full gap-2" onClick={dismiss}>
              <X className="h-4 w-4" />
              Tutup Alarm
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
