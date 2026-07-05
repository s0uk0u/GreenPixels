const lineageWordsA = ["Aube", "Racine", "Vent", "Terre", "Sève", "Braise", "Ombre"];
const lineageWordsB = ["Sèche", "Forte", "Dense", "Claire", "Lointaine", "Vive", "Ancienne"];
let lineageCounter = 1;

export function generateLineageName(): string {
  const w1 = lineageWordsA[Math.floor(Math.random() * lineageWordsA.length)];
  const w2 = lineageWordsB[Math.floor(Math.random() * lineageWordsB.length)];
  return `${w1}-${w2}-${lineageCounter++}`;
}
