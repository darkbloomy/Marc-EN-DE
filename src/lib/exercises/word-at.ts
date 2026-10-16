const WORD_CHAR = /[\p{L}\p{M}'’-]/u;
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

/**
 * The word that contains `offset` in `text`, or null if the offset is on
 * whitespace/punctuation, a CJK character, or a token without letters.
 */
export function extractWordAt(text: string, offset: number): string | null {
  if (!text) return null;
  let i = Math.min(Math.max(offset, 0), text.length);
  // Caret positions sit *between* characters; prefer the char after, else before.
  if (!isWordChar(text[i]) && isWordChar(text[i - 1])) i -= 1;
  if (!isWordChar(text[i]) || CJK.test(text[i])) return null;

  let start = i;
  let end = i + 1;
  while (start > 0 && isWordChar(text[start - 1]) && !CJK.test(text[start - 1])) start--;
  while (end < text.length && isWordChar(text[end]) && !CJK.test(text[end])) end++;

  const word = text.slice(start, end).replace(/^['’-]+|['’-]+$/g, "");
  if (!word || !/\p{L}/u.test(word) || word.length > 40) return null;
  return word;
}

function isWordChar(ch: string | undefined): boolean {
  return !!ch && WORD_CHAR.test(ch);
}
