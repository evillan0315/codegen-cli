// src/llm/jsonRepair.ts

/**
 * Attempts to repair common bad escape sequences in a JSON string
 * that might be returned by an LLM.
 * This function primarily focuses on fixing lone backslashes within string values
 * that cause JSON parsing errors.
 *
 * It is assumed that the LLM, when instructed to return JSON (e.g., with responseMimeType: "application/json"),
 * generally handles standard string escapes like `\n`, `\t`, `\"` correctly.
 * This repair function is a fallback for common minor deviations, mainly malformed backslashes.
 *
 * @param jsonString The potentially malformed JSON string.
 * @returns A repaired JSON string, or the original string if no repairs were made.
 */
export function repairJsonBadEscapes(jsonString: string): string {
  let repaired = jsonString;

  // IMPORTANT: Removed the replacement for unescaped newlines/tabs/carriage returns.
  // These replacements (e.g., `/(?<!\\)\n/g, '\\n'`) were incorrectly converting
  // structural newlines (used for JSON pretty-printing) into escaped newlines (`\n` -> `\\n`),
  // which makes the JSON invalid at the structural level.
  // JSON parsers expect literal newlines/tabs for formatting outside of string literals.
  // If a newline is inside a string value, the LLM should already be providing `\\n`.

  // 1. Escape lone backslashes that are not part of a valid JSON escape sequence.
  // This regex targets backslashes not followed by another backslash or a standard JSON escape char.
  // Example: "C:\\path\\to\\file" should become "C:\\\\path\\\\to\\\\file"
  // The `(?!...)` is a negative lookahead, ensuring the backslash is not followed by
  // a valid JSON escape character (", \\, /, b, f, n, r, t, u (for unicode escapes)).
  // This is the most common and relatively safe repair for paths or other literal backslashes within string values.
  repaired = repaired.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");

  return repaired; // Return the repaired string
}

export function extractJsonFromMarkdown(text: string): string {
  const jsonBlockRegex = /```json\n([\s\S]*?)\n```/;
  const match = text.match(jsonBlockRegex);
  if (match && match[1]) {
    return match[1].trim();
  }
  // If it's not wrapped in a JSON block, assume it's pure JSON and just trim it.
  return text.trim();
}

/**
 * Joins base path and relative path, handling leading/trailing slashes correctly.
 * Ensures a clean, normalized path.
 * @param base The base path (e.g., project root).
 * @param relative The path relative to the base (e.g., 'src/component/file.ts').
 * @returns The joined, normalized path.
 */
export const joinPaths = (base: string, relative: string): string => {
  // Normalize base path to not end with a slash unless it's just '/' (root)
  const normalizedBase =
    base.endsWith("/") && base.length > 1 ? base.slice(0, -1) : base;
  // Normalize relative path to not start with a slash
  const normalizedRelative = relative.startsWith("/")
    ? relative.slice(1)
    : relative;
  return `${normalizedBase}/${normalizedRelative}`;
};
