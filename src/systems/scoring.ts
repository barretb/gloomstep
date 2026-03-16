const STORAGE_KEY = 'gloomstep-dungeon-highscores';

export function loadHighScores(): number[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveHighScore(score: number): number[] {
  const scores = loadHighScores();
  scores.push(score);
  scores.sort((a, b) => b - a);
  const top = scores.slice(0, 10);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(top));
  } catch {
    // ignore
  }
  return top;
}
