"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { SOUNDCLOUD_PLAYLIST_URL } from "@/lib/constants";

interface MusicContextValue {
  isPlaying: boolean;
  isReady: boolean;
  trackTitle: string;
  shuffleEnabled: boolean;
  loopEnabled: boolean;
  volume: number;
  setVolume: (v: number) => void;
  toggle: () => void;
  next: () => void;
  toggleShuffle: () => void;
  toggleLoop: () => void;
}

const MusicContext = createContext<MusicContextValue>({
  isPlaying: false,
  isReady: false,
  trackTitle: "",
  shuffleEnabled: true,
  loopEnabled: false,
  volume: 80,
  setVolume: () => {},
  toggle: () => {},
  next: () => {},
  toggleShuffle: () => {},
  toggleLoop: () => {},
});

export function useMusic() {
  return useContext(MusicContext);
}

// SoundCloud Widget API types (minimal)
interface SCWidget {
  bind: (event: string, callback: (...args: unknown[]) => void) => void;
  toggle: () => void;
  next: () => void;
  play: () => void;
  pause: () => void;
  seekTo: (ms: number) => void;
  skip: (index: number) => void;
  getCurrentSound: (callback: (sound: { title?: string }) => void) => void;
  getCurrentSoundIndex: (callback: (index: number) => void) => void;
  getSounds: (callback: (sounds: unknown[]) => void) => void;
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

export function MusicProvider({ children }: { children: ReactNode }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const widgetRef = useRef<SCWidget | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [trackTitle, setTrackTitle] = useState("");
  const [shuffleEnabled, setShuffleEnabled] = useState(true);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [volume, setVolumeState] = useState(80);

  const trackCountRef = useRef(0);
  const shuffledOrderRef = useRef<number[]>([]);
  const shuffledPositionRef = useRef(0);
  const currentTrackIndexRef = useRef(0);
  // Refs to access latest state inside event callbacks
  const loopEnabledRef = useRef(loopEnabled);
  const shuffleEnabledRef = useRef(shuffleEnabled);
  const isSkippingRef = useRef(false);
  const isPlayingRef = useRef(false);
  loopEnabledRef.current = loopEnabled;
  shuffleEnabledRef.current = shuffleEnabled;
  isPlayingRef.current = isPlaying;

  const initWidget = useCallback(() => {
    if (!iframeRef.current || !window.SC) return;
    try {
      const widget = window.SC.Widget(iframeRef.current);
      widgetRef.current = widget;

      widget.bind(window.SC.Widget.Events.READY, () => {
        setIsReady(true);
        widget.setVolume(80);
        widget.getSounds((sounds) => {
          const count = sounds?.length || 0;
          trackCountRef.current = count;
          if (count > 0) {
            shuffledOrderRef.current = buildShuffledOrder(count);
            shuffledPositionRef.current = 0;
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
      });

      widget.bind(window.SC.Widget.Events.PAUSE, () => {
        if (!isSkippingRef.current) {
          isPlayingRef.current = false;
          setIsPlaying(false);
        }
      });

      widget.bind(window.SC.Widget.Events.FINISH, () => {
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
  }, [initWidget]);

  const toggle = useCallback(() => {
    const widget = widgetRef.current;
    if (!widget) return;
    if (isPlayingRef.current) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      widget.pause();
    } else {
      isPlayingRef.current = true;
      setIsPlaying(true);
      widget.play();
    }
  }, []);

  const next = useCallback(() => {
    const widget = widgetRef.current;
    if (!widget) return;

    isSkippingRef.current = true;
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
  }, [shuffleEnabled]);

  const handleSetVolume = useCallback((v: number) => {
    const widget = widgetRef.current;
    if (widget) widget.setVolume(v);
    setVolumeState(v);
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffleEnabled((prev) => {
      const next = !prev;
      if (next && trackCountRef.current > 0) {
        shuffledOrderRef.current = buildShuffledOrder(trackCountRef.current);
        shuffledPositionRef.current = 0;
      }
      return next;
    });
  }, []);

  const toggleLoop = useCallback(() => {
    setLoopEnabled((prev) => !prev);
  }, []);

  return (
    <MusicContext.Provider value={{ isPlaying, isReady, trackTitle, shuffleEnabled, loopEnabled, volume, setVolume: handleSetVolume, toggle, next, toggleShuffle, toggleLoop }}>
      <iframe
        ref={iframeRef}
        style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '300px', height: '300px', border: 0 }}
        allow="autoplay"
        src={SOUNDCLOUD_PLAYLIST_URL}
      />
      {children}
    </MusicContext.Provider>
  );
}
