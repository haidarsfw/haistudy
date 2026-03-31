"use client";

import { useState, useRef } from "react";
import { Play, Pause } from "lucide-react";

interface AudioPlayerProps {
  src: string;
}

export function AudioPlayer({ src }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!src) {
    return (
      <span className="text-xs text-muted-foreground italic">
        Audio tidak tersedia
      </span>
    );
  }

  if (hasError) {
    return (
      <span className="text-xs text-muted-foreground italic">
        Gagal memutar audio
      </span>
    );
  }

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => setHasError(true));
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (sec: number) => {
    if (!isFinite(sec) || isNaN(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 min-w-[160px] max-w-[240px]">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={() => {
          if (audioRef.current) {
            const d = audioRef.current.duration;
            if (isFinite(d) && !isNaN(d)) {
              setDuration(d);
            }
          }
        }}
        onTimeUpdate={() => {
          if (audioRef.current && duration > 0) {
            setProgress((audioRef.current.currentTime / duration) * 100);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          setProgress(0);
        }}
        onError={() => setHasError(true)}
      />
      <button
        onClick={togglePlay}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
      >
        {isPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3 ml-0.5" />
        )}
      </button>
      <div className="flex-1 space-y-1">
        <div className="h-1 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {formatTime(duration > 0 ? (isPlaying ? (audioRef.current?.currentTime || 0) : duration) : 0)}
        </span>
      </div>
    </div>
  );
}
