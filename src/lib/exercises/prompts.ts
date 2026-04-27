import type { ExerciseType, Language } from "./types";
import type { Topic } from "./topics";

export const SYSTEM_PROMPT = `You are a friendly language tutor for a 10-year-old German Gymnasium student in 5th grade (5. Klasse).

Your job is to generate practice exercises that are:
- Age-appropriate and engaging for a 10-year-old
- At the correct difficulty level for Gymnasium 5. Klasse
- Clear and unambiguous in their instructions
- Educational with helpful explanations

You MUST respond with valid JSON only — no markdown, no code fences, no extra text.`;

function exerciseTypeInstructions(type: ExerciseType): string {
  switch (type) {
    case "multiple_choice":
      return `Generate a multiple-choice question.
Return JSON with this exact structure:
{
  "type": "multiple_choice",
  "question": "The question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": 0,
  "explanation": "Why this answer is correct"
}
Rules:
- Exactly 4 options
- correctIndex is 0-based (0 = first option)
- Only one correct answer
- Options should be plausible but clearly distinguishable`;

    case "fill_in_the_blank":
      return `Generate a fill-in-the-blank exercise.
Return JSON with this exact structure:
{
  "type": "fill_in_the_blank",
  "sentence": "The cat ___ on the mat.",
  "correctAnswer": "sits",
  "acceptableAnswers": ["sat"],
  "hint": "A verb meaning to be seated",
  "explanation": "Why this answer is correct"
}
Rules:
- Use ___ (three underscores) for the blank
- Only one blank per sentence
- acceptableAnswers is optional, for alternative correct spellings/forms
- hint is optional but encouraged`;

    case "true_false":
      return `Generate a true/false statement.
Return JSON with this exact structure:
{
  "type": "true_false",
  "statement": "A statement that is either true or false",
  "isTrue": true,
  "explanation": "Why this is true/false"
}
Rules:
- Statement should be clearly true or clearly false
- Avoid trick questions
- Explanation should teach something`;

    case "reorder":
      return `Generate a word/sentence reordering exercise.
Return JSON with this exact structure:
{
  "type": "reorder",
  "instruction": "Put these words in the correct order to make a sentence.",
  "scrambledItems": ["the", "cat", "sat", "on", "mat", "the"],
  "correctOrder": ["the", "cat", "sat", "on", "the", "mat"],
  "explanation": "The correct sentence is: The cat sat on the mat."
}
Rules:
- 4-8 items to reorder
- scrambledItems should be shuffled (not in correct order)
- correctOrder is the single correct arrangement`;

    case "free_text":
      return `Generate a short writing prompt.
Return JSON with this exact structure:
{
  "type": "free_text",
  "prompt": "Write 2-3 sentences about your favorite animal.",
  "sampleAnswer": "My favorite animal is the dog. Dogs are loyal and playful. I want to have a golden retriever one day.",
  "keyPoints": ["Names a specific animal", "Gives a reason or description", "Uses complete sentences"],
  "explanation": "A good answer mentions a specific animal and says why you like it."
}
Rules:
- Prompt should ask for 2-3 sentences maximum (age-appropriate length)
- sampleAnswer shows what a good response looks like
- keyPoints are what the answer should include (for AI grading later)`;
  }
}

export function buildGenerationPrompt(
  topic: Topic,
  exerciseType: ExerciseType,
  count: number
): string {
  const langLabel = topic.language === "de" ? "German" : "English";
  const typeInstructions = exerciseTypeInstructions(exerciseType);

  return `Generate ${count} ${langLabel} exercise(s) for the topic: "${topic.labelEN}"

Topic description: ${topic.description}
Difficulty level: ${topic.difficulty}/5
Target student: 10-year-old German Gymnasium 5. Klasse student

${typeInstructions}

${
  count > 1
    ? `Return a JSON array of ${count} exercises, each following the structure above.
Example: [{ "type": "...", ... }, { "type": "...", ... }]`
    : "Return a single JSON object (not an array) following the structure above."
}

${
  topic.language === "en"
    ? "The exercise content should be in English, but remember the student is a German native speaker learning English."
    : "The exercise content should be in German."
}

Important: Return ONLY valid JSON. No markdown formatting, no code blocks, no explanatory text.`;
}
