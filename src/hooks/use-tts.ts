"use client";

/**
 * useTTS - SpeechSynthesis controller hook.
 *
 * Manages the browser's TTS engine: play, pause, resume, stop,
 * section navigation, speed control, and voice selection.
 *
 * Chrome pause bug workaround: instead of using speechSynthesis.pause()
 * (which silently dies after ~15s), we cancel the current utterance
 * and save position. Resume re-creates from the saved block.
 *
 * Speed preference is stored in localStorage (no Supabase cost).
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { TTSSection } from "@/lib/tts/strip-for-speech";

const SPEED_KEY = "hs-tts-speed";

export interface UseTTSReturn {
  // State
  isPlaying: boolean;
  isPaused: boolean;
  isFinished: boolean;
  currentSectionIndex: number;
  currentBlockIndex: number;
  totalSections: number;
  currentSectionTitle: string;
  activeLineIndex: number | null;
  availableVoices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  speed: number;
  supported: boolean;

  // Actions
  play: (fromSectionIndex?: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  nextSection: () => void;
  prevSection: () => void;
  setSpeed: (speed: number) => void;
  setVoice: (voice: SpeechSynthesisVoice) => void;
  setSections: (sections: TTSSection[]) => void;
}

export function useTTS(): UseTTSReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] =
    useState<SpeechSynthesisVoice | null>(null);
  const [speed, setSpeedState] = useState(1);
  const [totalSections, setTotalSections] = useState(0);
  const [supported, setSupported] = useState(false);

  // Refs for stable access in callbacks
  const sectionsRef = useRef<TTSSection[]>([]);
  const sectionIdxRef = useRef(0);
  const blockIdxRef = useRef(0);
  const playingRef = useRef(false);
  const pausedRef = useRef(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const speedRef = useRef(1);
  // Self-reference ref so the recursive `speakBlock` calls inside utt.onend
  // and the block-exhausted branch don't capture the const binding directly.
  // Breaks the closure cycle that the react-compiler/eslint-plugin-react-hooks
  // immutability rule flags ("speakBlock accessed before it is declared").
  const speakBlockRef = useRef<((secIdx: number, blkIdx: number) => void) | null>(null);

  // Check browser support on mount
  useEffect(() => {
    setSupported(
      typeof window !== "undefined" && "speechSynthesis" in window
    );
  }, []);

  // Load speed from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(SPEED_KEY);
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 2) {
        setSpeedState(parsed);
        speedRef.current = parsed;
      }
    }
  }, []);

  // ── Voice loading - Indonesian voices, prefer local (reliable) ──
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const loadVoices = () => {
      const all = speechSynthesis.getVoices();

      // Show only Indonesian voices
      let idVoices = all.filter((v) => v.lang.startsWith("id"));

      // If no Indonesian voices found, include English as fallback
      if (idVoices.length === 0) {
        idVoices = all.filter(
          (v) => v.lang.startsWith("id") || v.lang.startsWith("en")
        );
      }

      // Sort: local voices first (they're reliable), network voices last
      // Chrome's network "Bahasa Indonesia" voice often fails silently
      idVoices.sort((a, b) => {
        if (a.localService && !b.localService) return -1;
        if (!a.localService && b.localService) return 1;
        return 0;
      });

      setVoices(idVoices);

      // Auto-select first LOCAL voice for reliability
      if (!voiceRef.current) {
        const localVoice = idVoices.find((v) => v.localService);
        const pick = localVoice || idVoices[0] || null;
        setSelectedVoice(pick);
        voiceRef.current = pick;
      }
    };

    loadVoices();
    speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () =>
      speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  // ── Core: speak a single block, chain to next ──
  const speakBlock = useCallback(
    (secIdx: number, blkIdx: number) => {
      const sections = sectionsRef.current;

      // Finished all sections
      if (secIdx >= sections.length) {
        speechSynthesis.cancel();
        playingRef.current = false;
        pausedRef.current = false;
        setIsPlaying(false);
        setIsPaused(false);
        setIsFinished(true);
        setActiveLineIndex(null);
        setCurrentSectionIndex(0);
        setCurrentBlockIndex(0);
        return;
      }

      const section = sections[secIdx];

      // Move to next section if blocks exhausted - via ref to break closure cycle
      if (blkIdx >= section.blocks.length) {
        speakBlockRef.current?.(secIdx + 1, 0);
        return;
      }

      const block = section.blocks[blkIdx];

      // Update refs + state
      sectionIdxRef.current = secIdx;
      blockIdxRef.current = blkIdx;
      setCurrentSectionIndex(secIdx);
      setCurrentBlockIndex(blkIdx);
      setActiveLineIndex(block.lineIndex);

      // Create utterance
      const utt = new SpeechSynthesisUtterance(block.text);
      if (voiceRef.current) {
        utt.voice = voiceRef.current;
        utt.lang = voiceRef.current.lang;
      } else {
        utt.lang = "id-ID";
      }
      utt.rate = speedRef.current;

      utt.onend = () => {
        // CRITICAL: Don't advance if we're paused or stopped
        if (!playingRef.current || pausedRef.current) return;
        speakBlockRef.current?.(secIdx, blkIdx + 1);
      };

      utt.onerror = (e) => {
        if (
          e.error === "interrupted" ||
          e.error === "canceled"
        )
          return;
        console.error("[TTS] Utterance error:", e.error);
        if (playingRef.current && !pausedRef.current) {
          speakBlockRef.current?.(secIdx, blkIdx + 1);
        }
      };

      speechSynthesis.speak(utt);
    },
    [] // no deps - uses refs for all mutable state
  );

  // Keep speakBlockRef pointing at the latest speakBlock so the ref-via-self
  // recursion inside the callback resolves to the same closure each render.
  useEffect(() => {
    speakBlockRef.current = speakBlock;
  }, [speakBlock]);

  // ── Public actions ──

  const play = useCallback(
    (fromSectionIndex = 0) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      speechSynthesis.cancel();
      playingRef.current = true;
      pausedRef.current = false;
      setIsPlaying(true);
      setIsPaused(false);
      setIsFinished(false);
      speakBlock(fromSectionIndex, 0);
    },
    [speakBlock]
  );

  const pause = useCallback(() => {
    if (!playingRef.current) return;
    // Set pausedRef BEFORE cancel so onend doesn't advance
    pausedRef.current = true;
    speechSynthesis.cancel();
    setIsPaused(true);
    // playingRef stays true - we're still in a session
    // sectionIdxRef and blockIdxRef retain the current position
  }, []);

  const resume = useCallback(() => {
    if (!playingRef.current) return;
    pausedRef.current = false;
    setIsPaused(false);
    // Re-create from the EXACT saved position
    speakBlock(sectionIdxRef.current, blockIdxRef.current);
  }, [speakBlock]);

  const stop = useCallback(() => {
    pausedRef.current = false;
    playingRef.current = false;
    speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setIsFinished(false);
    setActiveLineIndex(null);
    setCurrentSectionIndex(0);
    setCurrentBlockIndex(0);
  }, []);

  const nextSection = useCallback(() => {
    const next = sectionIdxRef.current + 1;
    if (next >= sectionsRef.current.length) return;
    pausedRef.current = false;
    speechSynthesis.cancel();
    speakBlock(next, 0);
  }, [speakBlock]);

  const prevSection = useCallback(() => {
    const prev = sectionIdxRef.current - 1;
    if (prev < 0) return;
    pausedRef.current = false;
    speechSynthesis.cancel();
    speakBlock(prev, 0);
  }, [speakBlock]);

  const setSpeed = useCallback(
    (newSpeed: number) => {
      setSpeedState(newSpeed);
      speedRef.current = newSpeed;
      localStorage.setItem(SPEED_KEY, String(newSpeed));
      // If currently playing (not paused), restart current block with new speed
      if (playingRef.current && !pausedRef.current) {
        speechSynthesis.cancel();
        pausedRef.current = false;
        speakBlock(sectionIdxRef.current, blockIdxRef.current);
      }
    },
    [speakBlock]
  );

  const setVoice = useCallback(
    (voice: SpeechSynthesisVoice) => {
      setSelectedVoice(voice);
      voiceRef.current = voice;
      // If currently playing (not paused), restart current block with new voice
      if (playingRef.current && !pausedRef.current) {
        speechSynthesis.cancel();
        pausedRef.current = false;
        speakBlock(sectionIdxRef.current, blockIdxRef.current);
      }
    },
    [speakBlock]
  );

  const setSections = useCallback((sections: TTSSection[]) => {
    sectionsRef.current = sections;
    setTotalSections(sections.length);
    setIsFinished(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pausedRef.current = false;
      playingRef.current = false;
      if (typeof window !== "undefined" && window.speechSynthesis) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    isPlaying,
    isPaused,
    isFinished,
    currentSectionIndex,
    currentBlockIndex,
    totalSections,
    currentSectionTitle:
      sectionsRef.current[currentSectionIndex]?.title || "",
    activeLineIndex,
    availableVoices: voices,
    selectedVoice,
    speed,
    supported,
    play,
    pause,
    resume,
    stop,
    nextSection,
    prevSection,
    setSpeed,
    setVoice,
    setSections,
  };
}
