import type { Exercise, GeneratedExercise, Language } from "./types";

export interface SheetMeta {
  title: string;
  language: Language;
  mode?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getSheetCorrectAnswer(exercise: Exercise): string {
  switch (exercise.type) {
    case "multiple_choice":
      return exercise.options[exercise.correctIndex] ?? "";
    case "fill_in_the_blank":
      return exercise.blanks
        ? exercise.blanks.map((b) => b.correctAnswer).join(" | ")
        : exercise.correctAnswer;
    case "true_false":
      return exercise.isTrue ? "True" : "False";
    case "reorder":
      return exercise.correctOrder.join(" ");
    case "free_text":
      return exercise.sampleAnswer;
  }
}

function typeLabel(type: Exercise["type"]): string {
  switch (type) {
    case "multiple_choice":
      return "Multiple choice";
    case "fill_in_the_blank":
      return "Fill in the blank";
    case "true_false":
      return "True / False";
    case "reorder":
      return "Reorder";
    case "free_text":
      return "Free text";
  }
}

function renderWorksheetItem(ex: Exercise, index: number): string {
  const n = index + 1;
  const label = typeLabel(ex.type);
  let body = "";

  switch (ex.type) {
    case "multiple_choice": {
      const opts = ex.options
        .map((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          return `<li><span class="opt-letter">${letter}.</span> ${escapeHtml(opt)}</li>`;
        })
        .join("\n");
      body = `<p class="prompt">${escapeHtml(ex.question)}</p>
<ol class="options" type="A">${opts}</ol>`;
      break;
    }
    case "fill_in_the_blank":
      body = `<p class="prompt fill">${escapeHtml(ex.sentence)}</p>
<p class="answer-line">Answer: _______________________________</p>`;
      break;
    case "true_false":
      body = `<p class="prompt">${escapeHtml(ex.statement)}</p>
<p class="tf">☐ True &nbsp;&nbsp;&nbsp; ☐ False</p>`;
      break;
    case "reorder":
      body = `<p class="prompt">${escapeHtml(ex.instruction)}</p>
<p class="scrambled">Words: ${ex.scrambledItems.map(escapeHtml).join(" · ")}</p>
<p class="answer-line">Order: _______________________________________________</p>`;
      break;
    case "free_text":
      body = `<p class="prompt">${escapeHtml(ex.prompt)}</p>
<div class="ruled">
  <div class="rule"></div>
  <div class="rule"></div>
  <div class="rule"></div>
  <div class="rule"></div>
</div>`;
      break;
  }

  return `<article class="item">
  <h2><span class="num">${n}.</span> <span class="type">${escapeHtml(label)}</span></h2>
  ${body}
</article>`;
}

function renderAnswerKeyItem(ex: Exercise, index: number): string {
  const n = index + 1;
  const answer = getSheetCorrectAnswer(ex);
  const explanation = ex.explanation
    ? `<p class="key-explain">${escapeHtml(ex.explanation)}</p>`
    : "";
  return `<div class="key-item">
  <p><strong>${n}.</strong> ${escapeHtml(answer)}</p>
  ${explanation}
</div>`;
}

const SHEET_CSS = `
  * { box-sizing: border-box; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 12pt;
    line-height: 1.45;
    color: #111;
    max-width: 720px;
    margin: 0 auto;
    padding: 24px 28px 48px;
  }
  h1 { font-size: 1.5rem; margin: 0 0 0.25rem; }
  .meta { color: #444; font-size: 0.95rem; margin-bottom: 1.5rem; }
  .item { margin: 0 0 1.4rem; page-break-inside: avoid; }
  .item h2 { font-size: 1rem; margin: 0 0 0.4rem; font-weight: 700; }
  .num { margin-right: 0.25rem; }
  .type { font-weight: 400; color: #555; font-size: 0.85rem; }
  .prompt { margin: 0.25rem 0 0.5rem; }
  .fill { letter-spacing: 0.01em; }
  .options { margin: 0.25rem 0 0 1.25rem; padding: 0; }
  .options li { margin: 0.2rem 0; list-style: none; }
  .opt-letter { font-weight: 700; margin-right: 0.35rem; }
  .answer-line, .tf { margin: 0.5rem 0 0; color: #333; }
  .scrambled { margin: 0.35rem 0; }
  .ruled { margin-top: 0.6rem; }
  .rule {
    border-bottom: 1px solid #999;
    height: 1.6rem;
    margin-bottom: 0.15rem;
  }
  .answer-key { page-break-before: always; margin-top: 2rem; }
  .answer-key h1 { margin-bottom: 1rem; }
  .key-item { margin: 0 0 0.85rem; page-break-inside: avoid; }
  .key-explain { margin: 0.15rem 0 0 1.1rem; font-size: 0.9rem; color: #444; }
  @media print {
    body { padding: 0; max-width: none; }
    .answer-key { page-break-before: always; }
  }
`;

/** Build a standalone printable HTML worksheet + answer key. */
export function buildExerciseSheetHtml(
  exercises: GeneratedExercise[],
  meta: SheetMeta,
): string {
  const langLabel = meta.language === "de" ? "German" : "English";
  const modePart = meta.mode ? ` · ${escapeHtml(meta.mode)}` : "";
  const date = new Date().toISOString().slice(0, 10);

  const worksheet = exercises
    .map((g, i) => renderWorksheetItem(g.exercise, i))
    .join("\n");

  const answerKey = exercises
    .map((g, i) => renderAnswerKeyItem(g.exercise, i))
    .join("\n");

  return `<!DOCTYPE html>
<html lang="${meta.language}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(meta.title)}</title>
  <style>${SHEET_CSS}</style>
</head>
<body>
  <header>
    <h1>${escapeHtml(meta.title)}</h1>
    <p class="meta">${escapeHtml(langLabel)}${modePart} · ${exercises.length} exercises · ${date}</p>
  </header>
  <section class="worksheet">
    ${worksheet}
  </section>
  <section class="answer-key">
    <h1>Answer Key</h1>
    ${answerKey}
  </section>
</body>
</html>
`;
}

export function buildSheetFilename(
  mode: string,
  language: Language,
  date = new Date(),
): string {
  const d = date.toISOString().slice(0, 10);
  const safeMode = mode.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `marc-${safeMode}-${language}-${d}.html`;
}

/** Download HTML as a file (browser only). */
export function downloadExerciseSheetHtml(html: string, filename: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Open HTML in a new window and trigger print (browser only). */
export function printExerciseSheetHtml(html: string): void {
  const w = window.open("", "_blank");
  if (!w) {
    // Popup blocked — fall back to download so the user still gets the file
    downloadExerciseSheetHtml(html, "marc-exercises.html");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  // Allow layout/styles to settle before print
  w.focus();
  setTimeout(() => {
    w.print();
  }, 250);
}
