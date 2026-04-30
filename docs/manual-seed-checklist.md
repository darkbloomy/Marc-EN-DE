# Manual Seed Checklist

Tracking sheet for the manual exercise-pool generation workflow described in [manual-seed-prompt.md](manual-seed-prompt.md).

110 total prompt runs cover the full pool. Each row below = one prompt run = one (TOPIC_ID, EXERCISE_TYPE) combination across that topic's 2-3 difficulty levels.

## Summary

| Metric | Value |
|---|---|
| Total topics | 22 (12 DE + 10 EN) |
| Exercise types | 5 |
| Total prompt runs for full coverage | 110 |
| Estimated total exercises after all runs | ~1,920 |
| Suggested first pass (4 fast types, all topics) | 88 runs → ~1,310 exercises |
| Free text + reading/writing remainder | 22 runs → ~610 exercises |

**Per-run counts** are derived from the rule in [manual-seed-prompt.md](manual-seed-prompt.md):
- Standard types (`multiple_choice`, `fill_in_the_blank`, `true_false`, `reorder`) on grammar/vocab/spelling topics → 5 exercises × N difficulty levels
- `free_text` type **OR** any type on a reading/writing topic → 15 exercises × N difficulty levels

**Difficulty levels per topic** are `[D-1, D, D+1]` clamped to `[1, 5]` — so D=1 topics produce 2 levels, all others produce 3.

## Checklist

Tick the box as you complete each prompt run.

### German (de)

