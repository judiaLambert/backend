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

      // 2. Générer un ID unique pour la demande
      const timestamp = Date.now();
      const id_demande = `DEM-${timestamp}`;

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
      console.log('Demande sauvegardée:', savedDemande.id);

      // 5. Créer et sauvegarder les détails
      const detailDemandes: DetailDemande[] = [];
      
      for (let i = 0; i < details.length; i++) {
        const detail = details[i];
        
        // Vérifier que le matériel existe
        const materiel = await manager.findOne(Materiel, {
          where: { id: detail.id_materiel }
        });

        if (!materiel) {
          throw new NotFoundException(`Matériel ${detail.id_materiel} non trouvé`);
        }

        // Générer un ID unique pour le détail
        const id_detail = `DET-${timestamp}-${i}`;

        // Créer le détail
        const detailDemande = manager.create(DetailDemande, {
          id: id_detail,
          demandeMateriel: { id: savedDemande.id },
          materiel: { id: detail.id_materiel },
          quantite_demander: detail.quantite_demander
        });

        // Sauvegarder le détail
        const savedDetail = await manager.save(DetailDemande, detailDemande);
        console.log('Détail sauvegardé:', savedDetail.id);
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

  // Mettre à jour une demande
  async update(id: string, raison_demande: string): Promise<DemandeMateriel> {
    const demande = await this.findOne(id);
    demande.raison_demande = raison_demande;
    return await this.demandeRepository.save(demande);
  }

  // Mettre à jour le statut d'une demande (approuver/refuser)
  async updateStatut(id: string, statut: string, motif_refus?: string): Promise<DemandeMateriel> {
    const demande = await this.findOne(id);
    
    demande.statut = statut;
    if (motif_refus) {
      demande.motif_refus = motif_refus;
    }

    return await this.demandeRepository.save(demande);
  }

  // Supprimer une demande
  async remove(id: string): Promise<void> {
    const demande = await this.findOne(id);
    await this.demandeRepository.remove(demande);
  }
}
