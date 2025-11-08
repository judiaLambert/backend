import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attribution } from './attribution.entity';
import { DetailDemande } from '../detail_demande/detail.entity';
import { Materiel } from '../materiel/materiel.entity';
import { Demandeur } from '../demandeur/demandeur.entity';
import { DemandeMateriel } from '../demande_materiel/demande.entity';

@Injectable()
export class AttributionService {
  constructor(
    @InjectRepository(Attribution)
    private attributionRepository: Repository<Attribution>,
    
    @InjectRepository(DetailDemande)
    private detailDemandeRepository: Repository<DetailDemande>,
    
    @InjectRepository(Materiel)
    private materielRepository: Repository<Materiel>,
    
    @InjectRepository(Demandeur)
    private demandeurRepository: Repository<Demandeur>,

    @InjectRepository(DemandeMateriel)
    private demandeMaterielRepository: Repository<DemandeMateriel>,
  ) {}

  async create(
    id_materiel: string, 
    id_demandeur: string, 
    date_attribution: Date, 
    quantite_attribuee: number,
    statut_attribution: string,
    date_retour_prevue?: Date,
    motif_attribution?: string,
    id_detail_demande?: string // Nouveau paramètre pour l'ID du détail de demande
  ) {
    // VÉRIFICATION 1: Vérifier s'il existe une demande pour cette combinaison
    const detailDemande = await this.detailDemandeRepository.findOne({
      where: { 
        materiel: { id: id_materiel },
        demandeMateriel: { demandeur: { id_demandeur: id_demandeur } }
      },
      relations: ['materiel', 'demandeMateriel', 'demandeMateriel.demandeur']
    });

    if (!detailDemande) {
      throw new NotFoundException('Aucune demande trouvée pour cette combinaison demandeur/matériel');
    }

    // VÉRIFICATION 2: Vérifier si une attribution existe déjà pour ce DÉTAIL DE DEMANDE
    const attributionExistante = await this.attributionRepository.findOne({
      where: { 
        materiel: { id: id_materiel },
        demandeur: { id_demandeur: id_demandeur },
        // On vérifie par la relation avec DetailDemande
        // OU on utilise l'ID du détail de demande si fourni
      }
    });

    // Si une attribution existe déjà pour cette combinaison (quel que soit le statut)
    if (attributionExistante) {
      throw new ConflictException('Une attribution existe déjà pour cette demande. Impossible de créer une autre attribution pour le même détail de demande.');
    }

    // VÉRIFICATION 3: Validation de la date d'attribution
    if (new Date(date_attribution) < new Date(detailDemande.demandeMateriel.date_demande)) {
      throw new BadRequestException(
        `La date d'attribution (${date_attribution}) ne peut pas être antérieure à la date de demande (${detailDemande.demandeMateriel.date_demande})`
      );
    }

    // VÉRIFICATION 4: Validation de la quantité
    if (quantite_attribuee > detailDemande.quantite_demander) {
      throw new BadRequestException(
        `La quantité attribuée (${quantite_attribuee}) ne peut pas dépasser la quantité demandée (${detailDemande.quantite_demander})`
      );
    }

    if (quantite_attribuee < 1) {
      throw new BadRequestException('La quantité attribuée doit être au moins 1');
    }

    // VÉRIFICATION 5: Validation de la date de retour
    if (date_retour_prevue && new Date(date_retour_prevue) < new Date(date_attribution)) {
      throw new BadRequestException('La date de retour ne peut pas être antérieure à la date d\'attribution');
    }

    // CRÉATION DE L'ATTRIBUTION
    const attribution = this.attributionRepository.create({
      materiel: { id: id_materiel } as any,
      demandeur: { id: id_demandeur } as any,
      date_attribution: date_attribution,
      quantite_attribuee: quantite_attribuee,
      statut_attribution: statut_attribution,
      date_retour_prevue: date_retour_prevue,
      motif_attribution: motif_attribution,
      // Si vous avez une relation directe avec DetailDemande, l'ajouter
      // detailDemande: { id: detailDemande.id } as any
    });

    return await this.attributionRepository.save(attribution);
  }

  async findAll() {
    return await this.attributionRepository.find({
      relations: ['materiel', 'demandeur'],
      order: { date_attribution: 'DESC' }
    });
  }

  async findOne(id: string) {
    const attribution = await this.attributionRepository.findOne({
      where: { id },
      relations: ['materiel', 'demandeur'],
    });
    
    if (!attribution) {
      throw new NotFoundException(`Attribution ${id} non trouvée`);
    }
    
    return attribution;
  }

