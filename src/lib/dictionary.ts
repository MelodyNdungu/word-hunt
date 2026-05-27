// Build word set from the bundled word list (server-side and client-side)
let wordSet: Set<string> | null = null;

export async function getWordSet(): Promise<Set<string>> {
  if (wordSet) return wordSet;
  // Dynamically import word list (only 3+ letter words)
  const words = (await import("an-array-of-english-words")).default as string[];
  wordSet = new Set(words.filter((w) => w.length >= 3).map((w) => w.toUpperCase()));
  return wordSet;
}

export async function isValidWord(word: string): Promise<boolean> {
  const set = await getWordSet();
  return set.has(word.toUpperCase());
}
