export type SpeechLang = "zh-CN" | "de-DE" | "en-US";

export const SPEECH_LANGS: { code: SpeechLang; label: string }[] = [
  { code: "zh-CN", label: "中文" },
  { code: "de-DE", label: "Deutsch" },
  { code: "en-US", label: "English" },
];

export const DEFAULT_SPEECH_LANG: SpeechLang = "zh-CN";

export function isSpeechLang(value: unknown): value is SpeechLang {
  return SPEECH_LANGS.some((l) => l.code === value);
}

/** Append spoken text to what was already typed; Chinese after Chinese needs no space. */
export function mergeTranscript(base: string, spoken: string, lang: SpeechLang): string {
  const text = spoken.trim();
  if (!text) return base;
  if (!base.trim()) return text;
  const noSpace = /\s$/.test(base) || (lang === "zh-CN" && /\p{Script=Han}$/u.test(base));
  const sep = noSpace ? "" : " ";
  return `${base}${sep}${text}`;
}

/** Child-friendly message for a SpeechRecognition error code, or null to stay silent. */
export function speechErrorMessage(code: string, lang: SpeechLang): string | null {
  switch (code) {
    case "aborted":
      return null;
    case "no-speech":
      return "I didn't hear anything — tap the mic and try again.";
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked. Allow it in the browser settings.";
    case "audio-capture":
      return "No microphone found.";
    case "network":
      return "Voice input needs an internet connection.";
    case "language-not-supported": {
      const label = SPEECH_LANGS.find((l) => l.code === lang)?.label ?? lang;
      return `This browser can't recognise ${label}.`;
    }
    default:
      return "Voice input stopped — please try again.";
  }
}
