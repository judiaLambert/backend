import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { GrandLivre } from './livre.entity';
import { Journal, StatutValidation } from '../journal/journal.entity';
import { CategorieMateriel } from '../materiel/materiel.entity';
import { GenerationResult } from './livre.types';

@Injectable()
export class GrandLivreService {
  constructor(
    @InjectRepository(GrandLivre)
    private grandLivreRepository: Repository<GrandLivre>,
    @InjectRepository(Journal)
    private journalRepository: Repository<Journal>,
  ) {}

  // ✅ MÉTHODE PRINCIPALE : Créer ou mettre à jour le Grand Livre
  async createOrUpdateFromJournal(journal: Journal): Promise<GrandLivre | null> {
    // Vérifier si le matériel est DURABLE
    if (!journal.mouvement || !journal.mouvement.materiel) {
      throw new Error(`Journal ${journal.id_journal} sans mouvement ou matériel associé`);
    }

    if (journal.mouvement.materiel.categorie_materiel !== CategorieMateriel.DURABLE) {
      console.log(`ℹ️ Matériel CONSOMMABLE - Pas de grand livre pour journal ${journal.id_journal}`);
      return null;
    }

    const id_materiel = journal.mouvement.materiel.id;

    // ✅ CHERCHER LA LIGNE EXISTANTE pour ce matériel
    let grandLivre = await this.grandLivreRepository.findOne({
      where: { id_materiel },
      relations: ['materiel', 'materiel.typeMateriel'],
    });

    const isEntree = journal.mouvement.type_mouvement === 'ENTREE';
    const quantite = Number(journal.mouvement.quantite_mouvement) || 0;

    console.log(`📊 Traitement journal ${journal.id_journal}:`);
    console.log(`   Type: ${journal.mouvement.type_mouvement}`);
    console.log(`   Quantité: ${quantite}`);

    let valeur = 0;

    if (grandLivre) {
      // ✅ LIGNE EXISTE → MISE À JOUR
      console.log(`🔄 Mise à jour Grand Livre pour matériel ${id_materiel}`);

      if (isEntree) {
        // ✅ ENTRÉE : Utiliser le prix unitaire du mouvement
        const prix_unitaire = Number(journal.mouvement.prix_unitaire) || 0;
        valeur = prix_unitaire * quantite;
        
        console.log(`   ✅ ENTRÉE - Prix unitaire: ${prix_unitaire}`);
        console.log(`   Valeur calculée: ${valeur}`);

        grandLivre.quantite_entree += quantite;
        grandLivre.valeur_entree += valeur;
      } else {
        // ✅ SORTIE : Utiliser le CUMP actuel du Grand Livre
        const cump_actuel = grandLivre.quantite_restante > 0 
          ? grandLivre.valeur_restante / grandLivre.quantite_restante 
          : 0;
        valeur = cump_actuel * quantite;

        console.log(`   ✅ SORTIE - CUMP actuel: ${cump_actuel.toFixed(2)}`);
        console.log(`   Valeur calculée: ${valeur.toFixed(2)}`);

        grandLivre.quantite_sortie += quantite;
        grandLivre.valeur_sortie += valeur;
      }

      // Recalculer les soldes
      grandLivre.quantite_restante = grandLivre.quantite_entree - grandLivre.quantite_sortie;
      grandLivre.valeur_restante = grandLivre.valeur_entree - grandLivre.valeur_sortie;

      // Mettre à jour l'observation avec le dernier journal
      grandLivre.id_journal = journal.id_journal;
      grandLivre.observation = `Dernière opération : ${journal.mouvement.type_mouvement} - ${journal.mouvement.materiel.designation} (${new Date().toLocaleDateString('fr-FR')})`;

      await this.grandLivreRepository.save(grandLivre);
      console.log(`✅ Grand Livre mis à jour : ${grandLivre.id_grand_livre}`);
      console.log(`   Quantité entrée totale: ${grandLivre.quantite_entree}`);
      console.log(`   Valeur entrée totale: ${grandLivre.valeur_entree.toFixed(2)}`);
      console.log(`   Quantité sortie totale: ${grandLivre.quantite_sortie}`);
      console.log(`   Valeur sortie totale: ${grandLivre.valeur_sortie.toFixed(2)}`);
      console.log(`   Quantité restante: ${grandLivre.quantite_restante}`);
      console.log(`   Valeur restante: ${grandLivre.valeur_restante.toFixed(2)}`);
      console.log(`   CUMP nouveau: ${grandLivre.quantite_restante > 0 ? (grandLivre.valeur_restante / grandLivre.quantite_restante).toFixed(2) : 0}`);

    } else {
      // ✅ PREMIÈRE LIGNE → CRÉATION
      console.log(`➕ Création Grand Livre pour matériel ${id_materiel}`);

      const id_grand_livre = await this.generateId();

      if (isEntree) {
        // ✅ Première opération = ENTRÉE
        const prix_unitaire = Number(journal.mouvement.prix_unitaire) || 0;
        valeur = prix_unitaire * quantite;

        console.log(`   ✅ Première ENTRÉE - Prix unitaire: ${prix_unitaire}`);
        console.log(`   Valeur calculée: ${valeur}`);

        grandLivre = this.grandLivreRepository.create({
          id_grand_livre,
          id_materiel,
          id_journal: journal.id_journal,
          quantite_entree: quantite,
          quantite_sortie: 0,
          valeur_entree: valeur,
          valeur_sortie: 0,
          quantite_restante: quantite,
          valeur_restante: valeur,
          observation: `Première opération : ENTREE - ${journal.mouvement.materiel.designation}`,
        });
      } else {
        // ⚠️ Première opération = SORTIE (anormal mais on gère)
        console.warn(`⚠️ Première opération est une SORTIE pour ${id_materiel} - Stock initialisé à 0`);

        grandLivre = this.grandLivreRepository.create({
          id_grand_livre,
          id_materiel,
          id_journal: journal.id_journal,
          quantite_entree: 0,
          quantite_sortie: quantite,
          valeur_entree: 0,
          valeur_sortie: 0, // Pas de valeur car pas de CUMP
          quantite_restante: -quantite, // Stock négatif
          valeur_restante: 0,
          observation: `⚠️ Première opération : SORTIE - ${journal.mouvement.materiel.designation} (Stock négatif)`,
        });
      }

      await this.grandLivreRepository.save(grandLivre);
      console.log(`✅ Grand Livre créé : ${grandLivre.id_grand_livre}`);
      console.log(`   Quantité restante: ${grandLivre.quantite_restante}`);
      console.log(`   Valeur restante: ${grandLivre.valeur_restante.toFixed(2)}`);
    }

    return grandLivre;
  }

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

