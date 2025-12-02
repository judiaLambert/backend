import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { GrandLivre } from './livre.entity';
import { Journal, StatutValidation } from '../journal/journal.entity';
import { CategorieMateriel } from '../materiel/materiel.entity';
import { GenerationDetail, GenerationResult } from './livre.types';

@Injectable()
export class GrandLivreService {
  constructor(
    @InjectRepository(GrandLivre)
    private grandLivreRepository: Repository<GrandLivre>,
    @InjectRepository(Journal)
    private journalRepository: Repository<Journal>,
  ) {}

  async generateId(): Promise<string> {
    const lastEntry = await this.grandLivreRepository.findOne({
      where: {},
      order: { id_grand_livre: 'DESC' },
    });

    if (!lastEntry) {
      return 'GL001';
    }

    const lastNumber = parseInt(lastEntry.id_grand_livre.replace('GL', ''), 10);
    const newNumber = lastNumber + 1;
    return `GL${newNumber.toString().padStart(3, '0')}`;
  }

  async createFromJournal(journal: Journal): Promise<GrandLivre | null> {
    // VÉRIFIER SI LE MATÉRIEL EST DURABLE
    if (!journal.mouvement || !journal.mouvement.materiel) {
      throw new Error(`Journal ${journal.id_journal} sans mouvement ou matériel associé`);
    }

    if (journal.mouvement.materiel.categorie_materiel !== CategorieMateriel.DURABLE) {
      console.log(` Matériel CONSOMMABLE - Pas de grand livre pour journal ${journal.id_journal}`);
      return null;
    }

    const id_grand_livre = await this.generateId();

    // Récupérer le dernier solde global
    const derniereSolde = await this.getDernierSolde();

    const isEntree = journal.mouvement.type_mouvement === 'ENTREE';
    const quantite = Number(journal.mouvement.quantite_mouvement) || 0;
    const valeur = Number(journal.mouvement.valeur_totale) || 0;

    const quantite_entree = isEntree ? quantite : 0;
    const quantite_sortie = isEntree ? 0 : quantite;
    const valeur_entree = isEntree ? valeur : 0;
    const valeur_sortie = isEntree ? 0 : valeur;

    const quantite_restante =
      derniereSolde.quantite + (isEntree ? quantite : -quantite);
    const valeur_restante =
      derniereSolde.valeur + (isEntree ? valeur : -valeur);

    const grandLivre = this.grandLivreRepository.create({
      id_grand_livre,
      id_journal: journal.id_journal,
      quantite_entree,
      quantite_sortie,
      valeur_entree,
      valeur_sortie,
      quantite_restante,
      valeur_restante,
      observation: `${journal.mouvement.type_mouvement} - ${journal.mouvement.materiel.designation} - ${
        journal.mouvement.motif || 'N/A'
      }`,
    });

    const saved = await this.grandLivreRepository.save(grandLivre);
    console.log(
      `✅ Grand livre créé : ${saved.id_grand_livre} pour journal ${journal.id_journal} (matériel DURABLE)`,
    );
    return saved;
  }

  // ✅ Récupérer le dernier solde GLOBAL
  async getDernierSolde(): Promise<{ quantite: number; valeur: number }> {
    const derniereEntree = await this.grandLivreRepository.findOne({
      where: {},
      order: { date_enregistrement: 'DESC' },
    });

    if (!derniereEntree) {
      return { quantite: 0, valeur: 0 };
    }

    return {
      quantite: derniereEntree.quantite_restante,
      valeur: Number(derniereEntree.valeur_restante),
    };
  }

  // Liste détaillée (une ligne par journal)
  async findAll() {
    return await this.grandLivreRepository
      .createQueryBuilder('gl')
      .leftJoinAndSelect('gl.journal', 'journal')
      .leftJoinAndSelect('journal.mouvement', 'mouvement')
      .leftJoinAndSelect('mouvement.materiel', 'materiel')
      .leftJoinAndSelect('materiel.typeMateriel', 'typeMateriel')
      // JOIN conditionnel sur detail_approvisionnement si besoin
      .leftJoin(
        'detail_approvisionnement',
        'detailAppro',
        'detailAppro.id_materiel = materiel.id AND detailAppro.id_approvisionnement = mouvement.id_reference',
      )
      .addSelect(['detailAppro.id', 'detailAppro.prixUnitaire', 'detailAppro.quantiteRecu'])
      .orderBy('gl.date_enregistrement', 'DESC')
      .getMany();
  }

