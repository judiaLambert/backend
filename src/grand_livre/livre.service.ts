import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { GrandLivre } from './livre.entity';
import { Journal, StatutValidation } from '../journal/journal.entity';
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

    const lastNumber = parseInt(lastEntry.id_grand_livre.replace('GL', ''));
    const newNumber = lastNumber + 1;
    return `GL${newNumber.toString().padStart(3, '0')}`;
  }

  async createFromJournal(journal: Journal): Promise<GrandLivre> {
    const id_grand_livre = await this.generateId();

    const id_type_materiel = journal.mouvement.materiel.typeMateriel?.id;
    
    if (!id_type_materiel) {
      throw new Error(`Le matériel ${journal.mouvement.materiel.id} n'a pas de type de matériel défini`);
    }

    const derniereSolde = await this.getDernierSolde(id_type_materiel);

    const isEntree = journal.mouvement.type_mouvement === 'ENTREE';
    const quantite = journal.mouvement.quantite_mouvement;
    const valeur = journal.mouvement.valeur_totale || 0;

    const quantite_entree = isEntree ? quantite : 0;
    const quantite_sortie = isEntree ? 0 : quantite;
    const valeur_entree = isEntree ? valeur : 0;
    const valeur_sortie = isEntree ? 0 : valeur;

    const quantite_restante = derniereSolde.quantite + (isEntree ? quantite : -quantite);
    const valeur_restante = derniereSolde.valeur + (isEntree ? valeur : -valeur);

    const grandLivre = this.grandLivreRepository.create({
      id_grand_livre,
      id_journal: journal.id_journal,
      id_type_materiel,
      quantite_entree,
      quantite_sortie,
      valeur_entree,
      valeur_sortie,
      quantite_restante,
      valeur_restante,
      observation: `${journal.mouvement.type_mouvement} - ${journal.mouvement.materiel.designation} - ${journal.mouvement.motif || 'N/A'}`,
    });

    const saved = await this.grandLivreRepository.save(grandLivre);
    console.log(`✅ Grand livre créé : ${saved.id_grand_livre} pour journal ${journal.id_journal} (Type: ${id_type_materiel})`);
    return saved;
  }

  async getDernierSolde(id_type_materiel: string): Promise<{ quantite: number; valeur: number }> {
    const derniereEntree = await this.grandLivreRepository.findOne({
      where: { id_type_materiel },
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

  async findAll() {
    return await this.grandLivreRepository.find({
      relations: ['journal', 'journal.mouvement', 'typeMateriel'],
      order: { date_enregistrement: 'DESC' },
    });
  }

  async findOne(id_grand_livre: string) {
    const entry = await this.grandLivreRepository.findOne({
      where: { id_grand_livre },
      relations: ['journal', 'journal.mouvement', 'typeMateriel'],
    });

    if (!entry) {
      throw new NotFoundException(`Entrée ${id_grand_livre} non trouvée`);
    }

    return entry;
  }

  async findByTypeMateriel(id_type_materiel: string) {
    return await this.grandLivreRepository.find({
      where: { id_type_materiel },
      relations: ['journal', 'journal.mouvement', 'typeMateriel'],
      order: { date_enregistrement: 'ASC' },
    });
  }

  async findByPeriode(dateDebut: Date, dateFin: Date) {
    return await this.grandLivreRepository.find({
      where: {
        date_enregistrement: Between(dateDebut, dateFin),
      },
      relations: ['journal', 'journal.mouvement', 'typeMateriel'],
      order: { date_enregistrement: 'DESC' },
    });
  }

  async getSoldeActuel(id_type_materiel: string) {
    const solde = await this.getDernierSolde(id_type_materiel);
    return {
      id_type_materiel,
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
      totalEntrees: parseInt(totalEntrees.total) || 0,
      totalSorties: parseInt(totalSorties.total) || 0,
      valeurTotaleEntrees: parseFloat(valeurTotaleEntrees.total) || 0,
      valeurTotaleSorties: parseFloat(valeurTotaleSorties.total) || 0,
      soldeQuantite: (parseInt(totalEntrees.total) || 0) - (parseInt(totalSorties.total) || 0),
      soldeValeur: (parseFloat(valeurTotaleEntrees.total) || 0) - (parseFloat(valeurTotaleSorties.total) || 0),
      entreesAujourdhui,
    };
  }

  async getSoldesParTypeMateriel() {
    const result = await this.grandLivreRepository
      .createQueryBuilder('gl')
      .leftJoinAndSelect('gl.typeMateriel', 'typeMateriel')
      .select('typeMateriel.id', 'id_type_materiel')
      .addSelect('typeMateriel.designation', 'designation')
      .addSelect('SUM(gl.quantite_entree)', 'total_entrees')
      .addSelect('SUM(gl.quantite_sortie)', 'total_sorties')
      .addSelect('SUM(gl.valeur_entree)', 'valeur_entrees')
      .addSelect('SUM(gl.valeur_sortie)', 'valeur_sorties')
      .groupBy('typeMateriel.id')
      .addGroupBy('typeMateriel.designation')
      .getRawMany();

    return result.map((item) => ({
      id_type_materiel: item.id_type_materiel,
      designation: item.designation,
      total_entrees: parseInt(item.total_entrees) || 0,
      total_sorties: parseInt(item.total_sorties) || 0,
      solde_quantite: (parseInt(item.total_entrees) || 0) - (parseInt(item.total_sorties) || 0),
      valeur_entrees: parseFloat(item.valeur_entrees) || 0,
      valeur_sorties: parseFloat(item.valeur_sorties) || 0,
      solde_valeur: (parseFloat(item.valeur_entrees) || 0) - (parseFloat(item.valeur_sorties) || 0),
    }));
  }

  async genererGrandLivrePourPeriode(dateDebut: Date, dateFin: Date): Promise<GenerationResult> {
    console.log(`📊 Génération du grand livre pour la période du ${dateDebut.toISOString()} au ${dateFin.toISOString()}`);

    const journauxValides = await this.journalRepository.find({
      where: {
        statut: StatutValidation.VALIDE,
        date_validation: Between(dateDebut, dateFin),
      },
      relations: ['mouvement', 'mouvement.materiel', 'mouvement.materiel.typeMateriel'],
      order: { date_validation: 'ASC' },
    });

    console.log(`✅ ${journauxValides.length} journaux validés trouvés pour cette période`);

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
          console.log(`⏭️  Entrée déjà existante pour journal ${journal.id_journal}`);
          results.existants++;
          results.details.push({
            journal: journal.id_journal,
            status: 'existant',
            grand_livre: existant.id_grand_livre,
          });
        } else {
          const grandLivre = await this.createFromJournal(journal);
          results.crees++;
          results.details.push({
            journal: journal.id_journal,
            status: 'créé',
            grand_livre: grandLivre.id_grand_livre,
          });
        }
      } catch (error) {
        console.error(`❌ Erreur pour journal ${journal.id_journal}:`, error);
        results.erreurs++;
        results.details.push({
          journal: journal.id_journal,
          status: 'erreur',
          message: error.message,
        });
      }
    }

    console.log(`✅ Génération terminée : ${results.crees} créés, ${results.existants} existants, ${results.erreurs} erreurs`);
    return results;
  }

  async genererGrandLivreMoisCourant(): Promise<GenerationResult> {
    const now = new Date();
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
    const finMois = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return await this.genererGrandLivrePourPeriode(debutMois, finMois);
  }

  async genererGrandLivreAnneeCourante(): Promise<GenerationResult> {
    const now = new Date();
    const debutAnnee = new Date(now.getFullYear(), 0, 1);
    const finAnnee = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return await this.genererGrandLivrePourPeriode(debutAnnee, finAnnee);
  }

  async genererGrandLivreMois(annee: number, mois: number): Promise<GenerationResult> {
    const debutMois = new Date(annee, mois - 1, 1);
    const finMois = new Date(annee, mois, 0, 23, 59, 59, 999);
    return await this.genererGrandLivrePourPeriode(debutMois, finMois);
  }

  async genererGrandLivreAnnee(annee: number): Promise<GenerationResult> {
    const debutAnnee = new Date(annee, 0, 1);
    const finAnnee = new Date(annee, 11, 31, 23, 59, 59, 999);
    return await this.genererGrandLivrePourPeriode(debutAnnee, finAnnee);
  }
}
