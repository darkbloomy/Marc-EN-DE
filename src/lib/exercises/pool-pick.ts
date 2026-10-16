export interface PoolPickRow {
  id: string;
  payload: string;
  difficulty?: number;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Collapse articles/pronouns so "Das ist der Hund" and "Das ist die Katze" share a frame. */
export function sentenceShape(sentence: string): string {
  const normalized = sentence
    .toLowerCase()
    .replace(/[„“”"'`´.!?:,;()]/g, " ")
    .replace(
      /\b(der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines|the|a|an|this|that|these|those|my|your|his|her|our|their|ich|du|er|sie|es|wir|ihr)\b/g,
      "x",
    )
    .replace(/\s+/g, " ")
    .trim();
  const parts = normalized.split("___");
  const left = (parts[0] ?? "").trim();
  const right = parts.slice(1).join(" ").trim();
  const pos = !left ? "s" : !right ? "e" : "m";
  const leftKey = left.split(" ").filter(Boolean).slice(0, 3).join(" ");
  return `${pos}:${leftKey}`;
}

export function answerKeyFromPayload(payload: string): string {
  try {
    const ex = JSON.parse(payload) as {
      type?: string;
      correctAnswer?: string;
      blanks?: Array<{ correctAnswer?: string }>;
    };
    if (ex.type !== "fill_in_the_blank") return "";
    return (ex.blanks?.[0]?.correctAnswer ?? ex.correctAnswer ?? "")
      .toLowerCase()
      .trim();
  } catch {
    return "";
  }
}

/**
 * Pick `count` pool rows preferring the target difficulty, then unique
 * answers, then unique sentence frames — so a session does not fill with
 * the same "if / wenn / Das ist der …" skeleton.
 */
export function pickDiverseFromPool(
  rows: PoolPickRow[],
  count: number,
  targetDifficulty?: number,
): PoolPickRow[] {
  if (count <= 0 || rows.length === 0) return [];

  const items = shuffle(rows).map((row) => {
    let sentence = "";
    try {
      const ex = JSON.parse(row.payload) as { sentence?: string };
      sentence = ex.sentence ?? "";
    } catch {
      sentence = "";
    }
    return {
      row,
      answer: answerKeyFromPayload(row.payload),
      shape: sentence ? sentenceShape(sentence) : row.id,
      dist:
        targetDifficulty == null || row.difficulty == null
          ? 0
          : Math.abs(row.difficulty - targetDifficulty),
    };
  });

  items.sort((a, b) => a.dist - b.dist);

  const picked: PoolPickRow[] = [];
  const used = new Set<PoolPickRow>();
  const usedAnswers = new Set<string>();
  const usedShapes = new Set<string>();

  const take = (
    ok: (item: (typeof items)[number]) => boolean,
  ) => {
    for (const item of items) {
      if (picked.length >= count) return;
      if (used.has(item.row)) continue;
      if (!ok(item)) continue;
      used.add(item.row);
      picked.push(item.row);
      if (item.answer) usedAnswers.add(item.answer);
      if (item.shape) usedShapes.add(item.shape);
    }
  };

  take((item) => !usedAnswers.has(item.answer) && !usedShapes.has(item.shape));
  take((item) => !usedAnswers.has(item.answer));
  take((item) => !usedShapes.has(item.shape));
  take(() => true);

  return picked;
}
