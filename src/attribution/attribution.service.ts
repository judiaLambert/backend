import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attribution } from './attribution.entity';
import { DemandeMateriel } from '../demande_materiel/demande.entity';
import { DetailDemande } from '../detail_demande/detail.entity';
import { InventaireService } from '../inventaire/inventaire.service';
import { MouvementStockService } from '../mouvement_stock/mouvement.service';
import { MouvementType } from '../mouvement_stock/mouvement.entity'; // ✅ Import

@Injectable()
export class AttributionService {
  constructor(
    @InjectRepository(Attribution)
    private attributionRepository: Repository<Attribution>,
    @InjectRepository(DemandeMateriel)
    private demandeMaterielRepository: Repository<DemandeMateriel>,
    @InjectRepository(DetailDemande)
    private detailDemandeRepository: Repository<DetailDemande>,
    private inventaireService: InventaireService,
    private mouvementService: MouvementStockService,
  ) {}

  async generateId(): Promise<string> {
    const lastAttribution = await this.attributionRepository
      .createQueryBuilder('attribution')
      .orderBy('attribution.id', 'DESC')
      .limit(1)
      .getOne();

    if (!lastAttribution) {
      return 'ATT001';
    }

    const lastNumber = parseInt(lastAttribution.id.replace('ATT', ''));
    const newNumber = lastNumber + 1;
    return `ATT${newNumber.toString().padStart(3, '0')}`;
  }

  async create(
    id_materiel: string,
    id_demandeur: string,
    quantite_attribuee: number,
    date_retour_prevue?: Date,
    motif_attribution?: string,
  ) {
    const id = await this.generateId();

    const attribution = this.attributionRepository.create({
      id,
      materiel: { id: id_materiel } as any,
      demandeur: { id_demandeur } as any,
      date_attribution: new Date(),
      quantite_attribuee,
      statut_attribution: 'En possession',
      date_retour_prevue,
      motif_attribution,
    });

    const saved = await this.attributionRepository.save(attribution);

    // ✅ CRÉER MOUVEMENT SORTIE
    await this.mouvementService.create({
      id_materiel,
      type_mouvement: MouvementType.SORTIE, // ✅ SORTIE au lieu de SORTIE_ATTRIBUTION
      quantite_mouvement: quantite_attribuee,
      id_reference: saved.id,
      type_reference: 'ATTRIBUTION', // ✅ Contexte dans référence
      motif: motif_attribution || `Attribution à demandeur ${id_demandeur} - En possession`,
      utilisateur: 'system',
    });

    try {
      await this.inventaireService.appliquerAttribution(id_materiel, quantite_attribuee);
    } catch (err) {
      console.warn(`Inventaire non mis à jour pour ${id_materiel}:`, err.message);
    }

    return saved;
  }

  async findAll() {
    return await this.attributionRepository.find({
      relations: ['materiel', 'materiel.typeMateriel', 'demandeur'],
      order: { date_attribution: 'DESC' },
    });
  }

  async findOne(id: string) {
    const attribution = await this.attributionRepository.findOne({
      where: { id },
      relations: ['materiel', 'materiel.typeMateriel', 'demandeur'],
    });

    if (!attribution) {
      throw new NotFoundException(`Attribution ${id} non trouvée`);
    }

    return attribution;
  }

  async findByDemandeur(id_demandeur: string) {
    return await this.attributionRepository.find({
      where: { demandeur: { id_demandeur } },
      relations: ['materiel', 'materiel.typeMateriel', 'demandeur'],
      order: { date_attribution: 'DESC' },
    });
  }

  async findByMateriel(id_materiel: string) {
    return await this.attributionRepository.find({
      where: { materiel: { id: id_materiel } },
      relations: ['materiel', 'materiel.typeMateriel', 'demandeur'],
      order: { date_attribution: 'DESC' },
    });
  }

  async update(
    id: string,
    updateData: {
      quantite_attribuee?: number;
      statut_attribution?: string;
      date_retour_prevue?: Date;
      motif_attribution?: string;
    },
  ) {
    const attribution = await this.findOne(id);

    await this.attributionRepository.update(id, updateData);
    return this.findOne(id);
  }

