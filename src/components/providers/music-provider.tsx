"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { SOUNDCLOUD_PLAYLIST_URL } from "@/lib/constants";
import { useSession } from "@/components/providers/session-provider";

interface MusicContextValue {
  isPlaying: boolean;
  isReady: boolean;
  trackTitle: string;
  shuffleEnabled: boolean;
  loopEnabled: boolean;
  volume: number;
  isCustomPlaylist: boolean;
  position: number; // current position in ms
  duration: number; // track length in ms
  setVolume: (v: number) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (ms: number) => void;
  toggleShuffle: () => void;
  toggleLoop: () => void;
  // Returns false when the URL is not a valid SoundCloud link (caller toasts).
  setPlaylistUrl: (raw: string) => boolean;
  resetPlaylist: () => void;
}

const MusicContext = createContext<MusicContextValue>({
  isPlaying: false,
  isReady: false,
  trackTitle: "",
  shuffleEnabled: true,
  loopEnabled: false,
  volume: 80,
  isCustomPlaylist: false,
  position: 0,
  duration: 0,
  setVolume: () => {},
  toggle: () => {},
  next: () => {},
  previous: () => {},
  seek: () => {},
  toggleShuffle: () => {},
  toggleLoop: () => {},
  setPlaylistUrl: () => false,
  resetPlaylist: () => {},
});

export function useMusic() {
  return useContext(MusicContext);
}

// SoundCloud Widget API types (minimal)
interface SCWidget {
  bind: (event: string, callback: (...args: unknown[]) => void) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  play: () => void;
  pause: () => void;
  seekTo: (ms: number) => void;
  skip: (index: number) => void;
  load: (
    url: string,
    options?: { auto_play?: boolean; callback?: () => void; [key: string]: unknown }
  ) => void;
  getCurrentSound: (callback: (sound: { title?: string }) => void) => void;
  getCurrentSoundIndex: (callback: (index: number) => void) => void;
  getSounds: (callback: (sounds: unknown[]) => void) => void;
  getDuration: (callback: (durationMs: number) => void) => void;
  getPosition: (callback: (positionMs: number) => void) => void;
  setVolume: (volume: number) => void;
  getVolume: (callback: (volume: number) => void) => void;
}

interface SCWidgetConstructor {
  (iframe: HTMLIFrameElement): SCWidget;
  Events: {
    READY: string;
    PLAY: string;
    PAUSE: string;
    FINISH: string;
  };
}

declare global {
  interface Window {
    SC?: { Widget: SCWidgetConstructor };
  }
}

function buildShuffledOrder(count: number): number[] {
  const arr = Array.from({ length: count }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Custom playlist support ───
// The default lofi list, by its underlying SoundCloud URL. The default iframe
// src (SOUNDCLOUD_PLAYLIST_URL) already wraps this; toEmbedSrc() reproduces the
// same widget params for any user-supplied link.
const DEFAULT_PLAYLIST_RAW = "https://api.soundcloud.com/playlists/545610837";
const MUSIC_URL_KEY = "hs-music-url";
const SC_WIDGET_PARAMS =
  "color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&show_playcount=false";

function isSoundCloudUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    return (
      (u.protocol === "https:" || u.protocol === "http:") &&
      /(^|\.)soundcloud\.com$/.test(u.hostname)
    );
  } catch {
    return false;
  }
}

