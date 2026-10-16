"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import type { Language } from "@/lib/exercises/types";
import type { DictionaryEntry } from "@/lib/ai/dictionary";
import { extractWordAt } from "@/lib/exercises/word-at";

export interface WordLookupState {
  word: string;
  language: Language;
  x: number;
  y: number;
  status: "loading" | "ready" | "error";
  entry?: DictionaryEntry;
  error?: string;
}

const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_PX = 24;
const MAX_CONTEXT = 300;

type CaretDocument = Document & {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

function caretAt(x: number, y: number): { node: Text; offset: number } | null {
  const doc = document as CaretDocument;
  if (doc.caretPositionFromPoint) {
    const pos = doc.caretPositionFromPoint(x, y);
    if (pos && pos.offsetNode.nodeType === Node.TEXT_NODE) {
      return { node: pos.offsetNode as Text, offset: pos.offset };
    }
  }
  if (doc.caretRangeFromPoint) {
    const range = doc.caretRangeFromPoint(x, y);
    if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
      return { node: range.startContainer as Text, offset: range.startOffset };
    }
  }
  return null;
}

function contextFor(node: Text, word: string): string {
  const block = node.parentElement?.closest("p,h1,h2,h3,h4,li,button,label,div");
  const text = (block?.textContent ?? node.data).replace(/\s+/g, " ").trim();
  if (text.length <= MAX_CONTEXT) return text;
  const at = Math.max(0, text.indexOf(word) - MAX_CONTEXT / 2);
  return text.slice(at, at + MAX_CONTEXT);
}

/** Buttons are interactive (Next, Check, Reorder chips); only `[data-lookup]` ones opt in. */
function lookupLanguageFor(target: EventTarget | null, fallback: Language): Language | null {
  if (!(target instanceof Element)) return null;
  if (target.closest("[data-no-lookup],input,textarea,select,[contenteditable='true']")) return null;
  if (target.closest("button,a,[role='button']") && !target.closest("[data-lookup]")) return null;
  const override = target.closest("[data-lookup-lang]")?.getAttribute("data-lookup-lang");
  return override === "de" || override === "en" ? override : fallback;
}

export function useWordLookup(language: Language | undefined, resetKey: unknown) {
  const [stored, setState] = useState<(WordLookupState & { resetKey: unknown }) | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastTapRef = useRef<{ t: number; x: number; y: number; target: EventTarget | null } | null>(null);
  const lastTouchLookupRef = useRef(0);
  // A lookup belongs to the question it was opened on; moving on hides it.
  const state = stored && stored.resetKey === resetKey ? stored : null;

  const close = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(null);
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
  }, [resetKey]);

  const lookupAt = useCallback(
    (x: number, y: number, target: EventTarget | null): boolean => {
      if (!language) return false;
      const lang = lookupLanguageFor(target, language);
      if (!lang) return false;
      const caret = caretAt(x, y);
      if (!caret) return false;
      const word = extractWordAt(caret.node.data, caret.offset);
      if (!word) return false;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setState({ word, language: lang, x, y, status: "loading", resetKey });

      fetch("/api/dictionary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, language: lang, context: contextFor(caret.node, word) }),
        signal: controller.signal,
      })
        .then(async (res) => {
          const json = await res.json().catch(() => null);
          if (controller.signal.aborted) return;
          if (!res.ok || !json?.success) {
            throw new Error(json?.error?.message ?? "Dictionary unavailable right now.");
          }
          setState((s) => (s && s.word === word ? { ...s, status: "ready", entry: json.data.entry } : s));
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          const message = err instanceof Error ? err.message : "Dictionary unavailable right now.";
          setState((s) => (s && s.word === word ? { ...s, status: "error", error: message } : s));
        });
      return true;
    },
    [language, resetKey],
  );

  const onDoubleClick = useCallback(
    (e: ReactMouseEvent) => {
      // iPad Safari may fire dblclick after our own touch double-tap handling.
      if (Date.now() - lastTouchLookupRef.current < 800) return;
      lookupAt(e.clientX, e.clientY, e.target);
    },
    [lookupAt],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent) => {
      if (e.pointerType !== "touch") return;
      const prev = lastTapRef.current;
      const now = Date.now();
      if (
        prev &&
        now - prev.t < DOUBLE_TAP_MS &&
        Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < DOUBLE_TAP_PX &&
        prev.target === e.target
      ) {
        lastTapRef.current = null;
        if (lookupAt(e.clientX, e.clientY, e.target)) lastTouchLookupRef.current = now;
      } else {
        lastTapRef.current = { t: now, x: e.clientX, y: e.clientY, target: e.target };
      }
    },
    [lookupAt],
  );

  return {
    state,
    close,
    handlers: language ? { onDoubleClick, onPointerUp } : {},
  };
}