  async updateStatut(id: string, statut_attribution: string) {
    const attribution = await this.findOne(id);

    // ✅ CRÉER MOUVEMENT RETOUR si passage à "Retourné"
    if (statut_attribution === 'Retourné' && attribution.statut_attribution === 'En possession') {
      await this.mouvementService.create({
        id_materiel: attribution.materiel.id,
        type_mouvement: MouvementType.ENTREE, // ✅ ENTREE au lieu de RETOUR_ATTRIBUTION
        quantite_mouvement: attribution.quantite_attribuee,
        id_reference: id,
        type_reference: 'RETOUR_ATTRIBUTION', // ✅ Contexte dans référence
        motif: `Retour d'attribution - ${attribution.demandeur?.nom || 'Demandeur'}`,
        utilisateur: 'system',
      });

      try {
        await this.inventaireService.appliquerRetour(
          attribution.materiel.id,
          attribution.quantite_attribuee,
        );
      } catch (err) {
        console.warn(`Inventaire non mis à jour lors du retour:`, err.message);
      }
    }

    await this.attributionRepository.update(id, { statut_attribution });
    return this.findOne(id);
  }

  async remove(id: string) {
    const attribution = await this.findOne(id);

    // ✅ CRÉER MOUVEMENT ANNULATION si en possession
    if (attribution.statut_attribution === 'En possession') {
      await this.mouvementService.create({
        id_materiel: attribution.materiel.id,
        type_mouvement: MouvementType.ENTREE, // ✅ ENTREE au lieu de RETOUR_ATTRIBUTION
        quantite_mouvement: attribution.quantite_attribuee,
        id_reference: id,
        type_reference: 'ANNULATION_ATTRIBUTION', // ✅ Contexte dans référence
        motif: `Annulation attribution - Suppression`,
        utilisateur: 'system',
      });

      try {
        await this.inventaireService.appliquerRetour(
          attribution.materiel.id,
          attribution.quantite_attribuee,
        );
      } catch (err) {
        console.warn(`Inventaire non mis à jour lors de la suppression:`, err.message);
      }
    }

    return await this.attributionRepository.delete(id);
  }

  async getAttributionsEnRetard() {
    const maintenant = new Date();

    return await this.attributionRepository
      .createQueryBuilder('attribution')
      .where('attribution.statut_attribution = :statut', { statut: 'En possession' })
      .andWhere('attribution.date_retour_prevue IS NOT NULL')
      .andWhere('attribution.date_retour_prevue < :maintenant', { maintenant })
      .leftJoinAndSelect('attribution.materiel', 'materiel')
      .leftJoinAndSelect('attribution.demandeur', 'demandeur')
      .orderBy('attribution.date_retour_prevue', 'ASC')
      .getMany();
  }

  async getStatistiques() {
    const totalAttributions = await this.attributionRepository.count();

    const enPossession = await this.attributionRepository.count({
      where: { statut_attribution: 'En possession' },
    });

    const retournes = await this.attributionRepository.count({
      where: { statut_attribution: 'Retourné' },
    });

    const enRetard = await this.getAttributionsEnRetard();

    return {
      totalAttributions,
      enPossession,
      retournes,
      enRetard: enRetard.length,
    };
  }

  async getMaterielsDemandesApprouves(id_demandeur: string) {
    const demandesApprouvees = await this.demandeMaterielRepository.find({
      where: {
        demandeur: { id_demandeur },
        statut: 'approuvee',
      },
      relations: ['detailDemandes', 'detailDemandes.materiel', 'detailDemandes.materiel.typeMateriel'],
    });

    const materielsDisponibles = demandesApprouvees.flatMap((demande) =>
      demande.detailDemandes.map((detail) => ({
        id_detail: detail.id,
        id_materiel: detail.materiel.id,
        designation: detail.materiel.designation,
        type_materiel: detail.materiel.typeMateriel?.designation,
        quantite_demander: detail.quantite_demander,
        date_demande: demande.date_demande,
        date_retour: demande.date_retour,
        type_possession: demande.type_possession,
        id_demande: demande.id,
      })),
    );

    return materielsDisponibles;
  }
}
