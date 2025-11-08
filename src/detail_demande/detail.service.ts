import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DetailDemande } from './detail.entity';

@Injectable()
export class DetailDemandeService {
  constructor(
    @InjectRepository(DetailDemande)
    private detailDemandeRepository: Repository<DetailDemande>,
  ) {}

  async create(idMateriel: string, idDemande: string, quantiteDemander: number) {
    const detail = this.detailDemandeRepository.create({
      materiel: { id: idMateriel } as any,
      demandeMateriel: { id: idDemande } as any,
      quantite_demander: quantiteDemander,
    });
    return await this.detailDemandeRepository.save(detail);
  }

  async findAll() {
    return await this.detailDemandeRepository.find({
      relations: ['materiel', 'demandeMateriel', 'demandeMateriel.demandeur']
    });
  }

  async findOne(id: string) {
    const detail = await this.detailDemandeRepository.findOne({
      where: { id },
      relations: ['materiel', 'demandeMateriel', 'demandeMateriel.demandeur'],
    });
    if (!detail) {
      throw new NotFoundException(`Détail demande ${id} non trouvé`);
    }
    return detail;
  }

  async update(id: string, idMateriel: string, idDemande: string, quantiteDemander: number) {
    await this.detailDemandeRepository.update(id, {
      materiel: { id: idMateriel } as any,
      demandeMateriel: { id: idDemande } as any,
      quantite_demander: quantiteDemander,
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    return await this.detailDemandeRepository.delete(id);
  }
}