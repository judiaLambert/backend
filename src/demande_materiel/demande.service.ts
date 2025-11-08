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
      relations: ['demandeur']
    });
  }

  async findOne(id: string): Promise<DemandeMateriel> {
    const demande = await this.demandeMaterielRepository.findOne({ 
      where: { id },
      relations: ['demandeur']
    });
    if (!demande) {
      throw new NotFoundException(`Demande avec l'ID ${id} non trouvée`);
    }
    return demande;
  }

  async create(idDemandeur: string, dateDemande: Date, raisonDemande: string): Promise<DemandeMateriel> {
    const nouvelleDemande = this.demandeMaterielRepository.create({
      demandeur: { id: idDemandeur } as any,
      date_demande: dateDemande,
      raison_demande: raisonDemande,
    });
    return await this.demandeMaterielRepository.save(nouvelleDemande);
  }

  async update(id: string, idDemandeur: string, dateDemande: Date, raisonDemande: string): Promise<DemandeMateriel> {
    const demande = await this.findOne(id);
    
    demande.demandeur = { id: idDemandeur } as any;
    demande.date_demande = dateDemande;
    demande.raison_demande = raisonDemande;
    
    return await this.demandeMaterielRepository.save(demande);
  }

  async remove(id: string): Promise<void> {
    const demande = await this.findOne(id);
    await this.demandeMaterielRepository.remove(demande);
  }

  async findByDemandeur(idDemandeur: string): Promise<DemandeMateriel[]> {
    return await this.demandeMaterielRepository.find({
      where: { 
        demandeur: { id_demandeur: idDemandeur } 
      },
      relations: ['demandeur']
    });
  }
}