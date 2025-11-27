export interface GenerationRedditionDetail {
  id_reddition?: string;
  materiel?: string; // ✅ Changé de type_materiel à materiel
  status: 'créé' | 'erreur';
  message?: string;
}

export interface GenerationRedditionResult {
  total: number;
  crees: number;
  erreurs: number;
  details: GenerationRedditionDetail[];
}
