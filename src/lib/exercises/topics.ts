import type { Language, TopicCategory } from "./types";

export interface Topic {
  id: string;
  labelDE: string;
  labelEN: string;
  category: TopicCategory;
  language: Language;
  difficulty: number; // 1-5
  description: string; // Used in prompts to guide generation
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
];

export const ALL_TOPICS: Topic[] = [...DE_TOPICS, ...EN_TOPICS];

export function getTopicsByLanguage(language: Language): Topic[] {
  return ALL_TOPICS.filter((t) => t.language === language);
}

export function getTopicsByCategory(
  language: Language,
  category: TopicCategory
): Topic[] {
  return ALL_TOPICS.filter(
    (t) => t.language === language && t.category === category
  );
}

export function getTopic(topicId: string): Topic | undefined {
  return ALL_TOPICS.find((t) => t.id === topicId);
}
