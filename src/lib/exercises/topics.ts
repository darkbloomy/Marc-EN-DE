import type { Language, TopicCategory } from "./types";

export interface Topic {
  id: string;
  labelDE: string;
  labelEN: string;
  category: TopicCategory;
  language: Language;
  difficulty: number; // 1-5
  description: string; // Used in prompts to guide generation
  // When true, omitted from getTopicsByLanguage (e.g. drill-only topics not
  // shown in the Free Practice picker). getTopic(id) still resolves them.
  hidden?: boolean;
}

const DE_TOPICS: Topic[] = [
  // Grammar
  {
    id: "de_noun_cases",
    labelDE: "Fälle (Nominativ, Akkusativ, Dativ, Genitiv)",
    labelEN: "Noun Cases",
    category: "grammar",
    language: "de",
    difficulty: 3,
    description:
      "German noun cases: Nominativ, Akkusativ, Dativ, Genitiv. Identifying and using correct case endings with definite and indefinite articles.",
  },
  {
    id: "de_verb_conjugation",
    labelDE: "Verbkonjugation (Präsens)",
    labelEN: "Verb Conjugation (Present Tense)",
    category: "grammar",
    language: "de",
    difficulty: 2,
    description:
      "Conjugating regular and common irregular German verbs in present tense for all persons (ich, du, er/sie/es, wir, ihr, sie/Sie).",
  },
  {
    id: "de_past_tenses",
    labelDE: "Vergangenheitsformen (Perfekt & Präteritum)",
    labelEN: "Past Tenses",
    category: "grammar",
    language: "de",
    difficulty: 3,
    description:
      "German past tenses: Perfekt (conversational past with haben/sein + Partizip II) and Präteritum (simple past, especially for sein/haben/modal verbs).",
  },
  {
    id: "de_sentence_structure",
    labelDE: "Satzstellung",
    labelEN: "Sentence Structure",
    category: "grammar",
    language: "de",
    difficulty: 3,
    description:
      "German sentence structure: verb-second in main clauses, verb-final in subordinate clauses, word order with time-manner-place.",
  },
  {
    id: "de_articles",
    labelDE: "Artikel (der, die, das)",
    labelEN: "Articles",
    category: "grammar",
    language: "de",
    difficulty: 2,
    description:
      "Correct use of German definite articles (der, die, das) and indefinite articles (ein, eine) based on noun gender.",
  },
  {
    id: "de_prepositions",
    labelDE: "Präpositionen mit Fällen",
    labelEN: "Prepositions with Cases",
    category: "grammar",
    language: "de",
    difficulty: 3,
    description:
      "German prepositions that require specific cases: Akkusativ (durch, für, gegen, ohne, um), Dativ (aus, bei, mit, nach, seit, von, zu), Wechselpräpositionen (an, auf, in, etc.).",
  },

  // Spelling
  {
    id: "de_spelling_rules",
    labelDE: "Rechtschreibregeln",
    labelEN: "Spelling Rules",
    category: "spelling",
    language: "de",
    difficulty: 2,
    description:
      "German spelling rules: capitalization of nouns, ss vs ß, ie vs ei, compound words, common spelling traps for 5th graders.",
  },
  {
    id: "de_dictation",
    labelDE: "Diktatübungen",
    labelEN: "Dictation Practice",
    category: "spelling",
    language: "de",
    difficulty: 2,
    description:
      "Spelling exercises modeled on dictation: correctly spelling words with tricky letter combinations (sch, ch, ck, tz, st/sp).",
  },

  // Vocabulary
  {
    id: "de_vocabulary_school",
    labelDE: "Wortschatz: Schule & Alltag",
    labelEN: "Vocabulary: School & Daily Life",
    category: "vocabulary",
    language: "de",
    difficulty: 1,
    description:
      "German vocabulary for school subjects, classroom objects, daily routines, family, and common activities for a 5th grader.",
  },
  {
    id: "de_vocabulary_nature",
    labelDE: "Wortschatz: Natur & Tiere",
    labelEN: "Vocabulary: Nature & Animals",
    category: "vocabulary",
    language: "de",
    difficulty: 1,
    description:
      "German vocabulary for animals, plants, seasons, weather, and nature-related terms.",
  },

  // Reading
  {
    id: "de_reading_comprehension",
    labelDE: "Leseverständnis",
    labelEN: "Reading Comprehension",
    category: "reading",
    language: "de",
    difficulty: 3,
    description:
      "Short German reading passages (3-5 sentences) with comprehension questions about main idea, details, and vocabulary in context.",
  },

  // Writing
  {
    id: "de_creative_writing",
    labelDE: "Kreatives Schreiben",
    labelEN: "Creative Writing",
    category: "writing",
    language: "de",
    difficulty: 4,
    description:
      "Short creative writing prompts in German: describe a picture, continue a story, write a short letter or diary entry (2-3 sentences expected).",
  },

  // Drills (hidden — surfaced only via the Drills page, not Free Practice)
  {
    id: "de_drill_nouns",
    labelDE: "Drill: Nomen (Artikel + Plural)",
    labelEN: "Drill: Nouns",
    category: "grammar",
    language: "de",
    difficulty: 2,
    hidden: true,
    description:
      "Two-blank drill: singular article (der/die/das) + plural form for common German nouns.",
  },
  {
    id: "de_drill_verbs",
    labelDE: "Drill: Verben (Konjugation)",
    labelEN: "Drill: Verbs",
    category: "grammar",
    language: "de",
    difficulty: 2,
    hidden: true,
    description:
      "Single-blank drill: conjugate German verbs across Präsens, Präteritum, and Perfekt for a given pronoun.",
  },
  {
    id: "de_drill_adjectives",
    labelDE: "Drill: Adjektive (Komparativ / Superlativ)",
    labelEN: "Drill: Adjectives (Comparative / Superlative)",
    category: "grammar",
    language: "de",
    difficulty: 2,
    hidden: true,
    description:
      "Fill-in drill: German adjective comparative (größer) and superlative (am größten), including irregular forms (gut/besser/am besten).",
  },
  {
    id: "de_drill_prepositions",
    labelDE: "Drill: Präpositionen",
    labelEN: "Drill: Prepositions",
    category: "grammar",
    language: "de",
    difficulty: 3,
    hidden: true,
    description:
      "Fill-in drill: German prepositions with cases (Akkusativ/Dativ/Wechselpräpositionen) and common fixed expressions.",
  },
  {
    id: "de_drill_relative",
    labelDE: "Drill: Relativsätze",
    labelEN: "Drill: Relative Clauses",
    category: "grammar",
    language: "de",
    difficulty: 3,
    hidden: true,
    description:
      "Fill-in drill: German relative clauses. Relativpronomen der/die/das (and denen/dessen/deren/was/wo) must match gender, number, and case; the verb is final in the clause.",
  },
  {
    id: "de_drill_adverbial",
    labelDE: "Drill: Adverbialsätze",
    labelEN: "Drill: Adverbial Clauses",
    category: "grammar",
    language: "de",
    difficulty: 3,
    hidden: true,
    description:
      "Fill-in drill: German adverbial clauses — time (als, wenn, während, bevor, nachdem), reason (weil, da, zumal), condition (wenn, falls, sofern), concession (obwohl, obgleich, auch wenn), purpose (damit), result (sodass), manner/comparison (indem, wie, als ob). Verb-final word order.",
  },
  {
    id: "de_drill_complement",
    labelDE: "Drill: Ergänzungssätze (dass/ob/W-Fragen)",
    labelEN: "Drill: Complement Clauses",
    category: "grammar",
    language: "de",
    difficulty: 3,
    hidden: true,
    description:
      "Fill-in drill: German complement clauses used as object, subject, or predicate — dass, ob, and indirect question words (wer, was, wo, wann, warum, wie). Verb-final word order.",
  },
  {
    id: "de_drill_infinitive",
    labelDE: "Drill: Infinitivsätze (um/ohne/statt … zu)",
    labelEN: "Drill: Infinitive Clauses",
    category: "grammar",
    language: "de",
    difficulty: 3,
    hidden: true,
    description:
      "Fill-in drill: German infinitive clauses with um … zu (purpose, same subject), ohne … zu, and statt/anstatt … zu, including zu placement with separable verbs.",
  },
  {
    id: "de_drill_extras",
    labelDE: "Drill: Extra (Zahlen, Zeit, Rede, Wendungen)",
    labelEN: "Drill: Extra (numbers, time, speech, chunks)",
    category: "grammar",
    language: "de",
    difficulty: 3,
    hidden: true,
    description:
      "Fill-in drill: German numbers, dates, and time expressions; comparison structures (so … wie, als, je … desto); reported speech with Konjunktiv; Funktionsverbgefüge and common collocations.",
  },
];