  // ✅ Liste de toutes les lignes (une par matériel)
  async findAll() {
    return await this.grandLivreRepository.find({
      relations: ['materiel', 'materiel.typeMateriel', 'journal', 'journal.mouvement'],
      order: { date_enregistrement: 'DESC' },
    });
  }

  // Grand Livre d'un matériel spécifique
  async findByMateriel(id_materiel: string) {
    return await this.grandLivreRepository.findOne({
      where: { id_materiel },
      relations: ['materiel', 'materiel.typeMateriel', 'journal', 'journal.mouvement'],
    });
  }

  async findOne(id_grand_livre: string) {
    const entry = await this.grandLivreRepository.findOne({
      where: { id_grand_livre },
      relations: ['materiel', 'materiel.typeMateriel', 'journal', 'journal.mouvement'],
    });

    if (!entry) {
      throw new NotFoundException(`Entrée ${id_grand_livre} non trouvée`);
    }

    return entry;
  }

  // Statistiques globales
  async getStatistiques() {
    const result = await this.grandLivreRepository
      .createQueryBuilder('gl')
      .select('SUM(gl.quantite_entree)', 'totalEntrees')
      .addSelect('SUM(gl.quantite_sortie)', 'totalSorties')
      .addSelect('SUM(gl.valeur_entree)', 'valeurTotaleEntrees')
      .addSelect('SUM(gl.valeur_sortie)', 'valeurTotaleSorties')
      .addSelect('SUM(gl.quantite_restante)', 'soldeQuantite')
      .addSelect('SUM(gl.valeur_restante)', 'soldeValeur')
      .addSelect('COUNT(*)', 'nombreMateriels')
      .getRawOne();

    return {
      nombreMateriels: parseInt(result.nombreMateriels, 10) || 0,
      totalEntrees: parseInt(result.totalEntrees, 10) || 0,
      totalSorties: parseInt(result.totalSorties, 10) || 0,
      valeurTotaleEntrees: parseFloat(result.valeurTotaleEntrees) || 0,
      valeurTotaleSorties: parseFloat(result.valeurTotaleSorties) || 0,
      soldeQuantite: parseInt(result.soldeQuantite, 10) || 0,
      soldeValeur: parseFloat(result.soldeValeur) || 0,
    };
  }

