import { Rule, CellChange } from './RuleEngine.js';
import { CellType, Cell } from '../../types.js';
import { ENERGIE_MAX } from './plantRule.js';

// Énergie totale apportée par un nutriment, partagée entre les joueurs
// différents au contact — c'est volontairement une quantité fixe : un
// nutriment ne crée pas plus d'énergie selon le nombre de voisins, il la
// répartit. Ça en fait un point d'échange, pas une duplication.
const NUTRIENT_BOOST = 3;

export const nutrientRule: Rule = (grid, x, y, _cell) => {
  const voisins = grid.neighbors(x, y);
  const plantesVoisines = voisins.filter((v) => v.cell.type === CellType.Plant);
  if (plantesVoisines.length === 0) return []; // attend tranquillement qu'une plante arrive

  // Un seul bénéficiaire par joueur différent au contact (pas par plante) :
  // c'est ce qui transforme un nutriment posé à la frontière de deux
  // colonies en un véritable point d'échange entre joueurs.
  const parJoueur = new Map<string, { x: number; y: number; cell: Cell }>();
  for (const v of plantesVoisines) {
    const proprietaire = v.cell.createdBy ?? '?';
    if (!parJoueur.has(proprietaire)) parJoueur.set(proprietaire, v);
  }

  const beneficiaires = [...parJoueur.values()];
  const part = Math.max(1, Math.floor(NUTRIENT_BOOST / beneficiaires.length));

  const changes: CellChange[] = beneficiaires.map((v) => ({
    x: v.x,
    y: v.y,
    cell: { ...v.cell, energy: Math.min(ENERGIE_MAX, (v.cell.energy ?? 0) + part) },
  }));

  changes.push({ x, y, cell: { type: CellType.Empty } }); // le nutriment est consommé, à usage unique

  return changes;
};
