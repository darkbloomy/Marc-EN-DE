"use client";

import { useEffect, useRef } from "react";
import { Loader2, X } from "lucide-react";
import type { DictionaryLang } from "@/lib/ai/dictionary";
import type { WordLookupState } from "./useWordLookup";

const WIDTH = 300;
const GAP = 14;
const EST_HEIGHT = 280;

const LANG_BADGE: Record<DictionaryLang, { label: string; className: string }> = {
  en: { label: "EN", className: "bg-blue-100 text-blue-700" },
  de: { label: "DE", className: "bg-amber-100 text-amber-800" },
  zh: { label: "中文", className: "bg-red-100 text-red-700" },
};

export function WordLookupPopover({
  state,
  onClose,
}: {
  state: WordLookupState;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onClose, { passive: true });
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onClose);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [onClose]);

  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const width = Math.min(WIDTH, vw - 16);
  const left = Math.min(Math.max(8, state.x - width / 2), vw - width - 8);
  const placeAbove = state.y + GAP + EST_HEIGHT > vh && state.y > vh / 2;
  const position = placeAbove
    ? { left, width, bottom: vh - state.y + GAP }
    : { left, width, top: state.y + GAP };

  const entry = state.entry;
  const headword = entry ? (entry.article ? `${entry.article} ${entry.lemma}` : entry.lemma) : state.word;
  const showForm = entry && entry.word.toLowerCase() !== entry.lemma.toLowerCase();

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Dictionary: ${state.word}`}
      data-no-lookup
      style={position}
      className="fixed z-50 rounded-2xl border border-gray-200 bg-white p-4 shadow-xl text-left"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-lg font-bold text-gray-900 break-words">{headword}</span>
            {entry && (
              <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                {entry.partOfSpeech}
              </span>
            )}
          </div>
          {showForm && (
            <p className="text-xs text-gray-500 mt-0.5">
              from &ldquo;{entry.word}&rdquo;
            </p>
          )}
          {entry?.plural && (
            <p className="text-xs text-gray-500 mt-0.5">Plural: {entry.plural}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dictionary"
          className="p-1 -m-1 text-gray-400 hover:text-gray-600"
        >
          <X size={18} />
        </button>
      </div>

      {state.status === "loading" && (
        <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
          <Loader2 size={16} className="animate-spin" />
          Looking up &ldquo;{state.word}&rdquo;…
        </div>
      )}

      {state.status === "error" && (
        <p className="py-3 text-sm text-red-600">{state.error}</p>
      )}

      {entry && (
        <div className="mt-3 space-y-3">
          {entry.senses.map((sense) => (
            <div key={sense.lang} className="flex gap-2">
              <span
                className={`shrink-0 h-fit rounded-md px-1.5 py-0.5 text-xs font-semibold ${LANG_BADGE[sense.lang].className}`}
              >
                {LANG_BADGE[sense.lang].label}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">{sense.translation}</p>
                <p className="text-sm text-gray-600">{sense.explanation}</p>
              </div>
            </div>
          ))}
          {entry.example && (
            <p className="border-t border-gray-100 pt-2 text-sm italic text-gray-700">
              {entry.example}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
