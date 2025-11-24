export interface GenerationDetail {
  journal: string;
  status: 'créé' | 'existant' | 'erreur';
  grand_livre?: string;
  message?: string;
}

export interface GenerationResult {
  total: number;
  crees: number;
  existants: number;
  erreurs: number;
  details: GenerationDetail[];
}
