// src/reddition_annuelle/reddition.types.ts

export interface GenerationRedditionResult {
  total: number;
  crees: number;
  erreurs: number;
  details: GenerationDetail[];
}

export interface GenerationDetail {
  id_reddition?: string;
  materiel?: string;
  status: string;
  message?: string;
  ecart?: {
    quantite: number;
    valeur: number;
    taux: number;
  };
}

// ✅ NOUVEAU : Types pour le détail complet
export interface DetailCompletReddition {
  id_reddition: string;
  date_creation: Date;
  annee_validation: number;
  statut: string;
  date_validation?: Date;
  motif_rejet?: string| null;
  materiel: {
    designation: string;
    type: string;
  };
  grand_livre: {
    id: string;
    date_enregistrement: Date;
    quantite_restante: number;
    valeur_restante: number;
    cump: number;
  };
  resultat_recensement: {
    id: string;
    quantite_theorique: number;
    quantite_physique: number;
    ecart_trouve: number;
    valeur_systeme: number;
    pu_systeme: number;
  };
  // ✅ NOUVEAU : Attributions
  attributions: {
    total: number;
    en_cours: number;
    retournees: number;
    quantite_totale_attribuee: number;
  };
  // ✅ NOUVEAU : Dépannages
  depannages: {
    total: number;
    resolus: number;
    en_cours: number;
    irreparables: number;
  };
  analyse: {
    ecart_quantite: number;
    ecart_valeur: number;
    taux_ecart: number;
    est_coherent: boolean;
    niveau_alerte: string;
    recommandation: string;
  };
}
