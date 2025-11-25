import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedditionAnnuelle, StatutReddition } from './reddition.entity';
import { GrandLivre } from '../grand_livre/livre.entity';
import { Inventaire } from '../inventaire/inventaire.entity';
import { GenerationRedditionResult } from './reddition.types';

@Injectable()
export class RedditionAnnuelleService {
  constructor(
    @InjectRepository(RedditionAnnuelle)
    private redditionRepository: Repository<RedditionAnnuelle>,
    @InjectRepository(GrandLivre)
    private grandLivreRepository: Repository<GrandLivre>,
    @InjectRepository(Inventaire)
    private inventaireRepository: Repository<Inventaire>,
  ) {}

  async generateId(): Promise<string> {
    const lastReddition = await this.redditionRepository.findOne({
      where: {},
      order: { id_reddition: 'DESC' },
    });

    if (!lastReddition) {
      return 'RED001';
    }

    const lastNumber = parseInt(lastReddition.id_reddition.replace('RED', ''));
    const newNumber = lastNumber + 1;
    return `RED${newNumber.toString().padStart(3, '0')}`;
  }

  async genererRedditionAutomatique(annee: number): Promise<GenerationRedditionResult> {
    console.log(`📊 Génération automatique des redditions pour l'année ${annee}`);

    const existantes = await this.redditionRepository.count({
      where: { annee_validation: annee },
    });

    if (existantes > 0) {
      throw new BadRequestException(
        `Des redditions existent déjà pour l'année ${annee}. Total: ${existantes}`
      );
    }

    const result: GenerationRedditionResult = {
      total: 0,
      crees: 0,
      erreurs: 0,
      details: [],
    };

    const typesMateriels = await this.grandLivreRepository
      .createQueryBuilder('gl')
      .leftJoinAndSelect('gl.typeMateriel', 'tm')
      .select('tm.id', 'id_type_materiel')
      .addSelect('tm.designation', 'designation')
      .addSelect('MAX(gl.date_enregistrement)', 'derniere_date')
      .groupBy('tm.id')
      .addGroupBy('tm.designation')
      .getRawMany();

    console.log(`✅ ${typesMateriels.length} types de matériels trouvés`);
    result.total = typesMateriels.length;

    for (const type of typesMateriels) {
      try {
        const dernierGrandLivre = await this.grandLivreRepository.findOne({
          where: { id_type_materiel: type.id_type_materiel },
          order: { date_enregistrement: 'DESC' },
        });

        if (!dernierGrandLivre) {
          throw new Error(`Aucun grand livre trouvé pour le type ${type.designation}`);
        }

        // ✅ CORRECTION : Utiliser id_typemateriel (sans underscore entre type et materiel)
        const inventaires = await this.inventaireRepository
          .createQueryBuilder('inventaire')
          .leftJoinAndSelect('inventaire.materiel', 'materiel')
          .where('materiel.id_typemateriel = :id_type_materiel', { 
            id_type_materiel: type.id_type_materiel 
          })
          .getMany();

        if (inventaires.length === 0) {
          throw new Error(`Aucun inventaire trouvé pour le type ${type.designation}`);
        }

        const inventairePrincipal = inventaires.reduce((prev, current) => 
          (current.quantite_stock > prev.quantite_stock) ? current : prev
        );

        const id_reddition = await this.generateId();
        const reddition = this.redditionRepository.create({
          id_reddition,
          annee_validation: annee,
          id_grand_livre: dernierGrandLivre.id_grand_livre,
          id_inventaire: inventairePrincipal.id,
          statut: StatutReddition.EN_ATTENTE,
        });

        await this.redditionRepository.save(reddition);
        
        result.crees++;
        result.details.push({
          id_reddition,
          type_materiel: type.designation,
          status: 'créé',
        });

        console.log(`✅ Reddition créée : ${id_reddition} pour ${type.designation}`);

      } catch (error) {
        console.error(`❌ Erreur pour ${type.designation}:`, error);
        result.erreurs++;
        result.details.push({
          type_materiel: type.designation,
          status: 'erreur',
          message: error.message,
        });
      }
    }

    console.log(`✅ Génération terminée : ${result.crees} créées, ${result.erreurs} erreurs`);
    return result;
  }

  async findAll() {
    return await this.redditionRepository.find({
      relations: ['grandLivre', 'grandLivre.typeMateriel', 'inventaire', 'inventaire.materiel'],
      order: { date_creation: 'DESC' },
    });
  }

