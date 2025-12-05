import { Injectable, NotFoundException, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
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
      .orderBy('demande.id_demande', 'DESC')
      .getOne();

    if (!lastDemande || !lastDemande.id) {
      return 'DEM01';
    }

    // Extraire le numéro après "DEM"
    const numStr = lastDemande.id.substring(3);
    const lastNumber = parseInt(numStr, 10);
    
    // Vérifier que l'extraction a réussi
    if (isNaN(lastNumber)) {
      return 'DEM01';
    }

    const nextNumber = lastNumber + 1;
    return `DEM${nextNumber.toString().padStart(2, '0')}`;
  }

  // Génération ID détail au format DET01, DET02, etc.
  private async generateDetailId(): Promise<string> {
    const lastDetail = await this.detailRepository
      .createQueryBuilder('detail')
      .orderBy('detail.id_detail', 'DESC')
      .getOne();

    if (!lastDetail || !lastDetail.id) {
      return 'DET01';
    }

    const numStr = lastDetail.id.substring(3);
    const lastNumber = parseInt(numStr, 10);
    
    if (isNaN(lastNumber)) {
      return 'DET01';
    }

    const nextNumber = lastNumber + 1;
    return `DET${nextNumber.toString().padStart(2, '0')}`;
  }

  // MÉTHODE HELPER : Obtenir le dernier numéro de détail
  private async getLastDetailNumber(manager: any): Promise<number> {
    const lastDetail = await manager
      .createQueryBuilder(DetailDemande, 'detail')
      .orderBy('detail.id_detail', 'DESC')
      .getOne();

    if (!lastDetail || !lastDetail.id) {
      return 0;
    }

    const numStr = lastDetail.id.substring(3);
    const lastNumber = parseInt(numStr, 10);
    
    if (isNaN(lastNumber)) {
      return 0;
    }

    return lastNumber;
  }

  // Créer une demande avec ses détails (transaction)
  async create(
    id_demandeur: string,
    raison_demande: string,
    details: Array<{ id_materiel: string; quantite_demander: number }>,
    type_possession: string = 'temporaire',
    date_retour?: Date
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const demandeur = await manager.findOne(Demandeur, {
        where: { id_demandeur }
      });

      if (!demandeur) {
        throw new NotFoundException(`Demandeur ${id_demandeur} non trouvé`);
      }

      const id_demande = await this.generateDemandeId();

      const demande = manager.create(DemandeMateriel, {
        id: id_demande,
        demandeur: { id_demandeur },
        raison_demande: raison_demande,
        date_demande: new Date(),
        statut: 'en_attente',
        type_possession: type_possession,
        date_retour: date_retour
      });

      const savedDemande = await manager.save(DemandeMateriel, demande);

      // SOLUTION OPTIMALE : Récupérer le dernier ID UNE SEULE FOIS
      let currentDetailNumber = await this.getLastDetailNumber(manager);

      const detailDemandes: DetailDemande[] = [];
      
      for (const detail of details) {
        const materiel = await manager.findOne(Materiel, {
          where: { id: detail.id_materiel }
        });

        if (!materiel) {
          throw new NotFoundException(`Matériel ${detail.id_materiel} non trouvé`);
        }

        // Incrémenter le compteur pour chaque détail
        currentDetailNumber++;
        const id_detail = `DET${currentDetailNumber.toString().padStart(2, '0')}`;

        const detailDemande = manager.create(DetailDemande, {
          id: id_detail,
          demandeMateriel: savedDemande,
          materiel: { id: detail.id_materiel },
          quantite_demander: detail.quantite_demander
        });

        const savedDetail = await manager.save(DetailDemande, detailDemande);
        detailDemandes.push(savedDetail);
        
        console.log(`✅ Détail ${id_detail} créé pour matériel ${detail.id_materiel} (qté: ${detail.quantite_demander})`);
      }

      const demandeComplete = await manager.findOne(DemandeMateriel, {
        where: { id: savedDemande.id },
        relations: ['demandeur', 'detailDemandes', 'detailDemandes.materiel']
      });

      console.log(`✅ Demande ${id_demande} créée avec ${detailDemandes.length} détail(s)`);

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

  // ✅ NOUVELLE MÉTHODE : Approuver une demande
  async approuver(id: string, motif?: string): Promise<DemandeMateriel> {
    console.log(`\n✅ === APPROBATION DEMANDE ${id} ===`);
    
    const demande = await this.findOne(id);
    console.log(`Statut actuel: ${demande.statut}`);

    if (demande.statut !== 'en_attente') {
      throw new BadRequestException(`Impossible d'approuver. Statut actuel: ${demande.statut}`);
    }

    // ✅ Mettre à jour avec le bon statut
    demande.statut = 'Approuvée';  // Avec majuscule et accent
    
    const updated = await this.demandeRepository.save(demande);
    
    console.log(`Nouveau statut: ${updated.statut}`);
    console.log(`=====================================\n`);

    return updated;
  }

  // ✅ NOUVELLE MÉTHODE : Refuser une demande
  async refuser(id: string, motif_refus: string): Promise<DemandeMateriel> {
    console.log(`\n❌ === REFUS DEMANDE ${id} ===`);
    
    const demande = await this.findOne(id);
    console.log(`Statut actuel: ${demande.statut}`);
    console.log(`Motif refus: ${motif_refus}`);

    if (demande.statut !== 'en_attente') {
      throw new BadRequestException(`Impossible de refuser. Statut actuel: ${demande.statut}`);
    }

    if (!motif_refus) {
      throw new BadRequestException('Le motif de refus est obligatoire');
    }

    // ✅ Mettre à jour avec le bon statut
    demande.statut = 'Refusée';  // Avec majuscule et accent
    demande.motif_refus = motif_refus;
    
    const updated = await this.demandeRepository.save(demande);
    
    console.log(`Nouveau statut: ${updated.statut}`);
    console.log(`===================================\n`);

    return updated;
  }

  // ✅ ANCIENNE MÉTHODE : Garder pour compatibilité mais corriger le statut
  async updateStatut(
    id: string, 
    statut: 'Approuvée' | 'Refusée' | 'en_attente',  // ✅ Corriger le type
    motif_refus?: string
  ): Promise<DemandeMateriel> {
    const demande = await this.findOne(id);
    
    if (statut !== 'Approuvée' && statut !== 'Refusée' && statut !== 'en_attente') {
      throw new HttpException('Statut invalide', HttpStatus.BAD_REQUEST);
    }

    demande.statut = statut;
    
    if (statut === 'Refusée' && motif_refus) {
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

  // ✅ NOUVELLE MÉTHODE : Statistiques
  async getStatistiques() {
    const total = await this.demandeRepository.count();
    
    const enAttente = await this.demandeRepository.count({
      where: { statut: 'en_attente' }
    });
    
    const approuvees = await this.demandeRepository.count({
      where: { statut: 'Approuvée' }
    });
    
    const refusees = await this.demandeRepository.count({
      where: { statut: 'Refusée' }
    });

    return {
      total,
      en_attente: enAttente,
      approuvees,
      refusees,
    };
  }
}
