import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DemandeMateriel } from './demande.entity';
import { DetailDemande } from '../detail_demande/detail.entity';
import { Demandeur } from '../demandeur/demandeur.entity';
import { Materiel } from '../materiel/materiel.entity';

@Injectable()
export class DemandeMaterielService {
  constructor(
    @InjectRepository(DemandeMateriel)
    private demandeRepository: Repository<DemandeMateriel>,
    @InjectRepository(DetailDemande)
    private detailRepository: Repository<DetailDemande>,
    @InjectRepository(Demandeur)
    private demandeurRepository: Repository<Demandeur>,
    @InjectRepository(Materiel)
    private materielRepository: Repository<Materiel>,
    private dataSource: DataSource
  ) {}

  // Génération ID au format DEM01, DEM02, etc.
  private async generateDemandeId(): Promise<string> {
    const lastDemande = await this.demandeRepository
      .createQueryBuilder('demande')
      .orderBy('demande.id', 'DESC')
      .getOne();

    if (!lastDemande) {
      return 'DEM01';
    }

    const lastNumber = parseInt(lastDemande.id.substring(3));
    const nextNumber = lastNumber + 1;
    return `DEM${nextNumber.toString().padStart(2, '0')}`;
  }

  // Génération ID détail au format DET01, DET02, etc.
  private async generateDetailId(): Promise<string> {
    const lastDetail = await this.detailRepository
      .createQueryBuilder('detail')
      .orderBy('detail.id', 'DESC')
      .getOne();

    if (!lastDetail) {
      return 'DET01';
    }

    const lastNumber = parseInt(lastDetail.id.substring(3));
    const nextNumber = lastNumber + 1;
    return `DET${nextNumber.toString().padStart(2, '0')}`;
  }

  // Créer une demande avec ses détails (transaction)
  async create(
    id_demandeur: string,
    raison_demande: string,
    details: Array<{ id_materiel: string; quantite_demander: number }>
  ) {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Vérifier que le demandeur existe
      const demandeur = await manager.findOne(Demandeur, {
        where: { id_demandeur }
      });

      if (!demandeur) {
        throw new NotFoundException(`Demandeur ${id_demandeur} non trouvé`);
      }

      // 2. Générer l'ID de la demande
      const id_demande = await this.generateDemandeId();

      // 3. Créer la demande principale
      const demande = manager.create(DemandeMateriel, {
        id: id_demande,
        demandeur: { id_demandeur },
        raison_demande: raison_demande,
        date_demande: new Date(),
        statut: 'en_attente'
      });

      // 4. Sauvegarder la demande
      const savedDemande = await manager.save(DemandeMateriel, demande);

      // 5. Créer et sauvegarder les détails
      const detailDemandes: DetailDemande[] = [];
      
      for (const detail of details) {
        // Vérifier que le matériel existe
        const materiel = await manager.findOne(Materiel, {
          where: { id: detail.id_materiel }
        });

        if (!materiel) {
          throw new NotFoundException(`Matériel ${detail.id_materiel} non trouvé`);
        }

        // Générer un ID unique pour le détail
        const id_detail = await this.generateDetailId();

        // Créer le détail
        const detailDemande = manager.create(DetailDemande, {
          id: id_detail,
          demandeMateriel: savedDemande,
          materiel: { id: detail.id_materiel },
          quantite_demander: detail.quantite_demander
        });

        // Sauvegarder le détail
        const savedDetail = await manager.save(DetailDemande, detailDemande);
        detailDemandes.push(savedDetail);
      }

      // 6. Récupérer la demande complète avec relations
      const demandeComplete = await manager.findOne(DemandeMateriel, {
        where: { id: savedDemande.id },
        relations: ['demandeur', 'detailDemandes', 'detailDemandes.materiel']
      });

      return {
        success: true,
        message: 'Demande créée avec succès et en attente de validation',
        data: demandeComplete
      };
    });
  }

  // Récupérer toutes les demandes
  async findAll(): Promise<DemandeMateriel[]> {
    return await this.demandeRepository.find({
      relations: ['demandeur', 'demandeur.departement', 'detailDemandes', 'detailDemandes.materiel'],
      order: { date_demande: 'DESC' }
    });
  }

  // Récupérer une demande par ID
  async findOne(id: string): Promise<DemandeMateriel> {
    const demande = await this.demandeRepository.findOne({
      where: { id },
      relations: ['demandeur', 'demandeur.departement', 'detailDemandes', 'detailDemandes.materiel']
    });

    if (!demande) {
      throw new NotFoundException(`Demande ${id} non trouvée`);
    }

    return demande;
  }

  // Récupérer les demandes d'un demandeur
  async findByDemandeur(id_demandeur: string): Promise<DemandeMateriel[]> {
    return await this.demandeRepository.find({
      where: { demandeur: { id_demandeur } },
      relations: ['demandeur', 'detailDemandes', 'detailDemandes.materiel'],
      order: { date_demande: 'DESC' }
    });
  }

  // Mettre à jour une demande (raison)
  async update(id: string, raison_demande: string): Promise<DemandeMateriel> {
    const demande = await this.findOne(id);
    demande.raison_demande = raison_demande;
    return await this.demandeRepository.save(demande);
  }

  // Mettre à jour le statut d'une demande (approuver/refuser)
  async updateStatut(
    id: string, 
    statut: 'approuvee' | 'refusee', 
    motif_refus?: string
  ): Promise<DemandeMateriel> {
    const demande = await this.findOne(id);
    
    if (statut !== 'approuvee' && statut !== 'refusee') {
      throw new HttpException('Statut invalide', HttpStatus.BAD_REQUEST);
    }

    demande.statut = statut;
    
    if (statut === 'refusee' && motif_refus) {
      demande.motif_refus = motif_refus;
    }

    return await this.demandeRepository.save(demande);
  }

  // Supprimer une demande
  async remove(id: string): Promise<void> {
    const demande = await this.findOne(id);
    await this.demandeRepository.remove(demande);
  }

  // ========== GESTION DES DÉTAILS ==========

  // Ajouter un matériel à une demande existante
  async addDetail(
    id_demande: string, 
    id_materiel: string, 
    quantite_demander: number
  ) {
    const demande = await this.findOne(id_demande);
    
    const materiel = await this.materielRepository.findOne({
      where: { id: id_materiel }
    });

    if (!materiel) {
      throw new NotFoundException(`Matériel ${id_materiel} non trouvé`);
    }

    const id_detail = await this.generateDetailId();

    const detail = this.detailRepository.create({
      id: id_detail,
      demandeMateriel: demande,
      materiel: { id: id_materiel },
      quantite_demander
    });

    return await this.detailRepository.save(detail);
  }

  // Modifier la quantité d'un détail
  async updateDetail(id_detail: string, quantite_demander: number) {
    const detail = await this.detailRepository.findOne({
      where: { id: id_detail },
      relations: ['materiel', 'demandeMateriel']
    });

    if (!detail) {
      throw new NotFoundException(`Détail ${id_detail} non trouvé`);
    }

    detail.quantite_demander = quantite_demander;
    return await this.detailRepository.save(detail);
  }

  // Supprimer un détail
  async removeDetail(id_detail: string) {
    const detail = await this.detailRepository.findOne({
      where: { id: id_detail }
    });

    if (!detail) {
      throw new NotFoundException(`Détail ${id_detail} non trouvé`);
    }

    await this.detailRepository.remove(detail);
    return { success: true, message: 'Détail supprimé avec succès' };
  }
}
