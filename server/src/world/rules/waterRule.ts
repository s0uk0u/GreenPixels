import { Rule } from './RuleEngine.js';
import { CellType } from '../../types.js';

// Le gène pertinent est "hydratation" (tolérance à la sécheresse) : une
// plante peu hydratée dépend davantage de l'eau pour vivre, donc en
// consomme davantage. Beaucoup de plantes peu hydratées autour d'un même
// point d'eau finissent par l'épuiser.
const HYDRATATION_ASSOIFFEE = 1; // gène hydratation <= ce seuil = plante très consommatrice d'eau
const SEUIL_PLANTES_ASSOIFFEES = 4; // nombre de voisines assoiffées avant tout risque
const CHANCE_DESSECHEMENT = 0.05; // 5% par tick une fois le seuil dépassé

export const waterRule: Rule = (grid, x, y, cell) => {
  if (cell.type !== CellType.Water) return [];

  const voisins = grid.neighbors(x, y);
  const plantesAssoiffees = voisins.filter(
    (v) => v.cell.type === CellType.Plant && (v.cell.genes?.hydratation ?? 0) <= HYDRATATION_ASSOIFFEE
  ).length;

  if (plantesAssoiffees >= SEUIL_PLANTES_ASSOIFFEES && Math.random() < CHANCE_DESSECHEMENT) {
    return [{ x, y, cell: { type: CellType.Empty } }];
  }

  return [];
};