| Done | # | TOPIC_ID | EXERCISE_TYPE | Category | D-levels | Per run |
|---|---|---|---|---|---|---|
| ☐ | 1 | de_articles | multiple_choice | grammar | 1, 2, 3 | 15 |
| ☐ | 2 | de_articles | fill_in_the_blank | grammar | 1, 2, 3 | 15 |
| ☐ | 3 | de_articles | true_false | grammar | 1, 2, 3 | 15 |
| ☐ | 4 | de_articles | reorder | grammar | 1, 2, 3 | 15 |
| ☐ | 5 | de_articles | free_text | grammar | 1, 2, 3 | 45 |
| ☐ | 6 | de_creative_writing | multiple_choice | writing | 3, 4, 5 | 45 |
| ☐ | 7 | de_creative_writing | fill_in_the_blank | writing | 3, 4, 5 | 45 |
| ☐ | 8 | de_creative_writing | true_false | writing | 3, 4, 5 | 45 |
| ☐ | 9 | de_creative_writing | reorder | writing | 3, 4, 5 | 45 |
| ☐ | 10 | de_creative_writing | free_text | writing | 3, 4, 5 | 45 |
| ☐ | 11 | de_dictation | multiple_choice | spelling | 1, 2, 3 | 15 |
| ☐ | 12 | de_dictation | fill_in_the_blank | spelling | 1, 2, 3 | 15 |
| ☐ | 13 | de_dictation | true_false | spelling | 1, 2, 3 | 15 |
| ☐ | 14 | de_dictation | reorder | spelling | 1, 2, 3 | 15 |
| ☐ | 15 | de_dictation | free_text | spelling | 1, 2, 3 | 45 |
| ☐ | 16 | de_noun_cases | multiple_choice | grammar | 2, 3, 4 | 15 |
| ☐ | 17 | de_noun_cases | fill_in_the_blank | grammar | 2, 3, 4 | 15 |
| ☐ | 18 | de_noun_cases | true_false | grammar | 2, 3, 4 | 15 |
| ☐ | 19 | de_noun_cases | reorder | grammar | 2, 3, 4 | 15 |
| ☐ | 20 | de_noun_cases | free_text | grammar | 2, 3, 4 | 45 |
| ☐ | 21 | de_past_tenses | multiple_choice | grammar | 2, 3, 4 | 15 |
| ☐ | 22 | de_past_tenses | fill_in_the_blank | grammar | 2, 3, 4 | 15 |
| ☐ | 23 | de_past_tenses | true_false | grammar | 2, 3, 4 | 15 |
| ☐ | 24 | de_past_tenses | reorder | grammar | 2, 3, 4 | 15 |
| ☐ | 25 | de_past_tenses | free_text | grammar | 2, 3, 4 | 45 |
| ☐ | 26 | de_prepositions | multiple_choice | grammar | 2, 3, 4 | 15 |
| ☐ | 27 | de_prepositions | fill_in_the_blank | grammar | 2, 3, 4 | 15 |
| ☐ | 28 | de_prepositions | true_false | grammar | 2, 3, 4 | 15 |
| ☐ | 29 | de_prepositions | reorder | grammar | 2, 3, 4 | 15 |
| ☐ | 30 | de_prepositions | free_text | grammar | 2, 3, 4 | 45 |
| ☐ | 31 | de_reading_comprehension | multiple_choice | reading | 2, 3, 4 | 45 |
| ☐ | 32 | de_reading_comprehension | fill_in_the_blank | reading | 2, 3, 4 | 45 |
| ☐ | 33 | de_reading_comprehension | true_false | reading | 2, 3, 4 | 45 |
| ☐ | 34 | de_reading_comprehension | reorder | reading | 2, 3, 4 | 45 |
| ☐ | 35 | de_reading_comprehension | free_text | reading | 2, 3, 4 | 45 |
| ☐ | 36 | de_sentence_structure | multiple_choice | grammar | 2, 3, 4 | 15 |
| ☐ | 37 | de_sentence_structure | fill_in_the_blank | grammar | 2, 3, 4 | 15 |
| ☐ | 38 | de_sentence_structure | true_false | grammar | 2, 3, 4 | 15 |
| ☐ | 39 | de_sentence_structure | reorder | grammar | 2, 3, 4 | 15 |
| ☐ | 40 | de_sentence_structure | free_text | grammar | 2, 3, 4 | 45 |
| ☐ | 41 | de_spelling_rules | multiple_choice | spelling | 1, 2, 3 | 15 |
| ☐ | 42 | de_spelling_rules | fill_in_the_blank | spelling | 1, 2, 3 | 15 |
| ☐ | 43 | de_spelling_rules | true_false | spelling | 1, 2, 3 | 15 |
| ☐ | 44 | de_spelling_rules | reorder | spelling | 1, 2, 3 | 15 |
| ☐ | 45 | de_spelling_rules | free_text | spelling | 1, 2, 3 | 45 |
| ☐ | 46 | de_verb_conjugation | multiple_choice | grammar | 1, 2, 3 | 15 |
| ☐ | 47 | de_verb_conjugation | fill_in_the_blank | grammar | 1, 2, 3 | 15 |
| ☐ | 48 | de_verb_conjugation | true_false | grammar | 1, 2, 3 | 15 |
| ☐ | 49 | de_verb_conjugation | reorder | grammar | 1, 2, 3 | 15 |
| ☐ | 50 | de_verb_conjugation | free_text | grammar | 1, 2, 3 | 45 |
| ☐ | 51 | de_vocabulary_nature | multiple_choice | vocabulary | 1, 2 | 10 |
| ☐ | 52 | de_vocabulary_nature | fill_in_the_blank | vocabulary | 1, 2 | 10 |
| ☐ | 53 | de_vocabulary_nature | true_false | vocabulary | 1, 2 | 10 |
| ☐ | 54 | de_vocabulary_nature | reorder | vocabulary | 1, 2 | 10 |
| ☐ | 55 | de_vocabulary_nature | free_text | vocabulary | 1, 2 | 30 |
| ☐ | 56 | de_vocabulary_school | multiple_choice | vocabulary | 1, 2 | 10 |
| ☐ | 57 | de_vocabulary_school | fill_in_the_blank | vocabulary | 1, 2 | 10 |
| ☐ | 58 | de_vocabulary_school | true_false | vocabulary | 1, 2 | 10 |
| ☐ | 59 | de_vocabulary_school | reorder | vocabulary | 1, 2 | 10 |
| ☐ | 60 | de_vocabulary_school | free_text | vocabulary | 1, 2 | 30 |

### English (en)

