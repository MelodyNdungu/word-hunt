// Weighted letter distribution (Boggle-style, single letters only)
const LETTER_POOL = [
  "A","A","A","A","A","A","A","A","A",
  "B","B",
  "C","C","C","C","C",
  "D","D","D","D","D","D",
  "E","E","E","E","E","E","E","E","E","E","E","E",
  "F","F",
  "G","G","G","G",
  "H","H","H","H","H","H",
  "I","I","I","I","I","I","I","I","I",
  "J",
  "K","K",
  "L","L","L","L","L",
  "M","M","M","M",
  "N","N","N","N","N","N","N","N",
  "O","O","O","O","O","O","O","O",
  "P","P","P",
  "Q",
  "R","R","R","R","R","R","R","R",
  "S","S","S","S","S","S",
  "T","T","T","T","T","T","T","T","T",
  "U","U","U","U",
  "V","V",
  "W","W","W",
  "X",
  "Y","Y",
  "Z",
];

export const GRID_SIZE = 4;

export function generateGrid(): string[][] {
  const grid: string[][] = [];
  const shuffled = [...LETTER_POOL].sort(() => Math.random() - 0.5);
  let idx = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    grid.push([]);
    for (let c = 0; c < GRID_SIZE; c++) {
      grid[r].push(shuffled[idx++ % shuffled.length]);
    }
  }
  return grid;
}

export function isAdjacent(
  [r1, c1]: [number, number],
  [r2, c2]: [number, number]
): boolean {
  return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1 && !(r1 === r2 && c1 === c2);
}

export function cellKey(r: number, c: number): string {
  return `${r}-${c}`;
}

export function scoreWord(word: string): number {
  const len = word.length;
  if (len <= 2) return 0;
  if (len === 3) return 100;
  if (len === 4) return 400;
  if (len === 5) return 800;
  if (len === 6) return 1400;
  if (len === 7) return 1800;
  return 2200 + (len - 8) * 400;
}

export type CellCoord = [number, number];

export async function findAllWords(grid: string[][]): Promise<string[]> {
  const { getWordSet } = await import("./dictionary");
  const wordSet = await getWordSet();

  // Build a prefix set for early path pruning during DFS
  const prefixSet = new Set<string>();
  for (const word of wordSet) {
    for (let i = 1; i <= word.length; i++) {
      prefixSet.add(word.slice(0, i));
    }
  }

  const found = new Set<string>();
  const rows = grid.length;
  const cols = grid[0].length;
  const upper = (s: string) => s.toUpperCase();

  function dfs(r: number, c: number, path: string, visited: boolean[][]) {
    if (!prefixSet.has(path)) return;
    if (path.length >= 3 && wordSet.has(path)) found.add(path);
    if (path.length >= 16) return;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (visited[nr][nc]) continue;
        visited[nr][nc] = true;
        dfs(nr, nc, path + upper(grid[nr][nc]), visited);
        visited[nr][nc] = false;
      }
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
      visited[r][c] = true;
      dfs(r, c, upper(grid[r][c]), visited);
    }
  }

  return Array.from(found).sort((a, b) => b.length - a.length || a.localeCompare(b));
}
