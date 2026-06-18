"use client";

import { useState } from "react";
import { Music, Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMusic } from "@/components/providers/music-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { toast } from "@/components/ui/toast";

function mmss(ms: number): string {
  if (!ms || ms < 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MusicPlayer() {
  const { isPlaying, isReady, trackTitle, shuffleEnabled, loopEnabled, volume, isCustomPlaylist, position, duration, setVolume, toggle, next, previous, seek, toggleShuffle, toggleLoop, setPlaylistUrl, resetPlaylist } = useMusic();
  const { t } = useTranslation();
  const [urlInput, setUrlInput] = useState("");

  const applyUrl = () => {
    const raw = urlInput.trim();
    if (!raw) return;
    if (setPlaylistUrl(raw)) {
      toast.success("Playlist diganti. Lagi nyetel punyamu sekarang.");
      setUrlInput("");
    } else {
      toast.error("Link SoundCloud nggak valid. Pastikan dari soundcloud.com ya.");
    }
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            className={`group flex items-center gap-1 rounded-full px-2.5 py-1.5 backdrop-blur-sm border transition-[background-color,border-color,color] cursor-pointer ${
              isPlaying
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          />
        }
      >
        <div className="relative">
          <Music className="h-4 w-4 shrink-0" />
          {isPlaying && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background animate-pulse" />
          )}
        </div>
        <span className={`whitespace-nowrap text-xs font-medium transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[max-width,opacity] ${
          isPlaying
            ? "max-w-[120px] opacity-100"
            : "max-w-0 overflow-hidden opacity-0 group-hover:max-w-[120px] group-hover:opacity-100"
        }`}>
          {isPlaying && trackTitle ? trackTitle.slice(0, 15) : t("music.title")}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end" sideOffset={8}>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-semibold">{t("music.title")}</span>
          </div>

          {/* Track title - always shown */}
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {t("music.now_playing")}
            </p>
            <p className="text-xs font-medium truncate mt-0.5">
              {trackTitle || (isPlaying ? "Loading..." : "No track")}
            </p>
          </div>

          {/* Seek bar - click/drag to scrub */}
          <div className="space-y-1">
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={Math.min(position, duration || 0)}
              step={1000}
              onChange={(e) => seek(Number(e.target.value))}
              disabled={!duration}
              aria-label="Posisi lagu"
              className="w-full h-1 accent-primary cursor-pointer disabled:cursor-default disabled:opacity-40"
            />
            <div className="flex justify-between text-[10px] tabular-nums text-muted-foreground">
              <span>{mmss(position)}</span>
              <span>{mmss(duration)}</span>
            </div>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <button onClick={() => setVolume(volume > 0 ? 0 : 80)} className="text-muted-foreground hover:text-foreground transition-colors">
              {volume === 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="flex-1 h-1 accent-primary cursor-pointer"
            />
            <span className="text-[10px] text-muted-foreground w-6 text-right">{volume}</span>
          </div>

          {!isReady ? (
            <p className="text-[11px] text-muted-foreground text-center">{t("music.loading")}</p>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className={`h-7 w-7 rounded-full ${shuffleEnabled ? "text-primary" : "text-muted-foreground"}`}
                onClick={toggleShuffle}
              >
                <Shuffle className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full"
                onClick={previous}
                aria-label="Sebelumnya"
              >
                <SkipBack className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant={isPlaying ? "default" : "outline"}
                className="h-10 w-10 rounded-full"
                onClick={toggle}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 ml-0.5" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full"
                onClick={next}
              >
                <SkipForward className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className={`h-7 w-7 rounded-full ${loopEnabled ? "text-primary" : "text-muted-foreground"}`}
                onClick={toggleLoop}
              >
                <Repeat className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Custom playlist - paste your own SoundCloud link */}
          <div className="space-y-1.5 border-t border-border pt-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Playlist sendiri
            </p>
            <div className="flex items-center gap-1.5">
              <input
                type="url"
                inputMode="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyUrl();
                  }
                }}
                placeholder="Tempel link playlist SoundCloud..."
                className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none transition-colors focus:border-primary"
              />
              <Button
                size="sm"
                className="h-7 shrink-0 px-2.5 text-[11px]"
                onClick={applyUrl}
                disabled={!urlInput.trim()}
              >
                Pakai
              </Button>
            </div>
            {isCustomPlaylist && (
              <button
                onClick={resetPlaylist}
                className="text-[10px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
              >
                Balikin ke lofi default
              </button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