| Done | # | TOPIC_ID | EXERCISE_TYPE | Category | D-levels | Per run |
|---|---|---|---|---|---|---|
| ☐ | 61 | en_comparisons | multiple_choice | grammar | 1, 2, 3 | 15 |
| ☐ | 62 | en_comparisons | fill_in_the_blank | grammar | 1, 2, 3 | 15 |
| ☐ | 63 | en_comparisons | true_false | grammar | 1, 2, 3 | 15 |
| ☐ | 64 | en_comparisons | reorder | grammar | 1, 2, 3 | 15 |
| ☐ | 65 | en_comparisons | free_text | grammar | 1, 2, 3 | 45 |
| ☐ | 66 | en_pronouns | multiple_choice | grammar | 1, 2, 3 | 15 |
| ☐ | 67 | en_pronouns | fill_in_the_blank | grammar | 1, 2, 3 | 15 |
| ☐ | 68 | en_pronouns | true_false | grammar | 1, 2, 3 | 15 |
| ☐ | 69 | en_pronouns | reorder | grammar | 1, 2, 3 | 15 |
| ☐ | 70 | en_pronouns | free_text | grammar | 1, 2, 3 | 45 |
| ☐ | 71 | en_questions | multiple_choice | grammar | 1, 2, 3 | 15 |
| ☐ | 72 | en_questions | fill_in_the_blank | grammar | 1, 2, 3 | 15 |
| ☐ | 73 | en_questions | true_false | grammar | 1, 2, 3 | 15 |
| ☐ | 74 | en_questions | reorder | grammar | 1, 2, 3 | 15 |
| ☐ | 75 | en_questions | free_text | grammar | 1, 2, 3 | 45 |
| ☐ | 76 | en_reading_comprehension | multiple_choice | reading | 2, 3, 4 | 45 |
| ☐ | 77 | en_reading_comprehension | fill_in_the_blank | reading | 2, 3, 4 | 45 |
| ☐ | 78 | en_reading_comprehension | true_false | reading | 2, 3, 4 | 45 |
| ☐ | 79 | en_reading_comprehension | reorder | reading | 2, 3, 4 | 45 |
| ☐ | 80 | en_reading_comprehension | free_text | reading | 2, 3, 4 | 45 |
| ☐ | 81 | en_simple_past | multiple_choice | grammar | 2, 3, 4 | 15 |
| ☐ | 82 | en_simple_past | fill_in_the_blank | grammar | 2, 3, 4 | 15 |
| ☐ | 83 | en_simple_past | true_false | grammar | 2, 3, 4 | 15 |
| ☐ | 84 | en_simple_past | reorder | grammar | 2, 3, 4 | 15 |
| ☐ | 85 | en_simple_past | free_text | grammar | 2, 3, 4 | 45 |
| ☐ | 86 | en_spelling | multiple_choice | spelling | 1, 2, 3 | 15 |
| ☐ | 87 | en_spelling | fill_in_the_blank | spelling | 1, 2, 3 | 15 |
| ☐ | 88 | en_spelling | true_false | spelling | 1, 2, 3 | 15 |
| ☐ | 89 | en_spelling | reorder | spelling | 1, 2, 3 | 15 |
| ☐ | 90 | en_spelling | free_text | spelling | 1, 2, 3 | 45 |
| ☐ | 91 | en_tenses | multiple_choice | grammar | 1, 2, 3 | 15 |
| ☐ | 92 | en_tenses | fill_in_the_blank | grammar | 1, 2, 3 | 15 |
| ☐ | 93 | en_tenses | true_false | grammar | 1, 2, 3 | 15 |
| ☐ | 94 | en_tenses | reorder | grammar | 1, 2, 3 | 15 |
| ☐ | 95 | en_tenses | free_text | grammar | 1, 2, 3 | 45 |
| ☐ | 96 | en_vocabulary_everyday | multiple_choice | vocabulary | 1, 2 | 10 |
| ☐ | 97 | en_vocabulary_everyday | fill_in_the_blank | vocabulary | 1, 2 | 10 |
| ☐ | 98 | en_vocabulary_everyday | true_false | vocabulary | 1, 2 | 10 |
| ☐ | 99 | en_vocabulary_everyday | reorder | vocabulary | 1, 2 | 10 |
| ☐ | 100 | en_vocabulary_everyday | free_text | vocabulary | 1, 2 | 30 |
| ☐ | 101 | en_vocabulary_travel | multiple_choice | vocabulary | 1, 2, 3 | 15 |
| ☐ | 102 | en_vocabulary_travel | fill_in_the_blank | vocabulary | 1, 2, 3 | 15 |
| ☐ | 103 | en_vocabulary_travel | true_false | vocabulary | 1, 2, 3 | 15 |
| ☐ | 104 | en_vocabulary_travel | reorder | vocabulary | 1, 2, 3 | 15 |
| ☐ | 105 | en_vocabulary_travel | free_text | vocabulary | 1, 2, 3 | 45 |
| ☐ | 106 | en_writing_short | multiple_choice | writing | 2, 3, 4 | 45 |
| ☐ | 107 | en_writing_short | fill_in_the_blank | writing | 2, 3, 4 | 45 |
| ☐ | 108 | en_writing_short | true_false | writing | 2, 3, 4 | 45 |
| ☐ | 109 | en_writing_short | reorder | writing | 2, 3, 4 | 45 |
| ☐ | 110 | en_writing_short | free_text | writing | 2, 3, 4 | 45 |

## Tip: editing the checkboxes

In VS Code / Cursor: replace `☐` with `☑` (or `[x]` if you prefer that style) as you complete each row.

Quick command-line check of progress (counts unchecked rows):

```bash
grep -c '^| ☐' docs/manual-seed-checklist.md
```
