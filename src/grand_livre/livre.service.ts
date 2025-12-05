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
    // ✅ FILTRAGE : Ignorer les mouvements sans impact financier
    const typesAvecImpactFinancier = [
      'APPROVISIONNEMENT',
      'ATTRIBUTION_DEFINITIVE',
      'MATERIEL_IRREPARABLE',
      'CORRECTION_POSITIVE',
      'CORRECTION_NEGATIVE',
    ];

    if (!journal.mouvement || !journal.mouvement.materiel) {
      throw new Error(`Journal ${journal.id_journal} sans mouvement ou matériel associé`);
    }

    // ✅ Ignorer RESERVATION et DERESERVATION (pannes temporaires)
    if (!typesAvecImpactFinancier.includes(journal.mouvement.type_reference)) {
      console.log(`⏭️  Type ${journal.mouvement.type_reference} ignoré (pas d'impact financier)`);
      return null;
    }

    // ✅ Vérifier que c'est un matériel DURABLE
    if (journal.mouvement.materiel.categorie_materiel !== CategorieMateriel.DURABLE) {
      console.log(`⏭️  Matériel CONSOMMABLE - Pas de grand livre`);
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

    console.log(`\n📊 === TRAITEMENT GRAND LIVRE ===`);
    console.log(`Journal: ${journal.id_journal}`);
    console.log(`Matériel: ${id_materiel} - ${journal.mouvement.materiel.designation}`);
    console.log(`Type: ${journal.mouvement.type_mouvement}`);
    console.log(`Quantité: ${quantite}`);

    let valeur = 0;

    if (grandLivre) {
      // ✅ LIGNE EXISTE → MISE À JOUR
      console.log(`\n🔄 Mise à jour Grand Livre existant: ${grandLivre.id_grand_livre}`);
      console.log(`État AVANT:`);
      console.log(`  Qté entrée: ${grandLivre.quantite_entree}, Valeur entrée: ${grandLivre.valeur_entree}`);
      console.log(`  Qté sortie: ${grandLivre.quantite_sortie}, Valeur sortie: ${grandLivre.valeur_sortie}`);
      console.log(`  Qté restante: ${grandLivre.quantite_restante}, Valeur restante: ${grandLivre.valeur_restante}`);

      if (isEntree) {
        // ✅ ENTRÉE : Utiliser le prix unitaire du mouvement
        const prix_unitaire = Number(journal.mouvement.prix_unitaire) || 0;
        valeur = prix_unitaire * quantite;
        
        console.log(`\n💰 ENTRÉE:`);
        console.log(`  Prix unitaire: ${prix_unitaire.toLocaleString('fr-FR')} Ar`);
        console.log(`  Quantité: ${quantite}`);
        console.log(`  Valeur de cette entrée: ${valeur.toLocaleString('fr-FR')} Ar`);

        // ✅ CORRECTION : Ajouter la valeur à valeur_entree
        grandLivre.quantite_entree = Number(grandLivre.quantite_entree) + quantite;
        grandLivre.valeur_entree = Number(grandLivre.valeur_entree) + valeur;  // ✅ ADDITION
        
        console.log(`  Nouvelle valeur entrée totale: ${grandLivre.valeur_entree.toLocaleString('fr-FR')} Ar`);
      } else {
        // ✅ SORTIE : Utiliser le CUMP actuel du Grand Livre
        const cump_actuel = grandLivre.quantite_restante > 0 
          ? Number(grandLivre.valeur_restante) / Number(grandLivre.quantite_restante)
          : 0;
        valeur = cump_actuel * quantite;

        console.log(`\n💸 SORTIE:`);
        console.log(`  CUMP actuel: ${cump_actuel.toLocaleString('fr-FR', {minimumFractionDigits: 2})} Ar`);
        console.log(`  Quantité: ${quantite}`);
        console.log(`  Valeur de cette sortie: ${valeur.toLocaleString('fr-FR', {minimumFractionDigits: 2})} Ar`);

        // ✅ CORRECTION : Ajouter la valeur à valeur_sortie
        grandLivre.quantite_sortie = Number(grandLivre.quantite_sortie) + quantite;
        grandLivre.valeur_sortie = Number(grandLivre.valeur_sortie) + valeur;  // ✅ ADDITION

        console.log(`  Nouvelle valeur sortie totale: ${grandLivre.valeur_sortie.toLocaleString('fr-FR', {minimumFractionDigits: 2})} Ar`);
      }

      // ✅ Recalculer les soldes (restantes)
      grandLivre.quantite_restante = Number(grandLivre.quantite_entree) - Number(grandLivre.quantite_sortie);
      grandLivre.valeur_restante = Number(grandLivre.valeur_entree) - Number(grandLivre.valeur_sortie);

      // ✅ S'assurer que les valeurs ne deviennent pas négatives
      if (grandLivre.quantite_restante < 0) {
        console.warn(`⚠️ Quantité restante négative détectée: ${grandLivre.quantite_restante}`);
      }
      if (grandLivre.valeur_restante < 0) {
        console.warn(`⚠️ Valeur restante négative détectée: ${grandLivre.valeur_restante}`);
        grandLivre.valeur_restante = 0;
      }

      // Mettre à jour l'observation avec le dernier journal
      grandLivre.id_journal = journal.id_journal;
      grandLivre.observation = `Dernière opération : ${journal.mouvement.type_mouvement} - ${journal.mouvement.materiel.designation} (${new Date().toLocaleDateString('fr-FR')})`;

      await this.grandLivreRepository.save(grandLivre);
      
      const cump_nouveau = grandLivre.quantite_restante > 0 
        ? grandLivre.valeur_restante / grandLivre.quantite_restante 
        : 0;

      console.log(`\n✅ État APRÈS:`);
      console.log(`  Qté entrée totale: ${grandLivre.quantite_entree}`);
      console.log(`  Valeur entrée totale: ${grandLivre.valeur_entree.toLocaleString('fr-FR', {minimumFractionDigits: 2})} Ar`);
      console.log(`  Qté sortie totale: ${grandLivre.quantite_sortie}`);
      console.log(`  Valeur sortie totale: ${grandLivre.valeur_sortie.toLocaleString('fr-FR', {minimumFractionDigits: 2})} Ar`);
      console.log(`  Qté restante: ${grandLivre.quantite_restante}`);
      console.log(`  Valeur restante: ${grandLivre.valeur_restante.toLocaleString('fr-FR', {minimumFractionDigits: 2})} Ar`);
      console.log(`  CUMP: ${cump_nouveau.toLocaleString('fr-FR', {minimumFractionDigits: 2})} Ar/unité`);
      console.log(`===================================\n`);

    } else {
      // ✅ PREMIÈRE LIGNE → CRÉATION
      console.log(`\n➕ Création première ligne Grand Livre`);

      const id_grand_livre = await this.generateId();

      if (isEntree) {
        // ✅ Première opération = ENTRÉE
        const prix_unitaire = Number(journal.mouvement.prix_unitaire) || 0;
        valeur = prix_unitaire * quantite;

        console.log(`💰 Première ENTRÉE:`);
        console.log(`  Prix unitaire: ${prix_unitaire.toLocaleString('fr-FR')} Ar`);
        console.log(`  Quantité: ${quantite}`);
        console.log(`  Valeur totale: ${valeur.toLocaleString('fr-FR')} Ar`);

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
        console.warn(`⚠️ Première opération est une SORTIE (anormal)`);

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
      console.log(`  Qté restante: ${grandLivre.quantite_restante}`);
      console.log(`  Valeur restante: ${grandLivre.valeur_restante.toLocaleString('fr-FR', {minimumFractionDigits: 2})} Ar`);
      console.log(`===================================\n`);
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

  async findAll() {
    return await this.grandLivreRepository.find({
      relations: ['materiel', 'materiel.typeMateriel', 'journal', 'journal.mouvement'],
      order: { date_enregistrement: 'DESC' },
    });
  }

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
      totalEntrees: parseFloat(result.totalEntrees) || 0,
      totalSorties: parseFloat(result.totalSorties) || 0,
      valeurTotaleEntrees: parseFloat(result.valeurTotaleEntrees) || 0,
      valeurTotaleSorties: parseFloat(result.valeurTotaleSorties) || 0,
      soldeQuantite: parseFloat(result.soldeQuantite) || 0,
      soldeValeur: parseFloat(result.soldeValeur) || 0,
    };
  }

  async regenererTout(): Promise<GenerationResult> {
    console.log(`\n🔄 === RÉGÉNÉRATION COMPLÈTE DU GRAND LIVRE ===`);

    await this.grandLivreRepository.clear();
    console.log(`🗑️  Grand livre vidé`);

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

    console.log(`📊 ${journauxValides.length} journaux validés trouvés\n`);

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
        console.error(`❌ Erreur pour journal ${journal.id_journal}:`, error.message);
        results.erreurs++;
        results.details.push({
          journal: journal.id_journal,
          status: 'erreur',
          message: error.message,
        });
      }
    }

    console.log(`\n✅ Régénération terminée :`);
    console.log(`   ${results.crees} mouvements traités`);
    console.log(`   ${results.erreurs} erreurs`);
    console.log(`===================================\n`);
    
    return results;
  }

  async genererGrandLivrePourPeriode(
    dateDebut: Date,
    dateFin: Date,
  ): Promise<GenerationResult> {
    console.log(`📊 Génération pour période du ${dateDebut.toLocaleDateString('fr-FR')} au ${dateFin.toLocaleDateString('fr-FR')}`);

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
        console.error(` Erreur pour journal ${journal.id_journal}:`, error.message);
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