  // Régénération complète depuis tous les journaux validés
  async regenererTout(): Promise<GenerationResult> {
    console.log(`🔄 Régénération complète du grand livre...`);

    // Vider le grand livre
    await this.grandLivreRepository.clear();
    console.log(`🗑️ Grand livre vidé`);

    // Récupérer TOUS les journaux validés par ordre chronologique
    const journauxValides = await this.journalRepository
      .createQueryBuilder('journal')
      .leftJoinAndSelect('journal.mouvement', 'mouvement')
      .leftJoinAndSelect('mouvement.materiel', 'materiel')
      .leftJoinAndSelect('materiel.typeMateriel', 'typeMateriel')
      .where('journal.statut = :statut', { statut: StatutValidation.VALIDE })
      .andWhere('materiel.categorie_materiel = :categorie', {
        categorie: CategorieMateriel.DURABLE,
      })
      .orderBy('journal.date_validation', 'ASC')
      .getMany();

    console.log(`📊 ${journauxValides.length} journaux validés trouvés`);

    const results: GenerationResult = {
      total: journauxValides.length,
      crees: 0,
      existants: 0,
      erreurs: 0,
      details: [],
    };

    // Traiter chaque journal dans l'ordre chronologique
    for (const journal of journauxValides) {
      try {
        const grandLivre = await this.createOrUpdateFromJournal(journal);

        if (grandLivre) {
          results.crees++;
          results.details.push({
            journal: journal.id_journal,
            status: 'créé',
            grand_livre: grandLivre.id_grand_livre,
          });
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

    console.log(`✅ Régénération terminée : ${results.crees} mouvements traités, ${results.erreurs} erreurs`);
    return results;
  }

  // Régénération pour une période
  async genererGrandLivrePourPeriode(
    dateDebut: Date,
    dateFin: Date,
  ): Promise<GenerationResult> {
    console.log(`📊 Génération pour période du ${dateDebut.toISOString()} au ${dateFin.toISOString()}`);

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

    const results: GenerationResult = {
      total: journauxValides.length,
      crees: 0,
      existants: 0,
      erreurs: 0,
      details: [],
    };

    for (const journal of journauxValides) {
      try {
        const grandLivre = await this.createOrUpdateFromJournal(journal);

        if (grandLivre) {
          results.crees++;
          results.details.push({
            journal: journal.id_journal,
            status: 'créé',
            grand_livre: grandLivre.id_grand_livre,
          });
        }
      } catch (error: any) {
        console.error(` Erreur pour journal ${journal.id_journal}:`, error);
        results.erreurs++;
        results.details.push({
          journal: journal.id_journal,
          status: 'erreur',
          message: error.message,
        });
      }
    }

    return results;
  }
}