  // Liste détaillée sur période (une ligne par journal)
  async findByPeriode(dateDebut: Date, dateFin: Date) {
    return await this.grandLivreRepository
      .createQueryBuilder('gl')
      .leftJoinAndSelect('gl.journal', 'journal')
      .leftJoinAndSelect('journal.mouvement', 'mouvement')
      .leftJoinAndSelect('mouvement.materiel', 'materiel')
      .leftJoinAndSelect('materiel.typeMateriel', 'typeMateriel')
      .leftJoin(
        'detail_approvisionnement',
        'detailAppro',
        'detailAppro.id_materiel = materiel.id AND detailAppro.id_approvisionnement = mouvement.id_reference',
      )
      .addSelect(['detailAppro.id', 'detailAppro.prixUnitaire', 'detailAppro.quantiteRecu'])
      .where('gl.date_enregistrement BETWEEN :dateDebut AND :dateFin', {
        dateDebut,
        dateFin,
      })
      .orderBy('gl.date_enregistrement', 'ASC')
      .getMany();
  }

  // ✅ NOUVELLE MÉTHODE : Résumé global par matériel (1 ligne par matériel)
 // ✅ MÉTHODE CORRIGÉE : Vue par matériel avec toutes les colonnes du Grand Livre
async getResumeParMateriel() {
  const results = await this.grandLivreRepository
    .createQueryBuilder('gl')
    .leftJoin('gl.journal', 'journal')
    .leftJoin('journal.mouvement', 'mouvement')
    .leftJoin('mouvement.materiel', 'materiel')
    .select('materiel.id', 'id_materiel')
    .addSelect('materiel.designation', 'designation')
    .addSelect('materiel.categorie_materiel', 'categorie_materiel')
    // Colonnes du Grand Livre
    .addSelect('MIN(gl.id_grand_livre)', 'id_grand_livre')
    .addSelect('MIN(journal.id_journal)', 'id_journal')
    .addSelect('MIN(gl.date_enregistrement)', 'date_enregistrement')
    .addSelect(
      `CONCAT('Récapitulatif - ', materiel.designation)`,
      'observation',
    )
    // Totaux
    .addSelect('SUM(gl.quantite_entree)', 'quantite_entree')
    .addSelect('SUM(gl.quantite_sortie)', 'quantite_sortie')
    .addSelect('SUM(gl.valeur_entree)', 'valeur_entree')
    .addSelect('SUM(gl.valeur_sortie)', 'valeur_sortie')
    // Soldes = somme entrées - somme sorties
    .addSelect(
      'SUM(gl.quantite_entree) - SUM(gl.quantite_sortie)',
      'quantite_restante',
    )
    .addSelect(
      'SUM(gl.valeur_entree) - SUM(gl.valeur_sortie)',
      'valeur_restante',
    )
    .groupBy('materiel.id')
    .addGroupBy('materiel.designation')
    .addGroupBy('materiel.categorie_materiel')
    .orderBy('materiel.designation', 'ASC')
    .getRawMany();

  return results;
}


  async findOne(id_grand_livre: string) {
    const entry = await this.grandLivreRepository.findOne({
      where: { id_grand_livre },
      relations: ['journal', 'journal.mouvement', 'journal.mouvement.materiel'],
    });

    if (!entry) {
      throw new NotFoundException(`Entrée ${id_grand_livre} non trouvée`);
    }

    return entry;
  }

  async getSoldeActuel() {
    const solde = await this.getDernierSolde();
    return {
      quantite_restante: solde.quantite,
      valeur_restante: solde.valeur,
    };
  }

  async getStatistiques() {
    const totalEntrees = await this.grandLivreRepository
      .createQueryBuilder('gl')
      .select('SUM(gl.quantite_entree)', 'total')
      .getRawOne();

    const totalSorties = await this.grandLivreRepository
      .createQueryBuilder('gl')
      .select('SUM(gl.quantite_sortie)', 'total')
      .getRawOne();

    const valeurTotaleEntrees = await this.grandLivreRepository
      .createQueryBuilder('gl')
      .select('SUM(gl.valeur_entree)', 'total')
      .getRawOne();

    const valeurTotaleSorties = await this.grandLivreRepository
      .createQueryBuilder('gl')
      .select('SUM(gl.valeur_sortie)', 'total')
      .getRawOne();

    const totalEntries = await this.grandLivreRepository.count();

    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);
    const aujourdhuiFin = new Date();
    aujourdhuiFin.setHours(23, 59, 59, 999);

    const entreesAujourdhui = await this.grandLivreRepository.count({
      where: {
        date_enregistrement: Between(aujourdHui, aujourdhuiFin),
      },
    });