const EN_TOPICS: Topic[] = [
  // Grammar
  {
    id: "en_tenses",
    labelDE: "Zeitformen (Simple Present, Present Progressive)",
    labelEN: "Tenses (Simple Present, Present Progressive)",
    category: "grammar",
    language: "en",
    difficulty: 2,
    description:
      "English tenses for 5th grade: Simple Present (habits, facts), Present Progressive (actions happening now), and knowing when to use which.",
  },
  {
    id: "en_simple_past",
    labelDE: "Simple Past (regelmäßig & unregelmäßig)",
    labelEN: "Simple Past (Regular & Irregular)",
    category: "grammar",
    language: "en",
    difficulty: 3,
    description:
      "English Simple Past: regular verbs (-ed ending), common irregular verbs (went, saw, had, etc.), negative and question forms with did.",
  },
  {
    id: "en_pronouns",
    labelDE: "Pronomen (Subjekt, Objekt, Possessiv)",
    labelEN: "Pronouns",
    category: "grammar",
    language: "en",
    difficulty: 2,
    description:
      "English pronouns: subject (I, you, he, she, it, we, they), object (me, you, him, her, it, us, them), possessive (my, your, his, her, its, our, their).",
  },
  {
    id: "en_questions",
    labelDE: "Fragen bilden",
    labelEN: "Forming Questions",
    category: "grammar",
    language: "en",
    difficulty: 2,
    description:
      "Forming English questions: yes/no questions with do/does/did, wh-questions (what, where, when, who, why, how), question word order.",
  },
  {
    id: "en_comparisons",
    labelDE: "Vergleiche (Steigerung)",
    labelEN: "Comparisons",
    category: "grammar",
    language: "en",
    difficulty: 2,
    description:
      "English comparative and superlative forms: -er/-est for short adjectives, more/most for longer ones, irregular forms (good-better-best).",
  },

  // Vocabulary
  {
    id: "en_vocabulary_everyday",
    labelDE: "Wortschatz: Alltag & Hobbys",
    labelEN: "Vocabulary: Everyday Life & Hobbies",
    category: "vocabulary",
    language: "en",
    difficulty: 1,
    description:
      "English vocabulary for daily activities, hobbies, sports, food, clothes, and common objects around the house.",
  },
  {
    id: "en_vocabulary_travel",
    labelDE: "Wortschatz: Reisen & Orte",
    labelEN: "Vocabulary: Travel & Places",
    category: "vocabulary",
    language: "en",
    difficulty: 2,
    description:
      "English vocabulary for travel, directions, places in a city, transportation, and asking for help.",
  },

  // Spelling
  {
    id: "en_spelling",
    labelDE: "Rechtschreibung (häufige Wörter)",
    labelEN: "Spelling Common Words",
    category: "spelling",
    language: "en",
    difficulty: 2,
    description:
      "Spelling common English words that German speakers often misspell: silent letters, double consonants, -tion/-sion endings, tricky vowel combinations.",
  },

  // Reading
  {
    id: "en_reading_comprehension",
    labelDE: "Leseverständnis",
    labelEN: "Reading Comprehension",
    category: "reading",
    language: "en",
    difficulty: 3,
    description:
      "Short English reading passages (3-5 sentences, age-appropriate) with comprehension questions about content, vocabulary, and inference.",
  },

  // Writing
  {
    id: "en_writing_short",
    labelDE: "Kurze Texte schreiben",
    labelEN: "Short Writing",
    category: "writing",
    language: "en",
    difficulty: 3,
    description:
      "Short English writing tasks: introduce yourself, describe your day, write about your favorite hobby (2-3 sentences expected for a 5th grader learning English).",
  },

  // Drills (hidden — surfaced only via the Drills page, not Free Practice)
  {
    id: "en_drill_plurals",
    labelDE: "Drill: Pluralformen",
    labelEN: "Drill: Plurals",
    category: "grammar",
    language: "en",
    difficulty: 2,
    hidden: true,
    description:
      "Fill-in drill: English regular and irregular noun plurals (cats, children, knives, etc.).",
  },
  {
    id: "en_drill_verbs",
    labelDE: "Drill: Verbformen",
    labelEN: "Drill: Verb Forms",
    category: "grammar",
    language: "en",
    difficulty: 2,
    hidden: true,
    description:
      "Fill-in drill: English verb forms — present (3rd person -s), simple past, and past participle for regular and irregular verbs.",
  },
  {
    id: "en_drill_adjectives",
    labelDE: "Drill: Steigerung (Adjektive)",
    labelEN: "Drill: Adjectives (Comparative / Superlative)",
    category: "grammar",
    language: "en",
    difficulty: 2,
    hidden: true,
    description:
      "Fill-in drill: English comparative and superlative (-er/-est, more/most, irregular good/better/best).",
  },
  {
    id: "en_drill_prepositions",
    labelDE: "Drill: Präpositionen (Englisch)",
    labelEN: "Drill: Prepositions",
    category: "grammar",
    language: "en",
    difficulty: 2,
    hidden: true,
    description:
      "Fill-in drill: English prepositions of place/time and common verb/adjective + preposition combinations (interested in, depend on, etc.).",
  },
  {
    id: "en_drill_relative",
    labelDE: "Drill: Relativsätze (Englisch)",
    labelEN: "Drill: Relative Clauses",
    category: "grammar",
    language: "en",
    difficulty: 3,
    hidden: true,
    description:
      "Fill-in drill: English relative clauses with who, which, that, whose, where, and whom.",
  },
  {
    id: "en_drill_adverbial",
    labelDE: "Drill: Adverbialsätze (Englisch)",
    labelEN: "Drill: Adverbial Clauses",
    category: "grammar",
    language: "en",
    difficulty: 3,
    hidden: true,
    description:
      "Fill-in drill: English adverbial clauses — time (when, while, before, after, until, as soon as), reason (because, since), condition (if, unless), concession (although, even though), purpose (so that), result (so … that), manner/comparison (as if, as).",
  },
  {
    id: "en_drill_complement",
    labelDE: "Drill: Ergänzungssätze (Englisch)",
    labelEN: "Drill: Complement Clauses",
    category: "grammar",
    language: "en",
    difficulty: 3,
    hidden: true,
    description:
      "Fill-in drill: English complement clauses used as object, subject, or predicate — that, whether/if, and indirect question words (who, what, where, when, why, how).",
  },
  {
    id: "en_drill_infinitive",
    labelDE: "Drill: Infinitivsätze (Englisch)",
    labelEN: "Drill: Infinitive Clauses",
    category: "grammar",
    language: "en",
    difficulty: 3,
    hidden: true,
    description:
      "Fill-in drill: English infinitive of purpose (to / in order to) and reduced clauses with without + -ing and instead of + -ing.",
  },
  {
    id: "en_drill_extras",
    labelDE: "Drill: Extra (Zahlen, Zeit, Rede, Chunks)",
    labelEN: "Drill: Extra (numbers, time, speech, chunks)",
    category: "grammar",
    language: "en",
    difficulty: 3,
    hidden: true,
    description:
      "Fill-in drill: English numbers, dates, and time expressions; comparison structures (as … as, than, the … the); reported speech; common collocations and chunks.",
  },
];

export const ALL_TOPICS: Topic[] = [...DE_TOPICS, ...EN_TOPICS];

export function getTopicsByLanguage(language: Language): Topic[] {
  return ALL_TOPICS.filter((t) => t.language === language && !t.hidden);
}

export function getTopicsByCategory(
  language: Language,
  category: TopicCategory
): Topic[] {
  return ALL_TOPICS.filter(
    (t) => t.language === language && t.category === category && !t.hidden
  );
}

export function getTopic(topicId: string): Topic | undefined {
  return ALL_TOPICS.find((t) => t.id === topicId);
}