  async findOne(id_reddition: string) {
    const reddition = await this.redditionRepository.findOne({
      where: { id_reddition },
      relations: ['grandLivre', 'grandLivre.typeMateriel', 'inventaire', 'inventaire.materiel'],
    });

    if (!reddition) {
      throw new NotFoundException(`Reddition ${id_reddition} non trouvée`);
    }

    return reddition;
  }

  async findByAnnee(annee: number) {
    return await this.redditionRepository.find({
      where: { annee_validation: annee },
      relations: ['grandLivre', 'grandLivre.typeMateriel', 'inventaire', 'inventaire.materiel'],
      order: { date_creation: 'DESC' },
    });
  }

  async findByStatut(statut: StatutReddition) {
    return await this.redditionRepository.find({
      where: { statut },
      relations: ['grandLivre', 'grandLivre.typeMateriel', 'inventaire', 'inventaire.materiel'],
      order: { date_creation: 'DESC' },
    });
  }

  async getEnAttente() {
    return await this.findByStatut(StatutReddition.EN_ATTENTE);
  }

  async valider(id_reddition: string) {
    const reddition = await this.findOne(id_reddition);

    if (reddition.statut !== StatutReddition.EN_ATTENTE) {
      throw new BadRequestException(
        `Cette reddition a déjà été traitée. Statut actuel: ${reddition.statut}`
      );
    }

    reddition.statut = StatutReddition.VALIDE;
    reddition.date_validation = new Date();
    reddition.motif_rejet = null;

    const updated = await this.redditionRepository.save(reddition);
    console.log(`✅ Reddition ${id_reddition} validée`);
    return updated;
  }

  async rejeter(id_reddition: string, motif_rejet: string) {
    const reddition = await this.findOne(id_reddition);

    if (reddition.statut !== StatutReddition.EN_ATTENTE) {
      throw new BadRequestException(
        `Cette reddition a déjà été traitée. Statut actuel: ${reddition.statut}`
      );
    }

    if (!motif_rejet || motif_rejet.trim().length === 0) {
      throw new BadRequestException('Le motif de rejet est obligatoire');
    }

    reddition.statut = StatutReddition.REJETE;
    reddition.date_validation = new Date();
    reddition.motif_rejet = motif_rejet;

    const updated = await this.redditionRepository.save(reddition);
    console.log(`❌ Reddition ${id_reddition} rejetée : ${motif_rejet}`);
    return updated;
  }

  async getStatistiques() {
    const total = await this.redditionRepository.count();

    const enAttente = await this.redditionRepository.count({
      where: { statut: StatutReddition.EN_ATTENTE },
    });

    const validees = await this.redditionRepository.count({
      where: { statut: StatutReddition.VALIDE },
    });

    const rejetees = await this.redditionRepository.count({
      where: { statut: StatutReddition.REJETE },
    });

    const parAnnee = await this.redditionRepository
      .createQueryBuilder('reddition')
      .select('reddition.annee_validation', 'annee')
      .addSelect('COUNT(*)', 'count')
      .addSelect('reddition.statut', 'statut')
      .groupBy('reddition.annee_validation')
      .addGroupBy('reddition.statut')
      .getRawMany();

    return {
      total,
      enAttente,
      validees,
      rejetees,
      tauxValidation: total > 0 ? ((validees / total) * 100).toFixed(2) + '%' : '0%',
      tauxRejet: total > 0 ? ((rejetees / total) * 100).toFixed(2) + '%' : '0%',
      parAnnee,
    };
  }

  async getDetailComplet(id_reddition: string) {
    const reddition = await this.findOne(id_reddition);

    return {
      id_reddition: reddition.id_reddition,
      date_creation: reddition.date_creation,
      annee_validation: reddition.annee_validation,
      statut: reddition.statut,
      date_validation: reddition.date_validation,
      motif_rejet: reddition.motif_rejet,
      grand_livre: reddition.grandLivre ? {
        id_grand_livre: reddition.grandLivre.id_grand_livre,
        date_enregistrement: reddition.grandLivre.date_enregistrement,
        quantite_restante: reddition.grandLivre.quantite_restante,
        valeur_restante: reddition.grandLivre.valeur_restante,
        type_materiel: reddition.grandLivre.typeMateriel?.designation,
      } : null,
      inventaire: reddition.inventaire ? {
        id_inventaire: reddition.inventaire.id,
        quantite_stock: reddition.inventaire.quantite_stock,
        quantite_disponible: reddition.inventaire.quantite_disponible,
        materiel: reddition.inventaire.materiel?.designation,
      } : null,
    };
  }
}
