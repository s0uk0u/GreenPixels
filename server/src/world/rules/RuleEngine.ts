import { Grid } from '../Grid.js';
import { Cell, CellType } from '../../types.js';

export type CellChange = { x: number; y: number; cell: Cell };

// Une "règle" est une fonction pure : elle reçoit l'état actuel et renvoie
// la liste des cases à modifier. Elle ne modifie jamais la grille elle-même
// (c'est le moteur qui applique les changements), pour éviter qu'une règle
// ne voie un état du monde déjà à moitié modifié par une autre case du même tick.
export type Rule = (grid: Grid, x: number, y: number, cell: Cell) => CellChange[];

export class RuleEngine {
  private rules = new Map<CellType, Rule>();

  // C'est ici qu'on "branche" un nouveau phénomène : fire.ts ferait
  // engine.register(CellType.Fire, fireRule) et n'a rien d'autre à toucher.
  register(type: CellType, rule: Rule): void {
    this.rules.set(type, rule);
  }

  tick(grid: Grid): CellChange[] {
    const allChanges: CellChange[] = [];

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.get(x, y);
        if (!cell) continue;

        const rule = this.rules.get(cell.type);
        if (!rule) continue;

        const changes = rule(grid, x, y, cell);
        for (const change of changes) {
          grid.set(change.x, change.y, change.cell);
          allChanges.push(change);
        }
      }
    }

    return allChanges;
  }
}
