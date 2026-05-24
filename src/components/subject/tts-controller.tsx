"use client";

import { useEffect, useRef } from "react";
import { useTTS } from "@/hooks/use-tts";
import { stripForSpeech } from "@/lib/tts/strip-for-speech";
import { TTSPlayerBar } from "./tts-player-bar";

interface TTSControllerProps {
  /** Raw rangkuman HTML/markdown to read aloud. */
  content: string;
  /** Ref to the rendered content container so we can highlight active lines. */
  contentRef: React.RefObject<HTMLDivElement | null>;
  /** Optional fullscreen view ref (also highlighted in sync). */
  fullscreenRef?: React.RefObject<HTMLDivElement | null>;
  /** Called when user closes or playback finishes naturally. */
  onClose: () => void;
}

/**
 * TTS controller — isolates the useTTS hook chain (31 hooks) from
 * RangkumanTab. Only mounts when user clicks "Dengarkan Rangkuman", so
 * the long hook chain doesn't run on every Rangkuman tab open. This
 * sidesteps a production React #310 that fired when useTTS rendered
 * alongside RangkumanTab's other hooks.
 */
export function TTSController({
  content,
  contentRef,
  fullscreenRef,
  onClose,
}: TTSControllerProps) {
  const tts = useTTS();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Kick off TTS playback once on mount with the current module content.
  // Module changes are handled by the parent re-mounting this component
  // (we're keyed on selectedModule).
  useEffect(() => {
    const sections = stripForSpeech(content, "id");
    if (sections.length === 0) {
      onCloseRef.current();
      return;
    }
    tts.setSections(sections);
    // Small delay so React commits setSections state before play() reads.
    const id = setTimeout(() => tts.play(0), 50);
    return () => {
      clearTimeout(id);
      tts.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  // Auto-close when playback finishes.
  useEffect(() => {
    if (tts.isFinished) onCloseRef.current();
  }, [tts.isFinished]);

  // Body class so floating FABs shift up to clear the player bar.
  useEffect(() => {
    document.documentElement.classList.add("tts-bar-open");
    return () => document.documentElement.classList.remove("tts-bar-open");
  }, []);

  // Auto-scroll + highlight the active line in both the normal and
  // fullscreen content containers.
  useEffect(() => {
    const containers = [contentRef.current, fullscreenRef?.current].filter(
      (c): c is HTMLDivElement => Boolean(c)
    );

    if (tts.activeLineIndex === null) {
      containers.forEach((c) =>
        c
          .querySelectorAll(".tts-active-line")
          .forEach((el) => el.classList.remove("tts-active-line"))
      );
      return;
    }

    for (const container of containers) {
      container
        .querySelectorAll(".tts-active-line")
        .forEach((el) => el.classList.remove("tts-active-line"));
      const el = container.querySelector(
        `[data-tts-line="${tts.activeLineIndex}"]`
      );
      if (el) {
        el.classList.add("tts-active-line");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [tts.activeLineIndex, contentRef, fullscreenRef]);

  return <TTSPlayerBar tts={tts} onClose={onClose} />;
}
