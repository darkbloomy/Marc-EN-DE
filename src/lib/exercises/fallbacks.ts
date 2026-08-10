import type { Exercise, ExerciseType, Language } from "./types";

// Fallback exercises organized by language → exerciseType
// These are used when the AI is unavailable

const DE_FALLBACKS: Record<ExerciseType, Exercise[]> = {
  multiple_choice: [
    {
      type: "multiple_choice",
      question: 'Welcher Artikel passt? "___ Hund ist groß."',
      options: ["Der", "Die", "Das", "Den"],
      correctIndex: 0,
      explanation:
        "\"Hund\" is masculine, so the nominative definite article is \"der\".",
      explanationCN:
        "\"Hund\"\u662f\u9633\u6027\u540d\u8bcd\uff0c\u6240\u4ee5\u4e3b\u683c\u5b9a\u51a0\u8bcd\u7528 der\u3002",
    },
    {
      type: "multiple_choice",
      question: "Welches Wort ist ein Verb?",
      options: ["laufen", "schnell", "Tisch", "groß"],
      correctIndex: 0,
      explanation:
        "\"Laufen\" is a verb. \"Schnell\" and \"gro\u00df\" are adjectives; \"Tisch\" is a noun.",
      explanationCN:
        "\"laufen\"\u662f\u52a8\u8bcd\u3002\"schnell\"\u548c\"gro\u00df\"\u662f\u5f62\u5bb9\u8bcd\uff0c\"Tisch\"\u662f\u540d\u8bcd\u3002",
    },
    {
      type: "multiple_choice",
      question:
        'Wie lautet die richtige Verbform? "Er ___ gerne Fußball."',
      options: ["spielt", "spielen", "spielst", "spiele"],
      correctIndex: 0,
      explanation:
        "With er/sie/es the verb usually ends in -t: er spielt.",
      explanationCN:
        "\u7b2c\u4e09\u4eba\u79f0\u5355\u6570\uff08er/sie/es\uff09\u52a8\u8bcd\u4e00\u822c\u52a0 -t\uff1aer spielt\u3002",
    },
  ],
  fill_in_the_blank: [
    {
      type: "fill_in_the_blank",
      sentence: "Ich ___ jeden Tag zur Schule.",
      correctAnswer: "gehe",
      acceptableAnswers: ["laufe"],
      hint: "Ein Verb der Bewegung",
      explanation:
        "The ich-form of \"gehen\" is \"gehe\". \"Laufe\" is also acceptable.",
      explanationCN:
        "\u52a8\u8bcd gehen \u7684 ich \u5f62\u5f0f\u662f gehe\u3002laufe \u4e5f\u53ef\u63a5\u53d7\u3002",
    },
    {
      type: "fill_in_the_blank",
      sentence: "Die Katze sitzt auf ___ Tisch.",
      correctAnswer: "dem",
      hint: 'Welcher Artikel passt nach "auf" mit Dativ?',
      explanation:
        "\"Auf\" with dative (location) needs \"dem\" for masculine nouns: auf dem Tisch.",
      explanationCN:
        "auf \u8868\u4f4d\u7f6e\uff08\u5728\u54ea\u91cc\uff09\u7528\u7b2c\u4e09\u683c\uff1aauf dem Tisch\u3002",
    },
    {
      type: "fill_in_the_blank",
      sentence: "Wir ___ gestern im Park gespielt.",
      correctAnswer: "haben",
      hint: "Hilfsverb im Perfekt",
      explanation:
        "The perfect of \"spielen\" uses \"haben\": Wir haben gespielt.",
      explanationCN:
        "spielen \u7684\u73b0\u5728\u5b8c\u6210\u65f6\u7528 haben\uff1aWir haben gespielt\u3002",
    },
  ],
  true_false: [
    {
      type: "true_false",
      statement: 'Das Wort "Schule" ist ein Nomen und wird großgeschrieben.',
      isTrue: true,
      explanation:
        "In German all nouns are capitalized. \"Schule\" is a noun.",
      explanationCN:
        "\u5fb7\u8bed\u6240\u6709\u540d\u8bcd\u90fd\u8981\u5927\u5199\u3002Schule \u662f\u540d\u8bcd\u3002",
    },
    {
      type: "true_false",
      statement: 'Der Plural von "Maus" ist "Mause".',
      isTrue: false,
      explanation:
        "The correct plural of \"Maus\" is \"M\u00e4use\" (with umlaut).",
      explanationCN:
        "Maus \u7684\u6b63\u786e\u590d\u6570\u662f M\u00e4use\uff08\u53d8\u5143\u97f3\uff09\u3002",
    },
    {
      type: "true_false",
      statement: "In einem Aussagesatz steht das Verb an zweiter Stelle.",
      isTrue: true,
      explanation:
        "In a German main clause the conjugated verb is always in second position (V2).",
      explanationCN:
        "\u5fb7\u8bed\u9648\u8ff0\u53e5\u4e2d\uff0c\u53d8\u4f4d\u52a8\u8bcd\u603b\u5728\u7b2c\u4e8c\u4f4d\uff08V2\uff09\u3002",
    },
  ],
  reorder: [
    {
      type: "reorder",
      instruction: "Bringe die Wörter in die richtige Reihenfolge.",
      scrambledItems: ["Schule", "gehe", "zur", "Ich"],
      correctOrder: ["Ich", "gehe", "zur", "Schule"],
      explanation:
        "The correct sentence is: \"Ich gehe zur Schule.\" The verb is in second position.",
      explanationCN:
        "\u6b63\u786e\u53e5\u5b50\u662f\uff1aIch gehe zur Schule\u3002\u52a8\u8bcd\u5728\u7b2c\u4e8c\u4f4d\u3002",
    },
    {
      type: "reorder",
      instruction: "Ordne die Wörter zu einem Satz.",
      scrambledItems: ["der", "im", "Hund", "Garten", "spielt"],
      correctOrder: ["der", "Hund", "spielt", "im", "Garten"],
      explanation:
        "\"Der Hund spielt im Garten.\" \u2014 subject + verb + place.",
      explanationCN:
        "\"Der Hund spielt im Garten.\" \u2014 \u4e3b\u8bed + \u52a8\u8bcd + \u5730\u70b9\u3002",
    },
    {
      type: "reorder",
      instruction: "Setze die Wörter in die richtige Reihenfolge.",
      scrambledItems: ["hat", "Buch", "gelesen", "ein", "Sie"],
      correctOrder: ["Sie", "hat", "ein", "Buch", "gelesen"],
      explanation:
        "\"Sie hat ein Buch gelesen.\" \u2014 In the perfect, the auxiliary is in position 2 and the participle at the end.",
      explanationCN:
        "\"Sie hat ein Buch gelesen.\" \u2014 \u5b8c\u6210\u65f6\u52a9\u52a8\u8bcd\u5728\u7b2c\u4e8c\u4f4d\uff0c\u8fc7\u53bb\u5206\u8bcd\u5728\u53e5\u672b\u3002",
    },
  ],
  free_text: [
    {
      type: "free_text",
      prompt:
        "Beschreibe dein Lieblingstier in 2-3 Sätzen. Was magst du an ihm?",
      sampleAnswer:
        "Mein Lieblingstier ist der Delfin. Delfine sind sehr klug und spielen gerne im Wasser. Ich finde es toll, wie sie springen können.",
      keyPoints: [
        "Nennt ein bestimmtes Tier",
        "Gibt einen Grund oder eine Beschreibung",
        "Benutzt vollständige Sätze",
      ],
      explanation:
        "A good answer names an animal and explains why you like it.",
      explanationCN:
        "\u597d\u7684\u7b54\u6848\u5e94\u8bf4\u51fa\u4e00\u79cd\u52a8\u7269\u5e76\u8bf4\u660e\u559c\u6b22\u7684\u539f\u56e0\u3002",
    },
  ],
};