    return {
      totalEntries,
      totalEntrees: parseInt(totalEntrees.total, 10) || 0,
      totalSorties: parseInt(totalSorties.total, 10) || 0,
      valeurTotaleEntrees: parseFloat(valeurTotaleEntrees.total) || 0,
      valeurTotaleSorties: parseFloat(valeurTotaleSorties.total) || 0,
      soldeQuantite:
        (parseInt(totalEntrees.total, 10) || 0) -
        (parseInt(totalSorties.total, 10) || 0),
      soldeValeur:
        (parseFloat(valeurTotaleEntrees.total) || 0) -
        (parseFloat(valeurTotaleSorties.total) || 0),
      entreesAujourdhui,
    };
  }

  async genererGrandLivrePourPeriode(
    dateDebut: Date,
    dateFin: Date,
  ): Promise<GenerationResult> {
    console.log(
      `📊 Génération du grand livre pour la période du ${dateDebut.toISOString()} au ${dateFin.toISOString()}`,
    );

    const journauxValides = await this.journalRepository
      .createQueryBuilder('journal')
      .leftJoinAndSelect('journal.mouvement', 'mouvement')
      .leftJoinAndSelect('mouvement.materiel', 'materiel')
      .leftJoinAndSelect('materiel.typeMateriel', 'typeMateriel')
      .where('journal.statut = :statut', { statut: StatutValidation.VALIDE })
      .andWhere('journal.date_validation BETWEEN :dateDebut AND :dateFin', {
        dateDebut,
        dateFin,
      })
      .andWhere('materiel.categorie_materiel = :categorie', {
        categorie: CategorieMateriel.DURABLE,
      })
      .orderBy('journal.date_validation', 'ASC')
      .getMany();

    console.log(
      `✅ ${journauxValides.length} journaux validés de matériels DURABLES trouvés pour cette période`,
    );

    const results: GenerationResult = {
      total: journauxValides.length,
      crees: 0,
      existants: 0,
      erreurs: 0,
      details: [],
    };

    for (const journal of journauxValides) {
      try {
        const existant = await this.grandLivreRepository.findOne({
          where: { id_journal: journal.id_journal },
        });

        if (existant) {
          console.log(
            `⏭️  Entrée déjà existante pour journal ${journal.id_journal}`,
          );
          results.existants++;
          results.details.push({
            journal: journal.id_journal,
            status: 'existant',
            grand_livre: existant.id_grand_livre,
          });
        } else {
          const grandLivre = await this.createFromJournal(journal);

          if (grandLivre) {
            results.crees++;
            results.details.push({
              journal: journal.id_journal,
              status: 'créé',
              grand_livre: grandLivre.id_grand_livre,
            });
          } else {
            console.log(
              `⏭️  Pas de grand livre créé pour journal ${journal.id_journal} (matériel non durable)`,
            );
          }
        }
      } catch (error: any) {
        console.error(`❌ Erreur pour journal ${journal.id_journal}:`, error);
        results.erreurs++;
        results.details.push({
          journal: journal.id_journal,
          status: 'erreur',
          message: error.message,
        });
      }
    }

    console.log(
      `✅ Génération terminée : ${results.crees} créés, ${results.existants} existants, ${results.erreurs} erreurs`,
    );
    return results;
  }

  async genererGrandLivreMoisCourant(): Promise<GenerationResult> {
    const now = new Date();
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
    const finMois = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    return await this.genererGrandLivrePourPeriode(debutMois, finMois);
  }

  async genererGrandLivreAnneeCourante(): Promise<GenerationResult> {
    const now = new Date();
    const debutAnnee = new Date(now.getFullYear(), 0, 1);
    const finAnnee = new Date(
      now.getFullYear(),
      11,
      31,
      23,
      59,
      59,
      999,
    );
    return await this.genererGrandLivrePourPeriode(debutAnnee, finAnnee);
  }

  async genererGrandLivreMois(
    annee: number,
    mois: number,
  ): Promise<GenerationResult> {
    const debutMois = new Date(annee, mois - 1, 1);
    const finMois = new Date(annee, mois, 0, 23, 59, 59, 999);
    return await this.genererGrandLivrePourPeriode(debutMois, finMois);
  }

  async genererGrandLivreAnnee(
    annee: number,
  ): Promise<GenerationResult> {
    const debutAnnee = new Date(annee, 0, 1);
    const finAnnee = new Date(annee, 11, 31, 23, 59, 59, 999);
    return await this.genererGrandLivrePourPeriode(debutAnnee, finAnnee);
  }

  async regenererTout(): Promise<GenerationResult> {
    console.log(`🔄 Régénération complète du grand livre...`);

    const premierJournal = await this.journalRepository.findOne({
      where: { statut: StatutValidation.VALIDE },
      order: { date_validation: 'ASC' },
    });

    if (!premierJournal) {
      console.log(`⚠️ Aucun journal validé trouvé`);
      return {
        total: 0,
        crees: 0,
        existants: 0,
        erreurs: 0,
        details: [],
      };
    }

    const dateDebut = new Date(premierJournal.date_validation);
    const dateFin = new Date();

    return await this.genererGrandLivrePourPeriode(dateDebut, dateFin);
  }
}
