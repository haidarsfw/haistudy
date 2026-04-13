"use client";

/**
 * useTTS — SpeechSynthesis controller hook.
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
  currentSectionIndex: number;
  currentBlockIndex: number;
  totalSections: number;
  currentSectionTitle: string;
  activeLineIndex: number | null;
  availableVoices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  speed: number;

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
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] =
    useState<SpeechSynthesisVoice | null>(null);
  const [speed, setSpeedState] = useState(1);

  // Refs for stable access in callbacks
  const sectionsRef = useRef<TTSSection[]>([]);
  const sectionIdxRef = useRef(0);
  const blockIdxRef = useRef(0);
  const playingRef = useRef(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const speedRef = useRef(1);

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

  // ── Voice loading ──
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const loadVoices = () => {
      const all = speechSynthesis.getVoices();
      // Show Indonesian + English voices
      const filtered = all.filter(
        (v) => v.lang.startsWith("id") || v.lang.startsWith("en")
      );
      setVoices(filtered);

      // Auto-select: prefer Indonesian neural voice
      if (!voiceRef.current) {
        const idVoice = filtered.find((v) => v.lang.startsWith("id"));
        const enVoice = filtered.find(
          (v) => v.lang.startsWith("en") && v.localService
        );
        const pick = idVoice || enVoice || filtered[0] || null;
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
        setIsPlaying(false);
        setIsPaused(false);
        setActiveLineIndex(null);
        setCurrentSectionIndex(0);
        setCurrentBlockIndex(0);
        return;
      }

      const section = sections[secIdx];

      // Move to next section if blocks exhausted
      if (blkIdx >= section.blocks.length) {
        speakBlock(secIdx + 1, 0);
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
        if (!playingRef.current) return;
        speakBlock(secIdx, blkIdx + 1);
      };

      utt.onerror = (e) => {
        if (e.error === "interrupted" || e.error === "canceled") return;
        console.error("[TTS] Utterance error:", e.error);
        if (playingRef.current) speakBlock(secIdx, blkIdx + 1);
      };

      speechSynthesis.speak(utt);
    },
    [] // no deps — uses refs for all mutable state
  );

  // ── Public actions ──

  const play = useCallback(
    (fromSectionIndex = 0) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      speechSynthesis.cancel();
      playingRef.current = true;
      setIsPlaying(true);
      setIsPaused(false);
      speakBlock(fromSectionIndex, 0);
    },
    [speakBlock]
  );

  const pause = useCallback(() => {
    if (!playingRef.current) return;
    // Chrome bug workaround: cancel instead of pause, save position
    speechSynthesis.cancel();
    setIsPaused(true);
    // playingRef stays true — we're still in a session
  }, []);

  const resume = useCallback(() => {
    if (!playingRef.current || !isPaused) return;
    setIsPaused(false);
    // Re-create from saved position
    speakBlock(sectionIdxRef.current, blockIdxRef.current);
  }, [isPaused, speakBlock]);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    playingRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
    setActiveLineIndex(null);
    setCurrentSectionIndex(0);
    setCurrentBlockIndex(0);
  }, []);

  const nextSection = useCallback(() => {
    const next = sectionIdxRef.current + 1;
    if (next >= sectionsRef.current.length) return;
    speechSynthesis.cancel();
    speakBlock(next, 0);
  }, [speakBlock]);

  const prevSection = useCallback(() => {
    const prev = sectionIdxRef.current - 1;
    if (prev < 0) return;
    speechSynthesis.cancel();
    speakBlock(prev, 0);
  }, [speakBlock]);

  const setSpeed = useCallback(
    (newSpeed: number) => {
      setSpeedState(newSpeed);
      speedRef.current = newSpeed;
      localStorage.setItem(SPEED_KEY, String(newSpeed));
      // If currently playing, restart current block with new speed
      if (playingRef.current && !isPaused) {
        speechSynthesis.cancel();
        speakBlock(sectionIdxRef.current, blockIdxRef.current);
      }
    },
    [isPaused, speakBlock]
  );

  const setVoice = useCallback(
    (voice: SpeechSynthesisVoice) => {
      setSelectedVoice(voice);
      voiceRef.current = voice;
      // If currently playing, restart current block with new voice
      if (playingRef.current && !isPaused) {
        speechSynthesis.cancel();
        speakBlock(sectionIdxRef.current, blockIdxRef.current);
      }
    },
    [isPaused, speakBlock]
  );

  const setSections = useCallback((sections: TTSSection[]) => {
    sectionsRef.current = sections;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speechSynthesis.cancel();
      playingRef.current = false;
    };
  }, []);

  return {
    isPlaying,
    isPaused,
    currentSectionIndex,
    currentBlockIndex,
    totalSections: sectionsRef.current.length,
    currentSectionTitle:
      sectionsRef.current[currentSectionIndex]?.title || "",
    activeLineIndex,
    availableVoices: voices,
    selectedVoice,
    speed,
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