const EN_FALLBACKS: Record<ExerciseType, Exercise[]> = {
  multiple_choice: [
    {
      type: "multiple_choice",
      question: 'Which sentence is correct?',
      options: [
        "She plays football every day.",
        "She play football every day.",
        "She playing football every day.",
        "She playes football every day.",
      ],
      correctIndex: 0,
      explanation:
        "In Simple Present, we add -s to the verb for he/she/it: \"She plays.\"",
      explanationCN:
        "\u4e00\u822c\u73b0\u5728\u65f6\uff0c\u4e3b\u8bed\u662f he/she/it \u65f6\u52a8\u8bcd\u52a0 -s\uff1aShe plays\u3002",
    },
    {
      type: "multiple_choice",
      question: "What is the past tense of 'go'?",
      options: ["went", "goed", "goes", "gone"],
      correctIndex: 0,
      explanation:
        "'Go' is an irregular verb. Its past tense is 'went', not 'goed'.",
      explanationCN:
        "go \u662f\u4e0d\u89c4\u5219\u52a8\u8bcd\uff0c\u8fc7\u53bb\u5f0f\u662f went\uff0c\u4e0d\u662f goed\u3002",
    },
    {
      type: "multiple_choice",
      question: 'Which word is an adjective? "The tall boy runs quickly."',
      options: ["tall", "boy", "runs", "quickly"],
      correctIndex: 0,
      explanation:
        "'Tall' is an adjective because it describes the noun 'boy'. 'Quickly' is an adverb.",
      explanationCN:
        "tall \u662f\u5f62\u5bb9\u8bcd\uff0c\u4fee\u9970\u540d\u8bcd boy\uff1bquickly \u662f\u526f\u8bcd\u3002",
    },
  ],
  fill_in_the_blank: [
    {
      type: "fill_in_the_blank",
      sentence: "She ___ to school every morning.",
      correctAnswer: "goes",
      acceptableAnswers: ["walks"],
      hint: "Third person singular of a movement verb",
      explanation:
        "With he/she/it in Simple Present, we add -s or -es: 'She goes.'",
      explanationCN:
        "\u4e00\u822c\u73b0\u5728\u65f6\u7b2c\u4e09\u4eba\u79f0\u5355\u6570\u52a8\u8bcd\u52a0 -s/-es\uff1aShe goes\u3002",
    },
    {
      type: "fill_in_the_blank",
      sentence: "I ___ a very interesting book yesterday.",
      correctAnswer: "read",
      hint: "Past tense of 'read'",
      explanation:
        "'Read' in past tense is spelled the same but pronounced differently (red).",
      explanationCN:
        "read \u7684\u8fc7\u53bb\u5f0f\u62fc\u5199\u76f8\u540c\uff0c\u4f46\u8bfb\u4f5c red\u3002",
    },
    {
      type: "fill_in_the_blank",
      sentence: "They ___ playing in the park right now.",
      correctAnswer: "are",
      hint: "A form of 'to be' for 'they'",
      explanation:
        "Present Progressive: They + are + verb-ing. 'They are playing.'",
      explanationCN:
        "\u73b0\u5728\u8fdb\u884c\u65f6\uff1aThey + are + \u52a8\u8bcd-ing\u3002",
    },
  ],
  true_false: [
    {
      type: "true_false",
      statement:
        "In English, we always capitalize the first word of a sentence.",
      isTrue: true,
      explanation:
        "Every English sentence starts with a capital letter, just like in German.",
      explanationCN:
        "\u82f1\u8bed\u53e5\u5b50\u5f00\u5934\u4e5f\u8981\u5927\u5199\uff0c\u548c\u5fb7\u8bed\u4e00\u6837\u3002",
    },
    {
      type: "true_false",
      statement: "The plural of 'child' is 'childs'.",
      isTrue: false,
      explanation:
        "'Child' is an irregular noun. The correct plural is 'children'.",
      explanationCN:
        "child \u662f\u4e0d\u89c4\u5219\u540d\u8bcd\uff0c\u590d\u6570\u662f children\u3002",
    },
    {
      type: "true_false",
      statement:
        "We use 'does' with he, she, and it in Simple Present questions.",
      isTrue: true,
      explanation:
        "'Does' is used with third person singular: 'Does she like music?'",
      explanationCN:
        "\u4e00\u822c\u73b0\u5728\u65f6\u7591\u95ee\u53e5\u91cc\uff0che/she/it \u7528 does\u3002",
    },
  ],
  reorder: [
    {
      type: "reorder",
      instruction: "Put the words in the correct order to make a sentence.",
      scrambledItems: ["like", "I", "cream", "ice"],
      correctOrder: ["I", "like", "ice", "cream"],
      explanation:
        "The correct sentence is: \"I like ice cream.\" Subject + verb + object.",
      explanationCN:
        "\u6b63\u786e\u53e5\u5b50\u662f\uff1aI like ice cream\u3002\u4e3b\u8bed + \u52a8\u8bcd + \u5bbe\u8bed\u3002",
    },
    {
      type: "reorder",
      instruction: "Arrange these words into a question.",
      scrambledItems: ["you", "do", "live", "where"],
      correctOrder: ["where", "do", "you", "live"],
      explanation:
        "Questions with \"where\": Where + do/does + subject + verb.",
      explanationCN:
        "where \u7591\u95ee\u53e5\uff1aWhere + do/does + \u4e3b\u8bed + \u52a8\u8bcd\u3002",
    },
    {
      type: "reorder",
      instruction: "Put the words in the correct order.",
      scrambledItems: ["not", "does", "like", "she", "spiders"],
      correctOrder: ["she", "does", "not", "like", "spiders"],
      explanation:
        "Negative: Subject + does + not + verb. \"She does not like spiders.\"",
      explanationCN:
        "\u5426\u5b9a\uff1a\u4e3b\u8bed + does + not + \u52a8\u8bcd\u539f\u5f62\u3002",
    },
  ],
  free_text: [
    {
      type: "free_text",
      prompt:
        "Write 2-3 sentences about your favorite hobby. What do you like about it?",
      sampleAnswer:
        "My favorite hobby is playing football. I play with my friends after school. It is fun and keeps me healthy.",
      keyPoints: [
        "Names a specific hobby",
        "Gives a reason why they like it",
        "Uses complete English sentences",
      ],
      explanation:
        "A good answer names a hobby and explains why you enjoy it.",
      explanationCN:
        "\u597d\u7684\u7b54\u6848\u5e94\u5199\u51fa\u7231\u597d\u5e76\u8bf4\u660e\u559c\u6b22\u7684\u539f\u56e0\u3002",
    },
  ],
};

const FALLBACKS: Record<Language, Record<ExerciseType, Exercise[]>> = {
  de: DE_FALLBACKS,
  en: EN_FALLBACKS,
};

export function getFallbackExercises(
  language: Language,
  _topicId: string,
  exerciseType: ExerciseType,
  count: number
): Exercise[] {
  const pool = FALLBACKS[language]?.[exerciseType] ?? [];
  if (pool.length === 0) {
    // Return a generic multiple choice as ultimate fallback
    return FALLBACKS[language]?.multiple_choice?.slice(0, count) ?? [];
  }

  // Cycle through available fallbacks if count > pool size
  const result: Exercise[] = [];
  for (let i = 0; i < count; i++) {
    result.push(pool[i % pool.length]);
  }
  return result;
}
