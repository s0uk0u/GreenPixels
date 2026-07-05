export enum CellType {
  Empty = 0,
  Water = 1,
  Earth = 2,
  Stone = 3,
  Plant = 4,
  Nutrient = 5,
  Sign = 6,
}

export interface PlantGenes {
  croissance: number;
  propagation: number;
  resistance: number;
  distance: number;
  hydratation: number;
  densite: number;
  graines: number;
}

export interface Cell {
  type: CellType;
  energy?: number;
  age?: number;
  genes?: PlantGenes;

  createdBy?: string;
  lineage?: string;
  message?: string;
}