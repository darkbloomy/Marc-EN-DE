# Manual Exercise Pool Seed (via another Claude chat)

Use this when you want to generate the exercise pool **without running `npm run seed:exercises`** — for example, to leverage your existing Claude subscription instead of paying for a Gemini API key.

The workflow:

1. Copy [the prompt](#the-prompt) into a fresh Claude chat (claude.ai or any Claude UI).
2. At the top of the prompt, fill in `TOPIC_ID`, `EXERCISE_TYPE`, and the run metadata (`BATCH_ID`, `MODEL_VERSION`, `CREATED_AT`).
3. Send the prompt. Claude returns a JSON array of ~15 exercise rows (3 difficulty levels × 5 each).
4. Append that array into the appropriate language file: `prisma/exercise-data/de.json` or `prisma/exercise-data/en.json`.
5. Repeat for every (topic, type) combination you want to cover (110 combinations max for full coverage).
6. When done, run `npm run seed:load:exercises` to load the JSON into the DB.

> **Tip — keep one BATCH_ID per session.** Generate one UUID at the start of your seeding work and reuse it across every run that day. That way `DELETE FROM Exercise WHERE batchId = '...'` cleanly rolls back the whole batch if you decide the quality wasn't good enough.
>
> Generate a UUID: `uuidgen` in Terminal, or any online UUID v4 generator.

## Output target

Each Claude response gives you a JSON array. The two language files at the end should look like:

```jsonc
// prisma/exercise-data/de.json
[
  { "id": "de_noun_cases_multiple_choice_d2_a1b2c3", "language": "de", ... },
  { "id": "de_noun_cases_multiple_choice_d3_d4e5f6", "language": "de", ... },
  // ...append every row from every German run here...
]
```

The loader (`prisma/seed-exercises-load.ts`) upserts by `id`, so safe-to-rerun even if you load the same file multiple times.

## Validation before loading

After pasting in new content:

```bash
# Sanity check: file is valid JSON and has the expected fields
node -e "const r = require('./prisma/exercise-data/de.json'); console.log(r.length, 'rows'); console.log('first:', r[0])"
```

## The prompt

Copy everything between the dashed lines below, fill in the `>>> FILL IN <<<` lines at the top, then paste into a Claude chat.

---

```
>>> FILL IN BEFORE SENDING <<<
TOPIC_ID:        de_noun_cases
EXERCISE_TYPE:   multiple_choice
BATCH_ID:        <paste a UUID v4 here, e.g. 7c3f8e1a-9b2d-4e5f-a6c7-8d9e0f1a2b3c>
MODEL_VERSION:   claude-opus-4-7-manual-2026-04
CREATED_AT:      2026-04-30T00:00:00.000Z
>>> END FILL IN <<<

You are a friendly language tutor generating practice exercises for a 10-year-old German Gymnasium 5. Klasse student. Your output will be loaded directly into a database — exact JSON shape matters.

# Available topics (look up TOPIC_ID in this list)

GERMAN (language="de"):
- de_noun_cases        | category=grammar     | base_difficulty=3 | German noun cases: Nominativ, Akkusativ, Dativ, Genitiv. Identifying and using correct case endings with definite and indefinite articles.
- de_verb_conjugation  | category=grammar     | base_difficulty=2 | Conjugating regular and common irregular German verbs in present tense for all persons (ich, du, er/sie/es, wir, ihr, sie/Sie).
- de_past_tenses       | category=grammar     | base_difficulty=3 | German past tenses: Perfekt (conversational past with haben/sein + Partizip II) and Präteritum (simple past, especially for sein/haben/modal verbs).
- de_sentence_structure| category=grammar     | base_difficulty=3 | German sentence structure: verb-second in main clauses, verb-final in subordinate clauses, word order with time-manner-place.
- de_articles          | category=grammar     | base_difficulty=2 | Correct use of German definite articles (der, die, das) and indefinite articles (ein, eine) based on noun gender.
- de_prepositions      | category=grammar     | base_difficulty=3 | German prepositions that require specific cases: Akkusativ (durch, für, gegen, ohne, um), Dativ (aus, bei, mit, nach, seit, von, zu), Wechselpräpositionen (an, auf, in, etc.).
- de_spelling_rules    | category=spelling    | base_difficulty=2 | German spelling rules: capitalization of nouns, ss vs ß, ie vs ei, compound words, common spelling traps for 5th graders.
- de_dictation         | category=spelling    | base_difficulty=2 | Dictation-style spelling: tricky letter combinations (sch, ch, ck, tz, st/sp).
- de_vocabulary_school | category=vocabulary  | base_difficulty=1 | German vocabulary for school subjects, classroom objects, daily routines, family, common activities for a 5th grader.
- de_vocabulary_nature | category=vocabulary  | base_difficulty=1 | German vocabulary for animals, plants, seasons, weather, nature-related terms.
- de_reading_comprehension | category=reading | base_difficulty=3 | Short German reading passages (3-5 sentences) with comprehension questions about main idea, details, vocabulary in context.
- de_creative_writing  | category=writing     | base_difficulty=4 | Short creative writing prompts in German: describe a picture, continue a story, write a short letter or diary entry (2-3 sentences expected).

ENGLISH (language="en"):
- en_tenses              | category=grammar    | base_difficulty=2 | English tenses for 5th grade: Simple Present (habits, facts), Present Progressive (actions happening now), and knowing when to use which.
- en_simple_past         | category=grammar    | base_difficulty=3 | English Simple Past: regular verbs (-ed ending), common irregular verbs (went, saw, had, etc.), negative and question forms with did.
- en_pronouns            | category=grammar    | base_difficulty=2 | English pronouns: subject (I, you, he, she, it, we, they), object (me, you, him, her, it, us, them), possessive (my, your, his, her, its, our, their).
- en_questions           | category=grammar    | base_difficulty=2 | Forming English questions: yes/no questions with do/does/did, wh-questions (what, where, when, who, why, how), question word order.
- en_comparisons         | category=grammar    | base_difficulty=2 | English comparative and superlative forms: -er/-est for short adjectives, more/most for longer ones, irregular forms (good-better-best).
- en_vocabulary_everyday | category=vocabulary | base_difficulty=1 | English vocabulary for daily activities, hobbies, sports, food, clothes, common objects around the house.
- en_vocabulary_travel   | category=vocabulary | base_difficulty=2 | English vocabulary for travel, directions, places in a city, transportation, asking for help.
- en_spelling            | category=spelling   | base_difficulty=2 | Spelling common English words that German speakers often misspell: silent letters, double consonants, -tion/-sion endings, tricky vowel combinations.
- en_reading_comprehension | category=reading  | base_difficulty=3 | Short English reading passages (3-5 sentences, age-appropriate) with comprehension questions about content, vocabulary, inference.
- en_writing_short       | category=writing    | base_difficulty=3 | Short English writing tasks: introduce yourself, describe your day, write about your favorite hobby (2-3 sentences expected for a 5th grader learning English).

# Difficulty levels (you must generate exercises at THREE levels)

For the chosen topic with `base_difficulty = D`, generate exercises at:
  - difficulty = max(1, D - 1)   (a step easier — confidence-building)
  - difficulty = D                (the standard 5. Klasse level)
  - difficulty = min(5, D + 1)   (a step harder — stretches the student)

If D=1, only generate difficulties [1, 2]. If D=5, only generate [4, 5].

Difficulty meanings:
  1 — very easy: short simple sentences, most common everyday vocabulary, gentle concepts
  2 — easy: short sentences, common vocabulary, basic concepts; build confidence
  3 — standard 5. Klasse Gymnasium level: moderate sentence length, age-appropriate vocabulary
  4 — challenging: longer sentences, less common vocabulary, distractors that require careful reading
  5 — very challenging: complex sentence structures, advanced vocabulary at upper edge of 5. Klasse / early 6. Klasse, subtle distractors

# Count per difficulty level

- For exercise types `multiple_choice`, `fill_in_the_blank`, `true_false`, `reorder`: generate **5 exercises per difficulty level**
- For exercise type `free_text` and any topic in categories `reading` or `writing`: generate **15 exercises per difficulty level** (variety matters more for these)

So your total response will be either ~15 rows (5×3) or ~45 rows (15×3).

# Exercise type schemas (the `payload` field)

Each row's `payload` field is a JSON-stringified object whose shape depends on EXERCISE_TYPE:

`multiple_choice`:
  { "type": "multiple_choice", "question": "...", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "..." }
  - Exactly 4 options
  - correctIndex is 0-based
  - Options should be plausible but clearly distinguishable

`fill_in_the_blank`:
  { "type": "fill_in_the_blank", "sentence": "The cat ___ on the mat.", "correctAnswer": "sits", "acceptableAnswers": ["sat"], "hint": "...", "explanation": "..." }
  - Use ___ (three underscores) for the blank
  - Only one blank per sentence
  - acceptableAnswers and hint are optional

`true_false`:
  { "type": "true_false", "statement": "...", "isTrue": true, "explanation": "..." }
  - Statement should be clearly true or clearly false; avoid trick questions
  - Explanation should teach something

`reorder`:
  { "type": "reorder", "instruction": "...", "scrambledItems": ["the","cat","sat"], "correctOrder": ["the","cat","sat"], "explanation": "..." }
  - 4-8 items
  - scrambledItems should NOT be in the correct order
  - correctOrder is the single correct arrangement

`free_text`:
  { "type": "free_text", "prompt": "...", "sampleAnswer": "...", "keyPoints": ["..."], "explanation": "..." }
  - Prompt should ask for 2-3 sentences max (age-appropriate length)
  - sampleAnswer shows what a good response looks like
  - keyPoints lists what a good answer should include

# Output format — the JSON array I want back

Return a single JSON array. Every element must have this exact shape:

{
  "id":           "<TOPIC_ID>_<EXERCISE_TYPE>_d<DIFFICULTY>_<6 random alphanumeric chars, lowercase>",
  "language":     "<de or en, taken from the topic>",
  "topic":        "<TOPIC_ID>",
  "category":     "<from the topic table above>",
  "exerciseType": "<EXERCISE_TYPE>",
  "difficulty":   <integer 1-5>,
  "payload":      "<JSON-stringified Exercise object — yes, a string, with escaped quotes>",
  "reviewStatus": "approved",
  "batchId":      "<BATCH_ID from above>",
  "modelVersion": "<MODEL_VERSION from above>",
  "createdAt":    "<CREATED_AT from above>"
}

The `id` field's random suffix MUST be unique for each row in this response. Use 6 random lowercase alphanumeric characters (a-z, 0-9).

The `payload` field is a STRING containing a JSON-encoded Exercise object. So if the inner exercise is `{"type":"true_false","statement":"X","isTrue":true,"explanation":"Y"}`, the payload field reads `"{\"type\":\"true_false\",\"statement\":\"X\",\"isTrue\":true,\"explanation\":\"Y\"}"`.

# Content guidance

- The student is a 10-year-old at German Gymnasium 5. Klasse — content must be age-appropriate
- For German topics, exercise content is in German. For English topics, exercise content is in English
- For English topics, remember the student is a German native speaker learning English — avoid advanced English vocabulary in instructions
- Make every exercise distinctly different from the others — different vocabulary, different sentence patterns, different examples; no near-duplicates
- For grammar topics, vary the grammatical edge case being tested across the 5 exercises in each difficulty level
- For vocabulary topics, vary the semantic field (e.g. animals, food, school) across exercises

# Output instructions

Output ONLY the JSON array. No prose before or after. No markdown code fences. No explanation. Just the array, starting with `[` and ending with `]`.
```

---

## After generating

Once you have the JSON array from Claude, edit `prisma/exercise-data/<language>.json`:

- If the file does not exist yet, create it as `[ ...your array contents... ]`
- If it exists, paste your new rows just before the closing `]` (with a comma after the previous last row)

Then validate and load:

```bash
# Validate JSON
node -e "JSON.parse(require('fs').readFileSync('./prisma/exercise-data/de.json','utf8'))" && echo "✓ valid"

# Load into local DB
npm run seed:load:exercises
```

If the loader prints non-zero counts under each `(language / exerciseType)` line, you're good.

## Suggested order of runs

To get coverage faster, prioritize:

1. **High-volume buckets first** — the daily session draws 3-5 exercises per (topic, type). Start with the 4 "fast" types (`multiple_choice`, `fill_in_the_blank`, `true_false`, `reorder`) across all 22 topics — that's 88 prompt runs and gives you ~1,300 exercises that cover most of daily practice.
2. **Free text and reading/writing topics** — these need 15 exercises per difficulty (45 per run) for variety. 22 runs.

Total for full coverage: 110 runs. You can cover the most-used buckets in a single weekend.
