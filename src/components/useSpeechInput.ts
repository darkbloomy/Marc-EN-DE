"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { mergeTranscript, speechErrorMessage, type SpeechLang } from "@/lib/speech";

interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: RecognitionAlternative;
}
interface RecognitionEvent {
  readonly results: { readonly length: number; [index: number]: RecognitionResult };
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noopSubscribe = () => () => {};

/**
 * Browser speech-to-text (Web Speech API) for a text box. Each session
 * appends to the text that was in the box when it started; it stops by
 * itself after a pause, or via `stop()`.
 */
export function useSpeechInput(onText: (text: string) => void) {
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => getRecognitionCtor() !== null,
    () => false,
  );
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);

  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  /** Finish listening and keep what was recognised so far. */
  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  /** Stop listening and drop any result still on its way. */
  const cancel = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    rec.onresult = null;
    rec.abort();
  }, []);

  const start = useCallback((base: string, lang: SpeechLang) => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    recognitionRef.current?.abort();

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      let spoken = "";
      for (let i = 0; i < e.results.length; i++) {
        spoken += e.results[i][0]?.transcript ?? "";
      }
      onTextRef.current(mergeTranscript(base, spoken, lang));
    };
    rec.onerror = (e) => {
      const message = speechErrorMessage(e.error, lang);
      if (message) setError(message);
    };
    rec.onend = () => {
      if (recognitionRef.current === rec) recognitionRef.current = null;
      setListening(false);
    };

    recognitionRef.current = rec;
    setError(null);
    try {
      rec.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setError(speechErrorMessage("start-failed", lang));
    }
  }, []);

  return { supported, listening, error, start, stop, cancel };
}
