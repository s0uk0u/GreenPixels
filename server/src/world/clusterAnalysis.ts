import { Cell } from "../types.js";

export interface GeneCluster {
  id: string;
  name: string;
  members: Cell[];
  centroid: number[];
}

function geneVector(cell: Cell): number[] {
  const g = cell.genes!;
  return [
    g.croissance,
    g.propagation,
    g.resistance,
    g.distance,
    g.hydratation,
    g.densite,
    g.graines
  ];
}

function distance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
}

export function computeClusters(plants: Cell[]): GeneCluster[] {
  const clusters: GeneCluster[] = [];
  const threshold = 3.5; // distance max pour être dans le même cluster

  for (const plant of plants) {
    const vec = geneVector(plant);

    let assigned = false;

    for (const cluster of clusters) {
      const d = distance(vec, cluster.centroid);
      if (d < threshold) {
        cluster.members.push(plant);

        // mise à jour du centroid
        const n = cluster.members.length;
        cluster.centroid = cluster.centroid.map((v, i) =>
          (v * (n - 1) + vec[i]) / n
        );

        assigned = true;
        break;
      }
    }

    if (!assigned) {
      clusters.push({
        id: "cluster-" + clusters.length,
        name: generateClusterName(plant),
        members: [plant],
        centroid: vec
      });
    }
  }

  return clusters;
}

function generateClusterName(cell: Cell): string {
  const g = cell.genes!;
  if (g.hydratation >= 3) return "Désertiques";
  if (g.densite >= 7) return "Massives";
  if (g.propagation >= 0.35) return "Explosives";
  if (g.resistance >= 3) return "Robustes";
  return "Neutres";
}
