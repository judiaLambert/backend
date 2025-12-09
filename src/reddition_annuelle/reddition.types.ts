export interface GenerationRedditionDetail {
  id_reddition?: string;
  materiel?: string;
  status: 'créé' | 'erreur' | 'existant'; // ← Ajoute "existant" ici
  message?: string;
  ecart?: {
    quantite: number;
    valeur: number;
    taux: number;
  };
}

export interface GenerationRedditionResult {
  total: number;
  crees: number;
  erreurs: number;
  details: GenerationRedditionDetail[];
}
