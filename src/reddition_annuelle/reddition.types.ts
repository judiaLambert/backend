export interface GenerationRedditionDetail {
  id_reddition?: string;
  type_materiel?: string;
  status: 'créé' | 'erreur';
  message?: string;
}

export interface GenerationRedditionResult {
  total: number;
  crees: number;
  erreurs: number;
  details: GenerationRedditionDetail[];
}