function toEmbedSrc(raw: string): string {
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(
    raw.trim()
  )}&${SC_WIDGET_PARAMS}`;
}

// Keep the default playlist on its exact original embed URL; only custom links
// get rebuilt via toEmbedSrc.
function srcFor(raw: string): string {
  return raw === DEFAULT_PLAYLIST_RAW ? SOUNDCLOUD_PLAYLIST_URL : toEmbedSrc(raw);
}

export function MusicProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const widgetRef = useRef<SCWidget | null>(null);
  // Armed flag - gates the SoundCloud script + iframe load until the user first
  // interacts with the music player. Saves ~50 KB external script + iframe
  // bundle on every scoped page load. Flipped one-way via arm().
  const [armed, setArmed] = useState(false);
  const armedRef = useRef(false);
  // Queued play intent: if the user clicks Play while the widget is still
  // loading, we replay the intent in the READY handler so a single click works.
  const pendingPlayRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [trackTitle, setTrackTitle] = useState("");
  const [shuffleEnabled, setShuffleEnabled] = useState(true);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [volume, setVolumeState] = useState(80);
  // Active playlist: rawUrl is the SoundCloud link, armedSrc is the iframe src
  // captured when the player first arms (swaps after that go via widget.load).
  const [rawUrl, setRawUrl] = useState(DEFAULT_PLAYLIST_RAW);
  const [armedSrc, setArmedSrc] = useState(SOUNDCLOUD_PLAYLIST_URL);
  const rawUrlRef = useRef(DEFAULT_PLAYLIST_RAW);
  rawUrlRef.current = rawUrl;
  // Seek bar state: current position + track length, both in ms.
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const trackCountRef = useRef(0);
  const shuffledOrderRef = useRef<number[]>([]);
  const shuffledPositionRef = useRef(0);
  const currentTrackIndexRef = useRef(0);
  // Refs to access latest state inside event callbacks
  const loopEnabledRef = useRef(loopEnabled);
  const shuffleEnabledRef = useRef(shuffleEnabled);
  const isSkippingRef = useRef(false);
  const isPlayingRef = useRef(false);
  const volumeRef = useRef(volume);
  const positionRef = useRef(0);
  const durationRef = useRef(0);
  loopEnabledRef.current = loopEnabled;
  shuffleEnabledRef.current = shuffleEnabled;
  isPlayingRef.current = isPlaying;
  volumeRef.current = volume;
  positionRef.current = position;
  durationRef.current = duration;

  // Restore a previously saved custom playlist (per device).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MUSIC_URL_KEY);
      if (saved && isSoundCloudUrl(saved)) {
        setRawUrl(saved);
        setArmedSrc(srcFor(saved));
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Poll position/duration once a second while playing. Much lighter than the
  // SoundCloud PLAY_PROGRESS event (which fired ~10x/s and destabilized the
  // widget, causing tracks to skip after a few seconds).
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      const w = widgetRef.current;
      if (!w) return;
      w.getPosition((p) => setPosition(typeof p === "number" ? p : 0));
      w.getDuration((d) => {
        if (typeof d === "number" && d > 0) setDuration(d);
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isPlaying]);

  // Stop playback on logout. The provider lives at the root layout so the widget
  // survives navigation between the scoped app and /admin; the only time it
  // should hard-stop is when the session goes away (logout / forced sign-out).
  const wasAuthedRef = useRef(false);
  useEffect(() => {
    if (session) {
      wasAuthedRef.current = true;
      return;
    }
    if (wasAuthedRef.current) {
      wasAuthedRef.current = false;
      const w = widgetRef.current;
      if (w) {
        try {
          w.pause();
        } catch {
          /* ignore */
        }
      }
      isPlayingRef.current = false;
      setIsPlaying(false);
    }
  }, [session]);

  const arm = useCallback(() => {
    if (armedRef.current) return;
    armedRef.current = true;
    setArmedSrc(srcFor(rawUrlRef.current));
    setArmed(true);
  }, []);

  const initWidget = useCallback(() => {
    if (!iframeRef.current || !window.SC) return;
    try {
      const widget = window.SC.Widget(iframeRef.current);
      widgetRef.current = widget;

      widget.bind(window.SC.Widget.Events.READY, () => {
        setIsReady(true);
        widget.setVolume(volumeRef.current);
        widget.getSounds((sounds) => {
          const count = sounds?.length || 0;
          trackCountRef.current = count;
          if (count > 0) {
            shuffledOrderRef.current = buildShuffledOrder(count);
            shuffledPositionRef.current = 0;
          }
          // Replay queued intent if user clicked play while widget was loading.
          if (pendingPlayRef.current) {
            pendingPlayRef.current = false;
            widget.play();
          }
        });
      });

      widget.bind(window.SC.Widget.Events.PLAY, () => {
        isSkippingRef.current = false;
        isPlayingRef.current = true;
        setIsPlaying(true);
        widget.getCurrentSound((sound) => {
          setTrackTitle(sound?.title || "Unknown Track");
        });
        widget.getCurrentSoundIndex((index) => {
          currentTrackIndexRef.current = index;
        });
        widget.getDuration((d) => setDuration(d || 0));
      });

      widget.bind(window.SC.Widget.Events.PAUSE, () => {
        if (!isSkippingRef.current) {
          isPlayingRef.current = false;
          setIsPlaying(false);
        }
      });

      widget.bind(window.SC.Widget.Events.FINISH, () => {
        // Guard against spurious early FINISH (the bug that skipped tracks after
        // ~10-30s). Only advance when we're genuinely near the end, or when the
        // track length is still unknown.
        if (
          durationRef.current > 5000 &&
          positionRef.current < durationRef.current - 5000
        ) {
          return;
        }
        isSkippingRef.current = true;
        if (loopEnabledRef.current) {
          widget.seekTo(0);
          setTimeout(() => widget.play(), 300);
        } else if (shuffleEnabledRef.current) {
          shuffledPositionRef.current =
            (shuffledPositionRef.current + 1) % shuffledOrderRef.current.length;
          const nextIndex = shuffledOrderRef.current[shuffledPositionRef.current];
          widget.skip(nextIndex);
          setTimeout(() => widget.play(), 300);
        } else {
          widget.next();
          setTimeout(() => widget.play(), 300);
        }
      });
    } catch (e) {
      console.warn("SoundCloud widget init failed:", e);
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!armed) return;
    const existingScript = document.getElementById("sc-widget-api");
    if (existingScript) {
      if (window.SC && iframeRef.current) {
        initWidget();
      } else {
        // Poll briefly for SC to become available
        const interval = setInterval(() => {
          if (window.SC && iframeRef.current) {
            clearInterval(interval);
            initWidget();
          }
        }, 100);
        const timeout = setTimeout(() => {
          clearInterval(interval);
          setIsReady(true);
        }, 10000);
        return () => { clearInterval(interval); clearTimeout(timeout); };
      }
      return;
    }

    const script = document.createElement("script");
    script.id = "sc-widget-api";
    script.src = "https://w.soundcloud.com/player/api.js";
    script.async = true;

    script.onload = () => initWidget();
    script.onerror = () => {
      console.warn("Failed to load SoundCloud Widget API");
      setIsReady(true); // Don't show loading forever
    };

    document.body.appendChild(script);
  }, [armed, initWidget]);

  const toggle = useCallback(() => {
    arm();
    const widget = widgetRef.current;
    if (!widget) {
      // Widget still loading. Optimistically mark playing + queue intent so
      // the READY handler kicks off playback when the script finishes loading.
      pendingPlayRef.current = true;
      isPlayingRef.current = true;
      setIsPlaying(true);
      return;
    }
    if (isPlayingRef.current) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      widget.pause();
    } else {
      isPlayingRef.current = true;
      setIsPlaying(true);
      widget.play();
    }
  }, [arm]);

  const next = useCallback(() => {
    arm();
    const widget = widgetRef.current;
    if (!widget) {
      pendingPlayRef.current = true;
      return;
    }

    isSkippingRef.current = true;
    setPosition(0);
    if (shuffleEnabled && shuffledOrderRef.current.length > 0) {
      shuffledPositionRef.current =
        (shuffledPositionRef.current + 1) % shuffledOrderRef.current.length;
      const nextIndex = shuffledOrderRef.current[shuffledPositionRef.current];
      widget.skip(nextIndex);
      setTimeout(() => widget.play(), 300);
    } else {
      widget.next();
      setTimeout(() => widget.play(), 300);
    }
  }, [arm, shuffleEnabled]);

  const previous = useCallback(() => {
    arm();
    const widget = widgetRef.current;
    if (!widget) {
      pendingPlayRef.current = true;
      return;
    }

    isSkippingRef.current = true;
    setPosition(0);
    if (shuffleEnabled && shuffledOrderRef.current.length > 0) {
      const len = shuffledOrderRef.current.length;
      shuffledPositionRef.current = (shuffledPositionRef.current - 1 + len) % len;
      const prevIndex = shuffledOrderRef.current[shuffledPositionRef.current];
      widget.skip(prevIndex);
      setTimeout(() => widget.play(), 300);
    } else {
      widget.prev();
      setTimeout(() => widget.play(), 300);
    }
  }, [arm, shuffleEnabled]);

  const seek = useCallback((ms: number) => {
    const widget = widgetRef.current;
    if (!widget) return;
    const clamped = Math.max(0, ms);
    widget.seekTo(clamped);
    setPosition(clamped);
  }, []);

  const handleSetVolume = useCallback((v: number) => {
    arm();
    const widget = widgetRef.current;
    if (widget) widget.setVolume(v);
    setVolumeState(v);
  }, [arm]);

  const toggleShuffle = useCallback(() => {
    arm();
    setShuffleEnabled((prev) => {
      const next = !prev;
      if (next && trackCountRef.current > 0) {
        shuffledOrderRef.current = buildShuffledOrder(trackCountRef.current);
        shuffledPositionRef.current = 0;
      }
      return next;
    });
  }, [arm]);

  const toggleLoop = useCallback(() => {
    arm();
    setLoopEnabled((prev) => !prev);
  }, [arm]);

  // Re-read the track list + rebuild the shuffle order after a live playlist
  // swap (mirrors the READY handler so shuffle/next/loop stay correct).
  const applyLoaded = useCallback((widget: SCWidget) => {
    setIsReady(true);
    setPosition(0);
    widget.setVolume(volumeRef.current);
    widget.getDuration((d) => setDuration(d || 0));
    widget.getSounds((sounds) => {
      const count = sounds?.length || 0;
      trackCountRef.current = count;
      if (count > 0) {
        shuffledOrderRef.current = buildShuffledOrder(count);
        shuffledPositionRef.current = 0;
      }
      if (pendingPlayRef.current) {
        pendingPlayRef.current = false;
        widget.play();
      }
    });
  }, []);

  const switchTo = useCallback(
    (raw: string, play: boolean) => {
      rawUrlRef.current = raw;
      setRawUrl(raw);
      const widget = widgetRef.current;
      if (widget && armedRef.current) {
        // Live swap in place - no iframe remount, controls keep working.
        setIsReady(false);
        pendingPlayRef.current = false; // auto_play below handles playback
        widget.load(raw, { auto_play: play, callback: () => applyLoaded(widget) });
      } else {
        // Not armed yet: mount the iframe on the new src; READY will play if asked.
        pendingPlayRef.current = play;
        setArmedSrc(srcFor(raw));
        arm();
      }
    },
    [applyLoaded, arm]
  );

  // Returns false for non-SoundCloud links so the caller can show a toast.
  const setPlaylistUrl = useCallback(
    (raw: string): boolean => {
      const trimmed = raw.trim();
      if (!isSoundCloudUrl(trimmed)) return false;
      try {
        localStorage.setItem(MUSIC_URL_KEY, trimmed);
      } catch {
        /* ignore */
      }
      switchTo(trimmed, true);
      return true;
    },
    [switchTo]
  );

  const resetPlaylist = useCallback(() => {
    try {
      localStorage.removeItem(MUSIC_URL_KEY);
    } catch {
      /* ignore */
    }
    switchTo(DEFAULT_PLAYLIST_RAW, isPlayingRef.current);
  }, [switchTo]);

  const isCustomPlaylist = rawUrl !== DEFAULT_PLAYLIST_RAW;

  const value = useMemo<MusicContextValue>(
    () => ({
      isPlaying,
      isReady,
      trackTitle,
      shuffleEnabled,
      loopEnabled,
      volume,
      isCustomPlaylist,
      position,
      duration,
      setVolume: handleSetVolume,
      toggle,
      next,
      previous,
      seek,
      toggleShuffle,
      toggleLoop,
      setPlaylistUrl,
      resetPlaylist,
    }),
    [isPlaying, isReady, trackTitle, shuffleEnabled, loopEnabled, volume, isCustomPlaylist, position, duration, handleSetVolume, toggle, next, previous, seek, toggleShuffle, toggleLoop, setPlaylistUrl, resetPlaylist]
  );

  return (
    <MusicContext.Provider value={value}>
      {armed && (
        <iframe
          ref={iframeRef}
          // Hidden but with a REAL layout box: a 1x1 frame made SoundCloud's
          // waveform canvas render at 0x0 (createPattern errors) and got the
          // frame deprioritized (slow / no load). encrypted-media is required
          // or the widget aborts DRM-streamed tracks and auto-skips after a few
          // seconds (the 10-30s skip bug). Delegation is paired with the
          // Permissions-Policy header in next.config.ts.
          style={{ position: 'fixed', bottom: 0, left: 0, width: '320px', height: '120px', opacity: 0, pointerEvents: 'none', overflow: 'hidden', border: 0, zIndex: -1 }}
          allow="autoplay; encrypted-media"
          src={armedSrc}
        />
      )}
      {children}
    </MusicContext.Provider>
  );
}
