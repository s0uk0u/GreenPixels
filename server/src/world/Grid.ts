import { Cell, CellType } from '../types.js';

// Un tableau plat (et non un tableau 2D) : c'est plus rapide à parcourir
// et plus simple à sérialiser tel quel pour l'état initial envoyé au client.
export class Grid {
  constructor(
    public readonly width: number,
    public readonly height: number,
    public cells: Cell[] = []
  ) {
    if (this.cells.length === 0) {
      this.cells = Array.from({ length: width * height }, () => ({ type: CellType.Empty }));
    }
  }

  private index(x: number, y: number): number {
    return y * this.width + x;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  get(x: number, y: number): Cell | undefined {
    if (!this.inBounds(x, y)) return undefined;
    return this.cells[this.index(x, y)];
  }

  set(x: number, y: number, cell: Cell): void {
    if (!this.inBounds(x, y)) return;
    this.cells[this.index(x, y)] = cell;
  }

  // Les 8 voisins directs, avec leurs coordonnées (utile pour la propagation).
  neighbors(x: number, y: number): { x: number; y: number; cell: Cell }[] {
    const result: { x: number; y: number; cell: Cell }[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const vx = x + dx;
        const vy = y + dy;
        const cell = this.get(vx, vy);
        if (cell) result.push({ x: vx, y: vy, cell });
      }
    }
    return result;
  }
  
  neighborsRadius(x: number, y: number, r: number): { x: number; y: number; cell: Cell }[] {
  const result: { x: number; y: number; cell: Cell }[] = [];

  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx === 0 && dy === 0) continue;

      const vx = x + dx;
      const vy = y + dy;

      const cell = this.get(vx, vy);
      if (cell) {
        result.push({ x: vx, y: vy, cell });
      }
    }
  }

  return result;
	}
}

