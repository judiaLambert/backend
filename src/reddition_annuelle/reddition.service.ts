import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { RedditionAnnuelle, StatutReddition } from './reddition.entity';
import { GrandLivre } from '../grand_livre/livre.entity';
import { ResultatRecensement } from '../resultat_recensement/resultat.entity';
import { GenerationRedditionResult } from './reddition.types';

@Injectable()
export class RedditionAnnuelleService {
  constructor(
    @InjectRepository(RedditionAnnuelle)
    private redditionRepository: Repository<RedditionAnnuelle>,
    @InjectRepository(GrandLivre)
    private grandLivreRepository: Repository<GrandLivre>,
    @InjectRepository(ResultatRecensement)
    private resultatRecensementRepository: Repository<ResultatRecensement>,
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

    const result: GenerationRedditionResult = {
      total: 0,
      crees: 0,
      erreurs: 0,
      details: [],
    };

    // ✅ Récupérer tous les résultats de recensement de l'année
    const resultatsRecensement = await this.resultatRecensementRepository.find({
      where: {
        date_recensement: Between(
          new Date(`${annee}-01-01`),
          new Date(`${annee}-12-31`)
        ),
      },
      relations: ['inventaire', 'inventaire.materiel', 'inventaire.materiel.typeMateriel'],
    });

    console.log(`📦 ${resultatsRecensement.length} résultats de recensement trouvés pour ${annee}`);
    result.total = resultatsRecensement.length;

    for (const resultat of resultatsRecensement) {
      try {
        // Trouver le dernier grand livre pour ce matériel
        const dernierGrandLivre = await this.grandLivreRepository.findOne({
          where: { id_materiel: resultat.inventaire.materiel.id },
          relations: ['materiel', 'journal'],
          order: { date_enregistrement: 'DESC' },
        });

        if (!dernierGrandLivre) {
          throw new Error(`Aucun grand livre trouvé pour ${resultat.inventaire.materiel.designation}`);
        }

        // ✅ Calculer les écarts à partir du résultat de recensement
        const ecart_quantite = resultat.ecart_trouve;
        const ecart_valeur = resultat.valeur_ecart; // Getter déjà calculé dans l'entité
        const taux_ecart = resultat.quantite_theorique > 0 
          ? (Math.abs(ecart_quantite) / resultat.quantite_theorique) * 100 
          : 0;

        // Vérifier si une reddition existe déjà pour cette année + ce résultat
        const existante = await this.redditionRepository.findOne({
          where: {
            annee_validation: annee,
            resultatRecensement: { id: resultat.id },
          },
        });

        if (existante) {
          result.details.push({
            materiel: resultat.inventaire.materiel?.designation,
            status: 'existant',
            message: `Reddition ${existante.id_reddition} existe déjà`,
          });
          continue;
        }

        const id_reddition = await this.generateId();
        const reddition = this.redditionRepository.create({
          id_reddition,
          annee_validation: annee,
          grandLivre: dernierGrandLivre,
          resultatRecensement: resultat, // ✅ Changé
          statut: StatutReddition.EN_ATTENTE,
        });

        await this.redditionRepository.save(reddition);
        
        result.crees++;
        result.details.push({
          id_reddition,
          materiel: resultat.inventaire.materiel?.designation,
          status: 'créé',
          ecart: {
            quantite: ecart_quantite,
            valeur: ecart_valeur,
            taux: parseFloat(taux_ecart.toFixed(2)),
          },
        });

        if (Math.abs(taux_ecart) > 5) {
          console.warn(`⚠️ ÉCART IMPORTANT (${taux_ecart.toFixed(2)}%) : ${resultat.inventaire.materiel?.designation}`);
        }

        console.log(`✅ Reddition créée : ${id_reddition} pour ${resultat.inventaire.materiel?.designation}`);

      } catch (error) {
        console.error(`❌ Erreur pour ${resultat.inventaire.materiel?.designation}:`, error);
        result.erreurs++;
        result.details.push({
          materiel: resultat.inventaire.materiel?.designation,
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
      relations: [
        'grandLivre',
        'grandLivre.materiel',
        'resultatRecensement',
        'resultatRecensement.inventaire',
        'resultatRecensement.inventaire.materiel',
      ],
      order: { date_creation: 'DESC' },
    });
  }

  async findOne(id_reddition: string) {
    const reddition = await this.redditionRepository.findOne({
      where: { id_reddition },
      relations: [
        'grandLivre',
        'grandLivre.materiel',
        'resultatRecensement',
        'resultatRecensement.inventaire',
        'resultatRecensement.inventaire.materiel',
        'resultatRecensement.inventaire.materiel.typeMateriel',
      ],
    });

    if (!reddition) {
      throw new NotFoundException(`Reddition ${id_reddition} non trouvée`);
    }

    return reddition;
  }

  async findByAnnee(annee: number) {
    return await this.redditionRepository.find({
      where: { annee_validation: annee },
      relations: [
        'grandLivre',
        'grandLivre.materiel',
        'resultatRecensement',
        'resultatRecensement.inventaire',
        'resultatRecensement.inventaire.materiel',
      ],
      order: { date_creation: 'DESC' },
    });
  }

  async findByStatut(statut: StatutReddition) {
    return await this.redditionRepository.find({
      where: { statut },
      relations: [
        'grandLivre',
        'grandLivre.materiel',
        'resultatRecensement',
        'resultatRecensement.inventaire',
        'resultatRecensement.inventaire.materiel',
      ],
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
    reddition.motif_rejet = null!;

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

  // ✅ VÉRIFICATION : Si pas de resultatRecensement, retourner un message d'erreur
  if (!reddition.resultatRecensement) {
    throw new BadRequestException(
      `Cette reddition (${id_reddition}) a été créée avec l'ancienne structure. ` +
      `Elle doit être supprimée et régénérée avec la nouvelle structure.`
    );
  }

  // ✅ Utiliser les données du résultat de recensement
  const ecart_quantite = reddition.resultatRecensement.ecart_trouve;
  const ecart_valeur = reddition.resultatRecensement.valeur_ecart;
  const taux_ecart = reddition.resultatRecensement.quantite_theorique > 0
    ? (Math.abs(ecart_quantite) / reddition.resultatRecensement.quantite_theorique) * 100
    : 0;

  const est_coherent = Math.abs(ecart_quantite) === 0 && Math.abs(ecart_valeur) < 1;
  const niveau_alerte = taux_ecart > 10 ? 'CRITIQUE' : taux_ecart > 5 ? 'IMPORTANT' : taux_ecart > 0 ? 'MINEUR' : 'OK';

  return {
    id_reddition: reddition.id_reddition,
    date_creation: reddition.date_creation,
    annee_validation: reddition.annee_validation,
    statut: reddition.statut,
    date_validation: reddition.date_validation,
    motif_rejet: reddition.motif_rejet,
    materiel: {
      designation: reddition.resultatRecensement.inventaire.materiel?.designation,
      type: reddition.resultatRecensement.inventaire.materiel?.typeMateriel?.designation,
    },
    grand_livre: {
      id: reddition.grandLivre.id_grand_livre,
      date_enregistrement: reddition.grandLivre.date_enregistrement,
      quantite_restante: reddition.grandLivre.quantite_restante,
      valeur_restante: reddition.grandLivre.valeur_restante,
      cump: reddition.grandLivre.cump,
    },
    resultat_recensement: {
      id: reddition.resultatRecensement.id,
      quantite_theorique: reddition.resultatRecensement.quantite_theorique,
      quantite_physique: reddition.resultatRecensement.quantite_physique,
      ecart_trouve: reddition.resultatRecensement.ecart_trouve,
      valeur_systeme: reddition.resultatRecensement.valeur_systeme,
      pu_systeme: reddition.resultatRecensement.pu_systeme,
    },
    analyse: {
      ecart_quantite,
      ecart_valeur,
      taux_ecart: parseFloat(taux_ecart.toFixed(2)),
      est_coherent,
      niveau_alerte,
      recommandation: this.getRecommandation(niveau_alerte, ecart_quantite, ecart_valeur),
    },
  };
}


  private getRecommandation(niveau: string, ecart_qte: number, ecart_val: number): string {
    if (niveau === 'OK') {
      return ' Les données sont cohérentes. Validation recommandée.';
    }
    if (niveau === 'MINEUR') {
      return ' Écart mineur détecté. Vérifier avant validation.';
    }
    if (niveau === 'IMPORTANT') {
      return ' Écart important. Investigation nécessaire avant validation.';
    }
    return ' ÉCART CRITIQUE ! Ne PAS valider sans investigation approfondie.';
  }
}
