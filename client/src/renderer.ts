import { Cell, CellType } from './types';

const COLORS: Record<CellType, string> = {
  [CellType.Empty]: '#1a1a1a',
  [CellType.Water]: '#2e86de',
  [CellType.Earth]: '#8b5a2b',
  [CellType.Stone]: '#7f8c8d',
  [CellType.Plant]: '#27ae60',
  [CellType.Nutrient]: '#f1c40f',
  [CellType.Sign]: '#6c5ce7',
};

function plantColor(cell: Cell): string {
  const g = cell.genes;
  if (!g) return 'hsl(120, 70%, 40%)';

  let hue = 40 + g.hydratation * 30;
  hue = Math.max(40, Math.min(120, hue));

  let sat = 20 + g.graines * 10;
  sat = Math.min(100, sat);

  let lum = 80 - g.densite * 50;
  lum = Math.max(40, Math.min(80, lum));

  return `hsl(${hue}, ${sat}%, ${lum}%)`;
}

function getLineageColor(lineage?: string): string {
  if (!lineage) return "rgba(255,255,255,0.2)";

  // Hash simple → couleur stable
  let hash = 0;
  for (let i = 0; i < lineage.length; i++) {
    hash = (hash * 31 + lineage.charCodeAt(i)) % 360;
  }

  return `hsl(${hash}, 70%, 60%)`;
}

function getPlayerColor(name?: string): string {
  if (!name) return "rgba(255,255,255,0.2)";

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }

  return `hsl(${hash}, 80%, 55%)`;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(
	  private canvas: HTMLCanvasElement,
	  private cellSize: number,
	  private getLineageMode: () => boolean,
	  private getTerritoryMode: () => boolean
	) {
	  this.ctx = canvas.getContext('2d')!;
	}

  init(width: number, height: number, cells: Cell[]): void {
    this.canvas.width = width * this.cellSize;
    this.canvas.height = height * this.cellSize;
    for (let i = 0; i < cells.length; i++) {
      const x = i % width;
      const y = Math.floor(i / width);
      this.draw(x, y, cells[i]);
    }
  }

  redrawAll(width: number, height: number, cells: Cell[]): void {
    for (let i = 0; i < cells.length; i++) {
      const x = i % width;
      const y = Math.floor(i / width);
      this.draw(x, y, cells[i]);
    }
  }

  setCell(x: number, y: number, cell: Cell): void {
    this.draw(x, y, cell);
  }

  private draw(x: number, y: number, cell: Cell): void {
      const px = x * this.cellSize;
      const py = y * this.cellSize;

      // --- Mode lignées ---
      if (this.getLineageMode()) {
        if (cell.type === CellType.Plant) {
          this.ctx.fillStyle = getLineageColor(cell.lineage);
        } else {
          this.ctx.fillStyle = "rgba(50,50,50,0.3)";
        }
        this.ctx.fillRect(px, py, this.cellSize - 1, this.cellSize - 1);
        return;
      }

      // --- Mode territoires ---
      if (this.getTerritoryMode()) {
        if (cell.createdBy) {
          this.ctx.fillStyle = getPlayerColor(cell.createdBy);
        } else {
          this.ctx.fillStyle = "rgba(80,80,80,0.3)";
        }
        this.ctx.fillRect(px, py, this.cellSize - 1, this.cellSize - 1);
        return;
      }

      // --- Mode normal ---
      if (cell.type === CellType.Plant) {
        this.ctx.fillStyle = plantColor(cell);
      } else {
        this.ctx.fillStyle = COLORS[cell.type] ?? '#000';
      }

      this.ctx.fillRect(px, py, this.cellSize - 1, this.cellSize - 1);

      // Petit repère pour distinguer un panneau d'un simple aplat de couleur.
      if (cell.type === CellType.Sign) {
        this.ctx.fillStyle = '#ffffff';
        const r = Math.max(1, this.cellSize / 6);
        this.ctx.beginPath();
        this.ctx.arc(px + this.cellSize / 2, py + this.cellSize / 2, r, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
}
