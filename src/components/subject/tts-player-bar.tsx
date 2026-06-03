"use client";

import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  ChevronDown,
  X,
} from "lucide-react";
import type { UseTTSReturn } from "@/hooks/use-tts";

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

interface TTSPlayerBarProps {
  tts: UseTTSReturn;
  onClose: () => void;
  /** When true, renders inline (no fixed positioning) - for use inside fullscreen modals */
  inline?: boolean;
}

export function TTSPlayerBar({ tts, onClose, inline }: TTSPlayerBarProps) {
  const {
    isPlaying,
    isPaused,
    currentSectionIndex,
    totalSections,
    currentSectionTitle,
    selectedVoice,
    availableVoices,
    speed,
    play,
    pause,
    resume,
    stop,
    nextSection,
    prevSection,
    setSpeed,
    setVoice,
  } = tts;

  const handlePlayPause = () => {
    if (isPaused) {
      resume();
    } else if (isPlaying) {
      pause();
    } else {
      play(currentSectionIndex);
    }
  };

  const handleStop = () => {
    stop();
    onClose();
  };

  const sectionProgress =
    totalSections > 0
      ? Math.round(((currentSectionIndex + 1) / totalSections) * 100)
      : 0;

  // Friendly voice name: strip "Google" / "Microsoft" prefix noise
  const voiceLabel = (v: SpeechSynthesisVoice) => {
    let name = v.name;
    // Remove common prefixes
    name = name.replace(/^(Google |Microsoft |Apple )/i, "");
    // Keep it short
    if (name.length > 18) name = name.slice(0, 18) + "…";
    return name;
  };

  return (
    <div className={inline
      ? "shrink-0 animate-in slide-in-from-bottom duration-300"
      : "fixed bottom-[calc(var(--hs-mobile-nav)+env(safe-area-inset-bottom))] sm:bottom-0 left-0 sm:left-16 right-0 z-50 animate-in slide-in-from-bottom duration-300"
    }>
      {/* Progress bar */}
      <div className="h-0.5 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${sectionProgress}%` }}
        />
      </div>

      {/* Player body */}
      <div className={`border-t border-border/50 px-3 sm:px-4 py-2 ${
        inline ? "bg-background" : "bg-background/80 backdrop-blur-xl"
      }`}>
        <div className="max-w-4xl mx-auto flex items-center gap-2 sm:gap-3">
          {/* ── Play controls ── */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => prevSection()}
              disabled={currentSectionIndex === 0}
              className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              title="Section sebelumnya"
            >
              <SkipBack className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={handlePlayPause}
              className="rounded-full p-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              title={isPaused ? "Lanjutkan" : isPlaying ? "Pause" : "Play"}
            >
              {isPaused || !isPlaying ? (
                <Play className="h-4 w-4 ml-0.5" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </button>

            <button
              onClick={() => nextSection()}
              disabled={currentSectionIndex >= totalSections - 1}
              className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              title="Section berikutnya"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* ── Section title ── */}
          <div className="flex-1 min-w-0 flex items-center gap-1.5">
            <Volume2 className="h-3.5 w-3.5 text-primary shrink-0 hidden sm:block" />
            <div className="min-w-0">
              <p className="text-xs font-medium truncate leading-tight">
                {currentSectionTitle || "Siap diputar"}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Section {currentSectionIndex + 1}/{totalSections}
                {isPaused && " • Dijeda"}
              </p>
            </div>
          </div>

          {/* ── Speed selector ── */}
          <div className="relative shrink-0 group">
            <button
              className="rounded-md px-1.5 py-0.5 text-[11px] font-medium bg-muted hover:bg-muted/80 transition-colors tabular-nums"
              title="Kecepatan"
            >
              {speed}x <ChevronDown className="h-2.5 w-2.5 inline -mt-0.5" />
            </button>
            <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block group-focus-within:block">
              <div className="bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[60px]">
                {SPEED_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`block w-full text-left px-3 py-1 text-xs transition-colors ${
                      speed === s
                        ? "text-primary font-semibold bg-primary/5"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Voice selector (if multiple voices available) ── */}
          {availableVoices.length > 1 && (
            <div className="relative shrink-0 group hidden sm:block">
              <button
                className="rounded-md px-1.5 py-0.5 text-[11px] font-medium bg-muted hover:bg-muted/80 transition-colors max-w-[90px] truncate"
                title="Pilih suara"
              >
                {selectedVoice ? voiceLabel(selectedVoice) : "Suara"}{" "}
                <ChevronDown className="h-2.5 w-2.5 inline -mt-0.5" />
              </button>
              <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block group-focus-within:block">
                <div className="bg-popover border border-border rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto min-w-[180px]">
                  {availableVoices.map((v) => (
                    <button
                      key={v.voiceURI}
                      onClick={() => setVoice(v)}
                      className={`block w-full text-left px-3 py-1.5 text-xs transition-colors ${
                        selectedVoice?.voiceURI === v.voiceURI
                          ? "text-primary font-semibold bg-primary/5"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="font-medium">{voiceLabel(v)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Stop/Close ── */}
          <button
            onClick={handleStop}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
            title="Stop"
          >
            {isPlaying ? (
              <Square className="h-3.5 w-3.5" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
