"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface ActiveSupportState {
  activeConversationLk: string | null;
  isFocused: boolean;
}

interface ActiveSupportContextValue extends ActiveSupportState {
  setActiveConversation: (lk: string | null) => void;
}

const ActiveSupportContext = createContext<ActiveSupportContextValue | null>(
  null
);

/**
 * Tracks which support conversation is currently open AND whether the tab is
 * focused. Notification fan-out (client-side) uses this to suppress toasts/sound
 * for messages arriving in the conversation the user is already looking at.
 *
 * Service-worker-driven push uses its own focused-client check; this context
 * mirrors that decision for the in-app/sonner layer.
 */
export function ActiveSupportProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeConversationLk, setActiveConversationLk] = useState<
    string | null
  >(null);
  const [isFocused, setIsFocused] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    return document.visibilityState === "visible" && document.hasFocus();
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () =>
      setIsFocused(
        document.visibilityState === "visible" && document.hasFocus()
      );
    update();
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    window.addEventListener("blur", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update);
      window.removeEventListener("blur", update);
    };
  }, []);

  const setActiveConversation = useCallback((lk: string | null) => {
    setActiveConversationLk(lk);
  }, []);

  const value = useMemo<ActiveSupportContextValue>(
    () => ({ activeConversationLk, isFocused, setActiveConversation }),
    [activeConversationLk, isFocused, setActiveConversation]
  );

  return (
    <ActiveSupportContext.Provider value={value}>
      {children}
    </ActiveSupportContext.Provider>
  );
}

export function useActiveSupport(): ActiveSupportContextValue {
  const ctx = useContext(ActiveSupportContext);
  if (!ctx) {
    // Permissive: if used outside the provider (e.g. landing pages), return
    // a noop so the consumer doesn't crash.
    return {
      activeConversationLk: null,
      isFocused: false,
      setActiveConversation: () => {},
    };
  }
  return ctx;
}
