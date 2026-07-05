import { Rule } from './RuleEngine.js';
import { CellType, Cell, PlantGenes } from '../../types.js';
import { generateLineageName } from '../lineage.js';

// Exporté pour que nutrientRule.ts plafonne le bonus à la même valeur —
// un nutriment ne doit pas permettre de dépasser le plafond d'énergie normal.
export const ENERGIE_MAX = 6;
const CHANCE_MUTATION = 0.2; // mutation faible mais présente
const SURPOPULATION_SOFT = 5;
const SURPOPULATION_HARD = 7;

// Écart d'énergie minimal pour déclencher un don, et quantité donnée.
const MUTUALISME_SEUIL = 2;
const MUTUALISME_DON = 1;

// --- Mutation simple ---
function muter(valeur: number): number {
  if (Math.random() >= CHANCE_MUTATION) return valeur;
  return Math.max(1, valeur + (Math.random() < 0.5 ? -1 : 1));
}

// --- Mutation complète + détection mutation forte ---
function muterGenes(genes: PlantGenes): { mutated: PlantGenes; strongMutation: boolean } {
  const before = { ...genes };

  const mutated: PlantGenes = {
    croissance: muter(genes.croissance),
    propagation: Math.min(
      1,
      Math.max(
        0.01,
        genes.propagation +
          (Math.random() < CHANCE_MUTATION
            ? (Math.random() < 0.5 ? -0.05 : 0.05)
            : 0)
      )
    ),
    resistance: muter(genes.resistance),
    distance: Math.max(1, muter(genes.distance)),
    hydratation: Math.max(0, muter(genes.hydratation)),
    densite: Math.max(0, muter(genes.densite)),
    graines: Math.max(1, muter(genes.graines)),
  };

  // --- Détection mutation forte ---
  let strong = false;

  // Critère 1 : gènes majeurs changent beaucoup
  const majors = ["distance", "densite", "hydratation", "graines"] as (keyof PlantGenes)[];
  for (const k of majors) {
    if (Math.abs(mutated[k] - before[k]) >= 2) strong = true;
  }

  // Critère 2 : changement global cumulé
  const totalDiff =
    Math.abs(mutated.croissance - before.croissance) +
    Math.abs(mutated.propagation - before.propagation) +
    Math.abs(mutated.resistance - before.resistance) +
    Math.abs(mutated.distance - before.distance) +
    Math.abs(mutated.hydratation - before.hydratation) +
    Math.abs(mutated.densite - before.densite) +
    Math.abs(mutated.graines - before.graines);

  if (totalDiff >= 4) strong = true;

  // Critère 3 : plusieurs gènes changent simultanément
  let diffCount = 0;
  for (const key of Object.keys(mutated)) {
    const k = key as keyof PlantGenes;
    if (Math.abs(mutated[k] - before[k]) >= 1) diffCount++;
  }
  if (diffCount >= 3) strong = true;

  return { mutated, strongMutation: strong };
}

export const plantRule: Rule = (grid, x, y, cell: Cell) => {
  if (cell.type !== CellType.Plant || !cell.genes) return [];

  const genes = cell.genes;
  let energy = cell.energy ?? 0;
  const age = (cell.age ?? 0) + 1;

  const voisins = grid.neighborsRadius(x, y, genes.distance);
  const aDeLEau = voisins.some((v) => v.cell.type === CellType.Water);
  const plantesVoisines = voisins.filter((v) => v.cell.type === CellType.Plant).length;

  // --- Sécheresse
  if (!aDeLEau) {
    energy -= Math.max(1, 3 - genes.hydratation);
  } else {
    energy = Math.min(ENERGIE_MAX, energy + 1);
  }

  // --- Surpopulation
  if (plantesVoisines >= SURPOPULATION_HARD + genes.densite) {
    return [{ x, y, cell: { type: CellType.Empty } }];
  }

  if (plantesVoisines >= SURPOPULATION_SOFT + genes.densite) {
    energy -= 2;
  }

  // --- Mort par manque d'énergie
  if (energy <= -genes.resistance) {
    return [{ x, y, cell: { type: CellType.Empty } }];
  }

  const changes = [];

  // --- Mutualisme inter-joueurs : si une voisine d'un AUTRE joueur a
  // nettement moins d'énergie, on lui en cède un peu. C'est un transfert,
  // pas une création d'énergie (j'en perds autant qu'elle en gagne), donc
  // ça ne change pas l'équilibre global — juste qui a quoi localement.
  // Un seul don par tick, pour rester simple et ne pas vider une plante d'un coup.
  for (const v of voisins) {
    if (
      v.cell.type === CellType.Plant &&
      v.cell.createdBy &&
      v.cell.createdBy !== cell.createdBy &&
      energy - (v.cell.energy ?? 0) >= MUTUALISME_SEUIL
    ) {
      energy -= MUTUALISME_DON;
      changes.push({ x: v.x, y: v.y, cell: { ...v.cell, energy: (v.cell.energy ?? 0) + MUTUALISME_DON } });
      break;
    }
  }

  // --- Reproduction
  if (energy >= genes.croissance) {
    const casesVides = voisins.filter((v) => v.cell.type === CellType.Empty);

    for (let i = 0; i < genes.graines; i++) {
      if (casesVides.length === 0) break;

      const cible = casesVides[Math.floor(Math.random() * casesVides.length)];

      const { mutated, strongMutation } = muterGenes(genes);

      const lineage =
        strongMutation
          ? generateLineageName()   // nouvelle espèce
          : cell.lineage;           // même lignée

      const newPlant: Cell = {
        type: CellType.Plant,
        energy: 0,
        age: 0,
        genes: mutated,
        createdBy: cell.createdBy,
        lineage
      };

      changes.push({ x: cible.x, y: cible.y, cell: newPlant });
    }

    energy = 0;
  }

  // --- Mise à jour de la plante
  changes.push({
    x,
    y,
    cell: {
      type: CellType.Plant,
      genes,
      energy,
      age,
      createdBy: cell.createdBy,
      lineage: cell.lineage
    },
  });

  return changes;
};
