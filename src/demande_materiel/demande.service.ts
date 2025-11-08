import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DemandeMateriel } from '../demande_materiel/demande.entity';

@Injectable()
export class DemandeMaterielService {
  constructor(
    @InjectRepository(DemandeMateriel)
    private readonly demandeMaterielRepository: Repository<DemandeMateriel>,
  ) {}

  async findAll(): Promise<DemandeMateriel[]> {
    return await this.demandeMaterielRepository.find({
      relations: ['demandeur', 'detailDemandes', 'detailDemandes.materiel']
    });
  }

  async findOne(id: string): Promise<DemandeMateriel> {
    const demande = await this.demandeMaterielRepository.findOne({ 
      where: { id },
      relations: ['demandeur', 'detailDemandes', 'detailDemandes.materiel']
    });
    if (!demande) {
      throw new NotFoundException(`Demande avec l'ID ${id} non trouvée`);
    }
    return demande;
  }

  async findByDemandeur(idDemandeur: string): Promise<DemandeMateriel[]> {
    return await this.demandeMaterielRepository.find({
      where: { 
        demandeur: { id_demandeur: idDemandeur } 
      },
      relations: ['demandeur', 'detailDemandes', 'detailDemandes.materiel']
    });
  }

  async create(idDemandeur: string, dateDemande: Date, raisonDemande: string): Promise<DemandeMateriel> {
    const nouvelleDemande = this.demandeMaterielRepository.create({
      demandeur: { id_demandeur: idDemandeur } as any,
      date_demande: dateDemande,
      raison_demande: raisonDemande,
      statut: 'en_attente' // Statut par défaut
    });
    return await this.demandeMaterielRepository.save(nouvelleDemande);
  }

  async update(id: string, idDemandeur: string, dateDemande: Date, raisonDemande: string): Promise<DemandeMateriel> {
    const demande = await this.findOne(id);
    
    demande.demandeur = { id_demandeur: idDemandeur } as any;
    demande.date_demande = dateDemande;
    demande.raison_demande = raisonDemande;
    
    return await this.demandeMaterielRepository.save(demande);
  }

  // NOUVELLE MÉTHODE : Mettre à jour le statut (pour l'admin)
  async updateStatut(id: string, statut: 'en_attente' | 'approuvee' | 'refusee', motif?: string): Promise<DemandeMateriel> {
    const demande = await this.findOne(id);
    
    demande.statut = statut;
    if (motif) {
      demande.motif_refus = motif; // Ajoutez ce champ dans votre entité si nécessaire
    }
    
    return await this.demandeMaterielRepository.save(demande);
  }

  async remove(id: string): Promise<void> {
    const demande = await this.findOne(id);
    await this.demandeMaterielRepository.remove(demande);
  }
}