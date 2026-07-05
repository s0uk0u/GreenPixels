// Les types de base du monde. C'est volontairement minimal :
// chaque nouveau "phénomène" (feu, chimie...) ajoute une valeur ici
// et un fichier de règle dans world/rules/, rien d'autre à modifier.

export enum CellType {
  Empty = 0,
  Water = 1,
  Earth = 2,
  Stone = 3,
  Plant = 4,
  Nutrient = 5, // ressource consommable : boost d'énergie pour un voisin
  Sign = 6, // case neutre portant un court message
}

// L'ADN d'une plante, comme décrit dans le document de design.
export interface PlantGenes {
  croissance: number;     // seuil d'énergie pour se reproduire
  propagation: number;    // probabilité de reproduction
  resistance: number;     // énergie négative tolérée
  distance: number;       // rayon de reproduction (1 = voisins)
  hydratation: number;    // tolérance à la sécheresse
  densite: number;        // résistance à la surpopulation
  graines: number;        // nombre de graines par reproduction
}

export interface Cell {
  type: CellType;
  energy?: number;
  age?: number;
  genes?: PlantGenes;

  // --- Ajout généalogique ---
  createdBy?: string;   // joueur qui a placé la plante
  lineage?: string;     // joueur fondateur de la lignée

  // --- Panneaux ---
  message?: string;     // contenu d'un panneau (déjà nettoyé côté serveur)
}
