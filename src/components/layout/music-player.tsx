"use client";

import { Music, Play, Pause, SkipForward, Shuffle, Repeat, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMusic } from "@/components/providers/music-provider";
import { useTranslation } from "@/components/providers/language-provider";

export function MusicPlayer() {
  const { isPlaying, isReady, trackTitle, shuffleEnabled, loopEnabled, volume, setVolume, toggle, next, toggleShuffle, toggleLoop } = useMusic();
  const { t } = useTranslation();

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
        </div>
      </PopoverContent>
    </Popover>
  );
}
