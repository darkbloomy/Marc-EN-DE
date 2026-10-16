import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const SOURCES = join(ROOT, "prisma/exercise-data/sources");
const DE_TARGET = join(ROOT, "prisma/exercise-data/de.json");
const EN_TARGET = join(ROOT, "prisma/exercise-data/en.json");
const BATCH_ID = "manual-drills-2026-07-31";
const MODEL_VERSION = "manual-handcrafted";
const CREATED_AT = "2026-07-31T00:00:00.000Z";

const DE_DRILL_TOPICS = new Set([
  "de_drill_nouns",
  "de_drill_verbs",
  "de_drill_adjectives",
  "de_drill_prepositions",
  "de_drill_relative",
  "de_drill_adverbial",
  "de_drill_complement",
  "de_drill_infinitive",
  "de_drill_extras",
  // purged (split into adverbial + complement + relative + infinitive)
  "de_drill_subclauses",
]);
const EN_DRILL_TOPICS = new Set([
  "en_drill_plurals",
  "en_drill_verbs",
  "en_drill_adjectives",
  "en_drill_prepositions",
  "en_drill_relative",
  "en_drill_adverbial",
  "en_drill_complement",
  "en_drill_infinitive",
  "en_drill_extras",
  "en_drill_subclauses",
]);

interface ExerciseRow {
  id: string;
  language: string;
  topic: string;
  category: string;
  exerciseType: string;
  difficulty: number;
  payload: string;
  reviewStatus: string;
  batchId: string;
  modelVersion: string;
  createdAt: string;
}

