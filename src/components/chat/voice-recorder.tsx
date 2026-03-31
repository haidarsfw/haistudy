"use client";

import { motion } from "framer-motion";
import { Square, Play, Pause, Trash2, Send } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";

interface VoiceRecorderProps {
  onSend: (blob: Blob) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    pause,
    resume,
    discardRecording,
  } = useAudioRecorder();

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-start recording
  useEffect(() => {
    startRecording();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track playback progress via timeupdate
  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setPlaybackProgress((audio.currentTime / audio.duration) * 100);
  }, []);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handlePlayPause = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handlePlaybackEnded = () => {
    setIsPlaying(false);
    setPlaybackProgress(0);
  };

  const handleSend = () => {
    if (audioBlob) {
      // Stop preview playback before sending
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      setPlaybackProgress(0);
      onSend(audioBlob);
    }
  };

  const handleDiscard = () => {
    discardRecording();
    onCancel();
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-destructive">
        <span>{error}</span>
        <button
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground"
        >
          Batal
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex flex-col gap-1 px-3 py-2"
    >
      {isRecording ? (
        <>
          <div className="flex items-center gap-2">
            {/* Recording indicator */}
            <div className="flex items-center gap-2 flex-1">
              <div
                className={`h-2.5 w-2.5 rounded-full bg-red-500 ${
                  isPaused ? "" : "animate-pulse"
                }`}
              />
              <span className="text-sm font-mono tabular-nums text-foreground">
                {formatDuration(duration)}
              </span>
              <span className="text-xs text-muted-foreground">
                {isPaused ? "Paused" : "Recording..."}
              </span>
            </div>
            {/* Pause / Resume button */}
            <button
              onClick={isPaused ? resume : pause}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground hover:bg-muted/80 transition-colors"
            >
              {isPaused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </button>
            {/* Stop button */}
            <button
              onClick={stopRecording}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              <Square className="h-4 w-4" />
            </button>
          </div>
          {/* Recording progress bar */}
          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400"
              initial={{ width: "0%" }}
              animate={{ width: isPaused ? undefined : "100%" }}
              transition={
                isPaused
                  ? undefined
                  : { duration: 2, repeat: Infinity, ease: "linear" }
              }
            />
          </div>
        </>
      ) : audioBlob && audioUrl ? (
        <>
          <div className="flex items-center gap-2">
            {/* Audio preview */}
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={handlePlaybackEnded}
              onTimeUpdate={handleTimeUpdate}
            />
            <button
              onClick={handlePlayPause}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
            </button>
            <span className="text-xs text-muted-foreground flex-1">
              Voice note &middot; {formatDuration(duration)}
            </span>
            {/* Discard */}
            <button
              onClick={handleDiscard}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {/* Send */}
            <button
              onClick={handleSend}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          {/* Playback progress bar */}
          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200"
              style={{ width: `${playbackProgress}%` }}
            />
          </div>
        </>
      ) : null}
    </motion.div>
  );
}
