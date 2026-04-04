"use client";

import { Mic, MicOff, PhoneOff, Headphones } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { sounds } from "@/lib/sounds";
import type { VoiceRoom } from "@/types";

interface VoiceMiniBarProps {
  activeRoom: VoiceRoom;
  isMuted: boolean;
  onToggleMute: () => void;
  onLeave: () => void;
}

export function VoiceMiniBar({ activeRoom, isMuted, onToggleMute, onLeave }: VoiceMiniBarProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border bg-card/95 backdrop-blur-sm px-3 py-2 shadow-lg"
      >
        {/* Green pulse + room name */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          <Headphones className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium max-w-[120px] truncate">
            {activeRoom.name}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {activeRoom.participants.length}
          </span>
        </div>

        {/* Mute toggle */}
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 rounded-full ${isMuted ? "text-destructive hover:text-destructive" : "text-foreground"}`}
          onClick={() => { sounds.toggle(); onToggleMute(); }}
        >
          {isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
        </Button>

        {/* Leave */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => { sounds.leave(); onLeave(); }}
        >
          <PhoneOff className="h-3.5 w-3.5" />
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}
