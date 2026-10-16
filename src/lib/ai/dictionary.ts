import { z } from "zod/v4";
import { callTool, type ProviderName, type ToolDefinition } from "@/lib/ai";
import type { Language } from "@/lib/exercises/types";

export type DictionaryLang = "en" | "de" | "zh";

export interface DictionarySense {
  lang: DictionaryLang;
  translation: string;
  explanation: string;
}

export interface DictionaryEntry {
  word: string;
  lemma: string;
  partOfSpeech: string;
  /** German nouns only. */
  article?: "der" | "die" | "das";
  /** German nouns only. */
  plural?: string;
  /** Always the two languages other than the word's own, in display order. */
  senses: DictionarySense[];
  /** Short example sentence in the word's own language. */
  example?: string;
}

export const LANG_NAMES: Record<DictionaryLang, string> = {
  en: "English",
  de: "German",
  zh: "Simplified Chinese",
};

export function targetLanguages(language: Language): [DictionaryLang, DictionaryLang] {
  return language === "en" ? ["de", "zh"] : ["en", "zh"];
}

export const DICTIONARY_TOOL: ToolDefinition = {
  name: "dictionary_entry",
  description: "Return a short, child-friendly dictionary entry for one word.",
  input_schema: {
    type: "object",
    properties: {
      lemma: {
        type: "string",
        description: "Base/dictionary form (e.g. 'gehen' for 'ging', 'Hund' for 'Hunden', 'run' for 'ran')",
      },
      partOfSpeech: {
        type: "string",
        description: "Part of speech in English, lower case (noun, verb, adjective, adverb, preposition, article, pronoun, conjunction, …)",
      },
      article: {
        type: "string",
        enum: ["der", "die", "das"],
        description: "German nouns only: the definite article. Omit otherwise.",
      },
      plural: {
        type: "string",
        description: "German nouns only: the plural form (e.g. 'die Hunde'). Omit otherwise.",
      },
      senses: {
        type: "array",
        minItems: 2,
        maxItems: 2,
        items: {
          type: "object",
          properties: {
            lang: { type: "string", enum: ["en", "de", "zh"] },
            translation: {
              type: "string",
              description: "1-4 word equivalent in this language, matching the meaning in the sentence",
            },
            explanation: {
              type: "string",
              description: "One short, simple sentence in this language explaining the meaning or grammar role",
            },
          },
          required: ["lang", "translation", "explanation"],
        },
      },
      example: {
        type: "string",
        description: "A new, short, simple example sentence in the word's own language",
      },
    },
    required: ["lemma", "partOfSpeech", "senses"],
  },
};

const optionalString = z
  .string()
  .nullish()
  .transform((s) => (s && s.trim() ? s.trim() : undefined));

const rawEntrySchema = z.object({
  lemma: z.string().trim().min(1),
  partOfSpeech: z.string().trim().min(1),
  article: z
    .string()
    .nullish()
    .transform((a) => (a === "der" || a === "die" || a === "das" ? a : undefined)),
  plural: optionalString,
  senses: z
    .array(
      z.object({
        lang: z.enum(["en", "de", "zh"]),
        translation: z.string().trim().min(1),
        explanation: z.string().trim().min(1),
      }),
    )
    .min(2),
  example: optionalString,
});

/** Validate tool output; throws when a required language is missing. */
export function parseDictionaryEntry(raw: unknown, word: string, language: Language): DictionaryEntry {
  const data = rawEntrySchema.parse(raw);
  const senses = targetLanguages(language).map((lang) => {
    const sense = data.senses.find((s) => s.lang === lang);
    if (!sense) throw new Error(`Dictionary entry is missing ${LANG_NAMES[lang]}`);
    return sense;
  });
  const isGerman = language === "de";
  return {
    word,
    lemma: data.lemma,
    partOfSpeech: data.partOfSpeech.toLowerCase(),
    ...(isGerman && data.article ? { article: data.article } : {}),
    ...(isGerman && data.plural ? { plural: data.plural } : {}),
    senses,
    ...(data.example ? { example: data.example } : {}),
  };
}

export const DICTIONARY_SYSTEM_PROMPT = `You are a friendly bilingual dictionary inside a language-learning app for a 10-year-old (German Gymnasium, 5th grade).
- Always answer by calling the dictionary_entry tool.
- Use the sentence to pick the meaning the word has *there* (e.g. "bank" of a river vs. a money bank).
- Keep everything short and simple enough for a child. Chinese must be Simplified Chinese.
- For small grammar words (articles, prepositions, pronouns, conjunctions) explain what job the word does in the sentence.
- article and plural are only for German nouns; leave them out for everything else.`;

export function buildDictionaryPrompt(input: { word: string; language: Language; context?: string }): string {
  const [a, b] = targetLanguages(input.language);
  const lines = [
    `Word: "${input.word}"`,
    `The word is ${LANG_NAMES[input.language]}.`,
    input.context ? `Sentence it appears in: "${input.context}"` : null,
    `Give the two senses in ${LANG_NAMES[a]} (lang "${a}") and ${LANG_NAMES[b]} (lang "${b}"), in that order.`,
    `The example sentence must be in ${LANG_NAMES[input.language]}.`,
  ];
  return lines.filter(Boolean).join("\n");
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map<string, { entry: DictionaryEntry; expiresAt: number }>();

export function clearDictionaryCache(): void {
  cache.clear();
}

export interface LookupResult {
  entry: DictionaryEntry;
  cached: boolean;
  provider?: ProviderName;
  model?: string;
}

export async function lookupWord(input: {
  word: string;
  language: Language;
  context?: string;
}): Promise<LookupResult> {
  const key = `${input.language}|${input.word}|${input.context ?? ""}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return { entry: hit.entry, cached: true };

  const res = await callTool({
    system: DICTIONARY_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildDictionaryPrompt(input) }],
    tool: DICTIONARY_TOOL,
    prefer: ["qwen"],
    maxTokens: 1200,
    reasoningEffort: "low",
    timeoutMs: 20_000,
    parse: (raw) => parseDictionaryEntry(raw, input.word, input.language),
  });

  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { entry: res.input, expiresAt: Date.now() + CACHE_TTL_MS });
  return { entry: res.input, cached: false, provider: res.provider, model: res.model };
}