/** Parse a CSV line with RFC4180-style double-quoted fields. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

function parseCsv(path: string): Record<string, string>[] {
  const raw = readFileSync(path, "utf8").trim();
  const lines = raw.split(/\r?\n/);
  const header = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    header.forEach((h, i) => {
      row[h] = (cells[i] ?? "").trim();
    });
    return row;
  });
}

function wrap(
  language: string,
  topic: string,
  _slug: string,
  difficulty: number,
  seq: number,
  payload: object,
): ExerciseRow {
  const seqStr = String(seq).padStart(3, "0");
  return {
    id: `${topic}_fb_d${difficulty}_${seqStr}`,
    language,
    topic,
    category: "grammar",
    exerciseType: "fill_in_the_blank",
    difficulty,
    payload: JSON.stringify(payload),
    reviewStatus: "approved",
    batchId: BATCH_ID,
    modelVersion: MODEL_VERSION,
    createdAt: CREATED_AT,
  };
}

function seqMap() {
  return new Map<number, number>();
}

function nextSeq(map: Map<number, number>, difficulty: number): number {
  const seq = (map.get(difficulty) ?? 0) + 1;
  map.set(difficulty, seq);
  return seq;
}

function buildDeNouns(): ExerciseRow[] {
  const rows = parseCsv(join(SOURCES, "drill-nouns.csv"));
  const seqByDiff = seqMap();
  return rows.map((r) => {
    const difficulty = Number(r.difficulty);
    const seq = nextSeq(seqByDiff, difficulty);
    const payload: Record<string, unknown> = {
      type: "fill_in_the_blank",
      sentence: `Singular: ___ ${r.singular}. Plural: die ___`,
      correctAnswer: r.article,
      blanks: [
        { correctAnswer: r.article },
        { correctAnswer: r.plural },
      ],
      explanation: `${r.article} ${r.singular}, plural: die ${r.plural}. The definite article marks gender; plural nouns always take "die".`,
      explanationCN: `单数用 ${r.article} ${r.singular}，复数是 die ${r.plural}。定冠词标明名词性别；复数一律用 die。`,
    };
    if (r.hint) payload.hint = r.hint;
    return wrap("de", "de_drill_nouns", "nouns", difficulty, seq, payload);
  });
}

const TENSE_LABEL: Record<string, string> = {
  Praesens: "Präsens",
  Praeteritum: "Präteritum",
  Perfekt: "Perfekt",
};

function buildDeVerbs(): ExerciseRow[] {
  const rows = parseCsv(join(SOURCES, "drill-verbs.csv"));
  const seqByDiff = seqMap();
  return rows.map((r) => {
    const difficulty = Number(r.difficulty);
    const seq = nextSeq(seqByDiff, difficulty);
    const tense = TENSE_LABEL[r.tense] ?? r.tense;
    const canonical = r.answer.replace(/\s+/g, " ").trim();
    const explanation = r.auxiliary
      ? `${r.infinitive} (${tense}, ${r.pronoun}) → ${canonical}. Auxiliary: ${r.auxiliary}. Conjugate for the given person and tense.`
      : `${r.infinitive} (${tense}, ${r.pronoun}) → ${canonical}. Match the ending to the pronoun and tense.`;
    const explanationCN = r.auxiliary
      ? `${r.infinitive}（${tense}，${r.pronoun}）→ ${canonical}。助动词：${r.auxiliary}。按人称和时态变位。`
      : `${r.infinitive}（${tense}，${r.pronoun}）→ ${canonical}。按人称和时态变位。`;

    const payload: Record<string, unknown> = {
      type: "fill_in_the_blank",
      sentence: `${r.infinitive} | ${tense} | ${r.pronoun} → ___`,
      correctAnswer: canonical,
      explanation,
      explanationCN,
    };
    if (r.hint) payload.hint = r.hint;
    return wrap("de", "de_drill_verbs", "verbs", difficulty, seq, payload);
  });
}

function buildDeAdjectives(): ExerciseRow[] {
  const rows = parseCsv(join(SOURCES, "drill-de-adjectives.csv"));
  const seqByDiff = seqMap();
  return rows.map((r) => {
    const difficulty = Number(r.difficulty);
    const seq = nextSeq(seqByDiff, difficulty);
    const formLabel =
      r.form === "superlative"
        ? "Superlativ"
        : r.form === "comparative"
          ? "Komparativ"
          : r.form;
    const payload: Record<string, unknown> = {
      type: "fill_in_the_blank",
      sentence: `${r.base} | ${formLabel} → ___`,
      correctAnswer: r.answer,
      explanation: r.explanation,
      explanationCN: r.explanationCN,
    };
    if (r.hint) payload.hint = r.hint;
    return wrap(
      "de",
      "de_drill_adjectives",
      "adjectives",
      difficulty,
      seq,
      payload,
    );
  });
}

function uniqueAcceptable(primary: string, alts: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of [primary, ...alts]) {
    for (const v of [raw, raw.toLowerCase()]) {
      const item = v.trim();
      if (!item || seen.has(item)) continue;
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}

function buildEnPlurals(): ExerciseRow[] {
  const rows = parseCsv(join(SOURCES, "drill-en-plurals.csv"));
  const seqByDiff = seqMap();
  return rows.map((r) => {
    const difficulty = Number(r.difficulty);
    const seq = nextSeq(seqByDiff, difficulty);
    const payload: Record<string, unknown> = {
      type: "fill_in_the_blank",
      sentence: `Singular: ${r.singular}. Plural: ___`,
      correctAnswer: r.plural,
      explanation: r.explanation,
      explanationCN: r.explanationCN,
    };
    if (r.hint) payload.hint = r.hint;
    return wrap("en", "en_drill_plurals", "plurals", difficulty, seq, payload);
  });
}

function buildEnVerbs(): ExerciseRow[] {
  const rows = parseCsv(join(SOURCES, "drill-en-verbs.csv"));
  const seqByDiff = seqMap();
  return rows.map((r) => {
    const difficulty = Number(r.difficulty);
    const seq = nextSeq(seqByDiff, difficulty);
    const payload: Record<string, unknown> = {
      type: "fill_in_the_blank",
      sentence: `${r.infinitive} | ${r.form} | ${r.pronoun} → ___`,
      correctAnswer: r.answer,
      explanation: r.explanation,
      explanationCN: r.explanationCN,
    };
    if (r.hint) payload.hint = r.hint;
    return wrap("en", "en_drill_verbs", "verbs", difficulty, seq, payload);
  });
}

function buildEnAdjectives(): ExerciseRow[] {
  const rows = parseCsv(join(SOURCES, "drill-en-adjectives.csv"));
  const seqByDiff = seqMap();
  return rows.map((r) => {
    const difficulty = Number(r.difficulty);
    const seq = nextSeq(seqByDiff, difficulty);
    const payload: Record<string, unknown> = {
      type: "fill_in_the_blank",
      sentence: `${r.base} | ${r.form} → ___`,
      correctAnswer: r.answer,
      explanation: r.explanation,
      explanationCN: r.explanationCN,
    };
    if (r.hint) payload.hint = r.hint;
    return wrap(
      "en",
      "en_drill_adjectives",
      "adjectives",
      difficulty,
      seq,
      payload,
    );
  });
}

function buildSentenceDrill(
  language: string,
  topic: string,
  slug: string,
  csvName: string,
): ExerciseRow[] {
  const rows = parseCsv(join(SOURCES, csvName));
  const seqByDiff = seqMap();
  return rows.map((r) => {
    const difficulty = Number(r.difficulty);
    const seq = nextSeq(seqByDiff, difficulty);
    const answers = r.answer.split("|").map((s) => s.trim()).filter(Boolean);
    const alts = (r.alt ?? "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    const blankCount = (r.sentence.match(/___/g) ?? []).length;
    const payload: Record<string, unknown> = {
      type: "fill_in_the_blank",
      sentence: r.sentence,
      explanation: r.explanation,
      explanationCN: r.explanationCN,
    };
    if (blankCount > 1 && answers.length === blankCount) {
      payload.blanks = answers.map((ans, i) => ({
        correctAnswer: ans,
        acceptableAnswers: uniqueAcceptable(ans, alts[i] ? [alts[i]] : []),
      }));
      payload.correctAnswer = answers[0];
      payload.acceptableAnswers = uniqueAcceptable(
        answers[0],
        alts[0] ? [alts[0]] : [],
      );
    } else {
      payload.correctAnswer = r.answer;
      payload.acceptableAnswers = uniqueAcceptable(r.answer, alts);
    }
    if (r.hint) payload.hint = r.hint;
    return wrap(language, topic, slug, difficulty, seq, payload);
  });
}

function mergeInto(
  targetPath: string,
  drillTopics: Set<string>,
  newRows: ExerciseRow[],
  label: string,
): void {
  const existing = existsSync(targetPath)
    ? (JSON.parse(readFileSync(targetPath, "utf8")) as ExerciseRow[])
    : [];
  const kept = existing.filter((r) => !drillTopics.has(r.topic));
  const dropped = existing.length - kept.length;
  const merged = [...kept, ...newRows];
  writeFileSync(targetPath, JSON.stringify(merged, null, 2) + "\n", "utf8");
  console.log(
    `[build-drill-exercises] ${label}: dropped ${dropped} old drill rows, wrote ${newRows.length} new (total ${merged.length})`,
  );
}

function main(): void {
  const deRows = [
    ...buildDeNouns(),
    ...buildDeVerbs(),
    ...buildDeAdjectives(),
    ...buildSentenceDrill(
      "de",
      "de_drill_prepositions",
      "prepositions",
      "drill-de-prepositions.csv",
    ),
    ...buildSentenceDrill(
      "de",
      "de_drill_relative",
      "relative",
      "drill-de-relative.csv",
    ),
    ...buildSentenceDrill(
      "de",
      "de_drill_adverbial",
      "adverbial",
      "drill-de-adverbial.csv",
    ),
    ...buildSentenceDrill(
      "de",
      "de_drill_complement",
      "complement",
      "drill-de-complement.csv",
    ),
    ...buildSentenceDrill(
      "de",
      "de_drill_infinitive",
      "infinitive",
      "drill-de-infinitive.csv",
    ),
    ...buildSentenceDrill(
      "de",
      "de_drill_extras",
      "extras",
      "drill-de-extras.csv",
    ),
  ];
  mergeInto(DE_TARGET, DE_DRILL_TOPICS, deRows, "de.json");

  const enRows = [
    ...buildEnPlurals(),
    ...buildEnVerbs(),
    ...buildEnAdjectives(),
    ...buildSentenceDrill(
      "en",
      "en_drill_prepositions",
      "prepositions",
      "drill-en-prepositions.csv",
    ),
    ...buildSentenceDrill(
      "en",
      "en_drill_relative",
      "relative",
      "drill-en-relative.csv",
    ),
    ...buildSentenceDrill(
      "en",
      "en_drill_adverbial",
      "adverbial",
      "drill-en-adverbial.csv",
    ),
    ...buildSentenceDrill(
      "en",
      "en_drill_complement",
      "complement",
      "drill-en-complement.csv",
    ),
    ...buildSentenceDrill(
      "en",
      "en_drill_infinitive",
      "infinitive",
      "drill-en-infinitive.csv",
    ),
    ...buildSentenceDrill(
      "en",
      "en_drill_extras",
      "extras",
      "drill-en-extras.csv",
    ),
  ];
  mergeInto(EN_TARGET, EN_DRILL_TOPICS, enRows, "en.json");
}

main();