  async update(
    id: string,
    updateData: {
      date_attribution?: Date;
      quantite_attribuee?: number;
      statut_attribution?: string;
      date_retour_prevue?: Date;
      motif_attribution?: string;
    }
  ) {
    const attribution = await this.findOne(id);

    // VÉRIFICATIONS POUR LA MISE À JOUR
    if (updateData.date_attribution) {
      // Récupérer le détail de demande pour la date de demande
      const detailDemande = await this.detailDemandeRepository.findOne({
        where: { 
          materiel: { id: attribution.materiel.id },
          demandeMateriel: { demandeur: { id_demandeur: attribution.demandeur.id_demandeur } }
        },
        relations: ['demandeMateriel']
      });

      if (detailDemande && new Date(updateData.date_attribution) < new Date(detailDemande.demandeMateriel.date_demande)) {
        throw new BadRequestException('La date d\'attribution ne peut pas être antérieure à la date de demande');
      }
    }

    if (updateData.quantite_attribuee !== undefined) {
      if (updateData.quantite_attribuee < 1) {
        throw new BadRequestException('La quantité attribuée doit être au moins 1');
      }

      // Récupérer le détail de demande pour vérifier la quantité maximale
      const detailDemande = await this.detailDemandeRepository.findOne({
        where: { 
          materiel: { id: attribution.materiel.id },
          demandeMateriel: { demandeur: { id_demandeur: attribution.demandeur.id_demandeur

           } }
        }
      });

      if (detailDemande && updateData.quantite_attribuee > detailDemande.quantite_demander) {
        throw new BadRequestException(
          `La quantité attribuée ne peut pas dépasser la quantité demandée (${detailDemande.quantite_demander})`
        );
      }
    }

    if (updateData.date_retour_prevue && updateData.date_retour_prevue < new Date(attribution.date_attribution)) {
      throw new BadRequestException('La date de retour ne peut pas être antérieure à la date d\'attribution');
    }

    // MISE À JOUR
    await this.attributionRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string) {
    const attribution = await this.findOne(id);
    
    // Empêcher la suppression si le matériel n'a pas été rendu
    if (attribution.statut_attribution !== 'Rendu') {
      throw new BadRequestException(
        'Impossible de supprimer une attribution active. Marquez d\'abord le matériel comme rendu.'
      );
    }

    return await this.attributionRepository.delete(id);
  }

  async findByDemandeur(id_demandeur: string) {
    const demandeur = await this.demandeurRepository.findOne({
      where: { id_demandeur: id_demandeur }
    });

    if (!demandeur) {
      throw new NotFoundException('Demandeur non trouvé');
    }

    return await this.attributionRepository.find({
      where: { demandeur: { id_demandeur: id_demandeur } },
      relations: ['materiel', 'demandeur'],
      order: { date_attribution: 'DESC' }
    });
  }

  async findByMateriel(id_materiel: string) {
    const materiel = await this.materielRepository.findOne({
      where: { id: id_materiel }
    });

    if (!materiel) {
      throw new NotFoundException('Matériel non trouvé');
    }

    return await this.attributionRepository.find({
      where: { materiel: { id: id_materiel } },
      relations: ['materiel', 'demandeur'],
      order: { date_attribution: 'DESC' }
    });
  }

  async findByDemandeurAndMateriel(id_demandeur: string, id_materiel: string) {
    return await this.attributionRepository.find({
      where: { 
        demandeur: { id_demandeur: id_demandeur },
        materiel: { id: id_materiel }
      },
      relations: ['materiel', 'demandeur'],
      order: { date_attribution: 'DESC' }
    });
  }

  async findByDetailDemande(id_detail_demande: string) {
    // Si vous avez une relation directe avec DetailDemande
    return await this.attributionRepository.find({
      where: { 
        // detailDemande: { id: id_detail_demande }
      },
      relations: ['materiel', 'demandeur'],
    });
  }

  async updateStatut(id: string, statut_attribution: string) {
    const attribution = await this.findOne(id);

    // Validation du statut
    const statutsValides = ['En possession', 'Rendu', 'En retard'];
    if (!statutsValides.includes(statut_attribution)) {
      throw new BadRequestException(`Statut invalide. Statuts valides: ${statutsValides.join(', ')}`);
    }

    const updateData: any = { statut_attribution };
    
    // Si on marque comme rendu, on peut mettre la date de retour à aujourd'hui
    if (statut_attribution === 'Rendu' && !attribution.date_retour_prevue) {
      updateData.date_retour_prevue = new Date();
    }

    await this.attributionRepository.update(id, updateData);
    return this.findOne(id);
  }

  async getAttributionsEnRetard() {
    const aujourdhui = new Date();
    
    return await this.attributionRepository
      .createQueryBuilder('attribution')
      .where('attribution.date_retour_prevue < :aujourdhui', { aujourdhui })
      .andWhere('attribution.statut_attribution = :statut', { statut: 'En possession' })
      .leftJoinAndSelect('attribution.materiel', 'materiel')
      .leftJoinAndSelect('attribution.demandeur', 'demandeur')
      .orderBy('attribution.date_retour_prevue', 'ASC')
      .getMany();
  }

  async getStatistiques() {
    const total = await this.attributionRepository.count();
    const enPossession = await this.attributionRepository.count({
      where: { statut_attribution: 'En possession' }
    });
    const rendu = await this.attributionRepository.count({
      where: { statut_attribution: 'Rendu' }
    });
    const enRetard = await this.attributionRepository.count({
      where: { statut_attribution: 'En retard' }
    });

    return {
      total,
      enPossession,
      rendu,
      enRetard
    };
  }

  // Nouvelle méthode pour vérifier l'existence d'une attribution pour un détail de demande
  async verifierAttributionExistePourDetailDemande(id_materiel: string, id_demandeur: string): Promise<boolean> {
    const attribution = await this.attributionRepository.findOne({
      where: { 
        materiel: { id: id_materiel },
        demandeur: { id_demandeur: id_demandeur }
      }
    });

    return !!attribution;
  }

  // Méthode pour vérifier l'existence d'une demande
  async verifierDemandeExiste(id_demandeur: string, id_materiel: string): Promise<boolean> {
    const detailDemande = await this.detailDemandeRepository.findOne({
      where: { 
        materiel: { id: id_materiel },
        demandeMateriel: { demandeur: { id_demandeur: id_demandeur } }
      }
    });

    return !!detailDemande;
  }
}