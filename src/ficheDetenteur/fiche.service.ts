import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attribution } from '../attribution/attribution.entity';
import { Demandeur } from '../demandeur/demandeur.entity';
import { Materiel } from '../materiel/materiel.entity';

@Injectable()
export class FicheDetenteurService {
  constructor(
    @InjectRepository(Attribution)
    private attributionRepository: Repository<Attribution>,
    @InjectRepository(Demandeur)
    private demandeurRepository: Repository<Demandeur>,
  ) {}

  /**
   * Obtenir TOUS les demandeurs qui ont des attributions en cours
   */
  async getAllDemandeursAvecMateriels() {
    try {
      console.log('🔍 Recherche des demandeurs avec attributions...');

      // Méthode 1: QueryBuilder simple
      const demandeursAvecAttributions = await this.attributionRepository
        .createQueryBuilder('attribution')
        .select('DISTINCT(demandeur.id_demandeur)', 'id_demandeur')
        .addSelect('demandeur.nom', 'nom')
        .addSelect('demandeur.email', 'email')
        .addSelect('demandeur.telephone', 'telephone')
        .addSelect('demandeur.type_demandeur', 'type_demandeur')
        .leftJoin('attribution.demandeur', 'demandeur')
        .leftJoin('demandeur.departement', 'departement')
        .addSelect('departement.nom_service', 'departement')
        .where('attribution.statut_attribution = :statut', { statut: 'En possession' })
        .orderBy('demandeur.nom', 'ASC')
        .getRawMany();

      console.log(`✅ ${demandeursAvecAttributions.length} demandeur(s) trouvé(s)`);

      // Pour chaque demandeur, récupérer ses attributions
      const result = await Promise.all(
        demandeursAvecAttributions.map(async (demandeur) => {
          const attributions = await this.attributionRepository.find({
            where: {
              demandeur: { id_demandeur: demandeur.id_demandeur },
              statut_attribution: 'En possession',
            },
            relations: ['materiel', 'materiel.typeMateriel'],
            order: { date_attribution: 'DESC' },
          });

          const materiels = attributions.map((attr) => ({
            id_attribution: attr.id,
            designation: attr.materiel.designation,
            type_materiel: attr.materiel.typeMateriel?.designation || 'Non spécifié',
            quantite: attr.quantite_attribuee,
            date_attribution: attr.date_attribution,
            date_retour_prevue: attr.date_retour_prevue,
            motif: attr.motif_attribution || '',
          }));

          return {
            id_demandeur: demandeur.id_demandeur,
            nom: demandeur.nom,
            email: demandeur.email,
            telephone: demandeur.telephone,
            type_demandeur: demandeur.type_demandeur,
            departement: demandeur.departement,
            materiels: materiels,
            total_materiels: materiels.length,
          };
        })
      );

      return result;

    } catch (error) {
      console.error('❌ Erreur dans getAllDemandeursAvecMateriels:', error);
      return [];
    }
  }

  /**
   * Obtenir UN demandeur avec ses matériels
   */
  async getDemandeurAvecMateriels(id_demandeur: string) {
    try {
      console.log(`🔍 Recherche du demandeur ${id_demandeur}...`);

      // Trouver le demandeur
      const demandeur = await this.demandeurRepository.findOne({
        where: { id_demandeur },
        relations: ['departement'],
      });

      if (!demandeur) {
        return { error: 'Demandeur non trouvé' };
      }

      // Récupérer ses attributions
      const attributions = await this.attributionRepository.find({
        where: {
          demandeur: { id_demandeur },
          statut_attribution: 'En possession',
        },
        relations: ['materiel', 'materiel.typeMateriel'],
        order: { date_attribution: 'DESC' },
      });

      const materiels = attributions.map((attr) => ({
        id_attribution: attr.id,
        designation: attr.materiel.designation,
        type_materiel: attr.materiel.typeMateriel?.designation || 'Non spécifié',
        quantite: attr.quantite_attribuee,
        date_attribution: attr.date_attribution,
        date_retour_prevue: attr.date_retour_prevue,
        motif: attr.motif_attribution || '',
      }));

      return {
        id_demandeur: demandeur.id_demandeur,
        nom: demandeur.nom,
        email: demandeur.email,
        telephone: demandeur.telephone,
        type_demandeur: demandeur.type_demandeur,
        departement: demandeur.departement?.nom_service || 'Non attribué',
        materiels: materiels,
        total_materiels: materiels.length,
      };

    } catch (error) {
      console.error('❌ Erreur dans getDemandeurAvecMateriels:', error);
      return { error: error.message };
    }
  }

  /**
   * Version alternative: Tout en une seule requête
   */
  async getAllDemandeursAvecMaterielsV2() {
    try {
      console.log('🔍 Recherche des demandeurs avec matériels (méthode V2)...');

      const result = await this.attributionRepository
        .createQueryBuilder('attribution')
        .leftJoinAndSelect('attribution.demandeur', 'demandeur')
        .leftJoinAndSelect('demandeur.departement', 'departement')
        .leftJoinAndSelect('attribution.materiel', 'materiel')
        .leftJoinAndSelect('materiel.typeMateriel', 'typeMateriel')
        .where('attribution.statut_attribution = :statut', { statut: 'En possession' })
        .orderBy('demandeur.nom', 'ASC')
        .addOrderBy('attribution.date_attribution', 'DESC')
        .getMany();

      // Grouper par demandeur
      const groupedByDemandeur = result.reduce((acc, attribution) => {
        const demandeur = attribution.demandeur;
        const demandeurId = demandeur.id_demandeur;

        if (!acc[demandeurId]) {
          acc[demandeurId] = {
            id_demandeur: demandeur.id_demandeur,
            nom: demandeur.nom,
            email: demandeur.email,
            telephone: demandeur.telephone,
            type_demandeur: demandeur.type_demandeur,
            departement: demandeur.departement?.nom_service || 'Non attribué',
            materiels: [],
            total_materiels: 0,
          };
        }

        acc[demandeurId].materiels.push({
          id_attribution: attribution.id,
          designation: attribution.materiel.designation,
          type_materiel: attribution.materiel.typeMateriel?.designation || 'Non spécifié',
          quantite: attribution.quantite_attribuee,
          date_attribution: attribution.date_attribution,
          date_retour_prevue: attribution.date_retour_prevue,
          motif: attribution.motif_attribution || '',
        });

        acc[demandeurId].total_materiels = acc[demandeurId].materiels.length;

        return acc;
      }, {});

      const finalResult = Object.values(groupedByDemandeur);
      console.log(`✅ ${finalResult.length} demandeur(s) avec matériels trouvé(s)`);

      return finalResult;

    } catch (error) {
      console.error('❌ Erreur dans getAllDemandeursAvecMaterielsV2:', error);
      return [];
    }
  }
}