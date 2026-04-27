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
        '"Hund" ist maskulin, daher ist der richtige Artikel "der" im Nominativ.',
    },
    {
      type: "multiple_choice",
      question: "Welches Wort ist ein Verb?",
      options: ["laufen", "schnell", "Tisch", "groß"],
      correctIndex: 0,
      explanation:
        '"Laufen" ist ein Verb (Tuwort). "Schnell" und "groß" sind Adjektive, "Tisch" ist ein Nomen.',
    },
    {
      type: "multiple_choice",
      question:
        'Wie lautet die richtige Verbform? "Er ___ gerne Fußball."',
      options: ["spielt", "spielen", "spielst", "spiele"],
      correctIndex: 0,
      explanation:
        'Bei "er/sie/es" endet das Verb in der Regel auf -t: er spielt.',
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
        '"Gehen" konjugiert für "ich" wird zu "gehe". "Laufe" ist auch akzeptabel.',
    },
    {
      type: "fill_in_the_blank",
      sentence: "Die Katze sitzt auf ___ Tisch.",
      correctAnswer: "dem",
      hint: 'Welcher Artikel passt nach "auf" mit Dativ?',
      explanation:
        '"Auf" mit Dativ (wo?) braucht "dem" für maskuline Nomen: auf dem Tisch.',
    },
    {
      type: "fill_in_the_blank",
      sentence: "Wir ___ gestern im Park gespielt.",
      correctAnswer: "haben",
      hint: "Hilfsverb im Perfekt",
      explanation:
        'Das Perfekt von "spielen" wird mit "haben" gebildet: Wir haben gespielt.',
    },
  ],
  true_false: [
    {
      type: "true_false",
      statement: 'Das Wort "Schule" ist ein Nomen und wird großgeschrieben.',
      isTrue: true,
      explanation:
        "Im Deutschen werden alle Nomen (Hauptwörter) großgeschrieben. Schule ist ein Nomen.",
    },
    {
      type: "true_false",
      statement: 'Der Plural von "Maus" ist "Mause".',
      isTrue: false,
      explanation:
        'Der korrekte Plural von "Maus" ist "Mäuse" (mit Umlaut).',
    },
    {
      type: "true_false",
      statement: "In einem Aussagesatz steht das Verb an zweiter Stelle.",
      isTrue: true,
      explanation:
        "Im deutschen Aussagesatz steht das konjugierte Verb immer an zweiter Position (V2-Stellung).",
    },
  ],
  reorder: [
    {
      type: "reorder",
      instruction: "Bringe die Wörter in die richtige Reihenfolge.",
      scrambledItems: ["Schule", "gehe", "zur", "Ich"],
      correctOrder: ["Ich", "gehe", "zur", "Schule"],
      explanation:
        'Der richtige Satz lautet: "Ich gehe zur Schule." Das Verb steht an zweiter Stelle.',
    },
    {
      type: "reorder",
      instruction: "Ordne die Wörter zu einem Satz.",
      scrambledItems: ["der", "im", "Hund", "Garten", "spielt"],
      correctOrder: ["der", "Hund", "spielt", "im", "Garten"],
      explanation:
        '"Der Hund spielt im Garten." — Subjekt + Verb + Ort.',
    },
    {
      type: "reorder",
      instruction: "Setze die Wörter in die richtige Reihenfolge.",
      scrambledItems: ["hat", "Buch", "gelesen", "ein", "Sie"],
      correctOrder: ["Sie", "hat", "ein", "Buch", "gelesen"],
      explanation:
        '"Sie hat ein Buch gelesen." — Im Perfekt steht das Hilfsverb an Position 2 und das Partizip am Ende.',
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
        "Eine gute Antwort nennt ein Tier und erklärt, warum man es mag.",
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
        'In Simple Present, we add -s to the verb for he/she/it: "She plays."',
    },
    {
      type: "multiple_choice",
      question: "What is the past tense of 'go'?",
      options: ["went", "goed", "goes", "gone"],
      correctIndex: 0,
      explanation:
        "'Go' is an irregular verb. Its past tense is 'went', not 'goed'.",
    },
    {
      type: "multiple_choice",
      question: 'Which word is an adjective? "The tall boy runs quickly."',
      options: ["tall", "boy", "runs", "quickly"],
      correctIndex: 0,
      explanation:
        "'Tall' is an adjective because it describes the noun 'boy'. 'Quickly' is an adverb.",
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
    },
    {
      type: "fill_in_the_blank",
      sentence: "I ___ a very interesting book yesterday.",
      correctAnswer: "read",
      hint: "Past tense of 'read'",
      explanation:
        "'Read' in past tense is spelled the same but pronounced differently (red).",
    },
    {
      type: "fill_in_the_blank",
      sentence: "They ___ playing in the park right now.",
      correctAnswer: "are",
      hint: "A form of 'to be' for 'they'",
      explanation:
        "Present Progressive: They + are + verb-ing. 'They are playing.'",
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
    },
    {
      type: "true_false",
      statement: "The plural of 'child' is 'childs'.",
      isTrue: false,
      explanation:
        "'Child' is an irregular noun. The correct plural is 'children'.",
    },
    {
      type: "true_false",
      statement:
        "We use 'does' with he, she, and it in Simple Present questions.",
      isTrue: true,
      explanation:
        "'Does' is used with third person singular: 'Does she like music?'",
    },
  ],
  reorder: [
    {
      type: "reorder",
      instruction: "Put the words in the correct order to make a sentence.",
      scrambledItems: ["like", "I", "cream", "ice"],
      correctOrder: ["I", "like", "ice", "cream"],
      explanation: 'The correct sentence is: "I like ice cream."',
    },
    {
      type: "reorder",
      instruction: "Arrange these words into a question.",
      scrambledItems: ["you", "do", "live", "where"],
      correctOrder: ["where", "do", "you", "live"],
      explanation:
        'Questions with "where": Where + do/does + subject + verb.',
    },
    {
      type: "reorder",
      instruction: "Put the words in the correct order.",
      scrambledItems: ["not", "does", "like", "she", "spiders"],
      correctOrder: ["she", "does", "not", "like", "spiders"],
      explanation:
        'Negative: Subject + does + not + verb. "She does not like spiders."',
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
